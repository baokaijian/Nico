import { ordered, validDate } from './domain.mjs';
import { eligiblePerformance, formatMilliseconds, performanceLabel, performanceMilliseconds } from './performance.ts';
import { trainingSummary } from './training.ts';
import { SKILL_LEVELS } from './growth-model.ts';
import { scopeStateForAthlete } from './athletes-coaches.mjs';

const fail = (status, message) => Object.assign(new Error(message), { status });

function validateWindow(win, label) {
  if (!win || typeof win !== 'object') throw fail(400, `请提供${label}起止日期`);
  const start = String(win.start || win.startDate || '').trim();
  const end = String(win.end || win.endDate || '').trim();
  if (!validDate(start) || !validDate(end)) throw fail(400, `${label}日期格式无效，请使用YYYY-MM-DD`);
  if (start > end) throw fail(400, `${label}起始日期不能晚于结束日期`);
  return { start, end, startDate: start, endDate: end, label: typeof win.label === 'string' && win.label.trim() ? win.label.trim() : `${start} 至 ${end}` };
}

function summarizeWindowTrainings(trainings) {
  const summary = trainingSummary(trainings);
  return {
    totalRecords: trainings.length,
    recordCount: trainings.length,
    sessionCount: summary.count,
    occurredCount: summary.count,
    minutes: summary.minutes,
    minutesCount: summary.minutesCount,
    meters: summary.meters,
    knownMeters: summary.knownMeters,
    metersCount: summary.metersCount,
    unknownSets: summary.unknownSets,
    strokes: summary.strokes,
  };
}

function countWindowPbs(allSwim, start, end) {
  const validChronological = ordered(allSwim).filter(r => eligiblePerformance(r));
  const bestSoFar = new Map();
  let pbCount = 0;
  const pbRecords = [];
  for (const row of validChronological) {
    const key = `${row.distance}|${row.stroke}|${row.poolLength}`;
    const ms = performanceMilliseconds(row);
    const prev = bestSoFar.get(key);
    if (prev === undefined || ms < prev) {
      bestSoFar.set(key, ms);
      if (row.date >= start && row.date <= end) {
        pbCount++;
        pbRecords.push({ id: row.id, date: row.date, distance: row.distance, stroke: row.stroke, poolLength: row.poolLength, time: performanceLabel(row), timeMs: ms });
      }
    }
  }
  return { pbCount, pbRecords };
}

export function comparePeriods(state, rawWindowA, rawWindowB, { athleteId = 'nico' } = {}) {
  const windowA = validateWindow(rawWindowA, '周期A');
  const windowB = validateWindow(rawWindowB, '周期B');
  const scoped = scopeStateForAthlete(state, athleteId);

  const inWin = (list, win, field = 'date') => ordered(list || []).filter(r => {
    const d = String(r[field] || '').slice(0, 10);
    return d >= win.start && d <= win.end;
  });

  // 1. Training Volume
  const trainingsA = inWin(scoped.trainings, windowA);
  const trainingsB = inWin(scoped.trainings, windowB);
  const volA = summarizeWindowTrainings(trainingsA);
  const volB = summarizeWindowTrainings(trainingsB);
  const volumeSufficient = volA.sessionCount > 0 && volB.sessionCount > 0;
  const hasKnownMetersA = volA.metersCount > 0 || volA.knownMeters > 0;
  const hasKnownMetersB = volB.metersCount > 0 || volB.knownMeters > 0;
  const deltaSessions = volumeSufficient ? volB.sessionCount - volA.sessionCount : null;
  const deltaKnownMeters = volumeSufficient && hasKnownMetersA && hasKnownMetersB ? volB.knownMeters - volA.knownMeters : null;
  const deltaMinutes = volumeSufficient && volA.minutes != null && volB.minutes != null ? volB.minutes - volA.minutes : null;
  const trainingVolume = {
    status: volumeSufficient ? '可对比' : '样本不足',
    reason: volumeSufficient ? '' : '至少一个周期内无已记录实际完成依据的训练，样本不足，不外推训练量变化',
    windowA: volA,
    windowB: volB,
    deltaSessions,
    deltaKnownMeters,
    deltaMinutes,
    delta: volumeSufficient ? { occurredCount: deltaSessions, knownMeters: deltaKnownMeters, minutes: deltaMinutes } : null,
  };

  // 2. Swim Performances & PBs
  const swimA = inWin(scoped.swim, windowA);
  const swimB = inWin(scoped.swim, windowB);
  const validA = swimA.filter(r => eligiblePerformance(r));
  const validB = swimB.filter(r => eligiblePerformance(r));
  const pbsA = countWindowPbs(scoped.swim || [], windowA.start, windowA.end);
  const pbsB = countWindowPbs(scoped.swim || [], windowB.start, windowB.end);

  const eventKeys = new Set(
    [...validA, ...validB].map(r => `${r.distance}|${r.stroke}|${r.poolLength}`)
  );
  const events = [...eventKeys].sort().map(key => {
    const [distance, stroke, poolLength] = key.split('|');
    const rowsA = validA.filter(r => r.distance === distance && r.stroke === stroke && r.poolLength === poolLength);
    const rowsB = validB.filter(r => r.distance === distance && r.stroke === stroke && r.poolLength === poolLength);
    const bestRowA = rowsA.length ? rowsA.reduce((a, b) => performanceMilliseconds(a) <= performanceMilliseconds(b) ? a : b) : null;
    const bestRowB = rowsB.length ? rowsB.reduce((a, b) => performanceMilliseconds(a) <= performanceMilliseconds(b) ? a : b) : null;
    const comparable = Boolean(bestRowA && bestRowB);
    const deltaMs = comparable ? performanceMilliseconds(bestRowB) - performanceMilliseconds(bestRowA) : null;
    return {
      key: `${distance}${stroke}（${poolLength}池）`,
      eventKey: `${distance}|${stroke}|${poolLength}`,
      distance,
      stroke,
      poolLength,
      countA: rowsA.length,
      countB: rowsB.length,
      bestA: bestRowA ? { id: bestRowA.id, date: bestRowA.date, time: performanceLabel(bestRowA), label: performanceLabel(bestRowA), timeMs: performanceMilliseconds(bestRowA) } : null,
      bestB: bestRowB ? { id: bestRowB.id, date: bestRowB.date, time: performanceLabel(bestRowB), label: performanceLabel(bestRowB), timeMs: performanceMilliseconds(bestRowB) } : null,
      status: comparable ? '可对比' : '样本不足',
      deltaMs,
      deltaSeconds: deltaMs != null ? deltaMs / 1000 : null,
      improved: comparable && deltaMs < 0,
      deltaText: !comparable
        ? '样本不足'
        : deltaMs === 0
          ? '持平 (0.000秒)'
          : deltaMs < 0
            ? `快 ${(Math.abs(deltaMs) / 1000).toFixed(3)}秒 (${formatMilliseconds(Math.abs(deltaMs))})`
            : `慢 ${(deltaMs / 1000).toFixed(3)}秒 (${formatMilliseconds(deltaMs)})`,
      reason: comparable ? '' : '仅单个周期有核验有效且池长明确的同项成绩，样本不足，不跨周期归因',
    };
  });

  const anyComparableEvent = events.some(e => e.status === '可对比');
  const pbRefreshCount = events.filter(e => e.improved).length;
  const performances = {
    status: anyComparableEvent ? '可对比' : '样本不足',
    reason: anyComparableEvent ? '' : '两周期内缺少同距离、同泳姿、同池长的核验有效成绩，样本不足',
    windowA: {
      totalCount: swimA.length,
      validCount: validA.length,
      eligibleCount: validA.length,
      unverifiedCount: swimA.filter(r => r.validityStatus !== '有效').length,
      pbCount: pbsA.pbCount,
      pbRecords: pbsA.pbRecords,
    },
    windowB: {
      totalCount: swimB.length,
      validCount: validB.length,
      eligibleCount: validB.length,
      unverifiedCount: swimB.filter(r => r.validityStatus !== '有效').length,
      pbCount: pbsB.pbCount,
      pbRefreshCount,
      pbRecords: pbsB.pbRecords,
    },
    events,
  };

  // 3. Skill Assessments (confirmed only, same standard version required)
  const confirmedSkillsA = inWin(scoped.skillAssessments, windowA).filter(r => r.status === '已确认');
  const confirmedSkillsB = inWin(scoped.skillAssessments, windowB).filter(r => r.status === '已确认');
  const skillIds = new Set([...confirmedSkillsA, ...confirmedSkillsB].map(r => r.skillId));
  const skillItems = [...skillIds].sort().map(skillId => {
    const listA = confirmedSkillsA.filter(r => r.skillId === skillId);
    const listB = confirmedSkillsB.filter(r => r.skillId === skillId);
    const latestA = listA.at(-1) || null;
    const latestB = listB.at(-1) || null;
    const name = (latestB || latestA)?.standardSnapshot?.name || skillId;
    const dimension = (latestB || latestA)?.standardSnapshot?.dimension || '';
    if (!latestA || !latestB) {
      return {
        skillId,
        name,
        dimension,
        status: '样本不足',
        levelA: latestA?.level || null,
        levelB: latestB?.level || null,
        versionA: latestA?.definitionVersion ?? null,
        versionB: latestB?.definitionVersion ?? null,
        deltaLevels: null,
        reason: '仅单个周期有已确认测评，样本不足',
      };
    }
    if (latestA.definitionVersion !== latestB.definitionVersion) {
      return {
        skillId,
        name,
        dimension,
        status: '标准版本不同',
        levelA: latestA.level,
        levelB: latestB.level,
        versionA: latestA.definitionVersion,
        versionB: latestB.definitionVersion,
        deltaLevels: null,
        reason: `周期A为v${latestA.definitionVersion}、周期B为v${latestB.definitionVersion}，标准版本不同，不直接对比升降级`,
      };
    }
    const deltaLevels = SKILL_LEVELS.indexOf(latestB.level) - SKILL_LEVELS.indexOf(latestA.level);
    return {
      skillId,
      name,
      dimension,
      status: '可对比',
      levelA: latestA.level,
      levelB: latestB.level,
      versionA: latestA.definitionVersion,
      versionB: latestB.definitionVersion,
      dateA: latestA.date,
      dateB: latestB.date,
      deltaLevels,
      reason: '',
    };
  });

  const anyComparableSkill = skillItems.some(i => i.status === '可对比');
  const skills = {
    status: anyComparableSkill ? '可对比' : '样本不足',
    reason: anyComparableSkill ? '' : '两周期内缺少同技能、同标准版本的已确认测评，样本不足',
    windowAConfirmedCount: confirmedSkillsA.length,
    windowBConfirmedCount: confirmedSkillsB.length,
    items: skillItems,
  };

  // 4. Goals Progress
  const allGoals = scoped.goals || [];
  const achievedA = allGoals.filter(g => ['已达成', '已归档'].includes(g.status) && g.confirmedAt && g.confirmedAt.slice(0, 10) >= windowA.start && g.confirmedAt.slice(0, 10) <= windowA.end);
  const achievedB = allGoals.filter(g => ['已达成', '已归档'].includes(g.status) && g.confirmedAt && g.confirmedAt.slice(0, 10) >= windowB.start && g.confirmedAt.slice(0, 10) <= windowB.end);
  const inProgress = allGoals.filter(g => g.status === '进行中');
  const goals = {
    status: allGoals.length ? '仅列事实' : '样本不足',
    reason: allGoals.length ? '目标达成仅以人工确认与关联证据为准，不作进度预测' : '当前档案尚无成长目标，样本不足',
    totalGoals: allGoals.length,
    inProgressCount: inProgress.length,
    windowAAchievedCount: achievedA.length,
    windowBAchievedCount: achievedB.length,
    windowAAchieved: achievedA.map(g => ({ id: g.id, title: g.title, confirmedAt: g.confirmedAt?.slice(0, 10) || '' })),
    windowBAchieved: achievedB.map(g => ({ id: g.id, title: g.title, confirmedAt: g.confirmedAt?.slice(0, 10) || '' })),
    inProgress: inProgress.map(g => ({ id: g.id, title: g.title, targetResult: g.targetResult || g.targetMetric || '', deadline: g.deadline || '' })),
  };

  return {
    athleteId: scoped.activeAthleteId,
    athleteDisplayName: scoped.profile.displayName || scoped.profile.name || 'Nico',
    windowA,
    windowB,
    trainingVolume,
    performances,
    performance: performances,
    skills: {
      ...skills,
      comparisons: skillItems,
    },
    goals: {
      ...goals,
      activeCount: inProgress.length,
      achievedCount: achievedA.length + achievedB.length,
      windowA: { touchedCount: achievedA.length },
      windowB: { touchedCount: achievedB.length },
    },
  };
}

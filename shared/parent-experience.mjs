import { ordered } from './domain.mjs';
import { DEFAULT_ATHLETE_ID, recordAthleteId } from './athletes-coaches.mjs';
import { adminTasks } from './admin-tasks.mjs';
import { practiceOverview } from './practice.mjs';
import { performanceLabel, validityLabel } from './performance.ts';
import { trainingFacts, trainingSummary } from './training.ts';
import { reportStale } from './report-drafts.mjs';

function resolveScope(data) {
  const athleteId = data?.activeAthleteId || data?.profile?.athleteId || data?.profile?.id || DEFAULT_ATHLETE_ID;
  const athleteName = (data?.profile?.displayName || data?.profile?.name || 'Nico').trim() || 'Nico';
  const explicitScope = Boolean(data?.activeAthleteId || data?.profile?.athleteId);
  const inScope = row => !explicitScope || recordAthleteId(row) === athleteId;
  return { athleteId, athleteName, inScope };
}

export function coachFeedbackList(data, limit = 3) {
  if (!data || typeof data !== 'object') return [];
  const { athleteId, athleteName, inScope } = resolveScope(data);
  const items = (data.trainings || [])
    .filter(row => row && inScope(row) && typeof row.coachNotes === 'string' && row.coachNotes.trim() && typeof row.feedbackBy === 'string' && row.feedbackBy.trim())
    .sort((a, b) => {
      const timeA = String(a.feedbackAt || a.date || '');
      const timeB = String(b.feedbackAt || b.date || '');
      return timeB.localeCompare(timeA) || String(b.date || '').localeCompare(String(a.date || '')) || String(b.id || '').localeCompare(String(a.id || ''));
    })
    .map(row => ({
      id: row.id,
      trainingId: row.id,
      date: row.date || '',
      feedbackAt: row.feedbackAt || '',
      feedbackBy: row.feedbackBy.trim(),
      coachNotes: row.coachNotes.trim(),
      session: row.session || row.trainingType || '水上训练',
      stroke: row.stroke || '',
      athleteId: recordAthleteId(row) || athleteId,
      athleteName,
      readOnly: true,
      source: { collection: 'trainings', id: row.id },
    }));
  return typeof limit === 'number' && limit > 0 ? items.slice(0, limit) : items;
}

export function parentToday(data, day) {
  const { athleteId, athleteName, inScope } = resolveScope(data || {});
  const trainings = ordered((data?.trainings || []).filter(inScope));
  const swim = ordered((data?.swim || []).filter(inScope));
  const todayTrainings = trainings.filter(row => row.date === day && trainingFacts(row).occurred);
  const latestToday = todayTrainings.at(-1) || null;
  const latestTodayFacts = latestToday ? trainingFacts(latestToday) : null;
  const weekRange = practiceOverview(data || {}, day).week;
  const weekTrainings = trainings.filter(row => row.date >= weekRange.start && row.date <= day);
  const weekSummary = trainingSummary(weekTrainings);
  const knownMinutes = weekSummary.minutesCount > 0 ? weekSummary.minutes : null;
  const knownMeters = weekSummary.metersCount > 0 || weekSummary.knownMeters > 0 ? weekSummary.knownMeters : null;
  const latestScore = swim.filter(row => row.date <= day).at(-1) || null;
  const latestFeedback = coachFeedbackList(data, 1)[0] || null;
  const allPending = adminTasks(data || {}, day);
  const todayMinutes = latestTodayFacts?.minutes ?? null;
  const todayMeters = latestTodayFacts?.meters ?? (latestTodayFacts?.knownMeters > 0 ? latestTodayFacts.knownMeters : null);
  return {
    day,
    athleteId,
    athleteName,
    todayRecorded: todayTrainings.length > 0,
    todayStatus: todayTrainings.length > 0 ? '今日已记录训练' : '今日未记录',
    todayCount: todayTrainings.length,
    todayTraining: latestToday
      ? {
          id: latestToday.id,
          date: latestToday.date,
          session: latestToday.session || latestToday.trainingType || '水上训练',
          completionStatus: latestToday.completionStatus || '未记录',
          minutes: todayMinutes,
          meters: todayMeters,
          durationMinutes: todayMinutes,
          totalMeters: todayMeters,
        }
      : null,
    week: {
      start: weekRange.start,
      end: weekRange.end,
      count: weekSummary.count,
      minutes: knownMinutes,
      knownMeters,
      meters: knownMeters,
      unknownSets: weekSummary.unknownSets,
      summary: weekSummary,
    },
    latestScore: latestScore
      ? {
          id: latestScore.id,
          date: latestScore.date,
          distance: latestScore.distance,
          stroke: latestScore.stroke,
          poolLength: latestScore.poolLength,
          time: performanceLabel(latestScore),
          validityStatus: validityLabel(latestScore),
        }
      : null,
    latestFeedback,
    latestCoachFeedback: latestFeedback,
    pendingTasks: allPending.slice(0, 3),
    pending: allPending.slice(0, 3),
    pendingCount: allPending.length,
  };
}

const SEARCH_FIELDS = {
  trainings: ['date', 'session', 'trainingType', 'stroke', 'completionStatus', 'feeling', 'notes', 'coachNotes', 'focusSkills', 'intensity', 'discomfort'],
  swim: ['date', 'distance', 'stroke', 'poolLength', 'time', 'validityStatus', 'testItem', 'eventName', 'location', 'recordType', 'startType', 'timingMethod', 'notes', 'validityNote'],
  media: ['date', 'title', 'description', 'category'],
  reportDrafts: ['period', 'title', 'status', 'parentSummary', 'childFeeling', 'nextFocus', 'start', 'end'],
};

function matchesFields(row, keys, needle, extra = '') {
  for (const key of keys) {
    const val = row?.[key];
    if (val != null && val !== '' && String(val).toLowerCase().includes(needle)) return true;
  }
  return Boolean(extra && extra.toLowerCase().includes(needle));
}

export function searchAthleteRecords(data, q) {
  const { athleteId, athleteName, inScope } = resolveScope(data || {});
  const trainings = ordered((data?.trainings || []).filter(inScope)).reverse();
  const swim = ordered((data?.swim || []).filter(inScope)).reverse();
  const media = ordered((data?.media || []).filter(inScope)).reverse();
  const reportDrafts = [...(data?.reportDrafts || [])].filter(inScope).sort((a, b) => String(b.period || b.generatedAt || '').localeCompare(String(a.period || a.generatedAt || '')));
  const hasAnyRecords = trainings.length + swim.length + media.length + reportDrafts.length > 0;
  const query = typeof q === 'string' ? q.trim() : '';
  if (!query) {
    return {
      query: '',
      athleteId,
      athleteName,
      hasAnyRecords,
      total: 0,
      emptyState: 'none',
      groups: { trainings: [], swim: [], media: [], reportDrafts: [] },
    };
  }
  const needle = query.toLowerCase();
  const matchedTrainings = trainings
    .filter(row => matchesFields(row, SEARCH_FIELDS.trainings, needle))
    .map(row => {
      const facts = trainingFacts(row);
      return {
        id: row.id,
        collection: 'trainings',
        date: row.date || '日期未记录',
        title: `${row.date || '日期未记录'} · ${row.session || row.trainingType || '水上训练'}`,
        summary: [
          row.completionStatus || '完成情况未记录',
          row.stroke || null,
          facts.minutes != null ? `实际时长${facts.minutes}分钟` : '时长未记录',
          facts.meters != null ? `实际距离${facts.meters}米` : facts.knownMeters > 0 ? `已知距离${facts.knownMeters}米` : '距离未记录',
          row.coachNotes ? `教练原话：${row.coachNotes}` : null,
          row.notes ? `备注：${row.notes}` : null,
        ].filter(Boolean).join(' · '),
        source: { collection: 'trainings', id: row.id },
      };
    });

  const matchedSwim = swim
    .filter(row => matchesFields(row, SEARCH_FIELDS.swim, needle, `${row.distance || ''}${row.stroke || ''} ${performanceLabel(row)}`))
    .map(row => ({
      id: row.id,
      collection: 'swim',
      date: row.date || '日期未记录',
      title: `${row.date || '日期未记录'} · ${row.distance || ''}${row.stroke || ''} ${performanceLabel(row)}`,
      summary: [
        `${row.poolLength || '未知'}池`,
        validityLabel(row),
        row.testItem || null,
        row.eventName || null,
        row.notes || null,
      ].filter(Boolean).join(' · '),
      source: { collection: 'swim', id: row.id },
    }));

  const matchedMedia = media
    .filter(row => matchesFields(row, SEARCH_FIELDS.media, needle))
    .map(row => ({
      id: row.id,
      collection: 'media',
      date: row.date || '日期未记录',
      title: `${row.date || '日期未记录'} · ${row.title || '未命名素材'}`,
      summary: [
        row.type === 'video' ? '视频' : '照片',
        row.category || null,
        row.description || '说明未记录',
      ].filter(Boolean).join(' · '),
      source: { collection: 'media', id: row.id },
    }));

  const matchedReports = reportDrafts
    .filter(row => matchesFields(row, SEARCH_FIELDS.reportDrafts, needle))
    .map(row => ({
      id: row.id,
      collection: 'reportDrafts',
      date: row.period || row.start || '周期未记录',
      title: `${row.period || ''} · ${row.title || '成长报告'}`,
      summary: [
        row.status || '待确认',
        row.start && row.end ? `${row.start}—${row.end}` : null,
        row.parentSummary || null,
        row.nextFocus || null,
      ].filter(Boolean).join(' · '),
      source: { collection: 'reportDrafts', id: row.id },
    }));

  const total = matchedTrainings.length + matchedSwim.length + matchedMedia.length + matchedReports.length;
  const emptyReason = !hasAnyRecords ? 'no-records' : total === 0 ? 'no-match' : null;
  return {
    query,
    athleteId,
    athleteName,
    hasAnyRecords,
    total,
    emptyState: emptyReason,
    emptyReason,
    groups: {
      trainings: matchedTrainings,
      swim: matchedSwim,
      media: matchedMedia,
      reportDrafts: matchedReports,
    },
  };
}

export function reportOverview(data, report) {
  if (!report || typeof report !== 'object') return null;
  const { athleteId, athleteName } = resolveScope(data || {});
  const f = report.facts || {};
  const training = f.training || {};
  const scores = Array.isArray(f.scores) ? f.scores : [];
  const validScores = scores.filter(s => s?.validityStatus === '有效');
  const pbEvents = Array.isArray(f.pbEvents) ? f.pbEvents : [];
  const skills = Array.isArray(f.skills) ? f.skills : [];
  const goals = Array.isArray(f.goals) ? f.goals : [];
  const milestones = Array.isArray(f.milestones) ? f.milestones : [];
  const media = Array.isArray(f.media) ? f.media : [];
  const trainingCount = typeof training.count === 'number' ? training.count : 0;
  const trainingRecordsCount = typeof training.records === 'number' ? training.records : 0;
  const knownMinutes = training.minutesCount > 0 && typeof training.minutes === 'number' ? training.minutes : null;
  const knownMeters = (training.metersCount > 0 || training.knownMeters > 0) && typeof training.knownMeters === 'number' ? training.knownMeters : null;
  const stale = Boolean(data && reportStale(data, report));
  const trainingSampleSufficient = trainingCount >= 2;
  const scoreSampleSufficient = validScores.length >= 2;
  const sampleSufficient = trainingSampleSufficient && scoreSampleSufficient;
  const sampleStatus = sampleSufficient ? '样本充足' : '样本不足';
  const sampleNote = !trainingSampleSufficient && !scoreSampleSufficient
    ? '本周期实际训练与有效成绩均少于2条，样本不足，仅呈现已记录事实，不作趋势结论。'
    : !trainingSampleSufficient
      ? '本周期实际训练少于2次，训练样本不足，不推导训练负荷变化结论。'
      : !scoreSampleSufficient
        ? '本周期有效成绩少于2条，成绩样本不足，不推导成绩趋势结论。'
        : '本周期实际训练与有效成绩已达2条及以上，可结合来源记录核对阶段变化。';

  return {
    id: report.id || '',
    athleteId,
    athleteName,
    title: report.title || '成长报告',
    periodType: report.periodType || 'month',
    period: report.period || '',
    start: report.start || '',
    end: report.end || '',
    status: report.status || '待确认',
    version: report.version ?? 1,
    stale,
    trainingCount,
    trainingRecordsCount,
    knownMinutes,
    knownMeters,
    totalMinutes: knownMinutes,
    totalMeters: knownMeters,
    unknownSets: training.unknownSets ?? 0,
    scoresCount: scores.length,
    validScoresCount: validScores.length,
    pbCount: pbEvents.length,
    mediaCount: media.length,
    confirmedAssessmentsCount: skills.length,
    pendingAssessmentsCount: typeof f.pendingAssessments === 'number' ? f.pendingAssessments : 0,
    goalsCount: goals.length,
    confirmedGoalsCount: goals.filter(g => g?.confirmedInPeriod).length,
    confirmedMilestonesCount: milestones.length,
    pendingMilestonesCount: typeof f.pendingMilestones === 'number' ? f.pendingMilestones : 0,
    trainingSampleSufficient,
    scoreSampleSufficient,
    sampleSufficient,
    sampleStatus,
    sampleNotice: sampleStatus,
    sampleNote,
    conclusion: null,
  };
}

function sanitizeFilenamePart(value, fallback) {
  const raw = String(value || fallback);
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);
    if (code < 32 || '/\\:*?"<>|'.includes(ch)) {
      out += '-';
    } else {
      out += ch;
    }
  }
  const collapsed = out.replace(/-+/g, '-').replace(/^-|-$/g, '').trim();
  return collapsed || fallback;
}

export function safeReportFilename(athleteName, period, { unsaved = false } = {}) {
  const cleanAthlete = sanitizeFilenamePart(athleteName, 'Nico');
  const cleanPeriod = sanitizeFilenamePart(period, '未定周期');
  return `${cleanAthlete}-${cleanPeriod}-成长报告${unsaved ? '-未保存预览' : ''}.html`;
}

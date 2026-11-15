import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { emptyState } from '../shared/domain.mjs';
import { scopeStateForAthlete } from '../shared/athletes-coaches.mjs';
import { saveGrowth } from '../shared/growth-records.mjs';
import {
  parentToday,
  coachFeedbackList,
  searchAthleteRecords,
  reportOverview,
  safeReportFilename,
} from '../shared/parent-experience.mjs';
import { checkBundleBudget } from '../scripts/check-bundle-budget.mjs';

test('parentToday：今日未记录与缺失测量值保持 null，不补 0；显式 0 原样保留', () => {
  const data = emptyState();
  data.profile = { ...data.profile, id: 'athlete-a', name: '安安', displayName: '安安' };
  const emptyToday = parentToday(data, '2026-11-14');
  assert.equal(emptyToday.athleteId, 'athlete-a');
  assert.equal(emptyToday.athleteName, '安安');
  assert.equal(emptyToday.todayRecorded, false);
  assert.equal(emptyToday.todayStatus, '今日未记录');
  assert.equal(emptyToday.todayTraining, null);
  assert.equal(emptyToday.week.count, 0);
  assert.equal(emptyToday.week.minutes, null);
  assert.equal(emptyToday.week.meters, null);
  assert.equal(emptyToday.latestCoachFeedback, null);

  data.trainings = [
    {
      id: 'tr-missing',
      date: '2026-11-14',
      session: '周六早训',
      completionStatus: '已完成',
      durationMinutes: null,
      totalMeters: null,
    },
  ];
  const withMissing = parentToday(data, '2026-11-14');
  assert.equal(withMissing.todayRecorded, true);
  assert.equal(withMissing.todayStatus, '今日已记录训练');
  assert.equal(withMissing.todayTraining.durationMinutes, null);
  assert.equal(withMissing.todayTraining.totalMeters, null);
  assert.equal(withMissing.week.count, 1);
  assert.equal(withMissing.week.minutes, null);
  assert.equal(withMissing.week.meters, null);

  data.trainings = [
    {
      id: 'tr-zero',
      date: '2026-11-14',
      session: '陆上激活',
      completionStatus: '已完成',
      durationMinutes: 0,
      totalMeters: 0,
    },
  ];
  const withZero = parentToday(data, '2026-11-14');
  assert.equal(withZero.todayTraining.durationMinutes, 0);
  assert.equal(withZero.todayTraining.totalMeters, 0);
  assert.equal(withZero.week.minutes, 0);
  assert.equal(withZero.week.meters, 0);
});

test('coachFeedbackList：仅展示含 feedbackBy 的真实教练反馈，按时间倒序且限制条数', () => {
  const data = emptyState();
  data.profile = { ...data.profile, id: 'nico', name: 'Nico', displayName: 'Nico' };
  data.trainings = [
    { id: 't-parent-only', date: '2026-11-14', coachNotes: '家长自己记的转述，无教练账号签名' },
    { id: 't-coach-empty', date: '2026-11-13', feedbackBy: 'coach-wang', coachNotes: '   ' },
    { id: 't-1', date: '2026-11-10', session: '周二训', stroke: '自由泳', feedbackBy: '王教练', feedbackAt: '2026-11-10T12:00:00Z', coachNotes: '高肘抱水稳定' },
    { id: 't-2', date: '2026-11-12', session: '周四训', stroke: '仰泳', feedbackBy: '李教练', feedbackAt: '2026-11-12T12:00:00Z', coachNotes: '转身流线型需收紧' },
    { id: 't-3', date: '2026-11-13', session: '周五训', stroke: '蛙泳', feedbackBy: '王教练', feedbackAt: '2026-11-13T12:00:00Z', coachNotes: '蹬夹节奏清晰' },
    { id: 't-4', date: '2026-11-14', session: '周六训', stroke: '蝶泳', feedbackBy: '张教练', feedbackAt: '2026-11-14T12:00:00Z', coachNotes: '第二次打腿更有力' },
  ];

  const list = coachFeedbackList(data, 3);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map(item => item.id), ['t-4', 't-3', 't-2']);
  assert.equal(list[0].athleteName, 'Nico');
  assert.equal(list[0].feedbackBy, '张教练');
  assert.equal(list[0].readOnly, true);
  assert.deepEqual(list[0].source, { collection: 'trainings', id: 't-4' });
});

test('searchAthleteRecords：严格按当前运动员隔离，区分无记录与无匹配，且不泄露私有路径', () => {
  const raw = emptyState();
  raw.athletes = [
    { id: 'nico', name: 'Nico', displayName: 'Nico' },
    { id: 'leo', name: 'Leo', displayName: 'Leo' },
  ];
  raw.trainings = [
    { id: 'tr-nico', athleteId: 'nico', date: '2026-11-10', session: '自由泳专项', coachNotes: '专属机密备注Nico' },
    { id: 'tr-leo', athleteId: 'leo', date: '2026-11-11', session: '蛙泳打腿', coachNotes: 'Leo蹬夹配合' },
  ];
  raw.swim = [
    { id: 'sw-nico', athleteId: 'nico', date: '2026-11-10', distance: '50m', stroke: '自由泳', poolLength: '25m', time: '00:35.20', timeMs: 35200, validityStatus: '有效' },
  ];
  raw.media = [
    { id: 'md-leo', athleteId: 'leo', date: '2026-11-11', title: 'Leo水下出发视频', type: 'video', filePath: '/private/uploads/secret-leo.mp4', url: '/uploads/secret-leo.mp4' },
  ];
  raw.reportDrafts = [
    { id: 'rp-leo', athleteId: 'leo', period: '2026-11', periodType: 'month', title: 'Leo十一月报告', status: '待确认', parentSummary: '稳步适应' },
  ];

  const leoScoped = scopeStateForAthlete(raw, 'leo');
  const leakCheck = searchAthleteRecords(leoScoped, '专属机密备注Nico');
  assert.equal(leakCheck.total, 0);
  assert.equal(leakCheck.hasAnyRecords, true);
  assert.equal(leakCheck.emptyReason, 'no-match');

  const leoHit = searchAthleteRecords(leoScoped, 'Leo');
  assert.equal(leoHit.total, 3);
  assert.equal(leoHit.groups.trainings.length, 1);
  assert.equal(leoHit.groups.media.length, 1);
  assert.equal(leoHit.groups.reportDrafts.length, 1);
  assert.equal('filePath' in leoHit.groups.media[0], false);
  assert.equal('url' in leoHit.groups.media[0], false);
  assert.ok(!JSON.stringify(leoHit).includes('/private/uploads/'));

  const emptyAthleteScoped = scopeStateForAthlete(
    {
      ...raw,
      athletes: [...raw.athletes, { id: 'mia', name: 'Mia', displayName: 'Mia' }],
    },
    'mia'
  );
  const emptyCheck = searchAthleteRecords(emptyAthleteScoped, '自由泳');
  assert.equal(emptyCheck.total, 0);
  assert.equal(emptyCheck.hasAnyRecords, false);
  assert.equal(emptyCheck.emptyReason, 'no-records');
});

test('reportOverview & safeReportFilename：样本不足不作趋势结论，缺失值保持 null，过期状态诚实', () => {
  const data = emptyState();
  data.profile = { ...data.profile, id: 'nico', name: 'Nico', displayName: 'Nico/测试:2026' };
  data.trainings = [{ id: 'tr-1', date: '2026-11-02', completionStatus: '已完成', durationMinutes: null, totalMeters: null }];
  const report = saveGrowth(
    data,
    'reportDrafts',
    {
      title: '11月成长报告',
      periodType: 'month',
      period: '2026-11',
      parentSummary: '保持水感',
      childFeeling: '水里很开心',
      nextFocus: '练习呼吸节奏',
      selectedMediaIds: [],
    },
    { id: 'rep-1', actor: 'protocol-parent', now: '2026-11-14T10:00:00Z' }
  );

  const overview = reportOverview(data, report);
  assert.equal(overview.athleteName, 'Nico/测试:2026');
  assert.equal(overview.trainingCount, 1);
  assert.equal(overview.totalMinutes, null);
  assert.equal(overview.totalMeters, null);
  assert.equal(overview.validScoresCount, 0);
  assert.equal(overview.sampleSufficient, false);
  assert.equal(overview.sampleNotice, '样本不足');
  assert.equal(overview.conclusion, null);
  assert.equal(overview.stale, false);

  data.trainings.push({ id: 'tr-2', date: '2026-11-05', completionStatus: '已完成', durationMinutes: 45, totalMeters: 1200 });
  const staleOverview = reportOverview(data, report);
  assert.equal(staleOverview.stale, true);

  assert.equal(safeReportFilename('Nico/测试:2026', '2026-11', { unsaved: false }), 'Nico-测试-2026-2026-11-成长报告.html');
  assert.equal(safeReportFilename('Nico', '2026-11', { unsaved: true }), 'Nico-2026-11-成长报告-未保存预览.html');
});

test('checkBundleBudget：拦截首屏 ffmpeg / pdf-document 与超预算构建产物', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-bundle-test-'));
  try {
    const assetsDir = path.join(tmpDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'index-abc.js'), 'console.log("hello");\n');
    fs.writeFileSync(
      path.join(tmpDir, 'index.html'),
      '<!doctype html><html><head><script type="module" src="/Nico/assets/index-abc.js"></script></head><body></body></html>'
    );
    const okResult = checkBundleBudget({ distDir: tmpDir });
    assert.equal(okResult.ok, true);

    fs.writeFileSync(path.join(assetsDir, 'ffmpeg-heavy.js'), 'console.log("ffmpeg");\n');
    fs.writeFileSync(
      path.join(tmpDir, 'index.html'),
      '<!doctype html><html><head><script type="module" src="/Nico/assets/index-abc.js"></script><link rel="modulepreload" href="/Nico/assets/ffmpeg-heavy.js"></head><body></body></html>'
    );
    assert.throws(() => checkBundleBudget({ distDir: tmpDir }), /ffmpeg/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

import {adminTasks} from '../../shared/admin-tasks.mjs';
import { eligiblePerformance, performanceMilliseconds } from '../../shared/performance.ts';
import { analysis, planContext, ordered } from '../../shared/domain.mjs';
import { practiceOverview } from '../../shared/practice.mjs';
import { trainingFacts, trainingSummary } from '../../shared/training.ts';
import { draftScopeKey } from './drafts.js';
import { growthCollection } from '../../shared/growth-model.ts';
export const managementSaveRequiresSnapshot = collection => collection === 'plans' || growthCollection(collection);
export const MANAGEMENT_NAV = [
  { key: 'workbench', label: '工作台', views: [['home', '工作台'], ['setup','首次使用引导'], ['tasks','待办中心']] },
  { key: 'training', label: '训练记录', views: [['trainings', '日常训练'], ['swim', '成绩'], ['plans', '训练计划'], ['competitions', '赛事'], ['calendar', '训练日历'], ['media', '影像关联']] },
  { key: 'growth', label: '成长管理', views: [['skills', '技能工作区'], ['practice', '技术短板与打卡'], ['goals', '目标与里程碑']] },
  { key: 'review', label: '分析复盘', views: [['cockpit','阶段驾驶舱'], ['quality', '数据质量'], ['timeline', '成长时间轴'], ['trends', '历史趋势'], ['reports', '周期报告'], ['yearbooks','年度纪念册'], ['media', '视频技术复盘'], ['compare', '视频对比'], ['archive', '成长档案']] },
];
export const SETTINGS_VIEWS = [['profile', '基础档案'], ['publishing', '公开展示'], ['backup', '备份与回收'], ['privateArchive','私人年度归档'], ['standards', '技能标准'], ['health', '运行健康'], ['child', '孩子的成长页']];
const home = () => ({ section: 'workbench', view: 'home' });
export function sanitizeLocation(value) {
  const views = value?.section === 'settings' ? SETTINGS_VIEWS : MANAGEMENT_NAV.find(item => item.key === value?.section)?.views;
  if (views?.some(([key]) => key === value?.view) || value?.section === 'review' && ['growth', 'fitness', 'nutrition'].includes(value?.view)) return { section: value.section, view: value.view };
  return home();
}
export function resolveManagementLocation(tab, type) {
  if (MANAGEMENT_NAV.some(item => item.key === tab) || tab === 'settings') return sanitizeLocation({ section: tab, view: type || (tab === 'settings' ? 'profile' : MANAGEMENT_NAV.find(item => item.key === tab).views[0][0]) });
  if (tab === 'week') return { section: 'training', view: 'plans' };
  if (tab === 'practice') return { section: 'growth', view: 'practice' };
  if (tab === 'profile') return { section: 'settings', view: 'profile' };
  if (tab === 'records') return ['growth', 'fitness', 'nutrition'].includes(type) ? { section: 'review', view: type } : { section: 'training', view: type === 'swim' ? 'swim' : 'trainings' };
  if (tab === 'review') return { section: 'review', view: type === 'media' ? 'media' : 'reports' };
  return home();
}
export function createManagementPosition({ scope, storage, isCurrent = () => true } = {}) {
  try { storage ??= globalThis.sessionStorage; } catch { /* Navigation still works in memory. */ }
  const identity = draftScopeKey(scope), key = `nico.management.position.v1:${identity}`;
  return {
    read() { try { if (!identity || !isCurrent(scope)) return home(); return sanitizeLocation(JSON.parse(storage?.getItem(key) || 'null')); } catch { return home(); } },
    write(value) { try { if (identity && isCurrent(scope)) storage?.setItem(key, JSON.stringify(sanitizeLocation(value))); } catch { /* No facts are stored here. */ } },
  };
}
export function workbenchModel(data, day) {
  const pending = adminTasks(data,day);
  const week = practiceOverview(data, day).week, result = analysis(data), context = planContext(data, day, result.version);
  const actual = ordered(data.trainings).filter(row => row.date <= day && trainingFacts(row).occurred);
  const latestScore = ordered(data.swim).filter(row => row.date <= day).at(-1);
  const peers = latestScore && eligiblePerformance(latestScore) ? ordered(data.swim).filter(row => row.date <= day && eligiblePerformance(row) && ['distance','stroke','poolLength'].every(key => row[key] === latestScore[key])) : [];
  const scoreChange = peers.length >= 2 ? { current: peers.at(-1), previous: peers.at(-2), deltaMs: performanceMilliseconds(peers.at(-1)) - performanceMilliseconds(peers.at(-2)) } : null;
  return { pending, week, scoreChange, summary: trainingSummary(data.trainings.filter(row => row.date >= week.start && row.date <= day)), goals: (data.goals || []).filter(row => row.status === '进行中'), latestTraining: actual.at(-1) || null, recentScores: ordered(data.swim).filter(row => row.date <= day).reverse().slice(0, 3), focus: context.current?.focus || result.focus, confirmedFocus: !!context.current };
}

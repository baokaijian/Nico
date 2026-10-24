// 成绩计时条件的展示辅助（V1.7 UX 优化）。本模块不在 Edge 函数依赖图内：
// 云端函数未部署 1.7.1 校验白名单前，裁决字段写入会被旧API拒绝，界面按部署状态提示。
import { performanceMilliseconds } from './performance.ts';
const SCORE_CONDITION_LABELS = { startType: '出发方式', timingMethod: '计时方式', recordType: '记录性质', poolLength: '池长' };
export const scoreConditionLabel = key => SCORE_CONDITION_LABELS[key] || key;
export const missingScoreConditions = row => ['startType', 'timingMethod', 'recordType', 'poolLength'].filter(key => !row?.[key] || ['未知', '其他'].includes(row[key]));
// 口语化辅注：56.17秒 / 1分02.05秒。主显示保持分:秒:百分秒与整数毫秒不变。
export function readablePerformance(record, field = 'time') {
  const ms = performanceMilliseconds(record, field);
  if (ms === null) return '';
  const seconds = ms / 1000;
  return seconds < 60 ? `${seconds.toFixed(2)}秒` : `${Math.floor(seconds / 60)}分${(seconds % 60).toFixed(2).padStart(5, '0')}秒`;
}

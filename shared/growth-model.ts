// Internal growth records: deliberately independent from training totals and official grades.
export const SKILL_DIMENSIONS = ['水中安全', '呼吸及水感', '自由泳', '仰泳', '蛙泳', '蝶泳', '出发和转身', '训练行为'] as const;
export const SKILL_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
export const GOAL_STATUSES = ['待确认', '进行中', '已达成', '暂停', '已归档'] as const;
export const GROWTH_COLLECTIONS = ['skillDefinitions', 'skillAssessments', 'goals', 'milestones', 'growthStories', 'reportDrafts', 'competitionEvents', 'videoComparisons', 'childViews', 'childReflections', 'yearbooks'] as const;
export const EVIDENCE_COLLECTIONS = ['swim', 'trainings', 'media', 'annotations', 'skillAssessments', 'checkins'] as const;
export type SkillDimension = typeof SKILL_DIMENSIONS[number];
export type SkillLevel = typeof SKILL_LEVELS[number];
export type GrowthCollection = typeof GROWTH_COLLECTIONS[number];
export type EvidenceCollection = typeof EVIDENCE_COLLECTIONS[number];
export type ObjectRecord = Record<string, unknown>;
export interface EvidenceRef { collection: EvidenceCollection; id: string }
export interface SkillDefinition extends ObjectRecord { name: string; dimension: SkillDimension; levels: Record<SkillLevel, string>; status: '启用' | '停用'; reviewedBy: string }
export interface SkillAssessment extends ObjectRecord { skillId: string; definitionVersion: number; date: string; assessor: string; level: SkillLevel; status: string; evidenceNote: string; evidenceRefs: EvidenceRef[]; improvementNote: string; previousAssessmentId: string; weakPointId: string; checkinIds: string[] }
export const failGrowth = (message: string, status = 400): never => { throw Object.assign(new Error(message), { status }); };
export function objectRecord(value: unknown, label = '记录'): ObjectRecord { if (!value || typeof value !== 'object' || Array.isArray(value)) return failGrowth(`${label}格式无效`); return value as ObjectRecord; }
export function growthCollection(key: string, record?: ObjectRecord): boolean { return GROWTH_COLLECTIONS.includes(key as GrowthCollection) && (key !== 'goals' || record === undefined || record.modelVersion === 1); }
export function growthText(value: unknown, label: string, required = false, max = 4000): string {
  if (value == null || value === '') { if (required) return failGrowth(`请填写${label}`); return ''; }
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) return failGrowth(`${label}格式无效`);
  return value.trim();
}
export function growthDate(value: unknown, label = '日期'): string {
  const text = growthText(value, label, true, 10); const parsed = new Date(`${text}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) return failGrowth(`${label}无效`);
  return text;
}
export function growthId(value: unknown, label = '记录ID', required = true): string { const text = growthText(value, label, required, 100); if (text && !/^[A-Za-z0-9_-]{1,100}$/.test(text)) return failGrowth(`${label}格式无效`); return text; }
function choice<const T extends readonly string[]>(value: unknown, values: T, label: string): T[number] { if (typeof value !== 'string' || !values.includes(value)) return failGrowth(`${label}无效`); return value as T[number]; }
export function growthIds(value: unknown, label: string): string[] { if (value == null) return []; if (!Array.isArray(value) || value.length > 100) return failGrowth(`${label}格式无效`); const ids = value.map(x => growthId(x, label)); if (new Set(ids).size !== ids.length) return failGrowth(`${label}重复`); return ids; }
export function evidenceRefs(value: unknown): EvidenceRef[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100) return failGrowth('证据引用格式无效');
  const refs = value.map(item => { const ref = objectRecord(item, '证据'); if (Object.keys(ref).some(key => !['collection', 'id'].includes(key))) return failGrowth('证据引用包含不支持的字段'); return { collection: choice(ref.collection, EVIDENCE_COLLECTIONS, '证据类型'), id: growthId(ref.id, '证据ID') }; });
  if (new Set(refs.map(ref => `${ref.collection}/${ref.id}`)).size !== refs.length) return failGrowth('证据引用重复'); return refs;
}
const fields: Record<string, string[]> = {
  yearbooks: ['title','year','reportId','theme','parentMessage','childMessage','sectionOrder','selectedMediaIds'],
  childViews: ['title','theme','selectedMediaIds','status'],
  childReflections: ['date','viewId','trainingId','mood','text','status'],
  skillDefinitions: ['name', 'dimension', 'levels', 'status', 'reviewedBy', 'notes'],
  skillAssessments: ['skillId', 'definitionVersion', 'date', 'assessor', 'level', 'status', 'evidenceNote', 'evidenceRefs', 'improvementNote', 'previousAssessmentId', 'weakPointId', 'checkinIds'],
  goals: ['title', 'category', 'targetMetric', 'deadline', 'status', 'currentProgress', 'ruleSource', 'reviewedBy', 'notes', 'baselineText', 'baselineRefs', 'targetResult', 'criteria', 'relatedTrainingIds', 'relatedSkillIds', 'targetSkillLevel'],
  milestones: ['title', 'date', 'status', 'evidenceNote', 'evidenceRefs', 'notes'],
  growthStories: ['title', 'date', 'body', 'status', 'evidenceRefs'],
  videoComparisons: ['title', 'date', 'leftMediaId', 'rightMediaId', 'leftSecond', 'rightSecond', 'mode', 'rate', 'observation', 'skillId', 'assessmentId', 'notes'],
  competitionEvents: ['name', 'date', 'eventType', 'poolLength', 'performanceIds', 'mediaIds', 'certificateIds', 'notes', 'review', 'awards'],
  reportDrafts: ['title', 'periodType', 'period', 'parentSummary', 'childFeeling', 'nextFocus', 'selectedMediaIds'],
};
export function editableGrowth(key: string, value: ObjectRecord): ObjectRecord { return Object.fromEntries((fields[key] || []).filter(field => value[field] !== undefined).map(field => [field, value[field]])); }
function parseGrowth(key: string, input: ObjectRecord, stored = false): ObjectRecord {
  const result: ObjectRecord = { modelVersion: 1 };
  if(key==='yearbooks') {
    const year=growthText(input.year,'纪念册年份',true,4);if(!/^(?:19|20|21)\d{2}$/.test(year))return failGrowth('年份须为1900–2199');
    const sections=['training','scores','skills','competitions','milestones','media','messages'],order=growthIds(input.sectionOrder,'章节顺序');if(order.length!==sections.length||sections.some(k=>!order.includes(k)))return failGrowth('须保留全部章节，可调整顺序');
    const ids=growthIds(input.selectedMediaIds,'精选素材');if(ids.length>12)return failGrowth('纪念册最多选择12份影像');
    Object.assign(result,{title:growthText(input.title,'纪念册标题',true,200),year,reportId:growthId(input.reportId,'年度报告'),theme:growthText(input.theme,'年度成长主题',true,500),parentMessage:growthText(input.parentMessage,'家长寄语',false,12000),childMessage:growthText(input.childMessage,'孩子成长感言',false,12000),sectionOrder:order,selectedMediaIds:ids,status:stored?choice(input.status,['待确认','已确认'],'纪念册状态'):'待确认'});
  } else if (key === 'childViews') {
    const selectedMediaIds=growthIds(input.selectedMediaIds,'精选照片');if(selectedMediaIds.length>12)return failGrowth('儿童页最多选择12张照片');
    Object.assign(result,{title:growthText(input.title,'儿童页标题',true,100),theme:growthText(input.theme,'当前成长主题',true,500),selectedMediaIds,status:choice(input.status||'停用',['启用','停用'],'儿童页状态')});
  } else if (key === 'childReflections') {
    const status=choice(input.status||'待确认',['待确认','已确认'],'感受状态');if(!stored&&status!=='待确认')return failGrowth('孩子感受须由家长独立确认');
    Object.assign(result,{date:growthDate(input.date),viewId:growthId(input.viewId,'儿童页'),trainingId:growthId(input.trainingId,'关联训练',false),mood:choice(input.mood,['开心','平静','有点累','想再试试','不想说'],'本次心情'),text:growthText(input.text,'孩子的一句话',input.mood!=='不想说',500),status});
  } else if (key === 'skillDefinitions') {
    const rawLevels = objectRecord(input.levels, '五级标准');
    if (Object.keys(rawLevels).length !== 5 || SKILL_LEVELS.some(level => !Object.hasOwn(rawLevels, level))) return failGrowth('须完整配置L1–L5五级标准');
    const status = choice(input.status || '停用', ['启用', '停用'], '标准状态');
    Object.assign(result, { name: growthText(input.name, '技能名称', true, 100), dimension: choice(input.dimension, SKILL_DIMENSIONS, '能力维度'), levels: Object.fromEntries(SKILL_LEVELS.map(level => [level, growthText(rawLevels[level], `${level}等级标准`, true, 1000)])), status, reviewedBy: growthText(input.reviewedBy, '标准审核人', status === '启用', 100), notes: growthText(input.notes, '适用说明') });
  } else if (key === 'skillAssessments') {
    const status = choice(input.status || '待确认', ['待确认', '已确认', '已撤销'], '评估状态');
    if (!stored && status !== '待确认') return failGrowth('确认或撤销评估须使用明确的人工操作');
    const version = input.definitionVersion;
    if (!Number.isSafeInteger(version) || Number(version) < 1) return failGrowth('请选择明确的标准版本');
    Object.assign(result, { skillId: growthId(input.skillId, '技能'), definitionVersion: version, date: growthDate(input.date), assessor: growthText(input.assessor, '评估人', true, 100), level: choice(input.level, SKILL_LEVELS, '人工测评等级'), status, evidenceNote: growthText(input.evidenceNote, '评估证据与观察', true), evidenceRefs: evidenceRefs(input.evidenceRefs), improvementNote: growthText(input.improvementNote, '改进说明'), previousAssessmentId: growthId(input.previousAssessmentId, '前次评估', false), weakPointId: growthId(input.weakPointId, '技术短板', false), checkinIds: growthIds(input.checkinIds, '关联打卡') });
  } else if (key === 'goals') {
    const status = choice(input.status || '待确认', GOAL_STATUSES, '目标状态');
    if (!stored && ['已达成', '已归档'].includes(status)) return failGrowth('完成确认和归档须使用明确的人工操作');
    const targetSkillLevel = input.targetSkillLevel ? choice(input.targetSkillLevel, SKILL_LEVELS, '目标技能等级') : '';
    const skillIds = growthIds(input.relatedSkillIds, '关联技能');
    if (targetSkillLevel && !skillIds.length) return failGrowth('目标技能等级须关联明确技能');
    Object.assign(result, { title: growthText(input.title, '目标名称', true, 200), category: growthText(input.category, '目标类别', false, 100), targetMetric: growthText(input.targetMetric, '原个人目标'), baselineText: growthText(input.baselineText, '起始能力或成绩', true), baselineRefs: evidenceRefs(input.baselineRefs), targetResult: growthText(input.targetResult, '目标结果', true), deadline: growthDate(input.deadline, '目标截止日期'), criteria: growthText(input.criteria, '可验证达成标准', true), relatedTrainingIds: growthIds(input.relatedTrainingIds, '关联训练'), relatedSkillIds: skillIds, targetSkillLevel, status, ruleSource: growthText(input.ruleSource, '规则来源'), reviewedBy: growthText(input.reviewedBy, '目标复核人', false, 100), notes: growthText(input.notes, '备注') });
    if (input.currentProgress != null && input.currentProgress !== '') { if (typeof input.currentProgress !== 'number' || !Number.isFinite(input.currentProgress) || input.currentProgress < 0 || input.currentProgress > 100) return failGrowth('手动进度须在0–100范围'); result.currentProgress = input.currentProgress; }
  } else if (key === 'milestones') {
    const status = choice(input.status || '待确认', ['待确认', '已确认'], '里程碑状态');
    if (!stored && status !== '待确认') return failGrowth('里程碑须由家长明确确认');
    Object.assign(result, { title: growthText(input.title, '里程碑名称', true, 250), date: growthDate(input.date), status, evidenceNote: growthText(input.evidenceNote, '成长证据', true), evidenceRefs: evidenceRefs(input.evidenceRefs), notes: growthText(input.notes, '备注') });
  } else if (key === 'growthStories') {
    const status = choice(input.status || '待确认', ['待确认', '已确认'], '故事状态');
    if (!stored && status !== '待确认') return failGrowth('成长故事须单独人工确认');
    Object.assign(result, { title: growthText(input.title, '故事标题', true, 200), date: growthDate(input.date), body: growthText(input.body, '实际成长观察', true, 12000), status, evidenceRefs: evidenceRefs(input.evidenceRefs) });
  } else if (key === 'reportDrafts') {
    const periodType = choice(input.periodType, ['month', 'year'], '报告模式'), period = growthText(input.period, '报告周期', true, 7);
    if (!(periodType === 'month' ? /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/ : /^(?:19|20|21)\d{2}$/).test(period)) return failGrowth('报告周期无效');
    Object.assign(result, { title: growthText(input.title, '报告标题', true, 200), periodType, period, parentSummary: growthText(input.parentSummary, '家长总结', false, 12000), childFeeling: growthText(input.childFeeling, '孩子的个人感受', false, 12000), nextFocus: growthText(input.nextFocus, '下阶段观察重点', false, 12000), selectedMediaIds: growthIds(input.selectedMediaIds, '精选影像') });
  } else if (key === 'competitionEvents') {
    Object.assign(result, { name: growthText(input.name, '赛事名称', true, 200), date: growthDate(input.date), eventType: choice(input.eventType, ['正式比赛', '交流赛', '测试赛', '其他'], '赛事类型'), poolLength: choice(input.poolLength, ['25m', '50m', '未知'], '赛事池长'), performanceIds: growthIds(input.performanceIds, '比赛成绩'), mediaIds: growthIds(input.mediaIds, '关联影像'), certificateIds: growthIds(input.certificateIds, '证书照片'), notes: growthText(input.notes, '备注'), review: growthText(input.review, '比赛复盘', false, 12000), awards: growthText(input.awards, '奖项（依据实际凭证）') });
  } else if (key === 'videoComparisons') {
    const seconds = (value: unknown) => { if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d{1,3})?$/.test(value))) || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 86400) return failGrowth('对比时间点须为0–86400秒，最多三位小数'); return Number(value); };
    const rate = Number(input.rate); if (![0.5, 0.75, 1].includes(rate)) return failGrowth('播放速度仅支持0.5x、0.75x、1x');
    Object.assign(result, { title: growthText(input.title, '对比标题', true, 200), date: growthDate(input.date), leftMediaId: growthId(input.leftMediaId, '视频A'), rightMediaId: growthId(input.rightMediaId, '视频B'), leftSecond: seconds(input.leftSecond), rightSecond: seconds(input.rightSecond), mode: choice(input.mode, ['同步', '独立'], '播放模式'), rate, observation: growthText(input.observation, '手工技术观察', true, 12000), skillId: growthId(input.skillId, '技能标准', false), assessmentId: growthId(input.assessmentId, '技能测评', false), notes: growthText(input.notes, '证据限制与备注'), status: '人工观察' });
    if (result.leftMediaId === result.rightMediaId) return failGrowth('请选择两个不同的真实视频');
  } else return failGrowth('不支持的成长集合');
  return result;
}
export function validateGrowthInput(key: string, raw: unknown, previous: ObjectRecord | null = null): ObjectRecord {
  const input = objectRecord(raw);
  if (!fields[key]) return failGrowth('不支持的成长集合');
  if (Object.keys(input).some(field => ![...fields[key]!, 'modelVersion', 'clientRequestId'].includes(field))) return failGrowth('成长记录包含不支持的字段；归属、版本及确认信息由服务端维护');
  if (input.modelVersion !== undefined && input.modelVersion !== 1) return failGrowth('不支持的成长模型版本');
  if (previous?.modelVersion === 1 && ['已确认', '已撤销', '已达成', '已归档'].includes(String(previous.status)) && key !== 'skillDefinitions') return failGrowth('此记录已确认或归档；请先撤销或重新开启，历史将保留');
  return { ...previous, ...parseGrowth(key, { ...(previous ? editableGrowth(key, previous) : {}), ...input }) };
}
function iso(value: unknown): boolean { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
export function validateStoredGrowth(key: string, raw: unknown): void {
  const record = objectRecord(raw);
  if (key === 'goals' && record.modelVersion !== 1) return;
  if (record.modelVersion !== 1 || record.athleteId !== 'nico' || !Number.isSafeInteger(record.version) || Number(record.version) < 1 || !iso(record.updatedAt) || !growthText(record.updatedBy, '修改人', true, 100)) return failGrowth('成长记录版本或归属元数据无效');
  growthId(record.id);
  if (record.createdAt !== undefined && (!iso(record.createdAt) || !growthText(record.createdBy, '创建人', true, 100))) return failGrowth('成长创建信息无效');
  if (key !== 'goals' && record.createdAt === undefined) return failGrowth('新成长实体缺少创建信息');
  parseGrowth(key, {...editableGrowth(key, record),...(key==='yearbooks'?{status:record.status}:{})}, true);
  if (['已确认', '已达成', '已归档'].includes(String(record.status)) && key !== 'skillDefinitions') {
    if (!iso(record.confirmedAt) || !growthText(record.confirmedBy, '确认人', true, 100) || !growthText(record.confirmedActor, '确认账号', true, 100)) return failGrowth('成长记录缺少人工确认信息');
    growthText(record.confirmationNote, '人工确认说明', true);
  }
  if (record.status === '已归档' && (!iso(record.archivedAt) || !growthText(record.archivedBy, '归档人', true, 100))) return failGrowth('目标归档信息无效');
  if (record.status === '已撤销' && (!iso(record.withdrawnAt) || !growthText(record.withdrawnBy, '撤销人', true, 100))) return failGrowth('评估撤销信息无效');
  if (record.status === '已撤销') growthText(record.withdrawalNote, '撤销说明', true);
  if (key === 'skillAssessments') {
    const snapshot = objectRecord(record.standardSnapshot, '评估标准快照');
    parseGrowth('skillDefinitions', editableGrowth('skillDefinitions', snapshot), true);
    if (snapshot.id !== record.skillId || snapshot.version !== record.definitionVersion) return failGrowth('评估标准快照不一致');
  }
  for (const [refKey, snapshotKey] of [['evidenceRefs', 'evidenceSnapshots'], ['baselineRefs', 'baselineSnapshots'], ['completionRefs', 'completionSnapshots']] as const) {
    if (record[refKey] === undefined) continue;
    const refs = evidenceRefs(record[refKey]), snapshots = record[snapshotKey];
    if (!Array.isArray(snapshots) || snapshots.length !== refs.length || snapshots.some((snapshot, index) => { const s = objectRecord(snapshot, '证据快照'); return s.collection !== refs[index]?.collection || s.id !== refs[index]?.id; })) return failGrowth('证据快照不一致');
  }
  if (key === 'goals' && ['已达成', '已归档'].includes(String(record.status)) && !evidenceRefs(record.completionRefs).length) return failGrowth('已达成目标缺少可验证证据');
  if (key === 'goals') {
    const ids = growthIds(record.relatedSkillIds, '关联技能'), snapshots = record.relatedSkillSnapshots;
    if (!Array.isArray(snapshots) || snapshots.length !== ids.length) return failGrowth('目标技能标准快照不一致');
    snapshots.forEach((snapshot, index) => { const item = objectRecord(snapshot); validateStoredGrowth('skillDefinitions', item); if (item.id !== ids[index]) failGrowth('目标技能标准快照不一致'); });
  }
}

export const INITIAL_SKILL_TEMPLATES = [
  { name: '水域规则与安全行为', dimension: '水中安全', status: '停用', reviewedBy: '', notes: '内部观察模板，使用前由家长结合教练意见调整并审核；不代表可独自下水。', levels: { L1: '在指导下认识本次水域的安全约定', L2: '能复述本次安全约定并在提示下遵守', L3: '在有人监督的本次活动中遵守约定', L4: '能在复核情境中识别需停止并求助的情况', L5: '在多次明确测评中稳定做到所确认的安全行为' } },
  { name: '自由泳动作与配合', dimension: '自由泳', status: '停用', reviewedBy: '', notes: '内部成长模板；测评任务、距离与器材由教练/家长明确记录，不预设训练量或授级条件。', levels: { L1: '在指导下尝试已指定的自由泳动作', L2: '在提示下完成本次约定的动作要点', L3: '在本次明确测评任务中完成约定动作配合', L4: '在复测任务中保持已确认动作要点', L5: '在多次明确测评中稳定完成约定动作与配合' } },
] as const;

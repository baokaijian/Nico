// V2 extension contract only. No model request, automatic publication or health prediction.
export type InsightKind = 'fact' | 'calculation' | 'pending-observation' | 'draft-advice';
export interface InsightSource { collection: string; id: string; version?: number }
export interface GrowthInsight { kind: InsightKind; text: string; sources: InsightSource[]; scope: { start: string; end: string }; limitations: string[]; status: 'pending-human-review' }
export function validateGrowthInsight(value: unknown): asserts value is GrowthInsight {
  const row = value as GrowthInsight;
  const date = (text: unknown): text is string => typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(Date.parse(`${text}T00:00:00Z`)) && new Date(`${text}T00:00:00Z`).toISOString().slice(0,10) === text;
  if (!row || !['fact','calculation','pending-observation','draft-advice'].includes(row.kind) || typeof row.text !== 'string' || !row.text.trim() || row.status !== 'pending-human-review' || !date(row.scope?.start) || !date(row.scope?.end) || row.scope.end < row.scope.start || !Array.isArray(row.sources) || !row.sources.length || row.sources.some(ref => !ref || typeof ref.collection !== 'string' || !ref.collection || typeof ref.id !== 'string' || !ref.id || ref.version !== undefined && (!Number.isSafeInteger(ref.version) || ref.version < 1)) || !Array.isArray(row.limitations) || row.limitations.some(item => typeof item !== 'string')) throw Error('成长分析必须标明类别、真实来源、适用范围及待人工确认状态；数据不足时列出限制');
}

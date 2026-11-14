import { useMemo } from 'react';
import { reportOverview } from '../../shared/parent-experience.mjs';
import { Message } from './ui';

export default function ReportOverview({ data, report, unsaved = false, loaded = false, readOnly = false, onExportHTML, onPrintPDF, onConfirm }) {
  const overview = useMemo(() => reportOverview(data, report), [data, report]);
  if (!overview) return null;
  const periodLabel = overview.periodType === 'year' ? '年度' : '月度';

  return (
    <div className="report-overview stack" aria-labelledby="report-overview-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">报告摘要 · 当前运动员：{overview.athleteName}</span>
          <h2 id="report-overview-heading">
            {overview.athleteName} · {overview.period} {periodLabel}成长报告
          </h2>
          <p className="muted">
            数据范围 {overview.start || '未记录'}—{overview.end || '未记录'} · {overview.status} · v{overview.version}
            {overview.stale ? ' · 来源基线已过期' : ''}
          </p>
        </div>
        <div className="actions">
          <span className={`badge ${overview.stale ? 'badge-warn' : 'badge-ok'}`}>
            {overview.stale ? '来源基线已过期' : '基线一致'}
          </span>
          <span className="badge">{overview.sampleStatus}</span>
        </div>
      </div>

      <Message error={overview.stale}>
        {overview.stale
          ? '来源基线已过期：来源记录已变化或失效。当前保留生成时旧事实，未静默覆盖。'
          : '当前来源与生成时基线一致。'}
        {unsaved ? ' 正在预览未保存叙事，请先保存叙事后再人工确认。' : ''}
      </Message>

      <div className="report-overview-grid" role="group" aria-label="报告事实计数">
        <div className="metric-card">
          <h3>训练实际情况</h3>
          <p>
            <strong>{overview.trainingCount}</strong> 次实际训练（共 {overview.trainingRecordsCount} 条记录）
          </p>
          <p>
            已知时长：<strong>{overview.knownMinutes == null ? '未记录' : `${overview.knownMinutes} 分钟`}</strong>
          </p>
          <p>
            已知距离：<strong>{overview.knownMeters == null ? '未记录' : `${overview.knownMeters} 米`}</strong>
          </p>
        </div>

        <div className="metric-card">
          <h3>成绩与有效PB</h3>
          <p>
            成绩记录：<strong>{overview.scoresCount}</strong> 条（核验有效 <strong>{overview.validScoresCount}</strong> 条）
          </p>
          <p>
            有效PB刷新：<strong>{overview.pbCount}</strong> 项
          </p>
          <small className="muted">仅有效且池长明确的成绩计入PB</small>
        </div>

        <div className="metric-card">
          <h3>测评、目标与影像</h3>
          <p>
            技能测评：<strong>{overview.confirmedAssessmentsCount}</strong> 条已确认 · <strong>{overview.pendingAssessmentsCount}</strong> 条待确认
          </p>
          <p>
            阶段目标：<strong>{overview.goalsCount}</strong> 项（本周期达成 <strong>{overview.confirmedGoalsCount}</strong> 项）
          </p>
          <p>
            里程碑：<strong>{overview.confirmedMilestonesCount}</strong> 项已确认（<strong>{overview.pendingMilestonesCount}</strong> 项待确认） · 精选影像 <strong>{overview.mediaCount}</strong> 项
          </p>
        </div>
      </div>

      <p className="muted" role="status">
        <strong>{overview.sampleStatus}</strong>：{overview.sampleNote}
      </p>

      <div className="report-action-bar actions" role="toolbar" aria-label="报告导出与确认操作">
        <button type="button" className="apple-btn apple-btn-primary" onClick={onExportHTML}>
          导出 HTML{unsaved ? '（未保存预览）' : ''}
        </button>
        <button type="button" className="apple-btn apple-btn-secondary" disabled={!loaded} onClick={onPrintPDF}>
          打印 PDF
        </button>
        {!readOnly && overview.status === '待确认' && (
          <button
            type="button"
            className="apple-btn apple-btn-secondary"
            disabled={overview.stale || unsaved}
            onClick={onConfirm}
          >
            人工确认报告
          </button>
        )}
      </div>
    </div>
  );
}

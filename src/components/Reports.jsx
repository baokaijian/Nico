import { lazy, Suspense, useMemo, useState } from 'react';
import { growthReportHTML, reportRange, reportStale } from '../../shared/report-drafts.mjs';
import { reportOverview, safeReportFilename } from '../../shared/parent-experience.mjs';
import { today } from '../services/files';
import useGrowthForm from '../services/useGrowthForm';
import { Field, Empty, Message } from './ui';
import { GrowthForm, GrowthHistory, GrowthActionDialog } from './GrowthUI';
import ReportOverview from './ReportOverview';

const LegacyReports = lazy(() => import('./LegacyReports'));
const defaults = () => ({ title: '', periodType: 'month', period: today().slice(0, 7), parentSummary: '', childFeeling: '', nextFocus: '', selectedMediaIds: [] });

export default function Reports(props) {
  const { data, readOnly, focusId } = props;
  const [selectedId, setSelectedId] = useState(focusId || '');
  const [action, setAction] = useState(null);
  const [legacy, setLegacy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const form = useGrowthForm({
    ...props,
    collection: 'reportDrafts',
    defaults,
    onRecordSaved: row => {
      setSelectedId(row.id);
      setLoaded(false);
    },
  });

  const sortedDrafts = useMemo(
    () => [...(data.reportDrafts || [])]
      .filter(row => !focusId || row.id === focusId)
      .sort((a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || ''))),
    [data.reportDrafts, focusId]
  );

  const selected = (data.reportDrafts || []).find(row => row.id === selectedId) || sortedDrafts[0] || null;
  const stale = Boolean(selected && reportStale(data, selected));
  const editing = Boolean(selected && form.editing === selected.id);
  const unsaved = Boolean(editing && ['title', 'parentSummary', 'childFeeling', 'nextFocus'].some(key => form.values[key] !== selected[key]));
  const preview = useMemo(
    () => selected && (editing
      ? { ...selected, ...Object.fromEntries(['title', 'parentSummary', 'childFeeling', 'nextFocus'].map(key => [key, form.values[key]])) }
      : selected),
    [selected, editing, form.values]
  );

  const athleteName = data.profile?.displayName || data.profile?.name || 'Nico';
  const html = preview ? growthReportHTML(preview, stale, athleteName) : '';
  const overview = useMemo(() => (preview ? reportOverview(data, preview) : null), [data, preview]);

  let range;
  try {
    range = reportRange(form.values.periodType, form.values.period);
  } catch {
    // Invalid period is explained on save.
  }

  const exportHTML = () => {
    if (!selected) return;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = safeReportFilename(athleteName, selected.period, { unsaved });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printReport = () => {
    document.getElementById('growth-report-preview')?.contentWindow?.print();
  };

  return (
    <div className="stack">
      <header>
        <h1>月度与年度成长报告</h1>
        <p>事实来自原始记录，叙事由家长和孩子共同补充。报告默认私有。</p>
      </header>
      <Message>保存叙事不会改写事实或自动刷新基线。已确认报告保留原版本；来源变化后显示过期提示。</Message>
      {!readOnly && (
        <GrowthForm form={form} title={form.editing ? '编辑报告叙事' : '新建月度 / 年度报告草稿'}>
          <Field field={{ key: 'title', label: '报告标题', type: 'text', required: true }} value={form.values.title} onChange={v => form.change('title', v)} />
          <fieldset disabled={!!form.editing}>
            <legend>事实来源范围（保存后保留，变更需新建报告）</legend>
            <div className="form-grid">
              <Field
                field={{ key: 'periodType', label: '报告模式', type: 'select', options: ['month', 'year'], optionLabels: { month: '月度', year: '年度' }, required: true }}
                value={form.values.periodType}
                onChange={v => {
                  form.change('periodType', v);
                  form.change('period', today().slice(0, v === 'year' ? 4 : 7));
                  form.change('selectedMediaIds', []);
                }}
              />
              <Field
                field={{ key: 'period', label: form.values.periodType === 'year' ? '年份（如2026）' : '月份', type: form.values.periodType === 'year' ? 'text' : 'month', required: true }}
                value={form.values.period}
                onChange={v => form.change('period', v)}
              />
            </div>
            <details>
              <summary>精选影像（可选） · 已选{form.values.selectedMediaIds.length}</summary>
              {(data.media || []).filter(row => range && row.date >= range.start && row.date <= range.end).map(row => (
                <label className="training-check" key={row.id}>
                  <input
                    type="checkbox"
                    checked={form.values.selectedMediaIds.includes(row.id)}
                    onChange={e => form.change('selectedMediaIds', e.target.checked ? [...form.values.selectedMediaIds, row.id] : form.values.selectedMediaIds.filter(id => id !== row.id))}
                  />
                  {row.date} · {row.title}
                </label>
              ))}
              <p>只关联当前周期的真实素材；导出仅列标题和ID，不嵌入私有视频。</p>
            </details>
          </fieldset>
          {[['parentSummary', '家长总结'], ['childFeeling', '孩子的个人感受（照原话填写）'], ['nextFocus', '下阶段观察重点']].map(([key, label]) => (
            <Field key={key} field={{ key, label, type: 'textarea' }} value={form.values[key]} onChange={v => form.change(key, v)} />
          ))}
        </GrowthForm>
      )}
      <section className="glass-card">
        <h2>已保存报告</h2>
        {sortedDrafts.length ? (
          <div className="record-list">
            {sortedDrafts.map(row => (
              <article className="history-entry" key={row.id}>
                <h3>{row.title}</h3>
                <p>{row.period} · {row.status} · v{row.version}{reportStale(data, row) ? ' · 来源基线已过期' : ''}</p>
                <div className="actions">
                  <button
                    type="button"
                    aria-pressed={selected?.id === row.id}
                    onClick={() => {
                      setSelectedId(row.id);
                      setLoaded(false);
                    }}
                  >
                    预览报告
                  </button>
                  {!readOnly && (
                    <>
                      {row.status === '待确认' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (form.edit(row)) {
                                setSelectedId(row.id);
                                setLoaded(false);
                              }
                            }}
                          >
                            编辑叙事
                          </button>
                          <button type="button" onClick={() => setAction({ record: row, action: 'refresh' })}>明确重新生成基线</button>
                        </>
                      )}
                      <button type="button" onClick={() => form.remove(row)}>移入回收站</button>
                    </>
                  )}
                </div>
                <GrowthHistory data={data} collection="reportDrafts" id={row.id} />
              </article>
            ))}
          </div>
        ) : (
          <Empty>尚无报告。选择月份或年份，生成第一份私有草稿。</Empty>
        )}
      </section>
      {selected && (
        <section className="glass-card stack">
          <ReportOverview
            overview={overview}
            unsaved={unsaved}
            loaded={loaded}
            readOnly={readOnly}
            onExportHTML={exportHTML}
            onPrint={printReport}
            onConfirm={() => setAction({ record: selected, action: 'confirm' })}
          />
          <iframe
            id="growth-report-preview"
            className="report-preview"
            title="成长报告预览"
            sandbox="allow-same-origin allow-modals"
            srcDoc={html}
            onLoad={() => setLoaded(true)}
          />
        </section>
      )}
      {!focusId && (
        <section>
          <button type="button" onClick={() => setLegacy(v => !v)} aria-expanded={legacy}>原八章完整方案与周期报告</button>
          {legacy && (
            <Suspense fallback={<Message>正在打开原报告…</Message>}>
              <LegacyReports data={data} />
            </Suspense>
          )}
        </section>
      )}
      {action && <GrowthActionDialog {...props} {...action} collection="reportDrafts" onClose={() => setAction(null)} />}
    </div>
  );
}

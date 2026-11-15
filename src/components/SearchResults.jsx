import { useMemo, useState } from 'react';
import { searchAthleteRecords } from '../../shared/parent-experience.mjs';
import SourceWorkspace from './SourceWorkspace';
import { Empty } from './ui';

const GROUP_META = [
  ['trainings', '水上训练', 'training', 'trainings'],
  ['swim', '游泳成绩', 'training', 'swim'],
  ['media', '影像素材', 'training', 'media'],
  ['reportDrafts', '周期报告', 'review', 'reports'],
];

export default function SearchResults({ data, query, onClear, navigate, api, role, readOnly, onSaved, reload }) {
  const results = useMemo(() => searchAthleteRecords(data, query), [data, query]);
  const [source, setSource] = useState(null);
  if (!results.query) return null;

  return (
    <section className="glass-card search-results stack" aria-labelledby="search-results-heading">
      <div className="flex-between">
        <div>
          <span className="eyebrow">当前运动员范围检索 · {results.athleteName}</span>
          <h1 id="search-results-heading">搜索“{results.query}”</h1>
        </div>
        <button type="button" className="apple-btn apple-btn-secondary" onClick={onClear}>
          清除搜索
        </button>
      </div>

      <p className="muted" role="status" aria-live="polite">
        当前运动员「{results.athleteName}」共匹配 {results.total} 条记录（仅检索当前儿童的训练、成绩、影像与报告，不跨运动员）。
      </p>

      {results.emptyState === 'no-records' && (
        <Empty>
          <p>当前运动员还没有可搜索的记录。未录入不代表没有训练，请先记录一次训练或成绩。</p>
          <div className="actions" style={{ justifyContent: 'center', marginTop: '8px' }}>
            <button type="button" className="apple-btn apple-btn-secondary" onClick={onClear}>
              清除搜索并返回
            </button>
          </div>
        </Empty>
      )}

      {results.emptyState === 'no-match' && (
        <Empty>
          <p>没有匹配的记录。请尝试其他日期、泳姿、项目或教练备注关键词。</p>
          <div className="actions" style={{ justifyContent: 'center', marginTop: '8px' }}>
            <button type="button" className="apple-btn apple-btn-secondary" onClick={onClear}>
              清除搜索
            </button>
          </div>
        </Empty>
      )}

      {results.total > 0 && (
        <div className="stack">
          {GROUP_META.map(([key, label, section, view]) => {
            const list = results.groups[key] || [];
            if (!list.length) return null;
            return (
              <section key={key} className="search-group" aria-labelledby={`search-group-${key}`}>
                <div className="section-head">
                  <h2 id={`search-group-${key}`}>
                    {label} <small>（{list.length}）</small>
                  </h2>
                  <button
                    type="button"
                    className="apple-btn apple-btn-secondary"
                    onClick={() => {
                      onClear();
                      navigate(section, view);
                    }}
                  >
                    打开{label}列表
                  </button>
                </div>
                <ul className="workbench-list search-group-list">
                  {list.map(item => (
                    <li key={item.id} className="search-item">
                      <div>
                        <strong>{item.title}</strong>
                        <p className="muted">{item.summary}</p>
                      </div>
                      <button type="button" onClick={() => setSource(item.source)}>
                        查看原记录
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {source && (
        <SourceWorkspace
          source={source}
          data={data}
          api={api}
          role={role}
          navigate={navigate}
          onSaved={onSaved}
          reload={reload}
          readOnly={readOnly || role !== 'owner'}
          onClose={() => setSource(null)}
        />
      )}
    </section>
  );
}

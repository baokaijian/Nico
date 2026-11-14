import { useMemo, useState } from 'react';
import { growthSetup } from '../../shared/growth-setup.mjs';
import SourceWorkspace from './SourceWorkspace';
import { workbenchModel } from '../services/management';
import { today } from '../services/files';
import { performanceLabel, validityLabel } from '../../shared/performance.ts';
import { readablePerformance } from '../../shared/score-conditions.mjs';
import EntryResume from './EntryResume';
import TodayCard from './TodayCard';
import CoachFeedbackCard from './CoachFeedbackCard';
import { Empty } from './ui';

function readStorageFlag(storage, key) {
  try {
    return typeof window !== 'undefined' && window[storage]?.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeStorageFlag(storage, key, enabled) {
  try {
    if (typeof window === 'undefined' || !window[storage]) return;
    if (enabled) window[storage].setItem(key, '1');
    else window[storage].removeItem(key);
  } catch {
    // Ignore storage errors in private mode or test environments
  }
}

export default function Workbench({ data, navigate, openQuickEntry, readOnly, api, role, resumeVersion, onSaved: propsOnSaved, reload: propsReload }) {
  const model = useMemo(() => workbenchModel(data, today()), [data]);
  const setup = useMemo(() => growthSetup(data, today()), [data]);
  const [source, setSource] = useState(null);
  const athleteScopeKey = model.today?.athleteId || 'default';
  const setupDismissKey = `nico.setup.dismissed.v1:${athleteScopeKey}`;
  const moreExpandKey = `nico.workbench.more.v1:${athleteScopeKey}`;

  const [dismissedByAthlete, setDismissedByAthlete] = useState({});
  const [moreByAthlete, setMoreByAthlete] = useState({});

  const setupDismissed = dismissedByAthlete[athleteScopeKey] ?? readStorageFlag('localStorage', setupDismissKey);
  const showMore = moreByAthlete[athleteScopeKey] ?? readStorageFlag('sessionStorage', moreExpandKey);

  function dismissSetupBanner() {
    writeStorageFlag('localStorage', setupDismissKey, true);
    setDismissedByAthlete(prev => ({ ...prev, [athleteScopeKey]: true }));
  }

  function toggleMore() {
    const next = !showMore;
    writeStorageFlag('sessionStorage', moreExpandKey, next);
    setMoreByAthlete(prev => ({ ...prev, [athleteScopeKey]: next }));
  }

  return (
    <div className="management-workbench stack">
      <header>
        <h1>工作台</h1>
        <p className="muted">记录本次训练，接着补充成绩、影像或教练反馈。</p>
      </header>
      {!readOnly && <EntryResume key={resumeVersion} api={api} openQuickEntry={openQuickEntry} />}
      <TodayCard
        today={model.today}
        readOnly={readOnly}
        role={role}
        openQuickEntry={openQuickEntry}
        navigate={navigate}
        onOpenSource={setSource}
      />
      {role === 'owner' && setup.readyCount < setup.total && !setupDismissed && (
        <section className="workbench-section setup-invitation setup-compact-banner" aria-label="首次使用引导提示">
          <div className="setup-compact-text">
            <strong>首次使用引导：已完成 {setup.readyCount}/{setup.total} 步</strong>
            <span className="muted">先处理最要紧的事项，也可随时在工作台子导航打开完整引导逐步核对。</span>
          </div>
          <div className="row">
            <button type="button" onClick={() => navigate('workbench', 'setup')}>打开引导</button>
            <button type="button" className="apple-btn apple-btn-secondary" onClick={dismissSetupBanner}>稍后再说</button>
          </div>
        </section>
      )}
      <section className="workbench-section">
        <div className="section-head">
          <h2>本周训练摘要</h2>
          <button type="button" onClick={() => navigate('training', 'trainings')}>查看记录</button>
        </div>
        <div className="workbench-stats">
          <p><strong>{model.summary.count}</strong> 次实际训练</p>
          <p><strong>{model.summary.minutes ?? '未记录'}</strong> {model.summary.minutes == null ? '时长' : '已知分钟'}</p>
          <p><strong>{model.summary.metersCount || model.summary.knownMeters ? model.summary.knownMeters : '未记录'}</strong> {model.summary.metersCount || model.summary.knownMeters ? '已知米' : '距离'}</p>
        </div>
        <small className="muted">{model.week.start}—{model.week.end}；只统计已记录的实际量，计划和缺失量不补齐。</small>
      </section>
      <CoachFeedbackCard items={model.coachFeedback} onOpenSource={setSource} />
      <div className="workbench-columns">
        <section className="workbench-section">
          <div className="section-head">
            <h2>统一待办 <small>{model.pending.length}</small></h2>
            <button type="button" onClick={() => navigate('workbench', 'tasks')}>查看全部</button>
          </div>
          {!model.pending.length ? (
            <Empty>暂时没有待确认事项。</Empty>
          ) : (
            <ul className="workbench-list">
              {model.pending.slice(0, 3).map(item => (
                <li key={item.taskId}>
                  <div>
                    <small>{item.label}</small>
                    <p>{item.title}</p>
                  </div>
                  <button type="button" onClick={() => setSource(item.source)}>处理</button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="workbench-section">
          <h2>当前训练重点</h2>
          <span className="badge">{model.confirmedFocus ? '已确认的周期重点' : '待家长核对的建议'}</span>
          <p className="workbench-focus">{model.focus}</p>
          <button type="button" onClick={() => navigate('training', 'plans')}>查看详情</button>
        </section>
      </div>
      <div className="workbench-more-wrap">
        <button
          type="button"
          className="apple-btn apple-btn-secondary workbench-more-toggle"
          aria-expanded={showMore}
          onClick={toggleMore}
        >
          {showMore ? '收起更多内容（目标 / 最近训练 / 成绩变化）' : '更多内容（目标 / 最近训练 / 成绩变化）'}
        </button>
      </div>
      {showMore && (
        <div className="stack workbench-more-panel">
          <section className="workbench-section">
            <div className="section-head">
              <div>
                <h2>这一阶段的成长</h2>
                <p>实际训练、有效PB、已确认技能和里程碑，保留每项来源。</p>
              </div>
              <button type="button" onClick={() => navigate('review', 'cockpit')}>打开阶段驾驶舱</button>
            </div>
          </section>
          <section className="workbench-section">
            <div className="section-head">
              <h2>进行中的成长目标</h2>
              <button type="button" onClick={() => navigate('growth', 'goals')}>查看全部目标</button>
            </div>
            {!model.goals.length ? (
              <Empty>尚无进行中的目标。可从真实起点建立一个阶段目标。</Empty>
            ) : (
              <ul className="workbench-list">
                {model.goals.slice(0, 3).map(row => (
                  <li key={row.id}>
                    <div>
                      <b>{row.title}</b>
                      <p>{row.targetResult || row.targetMetric || '目标结果待补充'}</p>
                      <small>{row.deadline ? `截止 ${row.deadline}` : '截止日期未填写'}</small>
                    </div>
                    <button type="button" onClick={() => navigate('growth', 'goals')}>查看详情</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="workbench-columns">
            <section className="workbench-section">
              <h2>最近一次训练</h2>
              {model.latestTraining ? (
                <>
                  <p>{model.latestTraining.date}</p>
                  <p>{model.latestTraining.session || model.latestTraining.trainingType || '水上训练'}</p>
                  <button type="button" onClick={() => navigate('training', 'trainings')}>查看训练</button>
                </>
              ) : (
                <Empty>尚无填写了实际完成依据的训练。</Empty>
              )}
            </section>
            <section className="workbench-section">
              <div className="section-head">
                <h2>最近成绩变化</h2>
                <button type="button" onClick={() => navigate('review', 'trends')}>查看成绩变化</button>
              </div>
              {model.scoreChange && (
                <p>
                  {model.scoreChange.current.distance}{model.scoreChange.current.stroke} · {model.scoreChange.current.poolLength}池，较前次{model.scoreChange.previous.date}
                  {model.scoreChange.deltaMs === 0 ? '持平' : `${model.scoreChange.deltaMs < 0 ? '快' : '慢'}${(Math.abs(model.scoreChange.deltaMs) / 1000).toFixed(3)}秒`}。
                  <small className="muted">仅呈现已核验记录变化；计时与出发条件不同不能作同条件改善归因。</small>
                </p>
              )}
              {!model.recentScores.length ? (
                <Empty>还没有成绩记录，可先保存一次真实计时。</Empty>
              ) : (
                <ul className="workbench-list">
                  {model.recentScores.map(row => (
                    <li key={row.id}>
                      <div>
                        {row.date} · {row.distance}{row.stroke}
                        <p>
                          <b>{performanceLabel(row)}</b>
                          {readablePerformance(row) ? `（${readablePerformance(row)}）` : ''}{' '}
                          <small>{row.poolLength}池 · {validityLabel(row)}</small>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
      {source && (
        <SourceWorkspace
          data={data}
          api={api}
          role={role}
          navigate={navigate}
          onSaved={propsOnSaved}
          reload={propsReload}
          readOnly={readOnly || role !== 'owner'}
          source={source}
          onClose={() => setSource(null)}
        />
      )}
    </div>
  );
}

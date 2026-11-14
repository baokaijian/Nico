import { Empty } from './ui';

export default function TodayCard({ todayModel, readOnly, role, openQuickEntry, onOpenSource, onNavigate }) {
  if (!todayModel) return null;
  const { athleteName, todayRecorded, todayCount, todayTraining, week, latestFeedback, pendingTasks, pendingCount } = todayModel;
  return (
    <section className="glass-card today-card" aria-labelledby="today-card-heading">
      <div className="section-head today-card-head">
        <div>
          <span className="eyebrow">当前运动员</span>
          <h2 id="today-card-heading">{athleteName} · 今日</h2>
        </div>
        <span className={`badge ${todayRecorded ? 'badge-ok' : ''}`}>
          {todayRecorded ? `今日已记录 ${todayCount} 次` : '今天还没有记录'}
        </span>
      </div>

      {todayRecorded && todayTraining ? (
        <p className="today-status-line">
          今日最新：{todayTraining.session}（{todayTraining.completionStatus}） · 实际时长 {todayTraining.minutes == null ? '未记录' : `${todayTraining.minutes} 分钟`} · 实际距离 {todayTraining.meters == null ? '未记录' : `${todayTraining.meters} 米`}
        </p>
      ) : (
        <p className="today-status-line muted">今天还没有记录；未录入不代表没有训练，缺失值不会记为 0。</p>
      )}

      <div className="today-week-summary" role="group" aria-label="本周训练已知量">
        <div className="today-stat">
          <span>本周实际训练</span>
          <strong>{week.count} 次</strong>
        </div>
        <div className="today-stat">
          <span>本周已知时长</span>
          <strong>{week.minutes == null ? '未记录' : `${week.minutes} 分钟`}</strong>
        </div>
        <div className="today-stat">
          <span>本周已知距离</span>
          <strong>{week.knownMeters == null ? '未记录' : `${week.knownMeters} 米`}</strong>
        </div>
      </div>

      {!readOnly && (
        <div className="today-actions" role="group" aria-label="今日快速录入">
          <button type="button" className="apple-btn apple-btn-primary today-primary-btn" onClick={() => openQuickEntry('training')}>
            记录这次训练
          </button>
          <button type="button" className="apple-btn apple-btn-secondary" onClick={() => openQuickEntry('score')}>
            记录成绩
          </button>
          {role === 'owner' && (
            <>
              <button type="button" className="apple-btn apple-btn-secondary" onClick={() => openQuickEntry('skill')}>
                技能测评
              </button>
              <button type="button" className="apple-btn apple-btn-secondary" onClick={() => openQuickEntry('media')}>
                添加影像
              </button>
            </>
          )}
        </div>
      )}

      <div className="today-subgrid">
        <div className="today-subcard">
          <div className="flex-between">
            <h3>最近教练原话</h3>
            {latestFeedback && (
              <button type="button" className="apple-btn apple-btn-secondary" onClick={() => onOpenSource(latestFeedback.source)}>
                查看
              </button>
            )}
          </div>
          {latestFeedback ? (
            <>
              <blockquote className="coach-feedback-quote">“{latestFeedback.coachNotes}”</blockquote>
              <small className="muted">
                来源：教练 {latestFeedback.feedbackBy} · {latestFeedback.date} · {latestFeedback.session}
              </small>
            </>
          ) : (
            <p className="muted">尚无教练原话。</p>
          )}
        </div>

        <div className="today-subcard">
          <div className="flex-between">
            <h3>待处理 {pendingCount} 项</h3>
            {role === 'owner' && pendingCount > 0 && (
              <button type="button" className="apple-btn apple-btn-secondary" onClick={() => onNavigate('workbench', 'tasks')}>
                全部待办
              </button>
            )}
          </div>
          {pendingTasks.length > 0 ? (
            <ul className="workbench-list today-todo-list">
              {pendingTasks.map(item => (
                <li key={item.taskId}>
                  <div>
                    <small>{item.label}</small>
                    <p>{item.title}</p>
                  </div>
                  <button type="button" onClick={() => onOpenSource(item.source)}>
                    去处理
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>暂时没有待确认事项。</Empty>
          )}
        </div>
      </div>
    </section>
  );
}

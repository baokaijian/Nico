import { Empty } from './ui';

export default function CoachFeedbackCard({ items = [], athleteName = 'Nico', onOpenSource, onNavigateTrainings }) {
  return (
    <section className="workbench-section coach-feedback-card" aria-labelledby="coach-feedback-heading">
      <div className="section-head">
        <div>
          <h2 id="coach-feedback-heading">教练原话 <small>{items.length}</small></h2>
          <p className="muted">仅汇总带教练署名（feedbackBy）的训练点评；家长不可改写原话，只可在原训练追加备注。</p>
        </div>
        {onNavigateTrainings && (
          <button type="button" onClick={onNavigateTrainings}>
            查看训练记录
          </button>
        )}
      </div>
      {!items.length ? (
        <Empty>尚无教练原话。教练在授权训练中留下的点评会在此显示，不填充示例内容。</Empty>
      ) : (
        <ul className="workbench-list coach-feedback-list">
          {items.map(item => (
            <li key={item.id} className="coach-feedback-item">
              <div className="coach-feedback-body">
                <div className="coach-feedback-meta">
                  <span className="badge">原话只读</span>
                  <strong>{item.date || '日期未记录'}</strong>
                  <span>运动员：{item.athleteName || athleteName}</span>
                  <span>教练：{item.feedbackBy}</span>
                  <span>来源训练：{item.session}</span>
                </div>
                <blockquote className="coach-feedback-quote">“{item.coachNotes}”</blockquote>
              </div>
              <button type="button" onClick={() => onOpenSource(item.source)}>
                查看原训练
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

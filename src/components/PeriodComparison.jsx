import { useMemo, useState } from 'react';
import { comparePeriods } from '../../shared/period-comparison.mjs';
import { today } from '../services/files';
import { Message, Empty } from './ui';

function shiftDays(isoDate, deltaDays) {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export default function PeriodComparison({ data }) {
  const nowDay = today();
  const [windowA, setWindowA] = useState(() => ({
    startDate: shiftDays(nowDay, -55),
    endDate: shiftDays(nowDay, -28),
    label: '前 28 天（基准周期 A）',
  }));
  const [windowB, setWindowB] = useState(() => ({
    startDate: shiftDays(nowDay, -27),
    endDate: nowDay,
    label: '近 28 天（对比周期 B）',
  }));

  const applyPreset = days => {
    setWindowA({
      startDate: shiftDays(nowDay, -(days * 2 - 1)),
      endDate: shiftDays(nowDay, -days),
      label: `前 ${days} 天（周期 A）`,
    });
    setWindowB({
      startDate: shiftDays(nowDay, -(days - 1)),
      endDate: nowDay,
      label: `近 ${days} 天（周期 B）`,
    });
  };

  const result = useMemo(() => {
    try {
      return {
        report: comparePeriods(data, windowA, windowB, { athleteId: data.activeAthleteId || data.profile?.id || 'nico' }),
        error: '',
      };
    } catch (problem) {
      return { report: null, error: problem.message };
    }
  }, [data, windowA, windowB]);

  const { report, error } = result;

  return (
    <div className="stack fade-in">
      <header>
        <h1>跨周期对比视图</h1>
        <p className="muted">
          选择两个日期区间（周期 A 与周期 B），对比训练完成量、同条件有效成绩与 PB、同版本已确认技能测评及目标推进。任一维度样本不足时明确标注“样本不足”，不做趋势外推或主观定性结论。
        </p>
      </header>

      <section className="glass-card">
        <div className="flex-between">
          <h2>对比区间选择</h2>
          <div className="actions">
            <button type="button" className="apple-btn apple-btn-secondary" onClick={() => applyPreset(14)}>近 14 天 vs 前 14 天</button>
            <button type="button" className="apple-btn apple-btn-secondary" onClick={() => applyPreset(28)}>近 28 天 vs 前 28 天</button>
            <button type="button" className="apple-btn apple-btn-secondary" onClick={() => applyPreset(90)}>近 90 天 vs 前 90 天</button>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: '12px' }}>
          <label className="form-group">
            周期 A 起始日期
            <input
              type="date"
              className="apple-input"
              value={windowA.startDate}
              onChange={e => setWindowA(curr => ({ ...curr, startDate: e.target.value }))}
            />
          </label>
          <label className="form-group">
            周期 A 结束日期
            <input
              type="date"
              className="apple-input"
              value={windowA.endDate}
              onChange={e => setWindowA(curr => ({ ...curr, endDate: e.target.value }))}
            />
          </label>
          <label className="form-group">
            周期 B 起始日期
            <input
              type="date"
              className="apple-input"
              value={windowB.startDate}
              onChange={e => setWindowB(curr => ({ ...curr, startDate: e.target.value }))}
            />
          </label>
          <label className="form-group">
            周期 B 结束日期
            <input
              type="date"
              className="apple-input"
              value={windowB.endDate}
              onChange={e => setWindowB(curr => ({ ...curr, endDate: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <Message error>{error}</Message>

      {report && (
        <>
          <section className="glass-card">
            <div className="flex-between">
              <h2>1. 训练完成量对比</h2>
              <span className="pill">{report.trainingVolume.status}</span>
            </div>
            {report.trainingVolume.status === '样本不足' && (
              <Message>{report.trainingVolume.reason}（样本不足，不计算差值或趋势结论）</Message>
            )}
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>指标</th>
                    <th>周期 A（{report.windowA.startDate} ~ {report.windowA.endDate}）</th>
                    <th>周期 B（{report.windowB.startDate} ~ {report.windowB.endDate}）</th>
                    <th>客观差值（B - A）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>实际发生训练次数</td>
                    <td>{report.trainingVolume.windowA.occurredCount} 次（共录入 {report.trainingVolume.windowA.recordCount} 条）</td>
                    <td>{report.trainingVolume.windowB.occurredCount} 次（共录入 {report.trainingVolume.windowB.recordCount} 条）</td>
                    <td>{report.trainingVolume.delta ? `${report.trainingVolume.delta.occurredCount >= 0 ? '+' : ''}${report.trainingVolume.delta.occurredCount} 次` : '样本不足'}</td>
                  </tr>
                  <tr>
                    <td>已知实际总距离</td>
                    <td>{report.trainingVolume.windowA.knownMeters} 米</td>
                    <td>{report.trainingVolume.windowB.knownMeters} 米</td>
                    <td>{report.trainingVolume.delta ? `${report.trainingVolume.delta.knownMeters >= 0 ? '+' : ''}${report.trainingVolume.delta.knownMeters} 米` : '样本不足'}</td>
                  </tr>
                  <tr>
                    <td>已知实际总时长</td>
                    <td>{report.trainingVolume.windowA.minutes ?? '未完整记录'} 分钟</td>
                    <td>{report.trainingVolume.windowB.minutes ?? '未完整记录'} 分钟</td>
                    <td>{report.trainingVolume.delta?.minutes != null ? `${report.trainingVolume.delta.minutes >= 0 ? '+' : ''}${report.trainingVolume.delta.minutes} 分钟` : '样本不足'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-card">
            <div className="flex-between">
              <h2>2. 有效成绩与同项最佳（PB）对比</h2>
              <span className="pill">{report.performance.status}</span>
            </div>
            <p className="muted">
              仅统计满足 <code>validityStatus === '有效'</code> 且池长（25m/50m）明确的成绩，同距离、同泳姿、同池长方可横向对比。
            </p>
            {report.performance.status === '样本不足' && (
              <Message>{report.performance.reason}</Message>
            )}
            <p>
              周期 A 有效成绩：{report.performance.windowA.eligibleCount} 条（总录入 {report.performance.windowA.totalCount} 条） ·
              周期 B 有效成绩：{report.performance.windowB.eligibleCount} 条（总录入 {report.performance.windowB.totalCount} 条，刷新周期 A 最佳 {report.performance.windowB.pbRefreshCount} 项）
            </p>
            {!report.performance.events.length ? (
              <Empty>两个周期内暂无有效成绩记录。</Empty>
            ) : (
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>项目（距离 · 泳姿 · 池长）</th>
                      <th>周期 A 最佳</th>
                      <th>周期 B 最佳</th>
                      <th>状态 / 差值（B - A）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.performance.events.map(ev => (
                      <tr key={ev.eventKey}>
                        <td>{ev.distance} {ev.stroke}（{ev.poolLength}池）</td>
                        <td>{ev.bestA ? `${ev.bestA.label}（${ev.bestA.date}，${ev.countA}次）` : '样本不足（无有效记录）'}</td>
                        <td>{ev.bestB ? `${ev.bestB.label}（${ev.bestB.date}，${ev.countB}次）` : '样本不足（无有效记录）'}</td>
                        <td>
                          {ev.status === '可对比'
                            ? `${ev.deltaSeconds <= 0 ? '' : '+'}${ev.deltaSeconds.toFixed(2)} 秒${ev.improved ? '（突破周期A最佳）' : ''}`
                            : `样本不足（${ev.reason}）`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="glass-card">
            <div className="flex-between">
              <h2>3. 已确认技能测评对比（同标准版本）</h2>
              <span className="pill">{report.skills.status}</span>
            </div>
            {report.skills.status === '样本不足' ? (
              <Message>{report.skills.reason}</Message>
            ) : (
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>技能与标准版本</th>
                      <th>周期 A 最新确认</th>
                      <th>周期 B 最新确认</th>
                      <th>对比状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.skills.comparisons.map(item => (
                      <tr key={`${item.skillId}@${item.definitionVersion}`}>
                        <td>{item.skillId}（v{item.definitionVersion}）</td>
                        <td>{item.windowA ? `${item.windowA.level}（${item.windowA.date}）` : '样本不足'}</td>
                        <td>{item.windowB ? `${item.windowB.level}（${item.windowB.date}）` : '样本不足'}</td>
                        <td>{item.status === '可对比' ? (item.changed ? `${item.windowA.level} → ${item.windowB.level}` : `维持 ${item.windowB.level}`) : `样本不足（${item.reason}）`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="glass-card">
            <div className="flex-between">
              <h2>4. 目标推进情况对比</h2>
              <span className="pill">{report.goals.status}</span>
            </div>
            {report.goals.status === '样本不足' ? (
              <Message>{report.goals.reason}</Message>
            ) : (
              <p>
                当前进行中目标：{report.goals.activeCount} 项 · 已达成目标：{report.goals.achievedCount} 项 ·
                周期 A 涉及目标记录：{report.goals.windowA.touchedCount} 项 · 周期 B 涉及目标记录：{report.goals.windowB.touchedCount} 项
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

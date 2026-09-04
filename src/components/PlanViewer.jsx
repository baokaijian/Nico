import React, { useState } from 'react';
import { Waves, HeartPulse, Apple, Printer, Zap, ShieldAlert, Flag } from 'lucide-react';

export default function PlanViewer({ growthRecords, swimRecords, trainings }) {
  const [activeSubTab, setActiveSubTab] = useState('water');

  const latestGrowth = growthRecords && growthRecords.length > 0 ? growthRecords[growthRecords.length - 1] : null;
  const latestSwim = swimRecords && swimRecords.length > 0 ? swimRecords[swimRecords.length - 1] : null;
  const totalWaterMeters = trainings ? trainings.reduce((acc, cur) => acc + (cur.totalMeters || 0), 0) : 0;

  return (
    <div>
      {/* Header Banner */}
      <div className="glass-card mb-lg" style={{ 
        background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.12) 0%, rgba(52, 199, 89, 0.12) 100%)',
        border: '1.5px solid rgba(0, 113, 227, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 113, 227, 0.08)'
      }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ 
                background: 'linear-gradient(135deg, #0071e3 0%, #005bb5 100%)', 
                color: '#fff', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}>
                杭州大关三线游泳队
              </span>
              <span style={{ 
                background: 'rgba(255, 149, 0, 0.15)', 
                color: '#d35400', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700 
              }}>
                2027市长杯二级运动员决战方案
              </span>
              <span style={{ 
                background: 'rgba(52, 199, 89, 0.15)', 
                color: '#248a3d', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700 
              }}>
                15个月周期化纲要
              </span>
            </div>
            <h2 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--primary-color)' }}>
              2027年底市长杯决赛 · 国家二级运动员冲刺纲领
            </h2>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.92rem', marginTop: '6px' }}>
              对标大关名将（杨雨、叶诗文启蒙阶段）实战体系：以女子 50 米自由泳突破 <strong>31.50 秒</strong> 为终极统领，分阶段攻关水上、陆上爆发力与赛事实战。
            </p>
          </div>

          <button 
            onClick={() => window.print()}
            className="apple-btn apple-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Printer size={15} />
            打印/导出方案
          </button>
        </div>

        {/* Real-time Status Strip */}
        <div style={{ 
          marginTop: 'var(--space-md)', 
          paddingTop: 'var(--space-md)', 
          borderTop: '1px solid rgba(0,0,0,0.06)', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px' 
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>当前骨骼形态:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary-color)' }}>
              身高 {latestGrowth?.height || 129.6} cm | 臂展 {latestGrowth?.armSpan || 129.5} cm
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>50m自由泳基准:</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-color)' }}>
              当前 {latestSwim?.time || '01:04.20'} ➔ 终极目标 ≤ 31.50s
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>大关走训累计游程:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#34c759' }}>
              {totalWaterMeters.toLocaleString()} 米 (专项打腿 ≥ 35%)
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="tab-nav mb-lg" style={{ 
        display: 'flex', 
        gap: '8px', 
        borderBottom: '1px solid rgba(0,0,0,0.08)', 
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        <button 
          className={`tab-btn ${activeSubTab === 'water' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('water')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Waves size={16} />
          <span>四阶段水上攻坚计划</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'turn_start' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('turn_start')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Zap size={16} />
          <span>出发与滚翻转身攻坚</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'dryland' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('dryland')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <HeartPulse size={16} />
          <span>陆上体能与爆发力</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('nutrition')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Apple size={16} />
          <span>高强度走训营养处方</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'strategy' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('strategy')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Flag size={16} />
          <span>市长杯决赛战术与巅峰</span>
        </button>
      </div>

      {/* Tab 1: 4-Phase Water Program */}
      {activeSubTab === 'water' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Phase 1 */}
          <div className="glass-card" style={{ borderLeft: '4px solid #0071e3' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(0, 113, 227, 0.1)', color: '#0071e3', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                  第 1 阶段 · 动力链奠基
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>水感与前交叉动力成型 (2026.09 - 2026.12 · 6.5岁)</h3>
              </div>
              <span style={{ fontWeight: 700, color: '#0071e3', fontSize: '0.95rem' }}>目标：50自进入 52.00秒 内</span>
            </div>
            
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>攻坚核心：</strong>将 Nico 暑假入选大关三线的基础动作全面定型。重点建立<strong>“大腿发力、小腿鞭状、脚踝内旋”</strong>的6次打腿动力链，确保游进过程中躯干像一条笔直鱼雷，杜绝塌腰与下半身下沉。
            </p>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div style={{ background: 'rgba(0, 113, 227, 0.03)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--accent-color)', display: 'block', marginBottom: '4px' }}>每周负荷与课次结构：</strong>
                • 课次：每周 4 次走训（每次 90-105 分钟）<br />
                • 单课总包干：1,400m - 1,800m（周游程 6,500m - 7,500m）<br />
                • 专项打腿占比：<strong>≥ 35%</strong>（每课打腿 500m~700m）
              </div>
              <div style={{ background: 'rgba(0, 113, 227, 0.03)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--accent-color)', display: 'block', marginBottom: '4px' }}>量化验收指标：</strong>
                • 25m 扶板全力打腿：进入 <strong>24.00秒</strong> 以内<br />
                • 50m 扶板有氧打腿：进入 <strong>55.00秒</strong> 以内<br />
                • 50m 自由泳配合测试：从 1:04.20 突破至 <strong>≤ 52.00秒</strong>
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="glass-card" style={{ borderLeft: '4px solid #ff9500' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(255, 149, 0, 0.1)', color: '#d35400', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                  第 2 阶段 · 速度成型
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>迎春杯达标测试与斩获“国家三级” (2027.01 - 2027.04 · 7.0岁)</h3>
              </div>
              <span style={{ fontWeight: 700, color: '#d35400', fontSize: '0.95rem' }}>目标：突破 39.50秒 (国家三级达标)</span>
            </div>
            
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>攻坚核心：</strong>出战杭州市迎春杯少儿达标赛。此阶段 Nico 骨骼与肌肉力量自然增长，重点攻克<strong>高肘抱水（EVF）深度感知与滚翻转身后水下海豚腿滑行</strong>，跨越中国竞技游泳第一座里程碑（国家三级运动员：50自 39.50s）。
            </p>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div style={{ background: 'rgba(255, 149, 0, 0.03)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#d35400', display: 'block', marginBottom: '4px' }}>每周负荷与课次结构：</strong>
                • 课次：每周 4-5 次（周游程 8,000m - 10,000m）<br />
                • 单课总包干：1,800m - 2,200m<br />
                • 重点训练：25m段落极速爆发（SP）+ 滚翻转身不抬头练习
              </div>
              <div style={{ background: 'rgba(255, 149, 0, 0.03)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#d35400', display: 'block', marginBottom: '4px' }}>量化验收指标：</strong>
                • 迎春杯 50m 自由泳：突破 <strong>39.50秒（正式申办国家三级运动员）</strong><br />
                • 滚翻转身蹬壁出水点：稳定越过 <strong>4.5米 - 5米线</strong><br />
                • 划幅效率（DPS）：50米比赛控制在 <strong>30-32 划</strong> 内完成
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="glass-card" style={{ borderLeft: '4px solid #af52de' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(175, 82, 222, 0.1)', color: '#af52de', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                  第 3 阶段 · 暑期强化
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>大关暑期双训与无氧耐力攻坚 (2027.05 - 2027.08 · 7.5岁)</h3>
              </div>
              <span style={{ fontWeight: 700, color: '#af52de', fontSize: '0.95rem' }}>目标：突破 35.00秒 (逼近二级门槛)</span>
            </div>
            
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>攻坚核心：</strong>大关三线每年最关键的<strong>“暑期大包干黄金期”</strong>。利用暑假无课业负担，执行“上午水上打底 + 下午速度强化”节奏，全面提升乳酸耐受力，消灭 50 米后半程速度衰减。
            </p>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div style={{ background: 'rgba(175, 82, 222, 0.03)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#af52de', display: 'block', marginBottom: '4px' }}>暑期特训负荷：</strong>
                • 课次：周一至周六单双训结合（周游程 12,000m - 15,000m）<br />
                • 专项耐力：8×50m 自由泳极速组包干（包干时间 50秒，冲刺在 36秒内）<br />
                • 专项打腿：10×50m 板打（包干 1分05秒）
              </div>
              <div style={{ background: 'rgba(175, 82, 222, 0.03)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#af52de', display: 'block', marginBottom: '4px' }}>量化验收指标：</strong>
                • 50m 自由泳测验：进入 <strong>35.00秒以内（力争 33~34s）</strong><br />
                • 50m 仰泳兼项：进入 <strong>39.00秒以内</strong><br />
                • 后程 25m 降速差：与前程 25m 差距控制在 <strong>1.5秒以内</strong>
              </div>
            </div>
          </div>

          {/* Phase 4 */}
          <div className="glass-card" style={{ borderLeft: '4px solid #34c759' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#248a3d', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                  第 4 阶段 · 终极决战
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>市长杯决赛决战 · 斩获国家二级运动员 (2027.09 - 2027.12 · 7.8岁)</h3>
              </div>
              <span style={{ fontWeight: 800, color: '#248a3d', fontSize: '1rem' }}>终极指标：≤ 31.50秒 (国家二级！)</span>
            </div>
            
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>攻坚核心：</strong>2027年底杭州市“市长杯”少儿游泳锦标赛决赛。在赛前 2 周严格实施减量巅峰策略（Tapering），在决赛发令枪响后，将 15 个月打磨的出发反应（0.65s）、前交叉抱水、转身反弹与终点触壁全力释放，达标国家二级运动员并登上领奖台！
            </p>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div style={{ background: 'rgba(52, 199, 89, 0.04)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#248a3d', display: 'block', marginBottom: '4px' }}>赛前精细调教：</strong>
                • 赛前 14 天开始逐步减少游程，保证肌肉神经超量恢复<br />
                • 模拟市长杯检录流程与发令枪声起跳<br />
                • 呼吸战术：前 15m 不换气，全程仅呼吸 3~4 次
              </div>
              <div style={{ background: 'rgba(52, 199, 89, 0.04)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#248a3d', display: 'block', marginBottom: '4px' }}>决战圆满成果：</strong>
                • 50m 自由泳决赛用时：<strong>≤ 31.50 秒（荣膺国家二级运动员）</strong><br />
                • 50m 仰泳达标：<strong>≤ 36.50 秒</strong><br />
                • 获得杭州市市长杯决赛奖牌，锁定杭州市二线队升队选拔席位！
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Turn & Start Details */}
      {activeSubTab === 'turn_start' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Zap size={20} style={{ color: '#ff9500' }} />
              市长杯决战抢分利器：出发与滚翻转身 (减耗 1.5~2.0 秒实战教案)
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              短距离 50 米比赛胜负往往在毫厘之间。通过出发反应时压缩 0.15s、滚翻转身提速 0.8s、水下海豚腿多滑行 1.5m， Nico 可在不额外增加耗能的情况下直接减掉 1.5 秒以上！
            </p>

            <div className="grid-3" style={{ gap: '16px' }}>
              {/* Point 1 */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#0071e3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>1</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>跳台出发反应与“穿针入水”</h4>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>准备口令：</strong>双手紧扣起跳台前沿，重心前移至大拇指，双眼凝视池壁前方1米水面。<br />
                  • <strong>发令反应：</strong>听枪声下肢爆发后蹬，躯干呈流线型向前上方跃出，<strong>反应时控制在 &lt; 0.68秒</strong>。<br />
                  • <strong>穿针入水：</strong>双手、头、躯干与双腿从水面同一个洞滑入，将入水阻力降到绝对最低。
                </div>
              </div>

              {/* Point 2 */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#ff9500', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>2</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>进出池壁“无呼吸折叠滚翻”</h4>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>进壁前 5 米：</strong>坚决禁止抬头换气，保持游进全速，以胸口带动低头切水。<br />
                  • <strong>高速折叠：</strong>以肚脐为圆心收腹屈膝，像弹簧一样瞬间翻转，双脚掌快速触碰池壁。<br />
                  • <strong>强力反弹：</strong>双腿蹬壁瞬间双臂紧夹耳朵，身体以仰卧或侧卧姿势飞速反弹射出。
                </div>
              </div>

              {/* Point 3 */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#34c759', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>3</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>水下海豚腿与破水衔接</h4>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>水下 4~5 次大推进海豚腿：</strong>利用 Nico 天生大脚蹼优势，利用波浪由胸部传至脚踝，高速滑行破水。<br />
                  • <strong>出水破面点：</strong>稳定越过 <strong>5 米红线</strong>，出水瞬间第一下划臂借势加速，严禁出水立刻仰头呼吸！
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Dryland Fitness */}
      {activeSubTab === 'dryland' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <HeartPulse size={20} style={{ color: '#ff2d55' }} />
              市长杯二级发动机：陆上体能与敏感期爆发力方案
            </h3>
            
            <div style={{ background: 'rgba(255, 149, 0, 0.08)', border: '1px solid rgba(255, 149, 0, 0.2)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={20} color="#ff9500" />
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)' }}>
                <strong>少儿发育安全第一：</strong>Nico 当前 6.5 岁，处于神经反应与柔韧敏感期。<strong>严禁使用杠铃深蹲或大重量器械</strong>，以自重弹跳、核心平衡与关节拉伸为主。
              </span>
            </div>

            <div className="grid-3" style={{ gap: '16px' }}>
              {/* Exercise 1 */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  1. 下肢爆发力 (目标跳远 ≥ 160cm)
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>原地单脚跳/双脚连续障碍跳：</strong>每周 2 次，每次 3 组×15次，刺激足弓弹性储能。<br />
                  • <strong>敏捷梯脚步频率练习：</strong>高频碎步与开合跳，锻炼下肢神经肌肉放电频率。<br />
                  • <strong>实效转化：</strong>起跳台腾空距离更远，入水即自带 0.3 秒初速度优势。
                </div>
              </div>

              {/* Exercise 2 */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  2. 核心刚性支撑 (目标平板 ≥ 120s)
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>标准平板支撑：</strong>每次 3 组，每组 60~90 秒，腹横肌收紧，背部保持水平线。<br />
                  • <strong>瑞士球流线型俯卧挺身：</strong>双臂伸直夹耳，锻炼背阔肌与深层竖脊肌抗旋转力。<br />
                  • <strong>实效转化：</strong>50米冲刺全程躯干无塌陷，游速越快阻力系数越小。
                </div>
              </div>

              {/* Exercise 3 */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  3. 踝肩极度柔韧 (守护天然脚蹼)
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>跪姿踝背屈压脚面操：</strong>课前课后各 3 分钟，巩固脚踝超长背屈范围。<br />
                  • <strong>绳操肩部环绕拉伸：</strong>双手握拉伸带由前往后匀速翻转，保持肩关节脱手宽在优秀区间。<br />
                  • <strong>实效转化：</strong>打腿如鞭，每一脚都能切中水流核心受压面。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: High-Intensity Nutrition */}
      {activeSubTab === 'nutrition' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Apple size={20} style={{ color: '#34c759' }} />
              高强度走训期专属营养方案 (打赢15个月体能消耗战)
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              6-7 岁三线走训每天水上消耗超过 600-800 千卡。吃对吃好不仅能防运动性贫血，更能在黄金深睡期促进生长激素成倍释放！
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              {/* Daily Meal Schedule */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '10px' }}>
                  ⏰ 走训日“三餐两点”作息食谱
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--primary-color)' }}>
                  • <strong>早餐 (07:15)：</strong>煮鸡蛋1个 + 全麦面包2片 + 纯牛奶200ml + 奇异果/苹果半个<br />
                  • <strong>午餐 (12:00)：</strong>清蒸鲈鱼/牛里脊肉 100g + 西兰花/胡萝卜 150g + 五谷米饭大半碗<br />
                  • <strong>训前加餐 (15:30，课前1小时)：</strong>香蕉半根 + 全麦小饼干2片 + 温开水150ml (快速补糖)<br />
                  • <strong>水上训练中 (16:30-18:15)：</strong>每 20 分钟小口补充稀释温蜂蜜水或少儿电解质水 80ml<br />
                  • <strong>训后黄金30分 (18:25)：</strong>温纯牛奶 250ml + 水煮蛋清 1 个 (肌肉超量修复黄金期)<br />
                  • <strong>晚餐 (19:15)：</strong>鲜虾/鸡胸肉 + 豆腐菠菜汤 + 杂粮粥 1 碗
                </div>
              </div>

              {/* Supplements & Sleep */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34c759', marginBottom: '10px' }}>
                  💊 骨骼微量元素与生长素深睡守则
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--primary-color)' }}>
                  • <strong>钙 + 维生素D3：</strong>每日随晚餐补充少儿液体乳钙（600mg）+ 400IU VD3，配合晒太阳促进纵向骨骼生长。<br />
                  • <strong>铁 + 维生素C：</strong>每周 2 次新鲜猪肝或红肉，配合富含 VC 水果，坚决预防“女童运动性隐性贫血”。<br />
                  • <strong>深睡眠红线：</strong>每晚 <strong>21:15 前</strong> 关灯上床，确保 22:00 前进入深睡状态（脑垂体分泌生长素高峰期在 22:00 - 02:00）。<br />
                  • <strong>清晨晨脉监测：</strong>起床前自测 60 秒脉搏。基线维持在 <strong>70~73 次/分</strong>。若高于基线 6 次以上，当天水上课降为技术慢游。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Mayor's Cup Strategy */}
      {activeSubTab === 'strategy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Flag size={20} style={{ color: '#248a3d' }} />
              2027 市长杯决赛战术与赛前减量巅峰策略 (Tapering)
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              如何在大战来临前将竞技状态调整至最兴奋点，并在 50 米决赛中战胜心魔、破壁封王？
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              {/* Strategy 1: Tapering */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0071e3', marginBottom: '8px' }}>
                  1. 赛前 14 天梯度减量（Tapering）
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--secondary-color)' }}>
                  • <strong>第 1 周（赛前 D-14 至 D-7）：</strong>游程减少 25%，保持极短距离 15m 爆发力刺激。<br />
                  • <strong>第 2 周（赛前 D-7 至 D-1）：</strong>游程减少 50%，以水感、转身蹬壁滑行和听枪起跳为主。<br />
                  • <strong>赛前前夜：</strong>清淡碳水为主，热水温水擦身，做 10 分钟心理积极成像演练。
                </div>
              </div>

              {/* Strategy 2: 50m Free Race Pacing */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#248a3d', marginBottom: '8px' }}>
                  2. 女子 50米自由泳 决赛分段战术（冲刺 31.50s）
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--secondary-color)' }}>
                  • <strong>0 ~ 15m (起跳潜泳)：</strong>发令枪响瞬间蹬出，水下海豚腿 4 次，破水前绝对不抬头，用时控制在 8.5 秒内。<br />
                  • <strong>15 ~ 25m (途中前程)：</strong>高频6次腿全力输出，大臂高肘抱水滑行，保持身体如冰刀切水。<br />
                  • <strong>25 ~ 35m (转身减耗)：</strong>快速贴水折叠，强力蹬壁射出，反弹越过 5 米线。<br />
                  • <strong>35 ~ 50m (拼死冲刺)：</strong>最后 10 米全油门，最后 5 米低头屏气，双手如闪电砸向终点触壁感应板！
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

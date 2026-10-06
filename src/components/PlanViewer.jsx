import React, { useState } from 'react';
import { Waves, Apple, Printer, Zap, Flag, Users, Target, CheckCircle2 } from 'lucide-react';

export default function PlanViewer({ growthRecords, swimRecords, trainings }) {
  const [activeSubTab, setActiveSubTab] = useState('tier2_blueprint');

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
                杭州大关三线走训队
              </span>
              <span style={{ 
                background: 'linear-gradient(135deg, #ff9500 0%, #ff5e3a 100%)', 
                color: '#fff', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(255, 149, 0, 0.3)'
              }}>
                核心攻坚：晋升大关二线队伍 (50自 &lt; 40.00s)
              </span>
              <span style={{ 
                background: 'rgba(0, 113, 227, 0.12)', 
                color: '#0071e3', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700 
              }}>
                一周五练 · 每练1小时 (1:15大组)
              </span>
              <span style={{ 
                background: 'rgba(52, 199, 89, 0.18)', 
                color: '#248a3d', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700 
              }}>
                最新实战：小候鸟 56.17s 个人新 PB
              </span>
            </div>
            <h2 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--primary-color)' }}>
              Nico 竞技成长方案 · 冲刺大关二线（&lt; 40s）与 2027 市长杯二级进阶
            </h2>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.92rem', marginTop: '6px' }}>
              基于 2026-09-19 小候鸟比赛 <strong>56.17 秒</strong>（较初测累计提速 17.83s）最新战报与比赛录像，锁定<strong>“50米自由泳突破 40 秒以内 · 入选大关二线队”</strong>核心战略目标，制定 16.17 秒时间账本与系统提速方案。
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
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>走训骨骼与水动力形态:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary-color)' }}>
              身高 {latestGrowth?.height || 128.5} cm | 手长 14.2cm | 脚长 19.3cm (天生大蹼面)
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>50m自当前PB与梯队差距:</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#d35400' }}>
              实测 {latestSwim?.time || '00:56.17'} ➔ 二线门槛 &lt; 40.00s (相差 16.17s)
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>走训累计总游程:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#248a3d' }}>
              {totalWaterMeters.toLocaleString()} 米 (专项打腿占比 ~42%)
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
          className={`tab-btn ${activeSubTab === 'tier2_blueprint' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('tier2_blueprint')}
          style={{ whiteSpace: 'nowrap', fontWeight: activeSubTab === 'tier2_blueprint' ? 700 : 500 }}
        >
          <Target size={16} />
          <span>二线达标（&lt;40s）攻坚专项拆解</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'water' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('water')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Waves size={16} />
          <span>60分钟高效水上课规划</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'technique' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('technique')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Zap size={16} />
          <span>自仰双姿技术精雕</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'group_coaching' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('group_coaching')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Users size={16} />
          <span>15人大组突围与家庭巩固</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('nutrition')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Apple size={16} />
          <span>日常营养与体能自律</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'strategy' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('strategy')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Flag size={16} />
          <span>二线达标与市长杯演进表</span>
        </button>
      </div>

      {/* Tab 0: Tier 2 (<40s) Selection Blueprint */}
      {activeSubTab === 'tier2_blueprint' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Why Tier 2 Matters Hero */}
          <div className="glass-card" style={{ 
            background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.08) 0%, rgba(0, 113, 227, 0.08) 100%)',
            border: '1.5px solid rgba(255, 149, 0, 0.3)'
          }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  background: 'linear-gradient(135deg, #ff9500 0%, #ff5e3a 100%)', 
                  color: '#fff', 
                  fontSize: '0.75rem', 
                  padding: '3px 10px', 
                  borderRadius: '12px', 
                  fontWeight: 700 
                }}>
                  核心目标解构
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                  为什么“进大关二线（&lt;40s）”是通往“二级运动员（31.50s）”的必经生命线？
                </h3>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#d35400', fontWeight: 700 }}>
                当前差距：16.17 秒 (56.17s ➔ &lt; 40.00s)
              </span>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--primary-color)', lineHeight: 1.6, marginBottom: '14px' }}>
              很多家长误以为从 56 秒提升到二级 31.50 秒只需要一直游下去，但在体制内竞技体育中，<strong>三线走训只是“选苗与动作塑形池”</strong>。若想冲击国家二级，必须在 7 岁半前攻入 <strong>40 秒以内成功晋升大关二线</strong>，获得精英级训练资源！
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.7)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '6px' }}>
                  🏊 当前：大关三线走训队 (1小时/天)
                </div>
                <ul style={{ fontSize: '0.82rem', color: 'var(--primary-color)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                  <li><strong>课时与组别：</strong> 每次 60 分钟，2 名教练各带 15 名学员，单道人数拥挤</li>
                  <li><strong>技术定位：</strong> 基础泳姿成型、水感游戏、自由泳咬苹果换气与仰泳平躺打腿</li>
                  <li><strong>限制瓶颈：</strong> 无法系统练专业跳台出发与滚翻转身，缺乏高负荷乳酸耐受冲刺</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(255, 245, 235, 0.9)', padding: '14px', borderRadius: '10px', border: '1.5px solid #ff9500' }}>
                <div style={{ fontWeight: 800, color: '#d35400', fontSize: '0.9rem', marginBottom: '6px' }}>
                  🚀 跃迁：大关二线精英队伍 (&lt;40s 准入标准)
                </div>
                <ul style={{ fontSize: '0.82rem', color: 'var(--primary-color)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                  <li><strong>课时与组别：</strong> 训练增加至 <strong>每次 1.5~2 小时</strong>，单道 3~5 人，专属快道</li>
                  <li><strong>高阶技术解禁：</strong> <strong>专业出发台跳水（Dive Start）</strong> 与 <strong>前滚翻转身（Flip Turn）</strong>，直接提速 3~4 秒！</li>
                  <li><strong>终极赋能：</strong> 具备代表大关体校出征市级、省级达级赛的固定名额，直通市长杯！</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 16.17 Seconds Time Budget Breakdown Card */}
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Zap size={20} style={{ color: '#ff9500' }} />
              16.17 秒时间账本科学拆解：从 56.17s 进击至 39.50s 的提速路径
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.88rem', marginBottom: '16px' }}>
              结合 Nico 手长 14.2cm（占身高 11.05%）、脚长 19.3cm（占身高 15.02%）的天赋形态，将 16.17 秒差距精确切片到 4 个关键技术模块中：
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className="history-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>攻坚技术模块</th>
                    <th>当前 56.17s 实测状态</th>
                    <th>二线达标 &lt;40s 技术标准</th>
                    <th>预期可挖潜提速</th>
                    <th>日常落地训练方法</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#0071e3' }}>
                      1. 出发起跳与入水滑行
                    </td>
                    <td>池边平缓蹬边入水，水下滑行仅约 3.5~4 米</td>
                    <td>池边微屈俯冲爆发起跳，流线型打腿滑行至 6~7 米</td>
                    <td style={{ fontWeight: 700, color: '#34c759' }}>省 1.5 ~ 2.0 秒</td>
                    <td>立定跳远强化弹跳（冲145cm+），发令口令反应起跳训练</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#ff9500' }}>
                      2. 半程转身与蹬壁水下腿
                    </td>
                    <td>手碰壁平转，蹬壁后无水下海豚腿直接划水</td>
                    <td>快速侧身触壁 / 引入前滚翻，水下加打 3~4 次蝶泳腿出水</td>
                    <td style={{ fontWeight: 700, color: '#34c759' }}>省 2.0 ~ 2.5 秒</td>
                    <td>练习水下快速缩身收膝触壁，蹬壁后保持绝对流线型射出</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#af52de' }}>
                      3. 途中游高肘抱水压腕
                    </td>
                    <td>前交叉直臂抢划，手长天赋未完全转化（划次约 48 次）</td>
                    <td>高肘抱水锁住水层，利用 14.2cm 手掌抓满水，划次降至 38 次</td>
                    <td style={{ fontWeight: 700, color: '#34c759' }}>省 6.0 ~ 8.0 秒</td>
                    <td>单臂扶板分解划手、陆上弹力带高肘引臂划水、数划次长滑行</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#248a3d' }}>
                      4. 高频六次腿耐力冲刺
                    </td>
                    <td>前程打腿有力，后程 15 米频率略有下降，脚踝轻微泛水</td>
                    <td>全程鞭状六次腿不衰减，大脚蹼推水，最后 15 米全力无氧冲刺</td>
                    <td style={{ fontWeight: 700, color: '#34c759' }}>省 4.0 ~ 5.0 秒</td>
                    <td>25米段落冲刺打腿（25m × 6组，间歇20s），脚背踝柔韧压脚背</td>
                  </tr>
                  <tr style={{ background: 'rgba(52, 199, 89, 0.08)' }}>
                    <td colSpan={3} style={{ fontWeight: 800, textAlign: 'right', color: 'var(--primary-color)' }}>
                      合计可挖潜总提速空间：
                    </td>
                    <td colSpan={2} style={{ fontWeight: 800, color: '#248a3d', fontSize: '0.95rem' }}>
                      预计缩短 13.5 ~ 17.5 秒 ➔ 目标实战成绩达到 38.60s ~ 39.80s（稳入二线！）
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 25m Speed Chain Velocity Ladder Card */}
          <div className="glass-card" style={{ borderLeft: '4px solid #0071e3' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#0071e3', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  最新考核衔接
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                  25米段落速度链阶梯突破：从 28.00s 考核到 20.00s 二线准入
                </h3>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#0071e3', fontWeight: 600 }}>
                10/06 巡线实测：28.00s ➔ 历史最好：26.50s ➔ 二线标杆：&lt; 20.00s
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', marginBottom: '12px', lineHeight: 1.5 }}>
              <strong>50米破 40 秒的本质是两个 25 米段落的叠加</strong>：前 25 米（带出发）需达到 18.5~19.5 秒，后 25 米（带转身）需达到 20.0~20.5 秒。10月6日巡线考核 28.00 秒印证了途中游巡航动作的稳定性，下一步训练方案全面引入“25米短段落阶梯提速包”：
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'rgba(0, 113, 227, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 113, 227, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0071e3' }}>第一阶梯 (2026.10-11)</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-color)', margin: '3px 0' }}>28.00s ➔ 24.50s</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>
                  出发后前 10 米坚决不换气，保持绝对流线型穿透水流，减少无谓呼吸阻力。
                </div>
              </div>

              <div style={{ background: 'rgba(255, 149, 0, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 149, 0, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff9500' }}>第二阶梯 (2026.12-2027.02)</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-color)', margin: '3px 0' }}>24.50s ➔ 22.00s</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>
                  高肘抱水压腕抓水点变现，单臂划水深度增加，25米划水次数降至 16 次以内。
                </div>
              </div>

              <div style={{ background: 'rgba(52, 199, 89, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#248a3d' }}>第三阶梯 (2027.03-05)</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#248a3d', margin: '3px 0' }}>22.00s ➔ &lt; 20.00s</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>
                  引入池边俯冲起跳爆发力，最后 5 米高频腿强行拍壁，50米速度自然打通进入 38~39s！
                </div>
              </div>
            </div>
          </div>

          {/* Three Core Pillars for Nico */}
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm" style={{ color: 'var(--primary-color)' }}>
              <CheckCircle2 size={20} style={{ color: '#248a3d' }} />
              结合 Nico 天赋形态的“进二线三大突围法则”
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(0, 113, 227, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #0071e3' }}>
                <strong style={{ color: '#0071e3', fontSize: '0.9rem' }}>法则一：大手掌变现“少划臂、长滑行”</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--primary-color)', lineHeight: 1.6, marginTop: '6px', margin: 0 }}>
                  Nico 手长 14.2cm（占身高 11.05%），天生抓水面积超前。在 1 小时走训课中，<strong>杜绝盲目高频摇橹式乱划</strong>。前手入水后保持前交叉“等待滑行”，手腕微屈形成厚实的抱水勺面，把每划前进距离由 0.95 米提升到 1.15 米。
                </p>
              </div>

              <div style={{ background: 'rgba(52, 199, 89, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #34c759' }}>
                <strong style={{ color: '#248a3d', fontSize: '0.9rem' }}>法则二：大脚蹼保持“高浮水流线型”</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--primary-color)', lineHeight: 1.6, marginTop: '6px', margin: 0 }}>
                  脚长 19.3cm（占身高 15.02%）配合极优的脚踝柔韧性。打腿时大腿发力带小腿，脚背内旋下压像海豚摆尾，让下半身始终高浮于水面最高阻力层上方，将 50 米后半程的降速压到最低。
                </p>
              </div>

              <div style={{ background: 'rgba(255, 149, 0, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #ff9500' }}>
                <strong style={{ color: '#d35400', fontSize: '0.9rem' }}>法则三：15人大组坚决“领游不跟游”</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--primary-color)', lineHeight: 1.6, marginTop: '6px', margin: 0 }}>
                  小候鸟比赛游出 56.17s 证明 Nico 在组内处于绝对前列。在 15 人走训课中，务必让 Nico 排在<strong>前 1~2 名出发</strong>，全程游在平静水域，避免跟在别人身后吃涡流脏水，保护水感和划水动作标准度。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: 60-Minute Efficient Water Sessions */}
      {activeSubTab === 'water' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Real class structure card */}
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Waves size={20} style={{ color: 'var(--accent-color)' }} />
              60 分钟走训课黄金时间轴分解 (每课 850m - 1000m 精细模型)
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              在 15 人的泳道中，1 小时无法走大负荷堆量，必须实行<strong>“模块化高质练习”</strong>，确保每一次蹬壁、每一次划手都在高质量建立动作动力定型。
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              {/* Timeline Card */}
              <div style={{ background: 'rgba(0, 113, 227, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 113, 227, 0.15)' }}>
                <h4 style={{ color: '#0071e3', fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>
                  ⏱️ 60 分钟四步走走训结构表
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ borderLeft: '3px solid #0071e3', paddingLeft: '10px' }}>
                    <strong>00 ~ 10 min | 水感唤醒与流线型滑行 (150m)：</strong><br />
                    • 蹬壁流线型漂浮滑行 4×25m（专注核心收紧与双手重叠夹耳）<br />
                    • 水下慢吐气与水面快吸气节奏预热
                  </div>
                  <div style={{ borderLeft: '3px solid #34c759', paddingLeft: '10px' }}>
                    <strong>10 ~ 30 min | 专项打腿核心板块 (350m - 400m)：</strong><br />
                    • 自由泳扶板打腿 6×25m（大腿发力、脚背绷直切水）<br />
                    • 仰泳平躺双手贴体打腿 4×25m（腹部贴水、脚尖踢出细密沸水花）<br />
                    • 徒手水下海豚腿练习 4×15m
                  </div>
                  <div style={{ borderLeft: '3px solid #ff9500', paddingLeft: '10px' }}>
                    <strong>30 ~ 52 min | 动作精雕与配合游 (300m - 350m)：</strong><br />
                    • 自由泳单臂分解 + 侧向咬苹果呼吸练习 4×25m<br />
                    • 仰泳单臂直臂提手与身体中轴转动 4×25m<br />
                    • 50m 自由泳完整配合长滑行 2~3 组（长划幅少划水）
                  </div>
                  <div style={{ borderLeft: '3px solid #af52de', paddingLeft: '10px' }}>
                    <strong>52 ~ 60 min | 趣味速度冲刺与放松 (100m)：</strong><br />
                    • 15米极速冲刺小对抗 2 组（激发兴奋度）+ 50m 轻松慢游排酸
                  </div>
                </div>
              </div>

              {/* Volume & Quality Focus */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <h4 style={{ color: 'var(--primary-color)', fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>
                  📊 一周五练周负荷与质量监控
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--secondary-color)' }}>
                  • <strong>单课总游程：</strong>稳定在 <strong>850米 ~ 1,000米</strong>（打腿占比保持在 <strong>40% 左右</strong>）。<br />
                  • <strong>每周五课总游程：</strong>约 <strong>4,500米 ~ 5,000米</strong>。对于 6.5 岁初学儿童，这一体量既不损伤幼嫩关节，又能充分建立肌肉神经记忆。<br />
                  • <strong>质量优先于米数：</strong>在 15 人的道次中，与其疲惫地游 1500m 导致动作严重变形，不如精力充沛地完成 900m 的极致流线型游进！
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Technique Fine-Tuning */}
      {activeSubTab === 'technique' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Zap size={20} style={{ color: '#ff9500' }} />
              自仰双姿技术攻坚与错误动作排查手册
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              6 岁小队员在初学自由泳与仰泳时最容易出现姿态变形。掌握以下两项关键动作口令，能让 Nico 的划水阻力降低 30% 以上！
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              {/* Freestyle Fine-Tuning */}
              <div style={{ background: 'rgba(0, 113, 227, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 113, 227, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ background: '#0071e3', color: '#fff', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>自由泳</span>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>自由泳核心精雕三要诀</h4>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--primary-color)' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#0071e3' }}>1. 侧向“咬苹果”换气（严禁抬头）：</strong><br />
                    换气时头部绝不向前上方抬起。身体沿脊柱中轴转动 45 度，<strong>一只泳镜留在水里，一只泳镜露出水面</strong>，嘴巴从水窝子侧向轻巧吸气。
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#0071e3' }}>2. 杜绝大剪刀交叉腿：</strong><br />
                    换气时小队员容易两腿分得很开（剪刀腿刹车）。要求大腿主动收紧带动小腿，踢水宽度控制在 30cm 窄通道内。
                  </div>
                  <div>
                    <strong style={{ color: '#0071e3' }}>3. 前交叉长划幅（DPS）：</strong><br />
                    前臂入水后向前充分伸展送肩滑行，等待另一只手推水过腰部再开始抱水，不盲目乱摇手臂。
                  </div>
                </div>
              </div>

              {/* Backstroke Introduction */}
              <div style={{ background: 'rgba(52, 199, 89, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ background: '#34c759', color: '#fff', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>仰泳</span>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>仰泳启蒙初学三道关</h4>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--primary-color)' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#248a3d' }}>1. 平躺头颈中立（双眼看天）：</strong><br />
                    平躺在水面上时，头颈与水面平行，双眼垂直向上看天花板，耳朵浸入水中一半，腹部像小桌子一样提起来，严防“坐水”。
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#248a3d' }}>2. 大脚蹼沸水踢水：</strong><br />
                    膝盖不要露出水面！利用脚背柔韧性向上鞭打，脚尖把水面踢得像开水沸腾一样翻滚细小浪花。
                  </div>
                  <div>
                    <strong style={{ color: '#248a3d' }}>3. 直臂提手与身体中轴轻转：</strong><br />
                    大拇指先出水，直臂划向头顶前方，小拇指入水切入。身体左右轻微自然转动，中轴保持笔直。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Group Coaching & Home Reinforcement */}
      {activeSubTab === 'group_coaching' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Users size={20} style={{ color: '#0071e3' }} />
              15人大组课突围法则与家庭 5 分钟小练习
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              在大关体校 2 名教练各带 15 名学生的走训体系中，教练精力有限。掌握科学的跟游心理与家庭简单辅助，能让 Nico 在 15 人中脱颖而出！
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              {/* Lane Tactics */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '8px' }}>
                  🏊 泳道秩序：争做“领流水手”
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--secondary-color)' }}>
                  • <strong>抢占前 1~3 位出发：</strong>排在前面游，水面平整没有乱流，能最大程度体会高肘水感与平滑滑行。<br />
                  • <strong>不跟游吃浪花：</strong>若排在后面，保持与前一名队员 5 米以上间距，不贴脚跟，避免被他人水花呛水或打乱呼吸节奏。<br />
                  • <strong>认真听教练口令：</strong>每组到岸后，迅速摘下泳镜注视教练，听清下一组的打腿或划手技术要求。
                </div>
              </div>

              {/* Home 5-min drills */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34c759', marginBottom: '8px' }}>
                  🏠 课后家庭 5 分钟地毯小巩固 (无需泳池)
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--secondary-color)' }}>
                  • <strong>靠墙自由泳转体换气练习 (2分钟)：</strong>身体贴墙站立，单臂前伸，身体沿墙转动 45 度侧头贴肩吸气，巩固“不抬头”的肌肉记忆。<br />
                  • <strong>床沿仰卧平躺踢腿 (2分钟)：</strong>平躺在床上或瑜伽垫上，双臂贴侧身，直腿轻快上下摆动，体会大腿带动小腿的发力感。<br />
                  • <strong>跪姿踝背屈压脚掌 (1分钟)：</strong>巩固天然大脚蹼踝关节柔韧性，保持推水推进效率。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Low-Load Nutrition & Sleep */}
      {activeSubTab === 'nutrition' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Apple size={20} style={{ color: '#34c759' }} />
              1小时走训作息与轻负荷营养食谱
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              对于 6-7 岁儿童，1 小时的水上运动量适度，饮食关键在于<strong>“课前不积食、课后速补水蛋白、晚间保深睡”</strong>。
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '8px' }}>
                  ⏰ 放学到就寝走训一日作息表
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--primary-color)' }}>
                  • <strong>15:50 放学 / 课前轻补给：</strong>全麦小吐司1片 + 香蕉半根 + 温开水100ml（切勿吃过饱引起水下胃胀）。<br />
                  • <strong>16:30 ~ 17:30 走训水上课：</strong>专注完成 60 分钟高质训练。<br />
                  • <strong>17:45 课后黄金30分：</strong>温纯牛奶 250ml + 水煮蛋 1 个（快速补充肌肉微损伤）。<br />
                  • <strong>18:30 ~ 19:15 晚餐：</strong>清蒸鱼/大虾 + 豆腐西红柿蔬菜 + 杂粮米饭半碗。<br />
                  • <strong>21:15 关灯入睡：</strong>确保 9.5 小时以上深睡，促进脑垂体生长激素脉冲分泌。
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34c759', marginBottom: '8px' }}>
                  🛡️ 骨骼生长与防疲劳三要素
                </h4>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--primary-color)' }}>
                  • <strong>骨骼钙素补充：</strong>每日随晚餐补充少儿乳钙（400-600mg）+ 维生素D3，助力腿骨纵向发育。<br />
                  • <strong>铁质吸收防疲劳：</strong>每周吃 1~2 次动物红肉或鸭血，保障血红蛋白携氧。<br />
                  • <strong>晨脉健康监测：</strong>早起静息心率在 <strong>70~74 次/分</strong> 属于充沛恢复状态，若出现感冒或心率明显偏快，当天下水以慢游漂浮为主。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Steady Path to Mayor's Cup 2nd-Tier */}
      {activeSubTab === 'strategy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm">
              <Flag size={20} style={{ color: '#248a3d' }} />
              二线队伍选拔达标（&lt;40s）与市长杯二级真实演进全景表
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              基于小候鸟比赛 <strong>56.17 秒</strong> 破分突破，梯队晋升逻辑非常明确：<strong>在三线 1 小时课中把 50 米自提升至 40 秒内 ➔ 晋升大关二线队伍 ➔ 借助二线跳台出发与 1.5~2 小时大负荷 ➔ 冲击 2027 年底市长杯国家二级（31.50s）！</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Step 1 */}
              <div style={{ background: 'rgba(0, 113, 227, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #0071e3' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#0071e3', fontSize: '0.95rem' }}>阶段一：2026 秋冬季 (当前 6.5岁) · 破分巩固与稳扎 50 秒关口</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-color)' }}>实测 56.17s ➔ 冲击 50-52 秒 (距二线差 ~10s)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  小候鸟比赛斩获 56.17 秒，较前测大幅提速 6.83 秒并击穿 1 分钟大关。当前核心是将“咬苹果侧向换气”完全形成潜意识肌肉记忆，严防抬头水阻；强化池壁快速侧身蹬壁滑行；仰泳 50 自摸底进入 1 分钟以内。
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ background: 'rgba(255, 149, 0, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #ff9500' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#d35400', fontSize: '0.95rem' }}>阶段二：2027 春季 (7.0岁) · 迎春杯实战与提频突破 45 秒</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-color)' }}>50自突破 43-45 秒 (距二线差 3-5s)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  自仰双项兼备，动作阻力减小后单课游程自然提升至 1100m。通过出战杭州迎春杯少儿赛，开始抓出发池边俯冲反应与途中高肘抱水压腕，大幅拉开划幅。
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ background: 'rgba(255, 245, 235, 0.95)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #ff9500' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#d35400', fontSize: '0.95rem' }}>阶段三：2027 夏季 (7.5岁) · 【决战二线】突破 40 秒大关 · 成功晋升二线队！</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d35400' }}>50自突破 &lt; 40.00 秒 (冲 38-39s) · 跨过国家三级</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  大关二线梯队夏季考核选拔！通过滚翻转身（单次省 1.5~2s）与全程六次腿无衰减冲刺，成功跨过 40 秒二线硬指标（同步达标国家三级 39.50s），正式跨入大关二线队伍，开启每天 1.5~2 小时、专属跳台的高阶集训轨道！
                </div>
              </div>

              {/* Step 4 */}
              <div style={{ background: 'rgba(52, 199, 89, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #34c759' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#248a3d', fontSize: '0.95rem' }}>阶段四：2027 年底市长杯决赛 (7.8岁) · 二线专业平台爆发 · 斩获国家二级！</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#248a3d' }}>50自突破 ≤ 31.50 秒 (国家二级)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  在二线精英团队中历练半年，依托专业跳台出发（0.65s 爆发力）、精湛水下腿与超长划幅，在市长杯决赛中破壁达标国家二级运动员！
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

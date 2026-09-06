import React, { useState } from 'react';
import { Waves, Apple, Printer, Zap, Flag, Users } from 'lucide-react';

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
                杭州大关三线走训队
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
                自由泳精雕 + 仰泳启蒙
              </span>
            </div>
            <h2 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--primary-color)' }}>
              Nico 竞技成长方案 · 1小时走训实效与市长杯二级进阶
            </h2>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.92rem', marginTop: '6px' }}>
              紧密结合当前<strong>“一周五练、每次 1 小时、2 名教练各带 15 名学生、自由泳动作深入精雕 + 仰泳启蒙初学”</strong>的真实训练环境，定制最接地气的高效培养全案。
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
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>走训骨骼与水动力:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary-color)' }}>
              身高 {latestGrowth?.height || 129.6} cm | 臂展 {latestGrowth?.armSpan || 129.5} cm
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>50m自当前PB:</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-color)' }}>
              {latestSwim?.time || '01:04.20'} ➔ 终极目标 ≤ 31.50s
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>走训累计总游程:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#248a3d' }}>
              {totalWaterMeters.toLocaleString()} 米 (打腿占比 ~42%)
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
          <span>轻负荷日常营养与深睡</span>
        </button>

        <button 
          className={`tab-btn ${activeSubTab === 'strategy' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('strategy')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Flag size={16} />
          <span>市长杯二级稳步演进表</span>
        </button>
      </div>

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
              稳扎稳打走向 2027 市长杯二级运动员的真实演进路径
            </h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '16px' }}>
              为什么现阶段“每天 1 小时精雕动作”是通向 2027 年底国家二级运动员（31.50s）最科学的路径？因为优秀的流线型动作能将水阻降低 30%，比过早死堆体能更具爆发力！
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Step 1 */}
              <div style={{ background: 'rgba(0, 113, 227, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #0071e3' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#0071e3', fontSize: '0.95rem' }}>2026 秋冬季 (当前 6.5岁)：自仰动作规范定型</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-color)' }}>实测 63.00s ➔ 破1分钟 ➔ 冲 54-56秒</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  在每天 1 小时的 15 人走训课中，把自由泳咬苹果侧向换气和仰泳平躺打腿彻底定型。最新实测达 63.00 秒，较前测再提速 1.2 秒，距离破 1 分钟大关仅差 3.0 秒！
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ background: 'rgba(255, 149, 0, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #ff9500' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#d35400', fontSize: '0.95rem' }}>2027 春季 (7.0岁)：迎春杯实战与突破国家三级</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-color)' }}>50自突破 39.50 秒 (国家三级)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  自仰双项兼备，动作阻力减小后单课游程自然提升至 1100m。通过迎春杯比赛正式跨过国家三级运动员门槛。
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ background: 'rgba(175, 82, 222, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #af52de' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#af52de', fontSize: '0.95rem' }}>2027 暑期 (7.5岁)：暑期大关特训突破 35 秒</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-color)' }}>50自逼近 33~35 秒</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  暑期集中强化蛙泳与蝶泳波浪腿，四式均衡发展，提升段落冲刺耐力，逼近二级门槛。
                </div>
              </div>

              {/* Step 4 */}
              <div style={{ background: 'rgba(52, 199, 89, 0.04)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #34c759' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#248a3d', fontSize: '0.95rem' }}>2027 年底市长杯决赛 (7.8岁)：斩获国家二级运动员！</strong>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#248a3d' }}>50自突破 ≤ 31.50 秒</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', lineHeight: 1.5 }}>
                  经过 15 个月的系统积淀，以完美的出发爆发力（0.65s）与超长划幅，在市长杯决赛中破壁达标国家二级运动员！
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

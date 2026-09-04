import React, { useState } from 'react';
import { Waves, HeartPulse, Apple, Target, CheckCircle2, Printer, Clock } from 'lucide-react';

export default function PlanViewer({ growthRecords, swimRecords, trainings }) {
  const [activeSubTab, setActiveSubTab] = useState('water');

  const latestGrowth = growthRecords && growthRecords.length > 0 ? growthRecords[growthRecords.length - 1] : null;
  const latestSwim = swimRecords && swimRecords.length > 0 ? swimRecords[swimRecords.length - 1] : null;
  const totalWaterMeters = trainings ? trainings.reduce((acc, cur) => acc + (cur.totalMeters || 0), 0) : 0;

  return (
    <div>
      {/* Header Banner */}
      <div className="glass-card mb-lg" style={{ 
        background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.08) 0%, rgba(52, 199, 89, 0.08) 100%)',
        border: '1px solid rgba(0, 113, 227, 0.2)'
      }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ 
                background: 'var(--accent-color)', 
                color: '#fff', 
                fontSize: '0.75rem', 
                padding: '3px 10px', 
                borderRadius: '20px', 
                fontWeight: 600,
                letterSpacing: '0.04em'
              }}>
                杭州大关三线游泳队
              </span>
              <span style={{ 
                background: 'rgba(52, 199, 89, 0.15)', 
                color: '#248a3d', 
                fontSize: '0.75rem', 
                padding: '3px 10px', 
                borderRadius: '20px', 
                fontWeight: 600 
              }}>
                6-7岁女子竞技梯队专属
              </span>
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              Nico 个人竞技战力提升与健将级进阶培养方案
            </h2>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.92rem', marginTop: '6px' }}>
              基于杭州大关世界冠军摇篮（陈慧佳、杨雨）教练组青训大纲，融合运动生理学敏感期规律与国家健将级梯级成长模型。
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
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>当前发育状态:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              身高 {latestGrowth?.height || 129.6} cm | 臂展 {latestGrowth?.armSpan || 129.5} cm
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>水上基线速度:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--accent-color)' }}>
              50米自由泳: {latestSwim?.time || '01:04.20'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>三线队出勤累计:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#34c759' }}>
              {totalWaterMeters} 米 水上包已入库
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>长远奋斗目标:</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#ff9500' }}>
              国家健将级运动员 (女子50自 26.5s)
            </div>
          </div>
        </div>
      </div>

      {/* Plan Navigation Tabs */}
      <div className="nav-tabs mb-lg" style={{ maxWidth: '640px' }}>
        <button 
          className={`tab-btn ${activeSubTab === 'water' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('water')}
        >
          <Waves size={15} />
          <span>水上专项提升</span>
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'fitness' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('fitness')}
        >
          <HeartPulse size={15} />
          <span>陆上体能与柔韧</span>
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('nutrition')}
        >
          <Apple size={15} />
          <span>科学饮食与恢复</span>
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'roadmap' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('roadmap')}
        >
          <Target size={15} />
          <span>健将级晋级路线</span>
        </button>
      </div>

      {/* Sub-Tab 1: Water Technical Plan */}
      {activeSubTab === 'water' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Card 1: Kicking & Water Feel */}
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm" style={{ color: 'var(--accent-color)' }}>
              <Waves size={20} />
              维度一：大关三线水上训练四大专项攻坚模块
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--secondary-color)', marginBottom: 'var(--space-md)' }}>
              6-7岁是水感建构（Water Feel）和动作神经元链接的核心窗口，重质不求盲目跑量，以高划幅（DPS）和高频流线型打腿为主核。
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} color="var(--accent-color)" />
                  1. 专项打腿发动机工程 (Kicking Engine)
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>打腿占课比：</strong> 每堂训练课打腿量不少于 <strong>30%~40% (500m-800m)</strong>。<br />
                  • <strong>自由泳打腿：</strong> 保持膝关节微屈、以髋为轴、鞭状下压。利用 Nico 天生脚踝柔韧优势，形成大面积推水。<br />
                  • <strong>海豚打腿：</strong> 每组蹬壁必接 <strong>3-4次深水海豚腿</strong>，出水前保持平整身体姿态，训练腹背核心节律。
                </p>
              </div>

              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} color="var(--accent-color)" />
                  2. 超直流线型与高肘抓水 (Streamline & Catch)
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>减阻重于发力：</strong> 水中阻力与速度平方成正比。入水后头部死死夹在两臂之间，下颌微收，维持水平中轴。<br />
                  • <strong>早立小臂高肘抱水 (EVF)：</strong> 利用手长优势，入水后快速屈腕屈肘，使小臂与手掌形成垂直截面，感受整片水柱向后推。<br />
                  • <strong>摇橹划水 (Sculling)：</strong> 课前 200 米进行前摇橹与中摇橹，培养敏感抓水水膜。
                </p>
              </div>

              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} color="var(--accent-color)" />
                  3. 转身蹬壁与出水衔接 (Turn & Breakout)
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>短池比赛分水岭：</strong> 50米/100米短池比赛胜负往往在转身。进池壁前 5 米绝不减速、绝不抬头寻找池壁。<br />
                  • <strong>团身翻滚：</strong> 下颌贴紧锁骨，以肚脐为轴快速翻转，双足掌精准、结实蹬击池壁中偏上方。<br />
                  • <strong>出水第一划：</strong> 蹬壁滑行后第一划必须是强力抱水冲刺，无呼吸启动，快速抢占水面初速度。
                </p>
              </div>

              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} color="var(--accent-color)" />
                  4. 四式均衡兼修 (200米个人混合泳底子)
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6 }}>
                  • <strong>拒绝过早单项化：</strong> 6-7岁坚决不可只游自由泳。大关传统优势正是混合泳人才辈出（如于子迪）。<br />
                  • <strong>仰泳：</strong> 强化躯干两侧45度滚动，头颈稳定不摆动。<br />
                  • <strong>蛙泳：</strong> 收腿窄、蹬夹迅猛合拢，滑行充分；蝶泳强化胸椎波浪起伏传导至指尖。
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Schedule Model */}
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm" style={{ color: 'var(--primary-color)' }}>
              <Clock size={20} color="var(--accent-color)" />
              大关三线走训期：周课表负荷科学配置模版
            </h3>
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>星期</th>
                    <th>训练时段</th>
                    <th>核心主题</th>
                    <th>建议水上量</th>
                    <th>强度区间与攻坚关键</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>周一</strong></td>
                    <td>下午 16:30 - 18:00</td>
                    <td>水感唤醒与四式打腿专项</td>
                    <td>1400m - 1600m</td>
                    <td><span style={{ color: '#248a3d', fontWeight: 600 }}>A1~A2</span>：打腿占比50%，纠正周末休整后的动作细节</td>
                  </tr>
                  <tr>
                    <td><strong>周二</strong></td>
                    <td>下午 16:30 - 18:15</td>
                    <td>自由泳/仰泳长划幅有氧配合</td>
                    <td>1600m - 1800m</td>
                    <td><span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>A2基础有氧</span>：高肘抱水，三划一换气平衡呼吸</td>
                  </tr>
                  <tr>
                    <td><strong>周三</strong></td>
                    <td>下午 16:30 - 18:00</td>
                    <td>出发跳水、转身与水下海豚腿</td>
                    <td>1300m - 1500m</td>
                    <td><span style={{ color: '#af52de', fontWeight: 600 }}>技术精度课</span>：起跳反应速度测验，转身不减速练习</td>
                  </tr>
                  <tr>
                    <td><strong>周四</strong></td>
                    <td>下午 16:30 - 18:15</td>
                    <td>蛙泳收蹬夹与蝶泳节律专项</td>
                    <td>1500m - 1700m</td>
                    <td><span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>A2~EN1</span>：蛙泳窄收快夹，蝶泳胸部波浪起伏</td>
                  </tr>
                  <tr>
                    <td><strong>周五</strong></td>
                    <td>下午 16:30 - 18:00</td>
                    <td>25m/50m 短冲刺与计时测验</td>
                    <td>1200m - 1400m</td>
                    <td><span style={{ color: '#ff9500', fontWeight: 600 }}>SP速度冲刺</span>：全力以赴冲刺记录，模拟比赛心理刺激</td>
                  </tr>
                  <tr>
                    <td><strong>周六</strong></td>
                    <td>上午 09:00 - 11:00</td>
                    <td>四式综合大包与水上耐力拓展</td>
                    <td>1800m - 2200m</td>
                    <td><span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>EN1综合有氧</span>：混合泳模拟大容量包，打牢心肺耐力</td>
                  </tr>
                  <tr>
                    <td><strong>周日</strong></td>
                    <td>全天休整</td>
                    <td>深度睡眠、家庭亲子放松与恢复</td>
                    <td>0m (静养)</td>
                    <td><span style={{ color: '#34c759', fontWeight: 600 }}>超量恢复</span>：充分补水、高钙饮食、早睡生长素分泌</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Dryland Fitness & Flexibility Plan */}
      {activeSubTab === 'fitness' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm" style={{ color: '#ff9500' }}>
              <HeartPulse size={20} />
              维度二：6-7岁幼少儿陆上体能与柔韧敏感期科学方案
            </h3>
            <div style={{ background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.2)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.88rem', color: 'rgb(200, 30, 20)' }}>
              <strong>⚠️ 6-7岁少儿体能训练第一铁律：</strong> 该年龄段骨骼骨骺板未闭合、软骨组织占比较高，<strong>严禁进行深蹲负重、杠铃抓举、哑铃大重量抗阻等器械负荷</strong>！体能训练重心必须100%集中于：<strong>核心抗旋稳定性、肩踝关节柔韧度、下肢弹跳协调性、神经灵敏反应</strong>。
            </div>

            <div className="grid-3" style={{ gap: '16px' }}>
              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                  1. 核心与姿态控制 (水中平漂身躯)
                </h4>
                <ul style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6, paddingLeft: '16px' }}>
                  <li><strong>标准静态平板支撑：</strong> 目标 60-90 秒。要求头、背、臀、脚跟成绝对直线，不塌腰、不翘臀。</li>
                  <li><strong>俯卧两头起 (小飞燕)：</strong> 每次保持 3 秒，15次/组，强化竖脊肌与后背链，防止水中沉臀。</li>
                  <li><strong>死虫式 (Dead Bug)：</strong> 仰卧四肢对角线延展伸缩，20次/组，建立水中换气时不失核心平衡的控制力。</li>
                </ul>
              </div>

              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#af52de', marginBottom: '8px' }}>
                  2. 游泳专项肩踝柔韧 (双蹼与高肘硬件)
                </h4>
                <ul style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6, paddingLeft: '16px' }}>
                  <li><strong>踝关节跪压脚背：</strong> 每天 10-15 分钟。脚背完全贴地跪坐，必要时双膝下垫毛巾微抬，拉长足背韧带，打造顶级脚蹼。</li>
                  <li><strong>肩关节转肩拉伸：</strong> 双手持跳绳/木棍做前后过肩，测量脱手宽度，目标接近肩宽 1.2 倍。</li>
                  <li><strong>坐位体前屈牵拉：</strong> 双腿并拢膝盖贴地，双手触碰脚尖并越过脚掌，保障出发翻转时躯干折叠速度。</li>
                </ul>
              </div>

              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#34c759', marginBottom: '8px' }}>
                  3. 弹跳爆发与敏捷反应 (出发蹬壁原型)
                </h4>
                <ul style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6, paddingLeft: '16px' }}>
                  <li><strong>立定跳远技术强化：</strong> 摆臂屈膝蹬地，目标 135-145 cm。直接对应池壁转身蹬击反作用力。</li>
                  <li><strong>单双脚敏捷梯连续跳：</strong> 刺激脚踝弹性势能储存与足弓刚性。</li>
                  <li><strong>发令声反应起跳：</strong> 闭眼听掌声/哨声瞬间向垫子扑跳入水姿势，训练前庭神经与声感反应时。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Nutrition & Bio-Recovery Plan */}
      {activeSubTab === 'nutrition' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm" style={{ color: '#248a3d' }}>
              <Apple size={20} />
              维度三：大关少体校专业营养配比与黄金恢复食谱
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--secondary-color)', marginBottom: 'var(--space-md)' }}>
              游泳是全身高能量消耗运动，水温吸热加快基础代谢。6岁女童处在骨骼拉长黄金期，必须保证<strong>“高密度优质能量、精准修复时机、深度生长激素睡眠”</strong>。
            </p>

            <div className="grid-2" style={{ gap: '16px' }}>
              {/* Timeline Strategy */}
              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '10px' }}>
                  ⏰ 训练日进餐时间轴精准策略
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <div style={{ padding: '8px 12px', background: 'rgba(0, 113, 227, 0.04)', borderRadius: '8px' }}>
                    <strong>课前 60 - 90 分钟（稳态充能）：</strong><br />
                    • 推荐：香蕉半根/1根 + 全麦吐司1片 / 杂粮粥1小碗 + 温水 150ml。<br />
                    • 禁忌：严禁吃油炸食物、奶油、大量肥肉（导致消化停滞、水中胃痉挛反胃）。
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(52, 199, 89, 0.04)', borderRadius: '8px' }}>
                    <strong>课中每 20 分钟（水合电解质）：</strong><br />
                    • 泳池即使不出汗感觉，身体也处在脱水状态。准备专属水壶，备好低浓度淡盐水或果汁稀释水，润口小口慢咽。
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(255, 149, 0, 0.04)', borderRadius: '8px' }}>
                    <strong>课后 30 分钟内（黄金修复窗口）：</strong><br />
                    • 肌糖原合成酶活性最高时机。立即饮用脱脂/低脂温纯牛奶 200-250ml + 水煮蛋1个 + 少量蓝莓/葡萄干。<br />
                    • 快速修复受损肌肉微纤维，阻止肌肉组织自身分解供能。
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px' }}>
                    <strong>正餐晚餐（19:00左右）：</strong><br />
                    • 优质蛋白质（清蒸海鱼/去皮鸡胸/瘦牛肉 80-100g）+ 充足深色蔬菜（西兰花/菠菜 150g）+ 优质碳水（杂粮饭 1碗）。
                  </div>
                </div>
              </div>

              {/* Micronutrients & Sleep */}
              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '10px' }}>
                  🦴 骨骼长高、抗贫血与生长激素管理
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <div style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                    <strong>1. 骨量储备与身高峰值（钙 + 维生素D3）：</strong><br />
                    每日保证 500ml 优质牛奶或酸奶，搭配维生素D3促进肠道钙吸收。骨骼纵向拉长是游泳顶尖选手的硬件天花板。
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                    <strong>2. 防范少儿游泳运动性贫血（铁 + 维C）：</strong><br />
                    水中高频足部拍打可能导致足底微血管红细胞机械性破坏。每周摄入 2 次猪肝/鸭血或红瘦肉，搭配富含维生素C的水果（猕猴桃、橙子）。
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                    <strong>3. 夜间生长激素分泌黄金窗口：</strong><br />
                    生长激素（HGH）在夜间 <strong>22:00 - 02:00</strong> 深度睡眠期呈脉冲式爆发分泌。要求 Nico 在 <strong>21:15 前洗漱完毕上床</strong>，确保每晚 <strong>9.5 - 10 小时</strong> 深度睡眠，关掉小夜灯保持完全黑暗。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Master of Sports Pathway & Standards */}
      {activeSubTab === 'roadmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="glass-card">
            <h3 className="mb-sm flex-gap-sm" style={{ color: '#d35400' }}>
              <Target size={20} />
              维度四：国家健将级游泳运动员梯次晋级路线图谱
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--secondary-color)', marginBottom: 'var(--space-md)' }}>
              按照国家体育总局最新《游泳运动员技术等级标准》，梳理从“杭州大关三线队走训”到“国家级运动健将”的递进里程碑。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Stage 1 */}
              <div style={{ display: 'flex', gap: '14px', background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(52, 199, 89, 0.4)' }}>
                <div style={{ minWidth: '80px', textAlign: 'center' }}>
                  <span style={{ background: '#34c759', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    当前阶段
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>6-7 岁</div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                    阶段一：杭州大关三线运动员立足与水感打底 (已顺利达标入选)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.5, marginTop: '4px' }}>
                    • <strong>核心任务：</strong> 适度走训出勤节奏，50米自由泳从 1:14 稳步提升至 1:04。四式动作定型，掌握高肘抱水和蹬壁滑行。<br />
                    • <strong>考核指标：</strong> 大关队内月度测验合格，全勤完成每日水上1500m-1800m包。
                  </p>
                </div>
              </div>

              {/* Stage 2 */}
              <div style={{ display: 'flex', gap: '14px', background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <div style={{ minWidth: '80px', textAlign: 'center' }}>
                  <span style={{ background: 'var(--accent-color)', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    近程目标
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>7-8 岁</div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                    阶段二：杭州“市长杯”少儿游泳赛亮相与破1分钟冲刺
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.5, marginTop: '4px' }}>
                    • <strong>核心任务：</strong> 代表大关队出征拱墅区中小学生赛与杭州市长杯。50米自由泳目标 <strong>突破 58.00 秒大关</strong>。<br />
                    • <strong>考核指标：</strong> 200米个人混合泳能够以标准动作无扣分完赛，具备正式大赛竞技心理。
                  </p>
                </div>
              </div>

              {/* Stage 3 */}
              <div style={{ display: 'flex', gap: '14px', background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <div style={{ minWidth: '80px', textAlign: 'center' }}>
                  <span style={{ background: '#af52de', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    等级起点
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>9-10 岁</div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                    阶段三：国家三级运动员达标 (女子 50自 35.00s / 100自 1:18.00)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.5, marginTop: '4px' }}>
                    • <strong>核心任务：</strong> 取得中国游泳协会颁发的首张正式国家等级运动员证书。开始进入大容量有氧基础扩张期。<br />
                    • <strong>考核指标：</strong> 转身蹬壁海豚腿出水达到5米线以上，打腿具备高频六次腿本能。
                  </p>
                </div>
              </div>

              {/* Stage 4 */}
              <div style={{ display: 'flex', gap: '14px', background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <div style={{ minWidth: '80px', textAlign: 'center' }}>
                  <span style={{ background: '#ff9500', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    竞技分水岭
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>11-13 岁</div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                    阶段四：国家二级运动员认证 (女子 50自 31.50s / 100自 1:09.50)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.5, marginTop: '4px' }}>
                    • <strong>核心任务：</strong> 竞技体育黄金分水岭。达到国家二级后，已具备国内所有一流重点初高中高水平运动队特招资格。<br />
                    • <strong>考核指标：</strong> 有机会选拔进入市二线集训队或省少体校预备组。
                  </p>
                </div>
              </div>

              {/* Stage 5 */}
              <div style={{ display: 'flex', gap: '14px', background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 149, 0, 0.08) 100%)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(255, 149, 0, 0.3)' }}>
                <div style={{ minWidth: '80px', textAlign: 'center' }}>
                  <span style={{ background: '#d35400', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    最高殿堂
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>14-16 岁+</div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d35400' }}>
                    阶段五：国家级运动健将 (女子 50自 26.50s / 100自 57.50s)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.5, marginTop: '4px' }}>
                    • <strong>终极目标：</strong> 代表浙江省/国家征战全国游泳锦标赛、全运会乃至国际泳联大赛。大关学姐（陈慧佳、杨雨）曾经登顶的巅峰！<br />
                    • <strong>考级达标：</strong> 国家健将级认证直接享有顶尖高校免试保送及国家队集训荣誉。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

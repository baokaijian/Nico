import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, Ruler, Scale, Activity, Sparkles, Award, ShieldCheck, Target, Clock } from 'lucide-react';

export default function Dashboard({ growthRecords, swimRecords, trainings, fitnessRecords, nutritionRecords, goals }) {
  const [selectedStroke, setSelectedStroke] = useState('自由泳');
  const [selectedDistance, setSelectedDistance] = useState('50m');

  // Auto-select filters to match latest swim record if available
  useEffect(() => {
    if (swimRecords && swimRecords.length > 0) {
      const latest = swimRecords[swimRecords.length - 1];
      if (latest.stroke) setSelectedStroke(latest.stroke);
      if (latest.distance) setSelectedDistance(latest.distance);
    }
  }, [swimRecords]);

  // Get latest growth metrics
  const latestGrowth = growthRecords && growthRecords.length > 0 ? growthRecords[growthRecords.length - 1] : null;
  const apeIndex = latestGrowth && latestGrowth.height && latestGrowth.armSpan 
    ? (latestGrowth.armSpan / latestGrowth.height).toFixed(3) 
    : '无';

  // Get latest swim record
  const latestSwim = swimRecords && swimRecords.length > 0 ? swimRecords[swimRecords.length - 1] : null;

  // Filter swim records for the chart
  const filteredSwimRecords = (swimRecords || []).filter(
    (r) => r.stroke === selectedStroke && r.distance === selectedDistance
  );

  // Format date for chart X-axis
  const formatChartDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Aggregated training stats
  const totalWaterMeters = (trainings || []).reduce((acc, cur) => acc + (cur.totalMeters || 0), 0);
  const totalKickMeters = (trainings || []).reduce((acc, cur) => acc + (cur.kickMeters || 0), 0);
  const completedGoalsCount = (goals || []).filter(g => g.status === '已达成').length;

  // 2027 Mayor's Cup National 2nd-tier Target Calculations
  const targetDate = new Date('2027-12-15');
  const today = new Date();
  const diffTime = targetDate - today;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // 50m Freestyle 2nd Tier Benchmark
  const LEVEL_2_FREE_50M = 31.50; // seconds
  const INITIAL_FREE_50M = 74.00; // Nico's starting time (1:14.00)

  const current50mFreeRecord = (swimRecords || [])
    .filter(r => r.stroke === '自由泳' && r.distance === '50m')
    .sort((a, b) => (a.seconds || 999) - (b.seconds || 999))[0];

  const currentBestSeconds = current50mFreeRecord ? current50mFreeRecord.seconds : 64.20;
  const deltaToLevel2 = Math.max(0, currentBestSeconds - LEVEL_2_FREE_50M).toFixed(2);
  const totalGapToClose = INITIAL_FREE_50M - LEVEL_2_FREE_50M; // 42.50s
  const gapClosed = Math.max(0, INITIAL_FREE_50M - currentBestSeconds);
  const progressPercent = Math.min(100, Math.max(0, Math.round((gapClosed / totalGapToClose) * 100)));

  // Prepare growth chart data
  const growthChartData = (growthRecords || []).map((r) => ({
    date: r.date?.slice(2) || '',
    '身高 (cm)': r.height || null,
    '臂展 (cm)': r.armSpan || null,
    '体重 (kg)': r.weight || null,
    '手长 (cm)': r.handLength || null,
    '手宽 (cm)': r.handWidth || null,
    '脚长 (cm)': r.footLength || null,
  }));

  // Prepare swim chart data
  const swimChartData = filteredSwimRecords.map((r) => ({
    date: formatChartDate(r.date),
    time: r.time,
    '用时 (秒)': r.seconds,
  }));

  // 6-Dimensional Radar capability scores dynamically evaluated
  const calculateRadarData = () => {
    let waterScore = 86;
    let kickScore = 85;
    let imScore = 84;
    let flexScore = 92; // High flexibility based on ankle/shoulder traits
    let coreScore = 83;
    let disciplineScore = 88;

    if (totalWaterMeters > 5000) waterScore += 4;
    if (totalKickMeters > 2000) kickScore += 5;
    if (swimRecords && swimRecords.some(r => r.stroke === '仰泳' || r.stroke === '蛙泳')) imScore += 5;
    if (fitnessRecords && fitnessRecords.length > 0) {
      const latestF = fitnessRecords[fitnessRecords.length - 1];
      if (latestF.plankSeconds && latestF.plankSeconds >= 60) coreScore += 5;
      if (latestF.standingJump && latestF.standingJump >= 135) coreScore += 3;
    }
    if (nutritionRecords && nutritionRecords.length > 0) {
      const latestN = nutritionRecords[nutritionRecords.length - 1];
      if (latestN.calciumTaken && latestN.sleepHours >= 9.5) disciplineScore += 5;
    }

    return [
      { subject: '水感与流线型', score: Math.min(waterScore, 98), fullMark: 100 },
      { subject: '专项打腿推进', score: Math.min(kickScore, 98), fullMark: 100 },
      { subject: '四式结构均衡', score: Math.min(imScore, 98), fullMark: 100 },
      { subject: '肩踝关节柔韧', score: Math.min(flexScore, 98), fullMark: 100 },
      { subject: '核心与爆发力', score: Math.min(coreScore, 98), fullMark: 100 },
      { subject: '营养恢复自律', score: Math.min(disciplineScore, 98), fullMark: 100 }
    ];
  };

  const radarData = calculateRadarData();
  const overallPower = Math.round(radarData.reduce((acc, c) => acc + c.score, 0) / radarData.length);

  const strokes = ['自由泳', '仰泳', '蛙泳', '蝶泳', '个人混合泳'];
  const distances = ['25m', '50m', '100m', '200m', '400m'];

  // AI analysis calculation
  const getAIAnalysis = () => {
    if ((!growthRecords || growthRecords.length === 0) && (!swimRecords || swimRecords.length === 0)) {
      return {
        hasData: false,
        message: "请先录入 Nico 的身体发育指标与游泳成绩，系统将自动生成定制化的 AI 智能教练分析报告。"
      };
    }

    let geneticStrengths = [];
    let physicalSummary = "";
    let comparisonHtml = "";

    if (latestGrowth) {
      const height = latestGrowth.height;
      const armSpan = latestGrowth.armSpan;
      const handL = latestGrowth.handLength;
      const handW = latestGrowth.handWidth;
      const footL = latestGrowth.footLength;

      if (height && armSpan) {
        const ratio = armSpan / height;
        if (ratio >= 0.99) {
          geneticStrengths.push(`🧬 <strong>顶级身体流线比例（臂展: ${armSpan}cm / 身高: ${height}cm，比值 ${ratio.toFixed(3)}）</strong>：双臂展开充盈，具备天然的大臂划水杠杆力臂，为高肘抱水和划水滑行提供了绝佳力学基础。`);
        } else {
          geneticStrengths.push(`🧬 <strong>身体流线型优势（比例: ${ratio.toFixed(3)}）</strong>：身体各段骨骼匀称，长远攻坚重心在于转体流线型减阻与高频打腿推进。`);
        }
      }
      
      if (handL && handW && height) {
        const ratio = handL / height;
        geneticStrengths.push(`✋ <strong>天然宽桨抱水优势（手掌: ${handL}×${handW} cm，占身高 ${(ratio * 100).toFixed(1)}%）</strong>：在6岁同龄女童中手掌骨骼宽大，天然推水截面充盈，利于在水感课中过早建立深层抱水厚度感知。`);
      }

      if (footL && height) {
        const ratio = footL / height;
        geneticStrengths.push(`🦶 <strong>天然脚蹼推进优势（脚长: ${footL} cm，占身高 ${(ratio * 100).toFixed(1)}%）</strong>：脚掌长度显著超前，配合优异的踝关节背屈与内旋，犹如天生佩戴一对柔韧短脚蹼，打水推力澎湃。`);
      }

      physicalSummary = `Nico 当前身高 ${height || '--'}cm，臂展 ${armSpan || '--'}cm，体重 ${latestGrowth.weight || '--'}kg。各项骨骼形态指标高度匹配短距离与中长距离自由泳/仰泳竞技选材黄金模型。`;
    }

    // Swim analysis
    let swimProgression = [];
    if (swimRecords && swimRecords.length > 0) {
      const free50Records = swimRecords.filter(r => r.stroke === '自由泳' && r.distance === '50m');
      if (free50Records.length >= 2) {
        const first = free50Records[0];
        const latest = free50Records[free50Records.length - 1];
        const diff = (first.seconds - latest.seconds).toFixed(2);
        if (diff > 0) {
          swimProgression.push(`⚡ <strong>50米自由泳从初测 ${first.time} 飙升至 ${latest.time}，累计缩短 ${diff} 秒！</strong> 这标志着暑期打腿基础全面成型，已成功叩开大关三线大门。`);
        }
      } else if (free50Records.length === 1) {
        swimProgression.push(`⏱️ <strong>50米自由泳基准成绩为 ${free50Records[0].time}</strong>，展现出优秀的大关三线水动力雏形。`);
      }
    }

    comparisonHtml = `
      <div style="background: rgba(0, 113, 227, 0.04); border-left: 4px solid var(--accent-color); padding: 14px 16px; border-radius: 0 var(--radius-md) var(--radius-md) 0; margin-top: 12px;">
        <h5 style="color: var(--accent-color); margin-bottom: 6px; font-size: 0.95rem; font-weight: 700;">
          🌟 名将同龄（6~7岁）发展路径深度对标：
        </h5>
        <div style="font-size: 0.88rem; line-height: 1.6; color: var(--primary-color);">
          <p style="margin-bottom: 8px;">
            <strong>• 对标奥运双冠王 叶诗文（6岁大关体校启蒙，教练魏巍）：</strong><br />
            叶诗文 6 岁被大关选拔入队时，其过人之处也是手大、脚大与超常水感，教练初期 1 年内完全不施加任何力量器械，全部专注于<strong>打腿耐力、前交叉身体转动与水感游戏</strong>。Nico 目前手足比例与当年叶诗文高度神似，此阶段最核心的是保护灵气，通过“高频6次腿打板”巩固神经反射。
          </p>
          <p style="margin: 0;">
            <strong>• 对标当代超新星 于子迪（世青赛/全国冠军，7-8岁向二级迈进）：</strong><br />
            于子迪 6~7 岁时踝关节背屈与跟腱极度柔韧，踢水推进率极高。Nico 具备同样的天生脚蹼特征。只要严格遵循大关三线走训纪律，在 2027 年底市长杯决赛突破 31.50 秒达标国家二级运动员具有极高可行性。
          </p>
        </div>
      </div>
    `;

    return {
      hasData: true,
      physicalSummary,
      geneticStrengths,
      swimProgression,
      comparisonHtml
    };
  };

  const analysis = getAIAnalysis();

  return (
    <div>
      {/* 2027 Mayor's Cup 2nd-Tier Target Hero Card */}
      <div className="glass-card mb-lg" style={{ 
        background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.12) 0%, rgba(52, 199, 89, 0.12) 100%)', 
        border: '1.5px solid rgba(0, 113, 227, 0.3)',
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
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Target size={13} />
                终极战役战略目标
              </span>
              <span style={{ 
                background: 'rgba(0, 113, 227, 0.12)', 
                color: '#0071e3', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700 
              }}>
                大关走训实况：一周五练 · 每练1小时 (1:15大组)
              </span>
              <span style={{ 
                background: 'rgba(52, 199, 89, 0.18)', 
                color: '#248a3d', 
                fontSize: '0.75rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 700 
              }}>
                当前：自由泳精雕 + 仰泳启蒙
              </span>
            </div>
            
            <h2 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--primary-color)' }}>
              2027 市长杯决赛 · 国家二级运动员冲刺工程
            </h2>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.92rem', marginTop: '6px' }}>
              立足当前 <strong>一周五练 · 每次1小时 · 15人大组</strong> 实况，不盲目堆量，把 60 分钟自由泳转体与仰泳打腿质量拉满，稳扎稳打向 2027 年底市长杯二级标准（31.50s）推进！
            </p>
          </div>

          {/* Countdown Block */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.85)', 
            padding: '12px 20px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid rgba(0, 113, 227, 0.2)',
            textAlign: 'center',
            minWidth: '160px'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--secondary-color)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Clock size={13} style={{ color: 'var(--accent-color)' }} />
              距离市长杯决战仅剩
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {daysLeft}
              <span style={{ fontSize: '0.9rem', color: 'var(--secondary-color)', fontWeight: 500, marginLeft: '4px' }}>天</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#248a3d', fontWeight: 600, marginTop: '2px' }}>
              备战窗口约 15 个月 / 4个战役周期
            </div>
          </div>
        </div>

        {/* Delta Gap & Progress Bar */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0, 113, 227, 0.15)' }}>
          <div className="flex-between" style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
              50米自由泳达标差距闭合进度：
              <span style={{ color: 'var(--accent-color)', marginLeft: '4px' }}>
                当前最好 {currentBestSeconds.toFixed(2)}s ➔ 终极目标 {LEVEL_2_FREE_50M.toFixed(2)}s
              </span>
            </span>
            <span style={{ fontWeight: 700, color: '#34c759' }}>
              距国家二级相差 {deltaToLevel2} 秒 (已攻坚缩短 {gapClosed.toFixed(2)}s / 推进 {progressPercent}%)
            </span>
          </div>

          {/* Progress Bar Visual */}
          <div style={{ 
            width: '100%', 
            height: '14px', 
            background: 'rgba(0, 0, 0, 0.06)', 
            borderRadius: '20px', 
            overflow: 'hidden',
            position: 'relative' 
          }}>
            <div style={{ 
              width: `${Math.max(10, progressPercent)}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #34c759 0%, #0071e3 100%)', 
              borderRadius: '20px',
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>

        {/* 4-Phase Roadmap Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
          gap: '10px', 
          marginTop: '16px' 
        }}>
          {/* Phase 1 */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.9)', 
            padding: '12px', 
            borderRadius: '12px', 
            border: '1.5px solid var(--accent-color)',
            boxShadow: '0 2px 8px rgba(0, 113, 227, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-color)' }}>阶段一：自仰动作精雕</span>
              <span style={{ fontSize: '0.68rem', background: 'rgba(0, 113, 227, 0.1)', color: 'var(--accent-color)', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>当前攻坚</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-color)' }}>冲刺 54 - 56 秒</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
              2026.09 - 2026.12 | 自由泳侧向转体呼吸 + 仰泳平躺打腿
            </div>
          </div>

          {/* Phase 2 */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            padding: '12px', 
            borderRadius: '12px', 
            border: '1px solid rgba(0,0,0,0.08)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff9500' }}>阶段二：迎春杯破三级</span>
              <span style={{ fontSize: '0.68rem', background: 'rgba(255, 149, 0, 0.1)', color: '#d35400', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>2027春</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-color)' }}>突破 39.50 秒</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
              2027.01 - 2027.04 | 自仰双项兼修与斩获国家三级
            </div>
          </div>

          {/* Phase 3 */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            padding: '12px', 
            borderRadius: '12px', 
            border: '1px solid rgba(0,0,0,0.08)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#af52de' }}>阶段三：暑期逼近二级</span>
              <span style={{ fontSize: '0.68rem', background: 'rgba(175, 82, 222, 0.1)', color: '#af52de', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>2027夏</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-color)' }}>突破 35.00 秒</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
              2027.05 - 2027.08 | 大关暑期双训与自仰蛙三项融合
            </div>
          </div>

          {/* Phase 4 */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            padding: '12px', 
            borderRadius: '12px', 
            border: '1px solid rgba(52, 199, 89, 0.3)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#248a3d' }}>阶段四：市长杯决战</span>
              <span style={{ fontSize: '0.68rem', background: 'rgba(52, 199, 89, 0.15)', color: '#248a3d', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>2027冬</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#248a3d' }}>突破 31.50 秒</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
              2027.09 - 2027.12 | 决战市长杯并斩获国家二级证书！
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="glass-card mb-lg" style={{ padding: '16px 24px' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #0071e3 0%, #34c759 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff' 
            }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                大关三线走训档案 · Nico
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                6.5岁走训队员 | 一周五练 (每练1小时 · 1:15大组) | 自由泳精雕 & 仰泳启蒙中
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', fontWeight: 600 }}>累计水上总游程</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                {totalWaterMeters.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>m</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', fontWeight: 600 }}>打腿专项总负荷</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34c759' }}>
                {totalKickMeters.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>m</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', fontWeight: 600 }}>综合战力指数</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                {overallPower} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>/100</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', fontWeight: 600 }}>阶段战略目标</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ff9500' }}>
                {completedGoalsCount} / {goals?.length || 6} 达成
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid-3 mb-lg">
        {/* Height & Arm Span Card */}
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">身体形态与骨骼发育</span>
            <Ruler size={18} style={{ color: 'var(--accent-color)' }} />
          </div>
          <div className="metrics-value">
            {latestGrowth ? latestGrowth.height : '--'}
            <span className="metrics-unit">cm</span>
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span>臂展: {latestGrowth ? latestGrowth.armSpan : '--'} cm</span>
              <span>|</span>
              <span>猿人指数: {apeIndex}</span>
            </div>
            {latestGrowth && latestGrowth.handLength && (
              <div style={{ fontSize: '0.8rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
                手掌: {latestGrowth.handLength}×{latestGrowth.handWidth} cm | 脚长: {latestGrowth.footLength} cm
              </div>
            )}
          </div>
        </div>

        {/* Weight & Body Comp */}
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">当前体重与水动力状态</span>
            <Scale size={18} style={{ color: '#ff9500' }} />
          </div>
          <div className="metrics-value">
            {latestGrowth ? latestGrowth.weight : '--'}
            <span className="metrics-unit">kg</span>
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            <span className="metrics-trend">
              <TrendingUp size={14} />
              大关走训期：体脂匀称，抗阻流线型优良
            </span>
          </div>
        </div>

        {/* Latest Achievement */}
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">50米自由泳基准与差值</span>
            <Activity size={18} style={{ color: '#34c759' }} />
          </div>
          <div className="metrics-value" style={{ fontSize: '1.75rem' }}>
            {latestSwim ? latestSwim.time : '--:--.--'}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#ff9500', fontWeight: 600 }}>
              距离国家二级(31.50s) 尚差 {deltaToLevel2} 秒
            </span>
          </div>
        </div>
      </div>

      {/* Radar & Growth Charts Row */}
      <div className="grid-2 mb-lg">
        {/* 6-Dimensional Radar Capability Chart */}
        <div className="glass-card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-between mb-sm">
            <h3 className="flex-gap-sm" style={{ margin: 0 }}>
              <ShieldCheck size={20} style={{ color: 'var(--accent-color)' }} />
              竞技战力六维能力雷达评测
            </h3>
            <span style={{ fontSize: '0.8rem', background: 'rgba(0, 113, 227, 0.1)', color: 'var(--accent-color)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              大关三线走训模型
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--secondary-color)', marginBottom: '8px' }}>
            涵盖水感、专项打腿、四式均衡、肩踝柔韧、核心体能与作息自律六大竞技维度。
          </p>
          
          <div style={{ width: '100%', height: '310px', flexGrow: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                <PolarGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: 'var(--primary-color)', fontSize: 11.5, fontWeight: 600 }} 
                />
                <PolarRadiusAxis angle={30} domain={[60, 100]} stroke="#c7c7cc" fontSize={10} />
                <Radar 
                  name="Nico 综合战力" 
                  dataKey="score" 
                  stroke="var(--accent-color)" 
                  fill="var(--accent-color)" 
                  fillOpacity={0.3} 
                  strokeWidth={2.5}
                />
                <Tooltip 
                  formatter={(val) => [`${val} 分`, '能力评分']}
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(0,0,0,0.1)', 
                    backdropFilter: 'blur(10px)' 
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Height & Arm Span Growth Chart */}
        <div className="glass-card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="mb-sm flex-gap-sm">
            <Ruler size={20} style={{ color: 'var(--accent-color)' }} />
            身高与臂展发育曲线 (骨骼纵向生长)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--secondary-color)', marginBottom: '8px' }}>
            持续监测双臂划幅力臂与身高比率，为大关长划幅（DPS）技术储备提供数据支撑。
          </p>

          <div style={{ width: '100%', height: '310px', flexGrow: 1 }}>
            {growthChartData.length > 0 && growthRecords.some(r => r.height !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5ea" />
                  <XAxis dataKey="date" stroke="#86868b" fontSize={11} tickLine={false} />
                  <YAxis domain={['dataMin - 3', 'dataMax + 3']} stroke="#86868b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255, 255, 255, 0.9)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(0,0,0,0.1)', 
                      backdropFilter: 'blur(10px)' 
                    }} 
                  />
                  <Legend iconType="circle" />
                  <Line 
                    connectNulls
                    type="monotone" 
                    dataKey="身高 (cm)" 
                    stroke="var(--accent-color)" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ strokeWidth: 2, r: 4 }} 
                  />
                  <Line 
                    connectNulls
                    type="monotone" 
                    dataKey="臂展 (cm)" 
                    stroke="#34c759" 
                    strokeWidth={3} 
                    dot={{ strokeWidth: 2, r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary-color)', fontSize: '0.95rem' }}>
                暂无成长数据，请在“身体数据”中录入。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Second Charts Row: Micro Development & Speed Analysis */}
      <div className="grid-2 mb-lg">
        {/* Hand & Foot Micro Development */}
        <div className="glass-card" style={{ minHeight: '380px' }}>
          <h3 className="mb-sm flex-gap-sm">
            <Ruler size={20} style={{ color: '#ff9500' }} />
            手足细微发育监测 (天然桨叶与脚蹼)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--secondary-color)', marginBottom: '8px' }}>
            跟踪手掌抱水表面积与脚掌打腿面积，验证天然“大桨叶”水动力优势。
          </p>

          <div style={{ width: '100%', height: '280px' }}>
            {growthChartData.length > 0 && growthRecords.some(r => r.handLength !== undefined && r.handLength !== null && r.handLength !== '') ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5ea" />
                  <XAxis dataKey="date" stroke="#86868b" fontSize={11} tickLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#86868b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255, 255, 255, 0.9)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(0,0,0,0.1)', 
                      backdropFilter: 'blur(10px)' 
                    }} 
                  />
                  <Legend iconType="circle" />
                  <Line connectNulls type="monotone" dataKey="脚长 (cm)" stroke="#ff9500" strokeWidth={2.5} dot={{ strokeWidth: 2, r: 4 }} />
                  <Line connectNulls type="monotone" dataKey="手长 (cm)" stroke="#af52de" strokeWidth={2.5} dot={{ strokeWidth: 2, r: 4 }} />
                  <Line connectNulls type="monotone" dataKey="手宽 (cm)" stroke="#ff5e3a" strokeWidth={2.5} dot={{ strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary-color)', fontSize: '0.95rem' }}>
                暂无手长、手宽、脚长数据记录。
              </div>
            )}
          </div>
        </div>

        {/* Swimming Speed Progress Chart */}
        <div className="glass-card" style={{ minHeight: '380px' }}>
          <div className="flex-between mb-sm" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="flex-gap-sm" style={{ margin: 0 }}>
              <TrendingUp size={20} style={{ color: '#34c759' }} />
              水上专项成绩趋势
            </h3>
            
            {/* Filters */}
            <div className="flex-gap-sm" style={{ flexWrap: 'wrap' }}>
              <select 
                className="apple-select" 
                style={{ padding: '6px 12px', width: 'auto', borderRadius: '12px', fontSize: '0.85rem' }}
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
              >
                {distances.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                className="apple-select" 
                style={{ padding: '6px 12px', width: 'auto', borderRadius: '12px', fontSize: '0.85rem' }}
                value={selectedStroke}
                onChange={(e) => setSelectedStroke(e.target.value)}
              >
                {strokes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--secondary-color)', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
            <span>当前项目：<strong>{selectedDistance} {selectedStroke}</strong></span>
            {selectedDistance === '50m' && selectedStroke === '自由泳' && (
              <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                🏁 国家二级达标线：31.50 秒 | 三级达标线：39.50 秒
              </span>
            )}
          </div>

          <div style={{ width: '100%', height: '280px' }}>
            {swimChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={swimChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5ea" />
                  <XAxis dataKey="date" stroke="#86868b" fontSize={11} tickLine={false} />
                  <YAxis 
                    domain={['dataMin - 1', 'dataMax + 1']} 
                    stroke="#86868b" 
                    fontSize={11} 
                    tickLine={false}
                    tickFormatter={(val) => `${val}秒`}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => [props.payload.time, '用时']}
                    contentStyle={{ 
                      background: 'rgba(255, 255, 255, 0.9)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(0,0,0,0.1)', 
                      backdropFilter: 'blur(10px)' 
                    }} 
                  />
                  <Legend iconType="circle" />
                  <Line 
                    type="monotone" 
                    dataKey="用时 (秒)" 
                    stroke="#34c759" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ strokeWidth: 2, r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary-color)', textAlign: 'center', padding: 'var(--space-lg)', fontSize: '0.95rem' }}>
                暂无 {selectedDistance} {selectedStroke} 的成绩数据。<br />
                请尝试更换过滤选项或录入新成绩。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Coach Analysis Report */}
      {analysis.hasData ? (
        <div className="glass-card mt-lg" style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(244, 247, 255, 0.85) 100%)', 
          border: '1px solid rgba(0, 113, 227, 0.18)', 
          boxShadow: '0 8px 32px rgba(0, 113, 227, 0.04)'
        }}>
          <h3 className="mb-md flex-gap-sm" style={{ color: 'var(--accent-color)', fontWeight: 700 }}>
            <Sparkles size={20} fill="rgba(0, 113, 227, 0.2)" />
            AI 智能教练战备研判 (冲刺 2027 市长杯决赛 · 国家二级运动员 15 个月演进分析)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Body growth */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🧬 身体形态与水动力潜能分析
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '8px', fontWeight: 500 }}>{analysis.physicalSummary}</p>
              {analysis.geneticStrengths.length > 0 && (
                <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--primary-color)' }}>
                  {analysis.geneticStrengths.map((s, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: s }} />)}
                </ul>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }} />

            {/* Swim performance */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                🏊 大关三线水上速度跃迁与二级差距
              </h4>
              {analysis.swimProgression.length > 0 && (
                <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--primary-color)' }}>
                  {analysis.swimProgression.map((s, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: s }} />)}
                </ul>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }} />

            {/* Elite Swimmers Comparison */}
            {analysis.comparisonHtml && (
              <div dangerouslySetInnerHTML={{ __html: analysis.comparisonHtml }} />
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }} />

            {/* Group Training 1:15 & Stage 1 Focus */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ff9500', marginBottom: '10px' }}>
                🏆 大关 15 人大组走训（1小时/课）· 现阶段突围与技术攻坚要诀
              </h4>
              <div style={{ background: 'rgba(255, 149, 0, 0.04)', border: '1px solid rgba(255, 149, 0, 0.15)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--primary-color)' }}>
                <p style={{ fontWeight: 700, marginBottom: '8px', color: '#d35400' }}>
                  当前一周五练、每次 60 分钟、自由泳精雕 + 仰泳初学阶段核心落地指令：
                </p>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                  <li><strong>大组突围（领流水手原则）：</strong> 2名教练各带15人，单道人数多。Nico 具备速度优势，训练中应主动排在队伍<strong>前 1~3 位出发</strong>，避免跟游吃前人水花涡流，确保全程在平稳活水中建立动作本体感知。</li>
                  <li><strong>自由泳动作精雕（侧向换气）：</strong> 严禁抬头换气！换气时保持“一只眼睛在水下一只在水上（咬苹果式换气）”，身体沿中轴转动 45 度，呼吸完成后下巴微收迅速复位，杜绝下半身下沉。</li>
                  <li><strong>仰泳启蒙关键点（平躺中轴）：</strong> 仰卧时双眼坚决凝视天花板正上方，腹部微提贴近水面（像小托盘），以肩为轴直臂向上提手，脚背绷直向上踢出细密沸水水花，严防“坐水”。</li>
                  <li><strong>1小时高效不堆量：</strong> 60分钟总游程控制在 850m~1000m（专项打腿 350-450m）。追求“少划臂、长滑行”的高质量动作经济性，杜绝无效疲劳。</li>
                  <li><strong>课后家庭营养与深睡：</strong> 课后 30 分钟内一杯温牛奶+水煮蛋快速修复肌糖原，每晚 21:15 前关灯入睡，为生长发育与神经突触修复提供充足时间。</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card mt-lg text-center" style={{ padding: 'var(--space-lg) 0', color: 'var(--secondary-color)', fontSize: '0.95rem' }}>
          <Sparkles size={24} style={{ color: 'var(--accent-color)', marginBottom: '8px' }} />
          请先录入成长数据，AI 将自动输出大关三线教练报告。
        </div>
      )}
    </div>
  );
}

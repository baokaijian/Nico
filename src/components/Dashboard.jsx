import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, Ruler, Scale, Activity, Sparkles, Award, ShieldCheck } from 'lucide-react';

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
          geneticStrengths.push(`🧬 <strong>顶级身体流线比例（臂展: ${armSpan}cm / 身高: ${height}cm，比值 ${ratio.toFixed(3)}）</strong>：双臂展开充盈，与身高基本持平且稳步超出身高趋势。具备天然的大臂划水杠杆力臂，为高肘抱水和划水滑行提供了绝佳力学基础。`);
        } else {
          geneticStrengths.push(`🧬 <strong>身体流线型优势（比例: ${ratio.toFixed(3)}）</strong>：身体各段骨骼匀称，长远攻坚重心在于转体流线型减阻与高频打腿推进。`);
        }
      }
      
      if (handL && handW && height) {
        const ratio = handL / height;
        geneticStrengths.push(`✋ <strong>高抱水表面积优势（手掌尺寸: ${handL}×${handW} cm，占身高 ${(ratio * 100).toFixed(1)}%）</strong>：在6岁同龄女童中手掌骨骼宽大，天然推水截面大，利于在水感课中过早建立深层抱水厚度感知。`);
      }

      if (footL && height) {
        const ratio = footL / height;
        geneticStrengths.push(`🦶 <strong>天然双蹼特征（足长: ${footL} cm，占身高 ${(ratio * 100).toFixed(1)}%）</strong>：大脚掌结合天生踝关节下压大角度，使打腿向下压水与向上提水兼具推力，为自由泳六次腿与蝶泳波浪腿提供充沛动能。`);
      }
      
      physicalSummary = `Nico 当前身高为 ${height || '--'} cm，体重 ${latestGrowth.weight || '--'} kg。暑假集训后骨骼发育与水感显著提升，正以大关三线运动员身份稳步前行。`;

      // Build Elite Swimmers Comparison Report
      const footRatioText = footL && height ? `脚长达到 ${footL}cm (身高占比 ${(footL / height * 100).toFixed(1)}%)` : "脚长指标";
      const handText = handL && handW ? `手掌尺寸为 ${handL}×${handW} cm` : "手掌面积";
      const latestSwimTime = latestSwim ? `${latestSwim.distance}${latestSwim.stroke} ${latestSwim.time}` : "水上训练表现";

      comparisonHtml = `
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 600; color: 'var(--primary-color)'; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            🏅 顶尖名将同年龄段天赋对照 (6-7岁启蒙与选拔期)
          </h4>
          <div style="background: rgba(0, 113, 227, 0.02); border-left: 3px solid var(--accent-color); padding: 12px 16px; border-radius: 4px; font-size: 0.9rem; line-height: 1.6; color: var(--primary-color);">
            <ul style="padding-left: 18px; display: flex; flex-direction: column; gap: 8px; margin: 0;">
              <li>
                <strong>叶诗文 (2012伦敦奥运双冠王，大关名帅魏巍教练弟子) 对照：</strong> 
                叶诗文在6岁大班时，魏巍教练选拔她的关键特征就是<strong>“手大、脚大、肩膀宽、身体协调性好”</strong>（成年后42码大脚被称为水中马达）。Nico 当前拥有的 <strong>${handText}</strong> 和 <strong>${footRatioText}</strong>，完全吻合这一顶尖苗子选材模型。大关三线队将助力 Nico 将这一天然优势转化为强劲的划幅与打腿推进。
              </li>
              <li>
                <strong>于子迪 (13岁破叶诗文200混亚洲纪录的新星) 对照：</strong> 
                于子迪同样在6岁（2018年）开启系统训练，其核心杀手锏是极度出色的<strong>四式水感均衡度与转身爆发力</strong>。Nico 目前在 <strong>${latestSwimTime}</strong> 中展现出大幅飞跃（50米自突破至 1分04秒），证明其心肺短暂供能与打腿推进正在向大关高标准靠拢。
              </li>
            </ul>
          </div>
        </div>
      `;
    }

    let swimProgression = [];
    const strokeGroups = {};
    (swimRecords || []).forEach(r => {
      const key = `${r.distance}_${r.stroke}`;
      if (!strokeGroups[key]) strokeGroups[key] = [];
      strokeGroups[key].push(r);
    });

    Object.keys(strokeGroups).forEach(key => {
      const group = strokeGroups[key];
      if (group.length >= 2) {
        group.sort((a, b) => new Date(a.date) - new Date(b.date));
        const earliest = group[0];
        const latest = group[group.length - 1];
        const diff = earliest.seconds - latest.seconds;
        if (diff > 0) {
          const [dist, strk] = key.split('_');
          swimProgression.push(`📈 <strong>${dist}${strk} 战力飞跃</strong>：从最初的 \`${earliest.time}\` 跃升至最新的 \`${latest.time}\`，累计狂缩 <strong>${diff.toFixed(2)} 秒</strong>！暑假大关集训成效卓著，动作效率和冲刺能力产生质变！`);
        }
      }
    });

    if (swimProgression.length === 0 && swimRecords && swimRecords.length > 0) {
      swimProgression.push(`🏊 <strong>水上成绩库平稳积累</strong>：已录入 ${swimRecords.length} 项成绩。当前 50米 自由泳 1:04.20 已具备冲击少体校考级前列的扎实基础。`);
    }

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
      {/* Athlete Status & Identity Banner */}
      <div className="glass-card mb-lg" style={{ 
        background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.07) 0%, rgba(52, 199, 89, 0.06) 100%)',
        border: '1px solid rgba(0, 113, 227, 0.18)'
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={12} />
                杭州大关三线运动员
              </span>
              <span style={{ 
                background: 'rgba(255, 149, 0, 0.15)', 
                color: '#b25900', 
                fontSize: '0.75rem', 
                padding: '3px 10px', 
                borderRadius: '20px', 
                fontWeight: 600 
              }}>
                竞技游泳梯队 · 6岁女子组
              </span>
              <span style={{ 
                background: 'rgba(52, 199, 89, 0.15)', 
                color: '#248a3d', 
                fontSize: '0.75rem', 
                padding: '3px 10px', 
                borderRadius: '20px', 
                fontWeight: 600 
              }}>
                走训集训在册
              </span>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              Nico 竞技战力指挥驾驶舱
            </h2>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.92rem', marginTop: '4px' }}>
              暑假集训圆满结业，正式晋级大关三线队！全面量化跟踪技术水感、打腿量、陆上柔韧、营养恢复与赛事晋级。
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--secondary-color)', fontWeight: 600 }}>综合战力指数</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {overallPower}
                <span style={{ fontSize: '1rem', color: 'var(--secondary-color)', fontWeight: 500 }}>/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick KPI strip */}
        <div style={{ 
          marginTop: 'var(--space-md)', 
          paddingTop: 'var(--space-md)', 
          borderTop: '1px solid rgba(0,0,0,0.06)', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
          gap: '12px' 
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>水上总训练里程:</span>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-color)' }}>
              {totalWaterMeters.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>m</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>打腿专项总负荷:</span>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#34c759' }}>
              {totalKickMeters.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>m</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>50m自由泳PB:</span>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-color)' }}>
              {latestSwim?.time || '01:04.20'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>达标里程碑:</span>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ff9500' }}>
              已达成 {completedGoalsCount} 项 / 共 {goals?.length || 7} 项
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
            <span className="metrics-title">当前体重与状态</span>
            <Scale size={18} style={{ color: '#ff9500' }} />
          </div>
          <div className="metrics-value">
            {latestGrowth ? latestGrowth.weight : '--'}
            <span className="metrics-unit">kg</span>
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            <span className="metrics-trend">
              <TrendingUp size={14} />
              大关走训期：体脂匀称，肌肉水动力平衡
            </span>
          </div>
        </div>

        {/* Latest Achievement */}
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">最新水上速度指标</span>
            <Activity size={18} style={{ color: '#34c759' }} />
          </div>
          <div className="metrics-value" style={{ fontSize: '1.75rem' }}>
            {latestSwim ? `${latestSwim.distance} ${latestSwim.stroke}` : '暂无记录'}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            {latestSwim ? `成绩: ${latestSwim.time} (${latestSwim.poolLength}长池)` : '录入新成绩'}
          </div>
        </div>
      </div>

      {/* Middle Row: Radar Chart + Development Charts */}
      <div className="grid-2 mb-lg">
        {/* 6-Dimensional Radar Chart */}
        <div className="glass-card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-between mb-sm">
            <h3 className="flex-gap-sm" style={{ margin: 0 }}>
              <Award size={20} color="var(--accent-color)" />
              大关三线运动员：六维竞技战力雷达
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
              综合评分: <strong>{overallPower}</strong>
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--secondary-color)', marginBottom: '8px' }}>
            融合水上水感、专项打腿量、四式技术均衡、关节柔韧、核心力量及生活营养恢复多维度动态赋分。
          </p>

          <div style={{ width: '100%', height: '310px', flexGrow: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e5e5ea" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#1d1d1f', fontSize: 11, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#86868b" tick={{ fontSize: 9 }} />
                <Radar 
                  name="Nico 战力" 
                  dataKey="score" 
                  stroke="var(--accent-color)" 
                  fill="var(--accent-color)" 
                  fillOpacity={0.35} 
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
              水上成绩速度提升曲线
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

          <p style={{ fontSize: '0.82rem', color: 'var(--secondary-color)', marginBottom: '8px' }}>
            曲线持续下行代表用时缩短、成绩提升。当前项目：<strong>{selectedDistance} {selectedStroke}</strong>
          </p>

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
            AI 智能教练评估报告 (大关三线梯队训练与健将级晋级分析)
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
                🏊 大关三线水上速度跃迁评估
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

            {/* Master of Sports Next-Step Focus */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ff9500', marginBottom: '10px' }}>
                🏆 大关三线本阶段核心攻坚重点 (冲刺市长杯与破58秒)
              </h4>
              <div style={{ background: 'rgba(255, 149, 0, 0.04)', border: '1px solid rgba(255, 149, 0, 0.15)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--primary-color)' }}>
                <p style={{ fontWeight: 700, marginBottom: '8px', color: '#d35400' }}>教练组下阶段三项量化攻坚指令：</p>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                  <li><strong>打腿专项突破：</strong> 扶板25米自由泳打腿必须进入 24秒以内；每堂课保持 500m 以上打腿量，强化大腿带动小腿的鞭打反射。</li>
                  <li><strong>进出池壁细节：</strong> 转身前 5 米坚决不抬头减速，以肚脐为轴快速翻转，蹬壁后水下海豚腿必须滑出 <strong>4.5米 - 5米</strong> 线。</li>
                  <li><strong>黄金恢复保障：</strong> 课后 30 分钟内立即补充温纯牛奶250ml+水煮蛋，晚间 21:15 前就寝，确保夜间生长素高效分泌。</li>
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

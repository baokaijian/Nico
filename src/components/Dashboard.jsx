import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Ruler, Scale, Activity, Sparkles } from 'lucide-react';

export default function Dashboard({ growthRecords, swimRecords }) {
  const [selectedStroke, setSelectedStroke] = useState('自由泳');
  const [selectedDistance, setSelectedDistance] = useState('25m');

  // Auto-select filters to match latest swim record if available
  useEffect(() => {
    if (swimRecords && swimRecords.length > 0) {
      const latest = swimRecords[swimRecords.length - 1];
      if (latest.stroke) setSelectedStroke(latest.stroke);
      if (latest.distance) setSelectedDistance(latest.distance);
    }
  }, [swimRecords]);

  // Get latest growth metrics
  const latestGrowth = growthRecords.length > 0 ? growthRecords[growthRecords.length - 1] : null;
  
  // Calculate Ape Index (Arm Span / Height)
  const apeIndex = latestGrowth ? (latestGrowth.armSpan / latestGrowth.height).toFixed(3) : '无';

  // Get latest swim record
  const latestSwim = swimRecords.length > 0 ? swimRecords[swimRecords.length - 1] : null;

  // Filter swim records for the chart
  const filteredSwimRecords = swimRecords.filter(
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

  // Prepare growth chart data
  const growthChartData = growthRecords.map((r) => ({
    date: r.date.slice(2), // YY-MM-DD
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

  const strokes = ['自由泳', '蛙泳', '仰泳', '蝶泳', '个人混合泳'];
  const distances = ['25m', '50m', '100m', '200m', '400m'];

  // AI analysis calculation
  const getAIAnalysis = () => {
    if (growthRecords.length === 0 && swimRecords.length === 0) {
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
        if (ratio > 1.0) {
          geneticStrengths.push(`🧬 <strong>身体流线型优势（猿人指数: ${ratio.toFixed(3)}）</strong>：她的臂展超出了身高，在女子游泳选手中具备天然的“长双臂桨叶”优势。这有利于在不大幅增加阻力的前提下，增加单次划水幅度（划幅），在各种泳姿中形成高效的水动力基础。`);
        } else {
          geneticStrengths.push(`🧬 <strong>身体流线型优势（比例: ${ratio.toFixed(3)}）</strong>：她的臂展与身高相对匀称。这类选手的长远技术方向在于追求卓越的**身体转体流线型（Body Rotation）**和高效率的**高肘抱水频率（划频）**。`);
        }
      }
      
      if (handL && handW && height) {
        const ratio = handL / height;
        if (ratio > 0.105) {
          geneticStrengths.push(`✋ <strong>掌面积占比高（手掌尺寸: ${handL}×${handW} cm，手长占比: ${(ratio * 100).toFixed(1)}%）</strong>：手掌骨骼发育极佳，天然具备更大的推抱水面积，水中划手时的“抱水厚度”优于同龄人，有利于提早建立高肘抱水的感觉。`);
        }
      }

      if (footL && height) {
        const ratio = footL / height;
        if (ratio > 0.155) {
          geneticStrengths.push(`🦶 <strong>天生双蹼特征（足长占比: ${(ratio * 100).toFixed(1)}%）</strong>：相较身高而言，足长比例丰满。这有利于在打腿时向下压水、向上鞭打，提供极其充沛的推进力，蹬壁转身加速的推进面积也更大。`);
        }
      }
      
      physicalSummary = `Nico 当前身高为 ${height || '--'} cm，体重 ${latestGrowth.weight || '--'} kg。作为 6 岁小女生，正处于骨骼神经反射发育、核心水力平衡和柔韧度发展的“黄金建构期”。`;

      // Build Elite Swimmers Comparison Report
      const footRatioText = footL && height ? `脚长比达 ${(footL / height * 100).toFixed(1)}%` : "脚长指标";
      const handText = handL && handW ? `手掌尺寸为 ${handL}×${handW} cm` : "手掌面积";
      const swimEventText = latestSwim ? `【${latestSwim.distance}${latestSwim.stroke} ${latestSwim.time}】` : "游泳训练课";

      comparisonHtml = `
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 600; color: 'var(--primary-color)'; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            🏅 顶尖名将同年龄段天赋对照 (6岁启蒙期)
          </h4>
          <div style="background: rgba(0, 113, 227, 0.02); border-left: 3px solid var(--accent-color); padding: 12px 16px; border-radius: 4px; font-size: 0.9rem; line-height: 1.6; color: var(--primary-color);">
            <ul style="padding-left: 18px; display: flex; flex-direction: column; gap: 8px; margin: 0;">
              <li>
                <strong>叶诗文 (2012奥运双冠王) 天赋对照：</strong> 
                叶诗文在6岁大班时，因<strong>高个子、手掌大、脚掌特大</strong>被幼儿园老师发掘进入少体校。她成年后拥有一双 42 码大脚（天然大脚蹼）。Nico 当前的 <strong>${handText}</strong> 及 <strong>${footRatioText}</strong>，完美映射了叶诗文在启蒙期表现出的抱水阻水面积与大蹼打腿生理潜能。这是冲刺健将级及以上水准的绝佳遗传资本。
              </li>
              <li>
                <strong>于子迪 (13岁破叶诗文混合泳亚洲纪录) 水感对照：</strong> 
                于子迪同在6岁（2018年）被发掘，起步时以惊人的水中协调性和水动力直觉（高水感）著称。Nico 目前在 <strong>${swimEventText}</strong> 中表现出的速度转换能力，印证了她处于同龄女选手中极佳的神经反射和抱水敏锐度。这在长远发展上，符合成为全能型混合泳健将的神经选拔模型。
              </li>
            </ul>
          </div>
        </div>
      `;
    }

    let swimProgression = [];
    const strokeGroups = {};
    swimRecords.forEach(r => {
      const key = `${r.distance}_${r.stroke}`;
      if (!strokeGroups[key]) strokeGroups[key] = [];
      strokeGroups[key].push(r);
    });

    let hasImprovement = false;
    Object.keys(strokeGroups).forEach(key => {
      const group = strokeGroups[key];
      if (group.length >= 2) {
        group.sort((a, b) => new Date(a.date) - new Date(b.date));
        const earliest = group[0];
        const latest = group[group.length - 1];
        const diff = earliest.seconds - latest.seconds;
        if (diff > 0) {
          hasImprovement = true;
          const [dist, strk] = key.split('_');
          swimProgression.push(`📈 <strong>${dist}${strk} 速度爬升</strong>：从最初的 \`${earliest.time}\` 成功提升至最新的 \`${latest.time}\`，一共缩短了 <strong>${diff.toFixed(2)} 秒</strong>！这表明其动作肌肉记忆正在巩固，心肺的短暂爆发能力稳步提升。`);
        }
      }
    });

    if (swimRecords.length > 0 && !hasImprovement) {
      swimProgression.push(`🏊 <strong>成绩档案已激活</strong>：已录入 ${swimRecords.length} 项游泳成绩。当前数据曲线正处于基础稳定期，成绩波动属于正常发育与技术修正过程，需坚持系统水感课。`);
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
      <h2 className="mb-lg" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
        Nico 的成长看板
      </h2>

      {/* Summary Metrics Cards */}
      <div className="grid-3 mb-lg">
        {/* Height & Arm Span Card */}
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">身体指标</span>
            <Ruler size={18} className="text-secondary" style={{ color: 'var(--accent-color)' }} />
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

        {/* Weight Card */}
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">当前体重</span>
            <Scale size={18} className="text-secondary" style={{ color: '#ff9500' }} />
          </div>
          <div className="metrics-value">
            {latestGrowth ? latestGrowth.weight : '--'}
            <span className="metrics-unit">kg</span>
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            {growthRecords.length > 1 ? (
              <span className="metrics-trend">
                <TrendingUp size={14} />
                成长轨迹记录中
              </span>
            ) : (
              <span>首条指标已录入</span>
            )}
          </div>
        </div>

        {/* Latest Swim Achievement Card */}
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">最新训练成绩</span>
            <Activity size={18} style={{ color: '#34c759' }} />
          </div>
          <div className="metrics-value" style={{ fontSize: '1.75rem' }}>
            {latestSwim ? `${latestSwim.distance} ${latestSwim.stroke}` : '暂无记录'}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            {latestSwim ? `时间: ${latestSwim.time} (${latestSwim.poolLength}泳池)` : '开始记录训练成绩吧'}
          </div>
        </div>
      </div>

      {/* Grid of Main Curves */}
      <div className="grid-2 mb-lg">
        {/* Height & Arm Span Chart */}
        <div className="glass-card" style={{ minHeight: '380px' }}>
          <h3 className="mb-md flex-gap-sm">
            <Ruler size={20} style={{ color: 'var(--accent-color)' }} />
            身高与臂展发育曲线
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
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

        {/* Hand & Foot Growth Chart */}
        <div className="glass-card" style={{ minHeight: '380px' }}>
          <h3 className="mb-md flex-gap-sm">
            <Ruler size={20} style={{ color: '#ff9500' }} />
            手足部细微发育曲线
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
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
                  <Line 
                    connectNulls
                    type="monotone" 
                    dataKey="脚长 (cm)" 
                    stroke="#ff9500" 
                    strokeWidth={2.5} 
                    dot={{ strokeWidth: 2, r: 4 }} 
                  />
                  <Line 
                    connectNulls
                    type="monotone" 
                    dataKey="手长 (cm)" 
                    stroke="#af52de" 
                    strokeWidth={2.5} 
                    dot={{ strokeWidth: 2, r: 4 }} 
                  />
                  <Line 
                    connectNulls
                    type="monotone" 
                    dataKey="手宽 (cm)" 
                    stroke="#ff5e3a" 
                    strokeWidth={2.5} 
                    dot={{ strokeWidth: 2, r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary-color)', fontSize: '0.95rem' }}>
                暂无手长、手宽、脚长数据记录。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swimming Speed Progress Chart */}
      <div className="glass-card" style={{ minHeight: '380px' }}>
        <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="flex-gap-sm" style={{ margin: 0 }}>
            <TrendingUp size={20} style={{ color: '#34c759' }} />
            游泳速度提升分析
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

        <div style={{ width: '100%', height: '300px' }}>
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
                  formatter={(value, name, props) => [props.payload.time, '成绩时间']}
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

      {/* AI Coach Analysis Report */}
      {analysis.hasData ? (
        <div className="glass-card mt-lg" style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(244, 247, 255, 0.82) 100%)', 
          border: '1px solid rgba(0, 113, 227, 0.15)', 
          boxShadow: '0 8px 32px rgba(0, 113, 227, 0.04)',
          marginTop: 'var(--space-lg)'
        }}>
          <h3 className="mb-md flex-gap-sm" style={{ color: 'var(--accent-color)', fontWeight: 700 }}>
            <Sparkles size={20} fill="rgba(0, 113, 227, 0.2)" />
            AI 智能教练评估与健将级晋级规划建议
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Body growth */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🧬 身体形态与发育潜能评估
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '8px', fontWeight: 500 }}>{analysis.physicalSummary}</p>
              {analysis.geneticStrengths.length > 0 ? (
                <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--primary-color)' }}>
                  {analysis.geneticStrengths.map((s, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: s }} />)}
                </ul>
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--secondary-color)' }}>录入完整的手长、手宽和足部数据后，系统将为您评估 Nico 的遗传学游泳天赋特征。</p>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }} />

            {/* Swim performance */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                🏊 水感开发与速度进阶状态
              </h4>
              {analysis.swimProgression.length > 0 ? (
                <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--primary-color)' }}>
                  {analysis.swimProgression.map((s, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: s }} />)}
                </ul>
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--secondary-color)' }}>录入多条同一项目的成绩以激活 AI 成绩提升斜率分析。</p>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }} />

            {/* Elite Swimmers Comparison */}
            {analysis.comparisonHtml && (
              <div dangerouslySetInnerHTML={{ __html: analysis.comparisonHtml }} />
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }} />

            {/* Master of Sports roadmap */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ff9500', marginBottom: '10px' }}>
                🏆 冲刺“国家健将级”长远发展规划
              </h4>
              <div style={{ background: 'rgba(255, 149, 0, 0.04)', border: '1px solid rgba(255, 149, 0, 0.15)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--primary-color)' }}>
                <p style={{ fontWeight: 700, marginBottom: '8px', color: '#d35400' }}>当前年龄段（6岁 - 幼儿启盟黄金期）训练核心：</p>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <li><strong>极致的水感与流线型建设</strong>：该阶段骨骼娇嫩，应极力避免任何陆上力量或高强度无氧心肺训练。重点在于漂浮、抓抱水感觉（Sculling）、以及身体极其平整的超直流线型滑行。</li>
                  <li><strong>四种泳姿全面开发</strong>：不应急于锁定主项姿势。全面平衡发展自由泳、仰泳、蛙泳、蝶泳，能最大化地刺激全身协调性肌肉，为中后期混合泳项目 and 主项爆发打下坚实底子。</li>
                  <li><strong>关节柔韧度拓展</strong>：着重维持并拉伸肩关节、踝关节的软组织。高柔韧性的肩踝是后期进行超高划幅和鞭状打腿的技术硬件支持。</li>
                </ol>
                
                <p style={{ fontWeight: 700, marginBottom: '8px', color: '#d35400' }}>长远健将之路里程碑规划：</p>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>7 - 9 岁（动作规范化）</strong>：打下完美的打腿（Kick）功底。女子短距离项目是打腿频率的较量，必须建立起高强度、长滑行的二次腿和六次腿反射。</li>
                  <li><strong>10 - 12 岁（有氧耐力与水下腿）</strong>：进入有氧容量扩张黄金期。此时要开始抠细节——出发跳水反应时、转身蹬壁滑行、以及出发/转身后的海豚腿（水下腿五米线以上维持能力）。</li>
                  <li><strong>13 - 15 岁（专项突破与身体定型）</strong>：骨骼逐步发育定型，开始进行核心无氧爆发训练和专项分工。女子运动员往往在 14 - 17 岁迎来首个成绩爆发和国家健将指标（如50自 26.5秒 / 100自 57.5秒等）的突破。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card mt-lg text-center" style={{ padding: 'var(--space-lg) 0', color: 'var(--secondary-color)', fontSize: '0.95rem' }}>
          <Sparkles size={24} style={{ color: 'var(--accent-color)', marginBottom: '8px' }} />
          请先在身体数据和成绩记录中录入数据，AI 将自动为您生成 Nico 冲刺健将级运动员的专属分析报告。
        </div>
      )}
    </div>
  );
}

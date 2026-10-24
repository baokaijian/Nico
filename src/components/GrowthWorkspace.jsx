import { useMemo, useState } from 'react';
import { skillWorkspace } from '../services/growth-workspace';
import Skills from './Skills';
import Practice from './Practice';
import GrowthGoals from './GrowthGoals';
import { Empty, Modal } from './ui';
export default function GrowthWorkspace({ data, api, onSaved, readOnly, navigate, manageSkills }) {
  const [skillId, setSkillId] = useState(''), [panel, setPanel] = useState('assessments'), [assessmentSeed, setAssessmentSeed] = useState(null), [pointSeed, setPointSeed] = useState(null), [standardsOpen, setStandardsOpen] = useState(false);
  const choices = [...new Map([...(data.skillAssessments || []).map(row => [row.skillId, row.standardSnapshot.name]), ...(data.skillDefinitions || []).map(row => [row.id, row.name])]).entries()];
  const selectedId = skillId || choices[0]?.[0] || '', model = useMemo(() => skillWorkspace(data, selectedId), [data, selectedId]);
  const seedAssessment = seed => { setAssessmentSeed({ ...seed, token: crypto.randomUUID() }); setPanel('assessments'); };
  const shared = { data, api, onSaved, readOnly, navigate };
  return <div className="stack growth-workspace"><header><p className="eyebrow">围绕一项技能，连续记录真实进步</p><h1>技能工作区</h1><p className="muted">测评、短板、练习和目标各自留档；练习次数不会改变等级。</p></header>
    <section className="glass-card"><label>正在查看的技能<select className="apple-input" value={selectedId} onChange={event => setSkillId(event.target.value)}><option value="">请选择技能</option>{choices.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>{model.current ? <p>当前已确认 <b>{model.current.level}</b> · {model.current.date} · 标准v{model.current.definitionVersion}</p> : <p>尚无已确认等级，待确认测评不计入当前能力。</p>}<p className="muted">{model.assessments.length}次测评 · {model.points.length}项关联短板 · {model.checkins.length}条练习 · {model.goals.length}个关联目标</p>{!choices.length && <Empty>先审核技能标准（五级标准按实际情况修改并填写审核人后启用），然后记录真实测评。</Empty>}
    {manageSkills && <button className="apple-btn apple-btn-secondary" onClick={() => setStandardsOpen(true)}>配置或审核技能标准</button>}
    {!readOnly && manageSkills && selectedId && <button className="apple-btn apple-btn-primary" onClick={() => seedAssessment({ skillId: selectedId })}>记录此技能测评</button>}</section>
    <nav className="management-sections" aria-label="技能工作区操作">{[['assessments','测评与历史'],['practice','技术短板与打卡'],['goals','关联目标与里程碑']].map(([key,label]) => <button key={key} aria-current={panel === key ? 'page' : undefined} onClick={() => setPanel(key)}>{label}</button>)}</nav>
    <div hidden={panel !== 'assessments'}><Skills {...shared} readOnly={readOnly || !manageSkills} workspace focusedSkillId={selectedId} onSkillChange={setSkillId} assessmentSeed={assessmentSeed} onCreatePoint={row => { setPointSeed({ ...row, token: crypto.randomUUID() }); setPanel('practice'); }}/></div>
    <div hidden={panel !== 'practice'}><Practice {...shared} embedded focusedSkillId={selectedId} initialAssessment={pointSeed} manageSkills={manageSkills} onRetest={seedAssessment}/></div>
    <div hidden={panel !== 'goals'}><GrowthGoals {...shared} readOnly={readOnly || !manageSkills} focusedSkillId={selectedId}/></div>
    <p className="muted">未关联到此技能的记录仍在“技术短板与打卡”和“目标与里程碑”中；切换此工作区不会删除输入。</p>
    {standardsOpen && <Modal title="配置真实技能标准" onClose={() => setStandardsOpen(false)}><Skills {...shared} initialSection="standards" readOnly={readOnly || !manageSkills}/></Modal>}
  </div>;
}

const refs = value => String(value || '').split(/[,，、\s]+/).filter(Boolean);
export function skillWorkspace(data, skillId) {
  const assessments = (data.skillAssessments || []).filter(row => row.skillId === skillId).sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id)));
  const ids = new Set(assessments.map(row => row.id));
  const points = (data.weakpoints || []).filter(row => row.sourceType === '技能评估' && refs(row.sourceRef).some(id => ids.has(id)));
  const pointIds = new Set(points.map(row => row.id));
  return { current: assessments.filter(row => row.status === '已确认').at(-1) || null, assessments, points, checkins: (data.checkins || []).filter(row => pointIds.has(row.weakPointId)), goals: (data.goals || []).filter(row => (row.relatedSkillIds || []).includes(skillId)) };
}

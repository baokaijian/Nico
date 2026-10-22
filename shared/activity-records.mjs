// Optional activity context; the training and the timed score remain independent facts.
export function activityRelations(key, record, data, previous = null) {
  if (key !== 'swim' || !record.trainingId) return;
  if (typeof record.trainingId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(record.trainingId)) throw Object.assign(Error('关联训练格式无效'), { status: 400 });
  if (record.trainingId === previous?.trainingId) return; // Historical links survive soft deletion.
  const training = data.trainings.find(row => row.id === record.trainingId);
  if (!training || training.athleteId && training.athleteId !== 'nico') throw Object.assign(Error('关联训练不存在、已删除或不属于当前档案'), { status: 400 });
}

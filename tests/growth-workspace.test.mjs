import test from 'node:test';
import assert from 'node:assert/strict';
import { skillWorkspace } from '../src/services/growth-workspace.js';
test('技能工作区只组合显式关联，打卡数量不改变确认等级', () => {
  const data = { skillAssessments: [{id:'a', skillId:'s', date:'2000-01-01', level:'L1',status:'已确认'}, {id:'b',skillId:'s',date:'2000-01-02',level:'L5',status:'待确认'}, {id:'c',skillId:'other',date:'2000-01-03',level:'L4',status:'已确认'}], weakpoints:[{id:'p',sourceType:'技能评估',sourceRef:'a'}, {id:'q',sourceType:'技能评估',sourceRef:'aa'}], checkins:[{id:'x',weakPointId:'p',times:200},{id:'y',weakPointId:'q'}], goals:[{id:'g',relatedSkillIds:['s']},{id:'u',relatedSkillIds:[]}] };
  const model=skillWorkspace(data,'s'); assert.equal(model.current.level,'L1'); assert.deepEqual(model.points.map(x=>x.id),['p']); assert.deepEqual(model.checkins.map(x=>x.id),['x']); assert.deepEqual(model.goals.map(x=>x.id),['g']); assert.equal(skillWorkspace(data,'missing').current,null);
});

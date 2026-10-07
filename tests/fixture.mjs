import fs from 'node:fs';
// Deterministic protocol examples for CI only. Never used by the application or its seed.
const protocolFixture = {
  growth: [{ id: 'fixture-growth-A', date: '2000-01-01', height: 100, handWidth: 5, footLength: 10 }, { id: 'fixture-growth-B', date: '2000-02-01', height: 101, handWidth: 4, footLength: 9 }],
  swim: [{ id: 'fixture-swim-A', date: '2000-01-01', distance: '50m', stroke: '自由泳', time: '01:10.00', seconds: 70, poolLength: '50m', notes: '' }, { id: 'fixture-swim-B', date: '2000-02-01', distance: '50m', stroke: '自由泳', time: '01:00.00', seconds: 60, poolLength: '50m', notes: '' }, { id: 'fixture-swim-C', date: '2000-03-01', distance: '50m', stroke: '自由泳', time: '00:55.00', seconds: 55, poolLength: '50m', notes: '' }, { id: 'fixture-swim-D', date: '2000-04-01', distance: '25m', stroke: '自由泳', time: '00:25.00', seconds: 25, poolLength: '25m', notes: '协议测试：爆发相关备注，不作运动判断' }],
  trainings: [], fitness: [], nutrition: [], goals: [{ id: 'fixture-goal', title: '测试目标', targetMetric: '54-54秒' }],
  media: [{ id: 'fixture-media', date: '2000-03-01', title: '测试素材占位（无文件）', type: 'video', url: '/uploads/test.mp4', description: '' }],
};
export const originalPath = new URL('../data/original-input.json', import.meta.url);
export const hasPrivateInput = process.env.NICO_TEST_PROTOCOL_ONLY !== 'true' && fs.existsSync(originalPath);
export const seedBytes = hasPrivateInput ? fs.readFileSync(originalPath) : Buffer.from(JSON.stringify(protocolFixture));
export const raw = JSON.parse(seedBytes);

import express from 'express';
import path from 'node:path';
import { createCloudHandler } from '../../server/cloud-api.mjs';
import { normalizeState } from '../../shared/domain.mjs';
import { passwordHash } from '../../shared/password.mjs';
import fs from 'node:fs';
import { emptyState, validateRecord } from '../../shared/domain.mjs';
if(process.env.NICO_TEST_PROTOCOL_ONLY !== 'true') throw Error('Protocol-only test server required');
import {releaseInfo} from '../../scripts/release-info.mjs';
import {mediaHealth} from '../../shared/runtime-health.mjs';
const port=Number(process.env.NICO_PROTOCOL_PORT||5293);if(![5293,5294].includes(port))throw Error('Isolated UI port must be 5293 or 5294');
const origin=`http://127.0.0.1:${port}`;
const mediaDir=process.env.NICO_PROTOCOL_MEDIA_DIR;if(!mediaDir||!path.isAbsolute(mediaDir))throw Error('Absolute synthetic-media directory required');
const raw=emptyState();
raw.swim=[{...validateRecord('swim',{date:'2000-01-01',distance:'50m',stroke:'自由泳',poolLength:'25m',time:'01:00:00',recordType:'比赛',validityStatus:'未核验',timingMethod:'未知',startType:'未知'}),id:'protocol-score'}];
raw.media=[{id:'protocol-a-video',date:'2000-01-01',title:'隔离合成视频A',type:'video',url:'/uploads/protocol-a.mp4',duration:12,recordId:'protocol-score'}, {id:'protocol-b-video',date:'2000-01-02',title:'隔离合成视频B',type:'video',url:'/uploads/protocol-b.mp4',duration:10}];
raw.media.push({id:'protocol-photo',date:'2000-01-03',title:'隔离合成照片',type:'photo',url:'/uploads/protocol-photo.png'});
let current={data:normalizeState(raw),revision:8};
current.data.publishing={swimIds:['protocol-score'],mediaIds:[],confirmedBy:'隔离测试',confirmedAt:'2000-01-03',story:'隔离测试公开摘要'};
const accounts = ['protocol-a', 'protocol-b'].map(username => ({ username, salt: 'test-only-salt', must_change_password: false }));
for (const item of accounts) item.password_hash = await passwordHash('Protocol-Only-Drafts-2026', item.salt);
const sessions = new Map(), calls = [], objects = new Map(); let offline = false, blockWrites = false, dropNext = '';
const backend = {
  read: async () => structuredClone(current),
  upload: async (name, bytes, type) => objects.set(name, { bytes, type }), removeFile: async name => objects.delete(name),
  download: async name => { const item = objects.get(name); return item ? new Response(item.bytes, { headers: { 'Content-Type': item.type } }) : new Response(null, { status: 404 }); },
  save: async (expected, data) => { if (expected !== current.revision) throw Object.assign(Error('protocol conflict'), { status: 409 }); current = { data, revision: expected + 1 }; return current.revision; }, account: async name => structuredClone(accounts.find(item => item.username === name) || null),
  session: async hash => sessions.get(hash), createSession: async value => sessions.set(value.token_hash, value), deleteSession: async hash => sessions.delete(hash), loginAttempt: async () => 1,
};
objects.set('protocol-a.mp4',{bytes:fs.readFileSync(path.join(mediaDir,'protocol-a.mp4')),type:'video/mp4'}); objects.set('protocol-b.mp4',{bytes:fs.readFileSync(path.join(mediaDir,'protocol-b.mp4')),type:'video/mp4'});
objects.set('protocol-photo.png',{bytes:fs.readFileSync(path.join(mediaDir,'protocol-photo.png')),type:'image/png'});
backend.health=async()=>({storage:{count:objects.size,bytes:[...objects.values()].reduce((n,item)=>n+item.bytes.length,0),complete:true},media:mediaHealth(current.data.media),backups:{mode:'before-write',currentRevision:current.revision}});
const handler = createCloudHandler({ backend, release:releaseInfo(), origins: [origin] });
const app = express(); app.use('/functions/v1/nico-api', express.raw({ type: () => true, limit:'51mb' }), async (req, res) => {
  calls.push({ path: req.originalUrl, credentialed: !!req.headers.authorization });
  if (offline || blockWrites && ['POST','PUT','DELETE'].includes(req.method) && !req.originalUrl.includes('/auth/')) return res.status(503).json({ error: '隔离测试：临时断网' });
  const response = await handler(new Request(origin + req.originalUrl, { method: req.method, headers: req.headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: req.body }) }));
  if (dropNext && req.originalUrl.endsWith(dropNext) && req.method === 'POST' && response.status === 201) { dropNext = ''; res.destroy(); return; }
  res.status(response.status); response.headers.forEach((v, k) => res.setHeader(k, v)); res.send(Buffer.from(await response.arrayBuffer()));
});
app.use('/protocol-control', express.json(), (req, res) => {
  if (req.body?.revoke) sessions.clear(); if (req.body?.bump) current.revision++;
  if (typeof req.body?.offline === 'boolean') offline = req.body.offline;
  if (typeof req.body?.blockWrites === 'boolean') blockWrites = req.body.blockWrites;
  if (req.body?.dropNext) dropNext = req.body.dropNext;
  res.json({ stories:current.data.growthStories.length,reports:current.data.reportDrafts.map(row=>({id:row.id,status:row.status,version:row.version})),competitions:current.data.competitionEvents.length,comparisons:current.data.videoComparisons.length, revision: current.revision, sessions: sessions.size, trainings: current.data.trainings.length, scores: current.data.swim.length, media: current.data.media.length, files: objects.size, trainingIds: current.data.trainings.map(row=>row.id), scoreLinks: current.data.swim.filter(row=>row.trainingId).map(row=>({id:row.id,trainingId:row.trainingId})), mediaLinks: current.data.media.map(row=>({id:row.id,recordId:row.recordId})), feedback: current.data.trainings.map(row=>!!row.coachNotes), skills:current.data.skillDefinitions.length, assessments:current.data.skillAssessments.map(row=>({id:row.id,level:row.level,status:row.status,checkins:row.checkinIds.length})), points:current.data.weakpoints.length, checkins:current.data.checkins.length, goals:current.data.goals.filter(row=>row.modelVersion===1).map(row=>row.status), milestones:current.data.milestones.map(row=>row.status) });
});
app.use('/Nico', express.static(path.resolve('dist')));
const server = app.listen(port, '127.0.0.1', () => console.log(`Isolated Nico protocol UI ready on port ${port}`));
const stop = () => server.close(() => process.exit(0)); process.on('SIGTERM', stop); process.on('SIGINT', stop);

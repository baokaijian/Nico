import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sourceFingerprint } from '../scripts/release-info.mjs';
import { verifyDeployment } from '../scripts/verify-deployment.mjs';
import { createHealth, routeCategory, mediaHealth } from '../shared/runtime-health.mjs';
import { createCloudHandler } from '../server/cloud-api.mjs';
import { archiveHarness } from './archive-harness.mjs';

test('发布指纹覆盖传递依赖，忽略生成元数据，缺失真实依赖拒绝构建', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nico-release-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'entry.mjs'),"import './child.mjs'; import './_release.mjs';\n");fs.writeFileSync(path.join(root,'child.mjs'),'export const value=1;');
  const a=sourceFingerprint(root,'entry.mjs');assert.match(a,/^[a-f0-9]{64}$/);
  fs.writeFileSync(path.join(root,'_release.mjs'),'generated ignored');assert.equal(sourceFingerprint(root,'entry.mjs'),a);
  fs.writeFileSync(path.join(root,'child.mjs'),'export const value=2;');assert.notEqual(sourceFingerprint(root,'entry.mjs'),a);
  fs.rmSync(path.join(root,'child.mjs'));assert.throws(()=>sourceFingerprint(root,'entry.mjs'));
});
test('发布验证查询实际 API；旧版本、HTML、非成功响应均不得宣称上线', async () => {
  const hash='a'.repeat(64);let calls=0;
  const fetcher=async()=>{calls++;return new Response(JSON.stringify({schema:1,release:'1.4.1',sourceHash:hash}));};
  assert.equal((await verifyDeployment('https://protocol.invalid',hash,{fetcher})).sourceHash,hash);assert.equal(calls,1);
  await assert.rejects(verifyDeployment('https://protocol.invalid','b'.repeat(64),{fetcher}),/不一致/);
  await assert.rejects(verifyDeployment('https://protocol.invalid',hash,{fetcher:async()=>new Response('<html>old</html>')}));
  await assert.rejects(verifyDeployment('https://protocol.invalid',hash,{fetcher:async()=>new Response('{}',{status:503})}));
});
test('多行导入导出和字面量动态导入均覆盖，计算路径和无效语法拒绝生成指纹',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nico-multiline-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const content of ["import {\n value\n} from './child.mjs';","export {\n value\n} from './child.mjs';","const child=import(\n './child.mjs'\n);"]){
    fs.writeFileSync(path.join(root,'entry.mjs'),content);fs.writeFileSync(path.join(root,'child.mjs'),'export const value=1;');const before=sourceFingerprint(root,'entry.mjs');fs.writeFileSync(path.join(root,'child.mjs'),'export const value=2;');assert.notEqual(sourceFingerprint(root,'entry.mjs'),before);
  }
  fs.writeFileSync(path.join(root,'entry.mjs'),'const name="./child.mjs";import(name);');assert.throws(()=>sourceFingerprint(root,'entry.mjs'));
  fs.writeFileSync(path.join(root,'entry.mjs'),'import { broken');assert.throws(()=>sourceFingerprint(root,'entry.mjs'));
});
test('运行指标只保留固定类别和数字，不泄漏路径、账号、正文或异常文字', () => {
  let time=0;const logs=[];const h=createHealth({now:()=>time,emit:item=>logs.push(item)});
  assert.equal(routeCategory('/api/media/private-name/content/original?token=secret','GET'),'mediaRead');
  assert.equal(routeCategory('/api/auth/login','POST'),'login');assert.equal(routeCategory('/api/anything-sensitive','POST'),'other');
  h.record('/api/media/private-name/content/original?token=secret','GET',200,75);
  h.record('/api/auth/login','POST',401,50);h.record('/api/media','POST',201,100);h.record('/api/media/id/processing-failure','POST',200,5);
  const view=h.snapshot();assert.equal(view.groups.login.unauthorized,1);assert.equal(view.groups.upload.ok,1);assert.equal(view.groups.processingFailure.ok,1);
  assert.equal(view.groups.mediaRead.durationMs,75);assert.doesNotMatch(JSON.stringify({view,logs}),/private-name|secret|token|anything-sensitive/);
  for(let i=0;i<200;i++)h.record('/api/snapshot','GET',200,1);assert.ok(logs.length<=60);assert.ok(h.snapshot().droppedLogs>0);
  time=11000;h.record('/api/snapshot','GET',200,1);assert.ok(logs.length>60);
  const broken=createHealth({emit:()=>{throw Error('logger down');}});assert.doesNotThrow(()=>broken.record('/api/snapshot','GET',200,1));
});
test('上传数量和处理成功严格分离，未知状态不当作成功', () => {
  assert.deepEqual(mediaHealth([{type:'video',processingStatus:'已处理'},{type:'video',processingStatus:'处理未完成，原片保留'},{type:'video'},{type:'photo'}]),{originals:4,videos:3,processed:1,failed:1,pendingOrUnknown:1});
});
test('版本接口无档案读写；健康只对有效家长会话开放且没有事实内容', async () => {
  let reads=0;const release={schema:1,release:'1.4.1',sourceHash:'a'.repeat(64)};
  const handler=createCloudHandler({origins:[],release,backend:{read:async()=>{reads++;throw Error('must not read facts');},session:async()=>({username:'private-account',expires_at:'2100-01-01T00:00:00Z'}),account:async()=>({must_change_password:false}),health:async()=>({storage:{count:2,bytes:100},backups:{count:3}})}});
  const call=(p,token)=>handler(new Request('https://protocol.invalid/nico-api'+p,{headers:token?{Authorization:`Bearer ${token}`}:{}}));
  const version=await call('/api/version');assert.equal(version.status,200);assert.deepEqual(await version.json(),release);assert.equal(reads,0);
  assert.equal((await call('/api/health')).status,401);const health=await call('/api/health','a'.repeat(64));assert.equal(health.status,200);
  const info=await health.json();assert.equal(info.release.sourceHash,release.sourceHash);assert.equal(info.operations.storage.bytes,100);assert.doesNotMatch(JSON.stringify(info),/private-account|accessToken/);assert.equal(reads,0);
});
test('本机健康接口只读且仅家长可见',async t=>{
  const h=await archiveHarness(t,'local');const before=h.read();
  assert.equal((await h.send('/api/health','GET',undefined,undefined,'guest')).status,401);
  assert.equal((await h.send('/api/health','GET',undefined,undefined,'coach')).status,403);
  const response=await h.send('/api/health');assert.equal(response.status,200);const value=await response.json();assert.equal(value.operations.media.originals,0);assert.equal(value.release.sourceHash,null);assert.deepEqual(h.read(),before);
});

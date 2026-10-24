import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/services/api.js';
import { installPageHealth } from '../src/services/health.js';
test('浏览器观测请求状态与延迟，不保留输入；退出清空，旧请求不能污染新账号',async()=>{
  const original=globalThis.fetch;let resolve;const api=createApi('https://protocol.invalid');
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({authenticated:true,username:'protocol-a',role:'owner',accessToken:'e'.repeat(64),expiresAt:Date.now()+60000}));
    await api.authRequest('login',{username:'private-name',password:'never-retain'});
    globalThis.fetch=async()=>new Response('{}',{status:503});await assert.rejects(api.request('/api/swim/private-record',{method:'GET'}));
    assert.equal(api.health.snapshot().groups.read.serverError,1);assert.doesNotMatch(JSON.stringify(api.health.snapshot()),/private-name|private-record|never-retain/);
    globalThis.fetch=()=>new Promise(r=>{resolve=r;});const pending=api.request('/api/snapshot');
    api.resetAuth();resolve(new Response('{}'));await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(api.health.snapshot().groups,{});
  }finally{globalThis.fetch=original;}
});
test('全局异常只计数，不读错误文本，卸载后停止监听',()=>{
  const api=createApi('https://protocol.invalid');const target=new EventTarget();const stop=installPageHealth(api.health,target);
  const event=new Event('error');Object.defineProperty(event,'error',{get(){throw Error('must never access private Error');}});target.dispatchEvent(event);target.dispatchEvent(new Event('unhandledrejection'));
  assert.equal(api.health.snapshot().pageErrors,2);stop();target.dispatchEvent(new Event('error'));assert.equal(api.health.snapshot().pageErrors,2);
});
test('本机Cookie登录无accessToken也清空设备指标',async()=>{
  const original=globalThis.fetch,api=createApi('');
  try{api.health.record('/api/snapshot','GET',503,1);globalThis.fetch=async()=>new Response(JSON.stringify({authenticated:true,username:'protocol-parent',role:'owner',csrf:'protocol-csrf',expiresAt:Date.now()+60000}));await api.authRequest('login',{username:'protocol-parent',password:'protocol-only'});assert.deepEqual(api.health.snapshot().groups,{});}finally{globalThis.fetch=original;}
});

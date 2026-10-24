import test from 'node:test';import assert from 'node:assert/strict';import {createChildDraft} from '../src/services/child-draft.js';
test('儿童草稿仅当前已验证儿童授权可读写，刷新保持请求ID，账号/授权到期隔离',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let now=100,current;
  const scope={role:'child',backend:'protocol',account:'protocol-a',expiresAt:1000,epoch:1};current=scope;
  const store=s=>createChildDraft({scope:s,viewId:'view',storage,isCurrent:x=>x===current,now:()=>now});
  const payload={trainingId:'',mood:'开心',text:'原话',clientRequestId:'stable-child-request',baseRevision:1};store(scope).save(payload);assert.equal(store(scope).read().value.clientRequestId,'stable-child-request');
  current={...scope,account:'protocol-b'};assert.equal(store(current).read().status,'empty');assert.equal(store(scope).save({...payload,text:'旧回调'}),false);assert.equal(values.size,1);
  current=scope;now=1001;assert.equal(store(scope).read().status,'expired');assert.equal(store(scope).save(payload),false);assert.doesNotMatch([...values.values()].join(''),/accessToken|Bearer/);
});

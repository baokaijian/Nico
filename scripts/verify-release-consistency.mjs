// V1.6 发布一致性检查：分别核对线上 Pages 实际资源、实际 API 指纹与本地构建，失败按类别退出非零。
// 只输出文件名哈希、版本与数量，不输出任何私有内容；构建成功不得被当作实际发布成功。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourceFingerprint } from './release-info.mjs';
const PRODUCTION_PAGES=process.env.NICO_PAGES_URL||'https://baokaijian.github.io/Nico';
const PRODUCTION_API=process.env.VITE_API_URL||'https://oeyirzlgqixvcxofimit.supabase.co/functions/v1/nico-api';
const assetNames=html=>[...new Set([...String(html).matchAll(/(?:src|href)="[^"]*\/?(assets\/[A-Za-z0-9_.-]+)"/g)].map(match=>match[1]))].sort();
export async function verifyReleaseConsistency({pagesBase,apiBase,expectedAssets,expectedBuild,expectedApiHash,fetcher=fetch}){
 if(!Array.isArray(expectedAssets)||!expectedAssets.length)throw Error('缺少本地构建资源清单');
 const expected=[...new Set(expectedAssets)].sort();
 const checks=[],fetchText=async(url)=>{
  const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  return response.text();
 };
 const record=async(name,run)=>{try{checks.push({name,status:'pass',detail:await run()});}catch(error){checks.push({name,status:'fail',detail:error instanceof Error?error.message:'未知失败'});}};
 await record('pages-index',async()=>{const html=await fetchText(`${pagesBase.replace(/\/+$/,'')}/index.html`);const live=assetNames(html);if(live.join('\n')!==expected.join('\n'))throw Error(`版本不一致：线上资源 ${live.join(',')} 与本地构建 ${expected.join(',')} 不同`);return {assets:live.length};});
 await record('pages-build',async()=>{const build=JSON.parse(await fetchText(`${pagesBase.replace(/\/+$/,'')}/nico-build.json`));if(build.release!==expectedBuild.release||build.frontendCommit!==expectedBuild.frontendCommit)throw Error(`版本不一致：线上 ${build.release}/${String(build.frontendCommit).slice(0,7)} 与本地 ${expectedBuild.release}/${String(expectedBuild.frontendCommit).slice(0,7)} 不同`);if(build.apiSourceHash!==expectedApiHash)throw Error('线上构建声明的API指纹与当前源码不一致');return {release:build.release,commit:String(build.frontendCommit).slice(0,7)};});
 await record('api-version',async()=>{const version=JSON.parse(await fetchText(`${apiBase.replace(/\/+$/,'')}/api/version`));if(version.sourceHash!==expectedApiHash)throw Error(`版本不一致：实际API指纹 ${String(version.sourceHash).slice(0,8)}… 与当前源码 ${expectedApiHash.slice(0,8)}… 不同`);return {release:version.release,compatible:true};});
 const failed=checks.filter(check=>check.status==='fail');
 return {schema:1,ok:!failed.length,checks,category:!failed.length?null:(failed.some(check=>check.detail.startsWith('版本不一致'))?'mismatch':'unreachable')};
}
export function localBuildExpectation({distDir='dist',apiHash=sourceFingerprint()}={}){
 const index=fs.readFileSync(path.join(distDir,'index.html'),'utf8'),build=JSON.parse(fs.readFileSync(path.join(distDir,'nico-build.json'),'utf8'));
 return {expectedAssets:assetNames(index),expectedBuild:{release:build.release,frontendCommit:build.frontendCommit},expectedApiHash:apiHash};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const pagesBase=process.argv.slice(2).find(value=>!value.startsWith('--'))||PRODUCTION_PAGES;
 const result=await verifyReleaseConsistency({pagesBase,apiBase:PRODUCTION_API,...localBuildExpectation()});
 console.log(JSON.stringify(result));
 process.exitCode=result.ok?0:1;
}

import { pathToFileURL } from 'node:url';
import { sourceFingerprint } from './release-info.mjs';
export async function verifyDeployment(base,expected,{fetcher=fetch,attempts=1,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  if(!/^[a-f0-9]{64}$/.test(expected))throw Error('预期 API 指纹无效');
  let problem;
  for(let n=0;n<attempts;n++) {
    try {
      const response=await fetcher(`${base.replace(/\/+$/,'')}/api/version`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error(`实际 API 版本查询失败：HTTP ${response.status}`);
      const actual=await response.json();
      if(actual.schema!==1||actual.sourceHash!==expected)throw Error('实际 API 源码指纹与待发布版本不一致，停止发布');
      return actual;
    }catch(error){problem=error;}
    if(n+1<attempts)await pause(10000);
  }
  throw problem;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const actual=await verifyDeployment(process.argv.slice(2).find(value=>!value.startsWith('--'))||process.env.VITE_API_URL||'https://oeyirzlgqixvcxofimit.supabase.co/functions/v1/nico-api',sourceFingerprint(),{attempts:process.argv.includes('--wait')?24:1});
  console.log(JSON.stringify({verified:true,release:actual.release,sourceHash:actual.sourceHash}));
}

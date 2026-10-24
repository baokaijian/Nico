export async function boundedMediaBlob(response,maxBytes,signal){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('媒体读取上限无效');
 const exceeded=()=>Object.assign(Error('单个媒体超过本次读取上限，已停止下载；原文件保持不变。'),{status:413});
 if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw exceeded();}
 const reader=response.body?.getReader();if(!reader)return new Blob([],{type:response.headers.get('content-type')||''});const chunks=[];let total=0;
 const cancelled=()=>{if(signal?.aborted)throw new DOMException('读取已取消','AbortError');},onAbort=()=>{void reader.cancel().catch(()=>{});};signal?.addEventListener('abort',onAbort,{once:true});
 try{while(true){cancelled();const {done,value}=await reader.read();cancelled();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw exceeded();}chunks.push(value);}return new Blob(chunks,{type:response.headers.get('content-type')||''});}
 finally{signal?.removeEventListener('abort',onAbort);reader.releaseLock();}
}

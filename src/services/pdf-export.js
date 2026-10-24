import fontUrl from '../assets/fonts/NotoSansSC-Regular.ttf?url';
export async function fontBytes(signal){const r=await fetch(fontUrl,{signal});if(!r.ok)throw Error('中文字体加载失败，请检查连接后重试。');return new Uint8Array(await r.arrayBuffer());}
export function downloadPrivate(name,bytes,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

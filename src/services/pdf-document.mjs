import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {yearbookSections} from '../../shared/yearbooks.mjs';
export async function growthPDF({title,subtitle,status,sections,sources=[],images=[]},fontBytes){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(fontBytes,{subset:false}),supported=new Set(font.getCharacterSet());
 const ink=rgb(.09,.22,.26),muted=rgb(.34,.42,.45),sea=rgb(.09,.42,.47),paper=rgb(.985,.977,.955);let page,y;
 const fresh=()=>{page=pdf.addPage([595.28,841.89]);page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:paper});y=779;};
 const safe=text=>String(text??'').replace(/\r/g,'').replace(/\t/g,'    ');
 function lines(text,size=12,width=491){const out=[];for(const para of safe(text).split('\n')){let line='';for(const c of para){if(!supported.has(c.codePointAt(0)))throw Error(`PDF字体暂不支持字符“${c}”，请调整叙事后重试，原文未修改。`);if(line&&font.widthOfTextAtSize(line+c,size)>width){out.push(line);line='';}line+=c;}out.push(line);}return out;}
 const text=(value,{size=12,color=ink,gap=9}={})=>{for(const line of lines(value,size)){if(y<size+65)fresh();page.drawText(line,{x:52,y:y-size,font,size,color});y-=size*1.65;}y-=gap;};
 fresh();y=700;text('NICO / PRIVATE GROWTH',{size:12,color:sea,gap:32});text(title,{size:34,color:ink,gap:24});text(subtitle,{size:15,color:muted,gap:28});text(status,{size:12,color:sea});text('私人档案 · 仅供家庭保存',{size:12,color:muted});
 for(const s of sections){fresh();text(s.title,{size:23,color:sea,gap:24});for(const line of s.lines)text(line);}
 for(const image of images){fresh();text(image.title,{size:20,color:sea,gap:20});const bytes=image.bytes;let embedded;try{embedded=image.mime==='image/png'?await pdf.embedPng(bytes):image.mime==='image/jpeg'?await pdf.embedJpg(bytes):null;}catch{throw Error('精选照片无法解析，PDF未完成，请核对素材后重试。');}if(!embedded)throw Error('PDF照片仅支持PNG/JPEG，请选择兼容照片或明确仅导出影像索引。');const fit=embedded.scaleToFit(491,Math.min(550,y-95));page.drawImage(embedded,{x:52+(491-fit.width)/2,y:y-fit.height,width:fit.width,height:fit.height});y-=fit.height+20;text(`media/${image.id}`,{size:10,color:muted});}
 fresh();text('来源与版本',{size:22,color:sea,gap:20});for(const source of sources)text(`${source.collection}/${source.id}${source.version?` · v${source.version}`:''}`,{size:10});
 const pages=pdf.getPages();pages.forEach((p,i)=>p.drawText(`NICO / PRIVATE    ${i+1} / ${pages.length}`,{x:52,y:32,font,size:9,color:muted}));pdf.setTitle(title);pdf.setProducer('Nico private export');return pdf.save();
}
export function yearbookPDF(book,fontBytes,{stale=false,images=[]}={}){return growthPDF({title:book.title,subtitle:`${book.year} · ${book.theme}`,status:`${book.status} · v${book.version}${stale?' · 来源基线已过期，保留生成时事实':''}`,sections:yearbookSections(book),sources:[{collection:'reportDrafts',id:book.reportId,version:book.reportVersion},...book.reportSnapshot.sourceRefs,...book.mediaSnapshots.map(m=>({collection:'media',id:m.id,version:m.version}))],images},fontBytes);}

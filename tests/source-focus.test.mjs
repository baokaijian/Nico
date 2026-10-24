import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {emptyState} from '../shared/domain.mjs';
test('待办媒体原记录内部说明和批注仅定位选定素材，其他记录仍留在档案',async()=>{
 const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {default:Gallery}=await server.ssrLoadModule('/src/components/MediaGallery.jsx');
  const data=emptyState();data.media=[{id:'chosen-media',date:'2000-01-01',title:'所选协议素材',type:'video',url:'/uploads/a.mp4'},{id:'other-media',date:'2000-01-02',title:'其他协议素材',description:'OTHER-MEDIA-METADATA',type:'video',url:'/uploads/b.mp4'}];
  data.annotations=[{id:'chosen-note',date:'2000-01-01',mediaId:'chosen-media',observation:'VISIBLE-PROTOCOL-NOTE'},{id:'other-note',date:'2000-01-02',mediaId:'other-media',observation:'HIDDEN-PROTOCOL-NOTE'}];
  const scope={backend:'protocol',account:'a',athlete:'nico'},api={getRevision:()=>1,getDraftScope:()=>scope};
  const before=structuredClone(data),html=renderToStaticMarkup(createElement(Gallery,{focusId:'chosen-media',data,api,readOnly:true}));
  assert.ok(html.includes('所选协议素材'));assert.ok(html.includes('VISIBLE-PROTOCOL-NOTE'));assert.ok(!html.includes('HIDDEN-PROTOCOL-NOTE'),'不能在选中素材的工作区列出无关批注');
  // Owner can edit metadata; read-only and owner see the same exact source.
  const editable=renderToStaticMarkup(createElement(Gallery,{focusId:'chosen-media',data,api,readOnly:false}));
  assert.ok(!editable.includes('OTHER-MEDIA-METADATA'),'不能列出无关素材的说明编辑入口');assert.deepEqual(data,before);
 }finally{await server.close();}
});

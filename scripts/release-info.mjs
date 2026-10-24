import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseAst } from 'rolldown/parseAst';
export const projectRoot=path.resolve(import.meta.dirname,'..');
export const edgeEntry='supabase/functions/nico-api/index.ts';
export const generatedRelease='supabase/functions/nico-api/_release.mjs';
export function sourceFiles(root=projectRoot,entry=edgeEntry) {
  const seen=new Map();
  const excluded=path.join(path.dirname(entry),'_release.mjs').split(path.sep).join('/');
  function visit(relative) {
    relative=path.relative(root,path.resolve(root,relative)).split(path.sep).join('/');
    if(relative.startsWith('../')||path.isAbsolute(relative))throw Error('发布依赖越出项目');
    if(relative===excluded||seen.has(relative))return;
    const content=fs.readFileSync(path.join(root,relative),'utf8');seen.set(relative,content);
    const ast=parseAst(content,{lang:relative.endsWith('.ts')?'ts':'js'},relative);
    const dependencies=[];
    function walk(node) {
      if(!node||typeof node!=='object')return;
      if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)&&node.source)dependencies.push(node.source.value);
      if(node.type==='ImportExpression') {
        if(node.source.type!=='Literal'||typeof node.source.value!=='string')throw Error(`发布依赖不允许计算动态路径：${relative}`);
        dependencies.push(node.source.value);
      }
      if(node.type==='CallExpression'&&node.callee?.name==='require')throw Error(`发布依赖不允许CommonJS加载：${relative}`);
      for(const value of Object.values(node))if(value&&typeof value==='object'){if(Array.isArray(value))value.forEach(walk);else walk(value);}
    }
    walk(ast);
    for(const dependency of dependencies) {
      if(typeof dependency==='string'&&dependency.startsWith('.'))visit(path.join(path.dirname(relative),dependency));
      else throw Error(`发布依赖必须为本仓库相对文件：${relative}`);
    }
  }
  visit(entry);return [...seen].sort(([a],[b])=>a<b?-1:a>b?1:0);
}
export function sourceFingerprint(root=projectRoot,entry=edgeEntry) {
  const hash=createHash('sha256');for(const [name,content] of sourceFiles(root,entry))hash.update(JSON.stringify([name,content])+'\n');return hash.digest('hex');
}
export function releaseInfo() {
  const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8'}).trim();
  return {schema:1,release:'1.6.0',sourceHash:sourceFingerprint(),commit};
}

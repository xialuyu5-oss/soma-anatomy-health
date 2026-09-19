import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const html=fs.readFileSync(new URL('./integration.html',import.meta.url),'utf8');
const blocks=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
let checked=0;
for(const [,attrs,code] of blocks){
  if(!code.trim()||/application\/json/.test(attrs))continue;
  new vm.Script(code);checked++;
}
for(const file of ['integration.js','composition-embed.js','boot.js','i18n.js','i18n-catalog.js'])new vm.Script(fs.readFileSync(new URL(file,import.meta.url),'utf8'));
new vm.Script(JSON.parse(blocks.find(([,attrs])=>attrs.includes('embedded-fit-worker34'))[2]));
const context=vm.createContext({console,TextDecoder,TextEncoder,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,ArrayBuffer,DataView,structuredClone,window:{},document:{readyState:'loading',addEventListener(){}},setTimeout,clearTimeout});
for(const [,attrs,code] of blocks)if(code.trim()&&!/application\/json/.test(attrs))vm.runInContext(code,context);
vm.runInContext('globalThis.testAPI={parseGLB,sharedNormalization,applyNormalization,decoratePart,SurfaceCore,SurfaceSource,SOURCE};',context);
const api=context.testAPI,systems=[],allParts=[];
let normalization;
for(const [key,source] of Object.entries(api.SOURCE.systems)){
  const raw=fs.readFileSync(new URL(source.local,import.meta.url));
  const data=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const parsed=api.parseGLB(data,key);
  if(key==='bones')normalization=api.sharedNormalization(parsed.parts);
  api.applyNormalization(parsed.parts,normalization);
  const ids=new Set();
  for(const p of parsed.parts){
    assert(!ids.has(p.id));ids.add(p.id);
    api.decoratePart(p);
    assert(p.raw);assert(p.term.zh);
    assert(p.center.every(Number.isFinite));
    assert(p.bounds.lo.every(Number.isFinite)&&p.bounds.hi.every(Number.isFinite));
  }
  allParts.push(...parsed.parts);
  systems.push({key,parts:parsed.parts.length,triangles:parsed.triangles,sha256:crypto.createHash('sha256').update(raw).digest('hex')});
}
assert.equal(systems.reduce((n,s)=>n+s.parts,0),2914);
const main=blocks.find(([,a,c])=>c.includes('function bootSOMA()'))[2];
const exerciseCode=main.slice(main.indexOf('const exercises=['),main.indexOf('function renderLearning()'));
const exerciseContext=vm.createContext({B:{state:{parts:allParts}}});
vm.runInContext(exerciseCode+'globalThis.results=exercises.map(ex=>({id:ex.id,parts:matches(ex)}));',exerciseContext);
const exerciseMatches=exerciseContext.results.map(r=>({id:r.id,count:r.parts.length}));
for(const r of exerciseContext.results){assert(r.parts.length>0);assert(r.parts.every(p=>!p.term.kindKey));}
const baselineContext=vm.createContext({B:{state:{parts:allParts}}});
vm.runInContext(exerciseCode.replace('&&!p.term.kindKey','')+'globalThis.bad=exercises.flatMap(matches).filter(p=>p.term.kindKey).length;',baselineContext);
assert(baselineContext.bad>0,'Regression fixture must expose the original tendon/bursa matching bug');
// Inventory the actual original recipes, so the retained legacy model library also stays local.
const files=new Set([api.SurfaceSource.base,api.SurfaceSource.eyes,api.SurfaceSource.eyeMap]);
for(const profile of ['male','female','child'])for(const childAge of [8,10])for(const muscle of [0,.5,1])for(const adiposity of [0,.5,1]){
  const recipe=api.SurfaceCore.recipe(profile,0,childAge,{muscle,adiposity});
  for(const item of recipe.items)files.add(item.file);
}
fs.writeFileSync(new URL('./validation/legacy-surface-files.json',import.meta.url),JSON.stringify([...files],null,2));
for(const file of files){
  const source=fs.readFileSync(new URL('./assets/makehuman/'+file,import.meta.url),'utf8');
  if(file.endsWith('.obj'))api.SurfaceCore.parseOBJ(source);
  else if(file.endsWith('.mhclo'))api.SurfaceCore.parseProxy(source,19158);
  else api.SurfaceCore.parseTarget(source,19158);
}
const original=fs.readFileSync(new URL('./legacy/SOMA-3.4-Refit.html',import.meta.url));
assert.equal(crypto.createHash('sha256').update(original).digest('hex'),'d83437190d57143c81efdd5b5c564162d0c6d83241e6acb7e5f168d589063345');
const report={inlineScripts:checked,systems,totalParts:2914,surfaceFiles:files.size,exerciseMatches,originalBadExerciseMatches:baselineContext.bad,originalPreserved:true};
fs.writeFileSync(new URL('./validation/integration-static.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

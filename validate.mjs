import fs from 'node:fs';
import assert from 'node:assert/strict';
import {shape,createHuman,disposeGroup} from './human.js';
const data=JSON.parse(fs.readFileSync(new URL('./assets/human.json',import.meta.url)));
const params={height:175,fat:50,muscle:50},options={pose:'standard',fit:'regular',garment:'tee',color:'#d5e9df',ghost:false,wireframe:false};
const base=shape(data,'male',params),same=shape(data,'male',params);
assert.deepEqual(base,same,'Identical parameters must generate identical body vertices');
const fat=shape(data,'male',{...params,fat:70}),muscle=shape(data,'male',{...params,muscle:70}),female=shape(data,'female',params);
assert.notDeepEqual(base,fat);assert.notDeepEqual(base,muscle);assert.notDeepEqual(fat,muscle);assert.notDeepEqual(base,female);
const checks=[];
for(const sex of ['male','female'])for(const pose of ['standard','natural'])for(const fit of ['tight','regular','loose']){
 const model=createHuman(data,sex,{height:175,fat:30,muscle:70},{...options,pose,fit});
 for(const mesh of model.children){const p=mesh.geometry.attributes.position.array;assert(p.every(Number.isFinite));assert(mesh.geometry.attributes.normal.array.every(Number.isFinite));assert(mesh.geometry.index.array.every(i=>i<p.length/3));}
 const shirt=model.children.find(m=>m.name==='上衣').geometry.attributes.position.array;
 for(let i=0;i<shirt.length;i+=3)if(shirt[i+1]>.78&&shirt[i+1]<1.05)assert(Math.abs(shirt[i])<.38,'Hem projection must not pick up arm/hand surfaces');
 const body=model.children[0].geometry.attributes.position.array;let min=Infinity,max=-Infinity;for(let i=1;i<body.length;i+=3){min=Math.min(min,body[i]);max=Math.max(max,body[i]);}assert(max-min>1.65&&max-min<1.85);
 checks.push({sex,pose,fit,meshes:model.children.length,finite:true,indicesValid:true});disposeGroup(model);
}
fs.writeFileSync(new URL('./validation/geometry-checks.json',import.meta.url),JSON.stringify({baselineDeterministic:true,independentMorphs:true,sexTargetsDistinct:true,checks,scope:'Numerical geometry checks only; not proof of anatomical accuracy or collision-free clothing.'},null,2));
console.log('PASS: deterministic baseline, independent morphs, distinct adult sex targets, 12 real-geometry combinations finite with valid indices.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shape} from './human.js';
import {bodyExample,BODY_EXAMPLE_IDS} from './composition.js';
const data=JSON.parse(fs.readFileSync(new URL('./assets/human.json',import.meta.url))),ids=[...new Set(data.body.indices)],results=[];
for(const sex of ['male','female']){
 const height=sex==='male'?175:165,neutral=shape(data,sex,{height,fat:50,muscle:50});
 const joint=name=>data.rig.joints[name].reduce((p,i)=>p.map((x,k)=>x+neutral[i][k]/data.rig.joints[name].length),[0,0,0]);
 const shoulder=joint(data.rig.bones['upperarm01.L'].head),hip=joint(data.rig.bones['upperleg01.L'].head),length=shoulder[1]-hip[1],subsets={};
 // Same skin vertices at anatomical torso levels for all four combinations.
 for(const [name,lo,hi]of [['back',.65,.85],['waist',.23,.40],['belly',.12,.32]])subsets[name]=ids.filter(i=>neutral[i][1]>hip[1]+lo*length&&neutral[i][1]<hip[1]+hi*length&&Math.abs(neutral[i][0])<shoulder[0]*1.05);
 const samples=BODY_EXAMPLE_IDS.map(id=>{
  const params=bodyExample(sex,height,id),vertices=shape(data,sex,params),metrics={};
  assert(vertices.flat().every(Number.isFinite));
  for(const [name,subset]of Object.entries(subsets)){
   const front=subset.filter(i=>neutral[i][2]>.5);assert(front.length>10);
   metrics[name]={width:Math.max(...subset.map(i=>vertices[i][0]))-Math.min(...subset.map(i=>vertices[i][0])),front:front.reduce((sum,i)=>sum+vertices[i][2],0)/front.length,y:front.reduce((sum,i)=>sum+vertices[i][1],0)/front.length};
  }
  for(const [name,start,end]of [['arm','upperarm01','lowerarm01'],['thigh','upperleg01','lowerleg01']]){
   const a=joint(data.rig.bones[start+'.L'].head),b=joint(data.rig.bones[end+'.L'].head),ab=b.map((x,k)=>x-a[k]),l2=ab.reduce((sum,x)=>sum+x*x,0);
   const radial=p=>{const ap=p.map((x,k)=>x-a[k]),t=ap.reduce((sum,x,k)=>sum+x*ab[k],0)/l2;return {t,r:Math.hypot(...ap.map((x,k)=>x-t*ab[k]))};};
   const subset=ids.filter(i=>{const {t}=radial(neutral[i]);return t>.3&&t<.7&&data.weights[i].some(([bone,w])=>bone.startsWith(start.replace('01',''))&&bone.endsWith('.L')&&w>.2);});
   metrics[name]=subset.reduce((sum,i)=>sum+radial(vertices[i]).r,0)/subset.length;
  }
  return {id,params,metrics};
 });
 const [lean,athletic,soft,solid]=samples.map(s=>s.metrics);
 for(const region of ['arm','thigh']){
  assert(lean[region]<athletic[region]*.80,'Low-fat/low-muscle must be visibly thinner than athletic');
  assert(solid[region]>soft[region]*1.20,'Muscular bulk must remain visible under high fat');
 }
 assert(athletic.back.width>lean.back.width*1.15,'Athletic shoulders/back must broaden');
 assert(athletic.waist.width/athletic.back.width<lean.waist.width/lean.back.width*.90,'Athletic taper must differ from a thin straight torso');
 assert(soft.belly.front>athletic.belly.front*1.50,'Soft build needs visibly more abdominal projection');
 assert(solid.back.width>soft.back.width*1.18,'Solid build needs a broader supported upper torso');
 assert(solid.belly.front>athletic.belly.front*1.40,'High-muscle/high-fat must retain abdominal fat');
 // Joint effect, beyond independent linear inflation: low support adds a lower,
 // projecting belly. Subtract low-fat shapes to separate support from baseline anatomy.
 const softProjection=(soft.belly.front-lean.belly.front)-(solid.belly.front-athletic.belly.front);
 const softDrop=(soft.belly.y-lean.belly.y)-(solid.belly.y-athletic.belly.y);
 assert(softProjection>.08,'Low muscle support must change fat distribution, not merely total size');
 assert(softDrop<-.06,'Soft high-fat belly must sit lower than supported high-fat belly');
 for(const testHeight of [145,175,200])for(const id of BODY_EXAMPLE_IDS){const p=bodyExample(sex,testHeight,id);assert.equal(p.height,testHeight);assert(p.skeletalMuscleKg>=5&&p.skeletalMuscleKg<=80);}
 // Transitions remain continuous around the neutral crossing; no four discrete meshes.
 const below=shape(data,sex,{height,fat:49.999,muscle:49.999}),above=shape(data,sex,{height,fat:50.001,muscle:50.001});
 let maxCrossingStep=0;for(const i of ids)maxCrossingStep=Math.max(maxCrossingStep,Math.hypot(...above[i].map((x,k)=>x-below[i][k])));assert(maxCrossingStep<.001);
 results.push({sex,samples,softProjection,softDrop,maxCrossingStep});
}
assert.throws(()=>bodyExample('male',175,'unknown'));assert.throws(()=>bodyExample('male',999,'lean'));
fs.writeFileSync(new URL('./validation/body-quadrants-regression.json',import.meta.url),JSON.stringify({results,scope:'Product silhouette and interaction requirements, not medical/biomechanical validation.'},null,2));
console.log('PASS: 8 body combinations, muscle support/fat coverage interaction, retained fat, thin versus muscular limbs, continuous transitions and height-aware examples.');

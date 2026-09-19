import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shape} from './human.js';
const data=JSON.parse(fs.readFileSync(new URL('./assets/human.json',import.meta.url)));
const ids=[...new Set(data.body.indices)],results=[];
for(const sex of ['male','female']){
 const base=shape(data,sex,{height:175,fat:50,muscle:50});
 const joint=name=>data.rig.joints[name].reduce((p,i)=>p.map((x,k)=>x+base[i][k]/data.rig.joints[name].length),[0,0,0]);
 const hip=joint(data.rig.bones['upperleg01.L'].head),shoulder=joint(data.rig.bones['upperarm01.L'].head),torso=shoulder[1]-hip[1];
 const samples=[[50,50],[50,85],[85,50],[85,85]].map(([fat,muscle])=>{
  const vertices=shape(data,sex,{height:175,fat,muscle}),regions={};
  // Same anatomical vertices for every sample; no body-wide bounding boxes
  // that could confuse arm spread or leg spacing with tissue thickness.
  for(const [name,lo,hi] of [['back',hip[1]+torso*.65,hip[1]+torso*.85],['waist',hip[1]+torso*.23,hip[1]+torso*.40],['belly',hip[1]+torso*.12,hip[1]+torso*.32],['thigh',-3.8,-2.6]]){
   const subset=ids.filter(i=>base[i][1]>lo&&base[i][1]<hi&&Math.abs(base[i][0])<(name==='thigh'?3:shoulder[0]*1.05)&&(name!=='thigh'||base[i][0]>0));
   const points=subset.map(i=>vertices[i]);
   const extent=k=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]));
   const front=subset.filter(i=>base[i][2]>.5);
   regions[name]={width:extent(0),depth:extent(2),front:front.reduce((sum,i)=>sum+vertices[i][2],0)/front.length};
  }
  return {fat,muscle,vertices,regions};
 });
 const [b,m,f,both]=samples.map(s=>s.regions);
 assert(m.back.width>b.back.width*1.07,'Muscle must widen the back');
 assert(m.thigh.width>b.thigh.width*1.05,'Muscle must thicken each thigh, not just spread the legs');
 assert(m.waist.width/m.back.width<b.waist.width/b.back.width,'Muscle must improve waist/back silhouette ratio');
 assert(m.belly.front<b.belly.front*1.02,'Muscle alone must not produce a fat-like belly');
 assert(f.belly.front>b.belly.front*1.20,'Fat must visibly increase abdominal projection');
 assert(f.waist.width>b.waist.width*1.20,'Fat must increase flanks');
 assert(f.thigh.width>b.thigh.width*1.03,'Fat also changes limbs');
 assert(both.belly.front>m.belly.front*1.20,'High muscle must not erase high fat');
 // v4 models support/coverage interaction; additive displacement equality is
 // intentionally superseded by the four-combination tests and retained fat.
 for(const fat of [15,50,85])for(const muscle of [15,50,85])assert(shape(data,sex,{height:175,fat,muscle}).flat().every(Number.isFinite));
 results.push({sex,samples:samples.map(({vertices,...s})=>s),highMuscleFatRetentionRatio:both.belly.front/m.belly.front});
}
fs.writeFileSync(new URL('./validation/regional-regression.json',import.meta.url),JSON.stringify({results,scope:'Art-directed regional response tests, not clinical body composition validation'},null,2));
console.log('PASS: distinct back/thigh muscle response, abdomen/flank fat response, combined high-fat/high-muscle preservation, 18 finite endpoints.');

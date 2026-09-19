import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shape} from './human.js';
const data=JSON.parse(fs.readFileSync(new URL('./assets/human.json',import.meta.url)));
const ids=[...new Set(data.body.indices)],results=[];
// Measure the same skin vertices around neutral anatomical axes. This avoids
// mistaking changed pose, camera, leg spacing or clothing volume for tissue gain.
for(const sex of ['male','female']){
 const height=sex==='male'?175:165,muscle=sex==='male'?32:22,baselineFat=sex==='male'?20:28;
 const params=bodyFatPercent=>({height,bodyFatPercent,skeletalMuscleKg:muscle});
 const baseline=shape(data,sex,params(baselineFat));
 const samples=[10,baselineFat,35,50].sort((a,b)=>a-b).map(bodyFatPercent=>({bodyFatPercent,vertices:shape(data,sex,params(bodyFatPercent))}));
 const joint=name=>data.rig.joints[name].reduce((p,i)=>p.map((x,k)=>x+baseline[i][k]/data.rig.joints[name].length),[0,0,0]);
 const metrics={};
 for(const side of ['L','R'])for(const [name,start,end] of [['upperArm','upperarm01','lowerarm01'],['forearm','lowerarm01','wrist'],['thigh','upperleg01','lowerleg01'],['calf','lowerleg01','foot']]){
  const a=joint(data.rig.bones[start+'.'+side].head),b=joint(data.rig.bones[end+'.'+side].head),ab=b.map((x,k)=>x-a[k]),len2=ab.reduce((s,x)=>s+x*x,0);
  const radial=p=>{const ap=p.map((x,k)=>x-a[k]),t=ap.reduce((s,x,k)=>s+x*ab[k],0)/len2;return {t,r:Math.hypot(...ap.map((x,k)=>x-t*ab[k]))};};
  const subset=ids.filter(i=>{const {t}=radial(baseline[i]);return t>.3&&t<.7&&data.weights[i].some(([n,w])=>n.startsWith(start.replace('01',''))&&n.endsWith('.'+side)&&w>.2);});
  assert(subset.length>30,'Region must sample a surface, not a single vertex');
  metrics[name+'.'+side]=samples.map(({vertices})=>subset.reduce((s,i)=>s+radial(vertices[i]).r,0)/subset.length);
 }
 const h=joint(data.rig.bones.head.head),top=joint(data.rig.bones.head.tail),length=top[1]-h[1];
 for(const [name,lo,hi] of [['cheek',-.30,-.09],['jaw',-.49,-.31]]){
  const subset=ids.filter(i=>{const [x,y,z]=baseline[i],t=(y-h[1])/length;return t>lo&&t<hi&&Math.abs(x)>.20*length&&Math.abs(x)<.50*length&&z>h[2]+.15*length;});
  assert(subset.length>20,name+' needs enough skin vertices');
  metrics[name]=samples.map(({vertices})=>subset.reduce((sum,i)=>sum+Math.abs(vertices[i][0]),0)/subset.length);
 }
 for(const [name,values] of Object.entries(metrics)){
  for(let i=1;i<values.length;i++)assert(values[i]>values[i-1]*1.005,sex+' '+name+' must increase progressively with body fat');
  const baseIndex=samples.findIndex(s=>s.bodyFatPercent===baselineFat),ratio=values.at(-1)/values[baseIndex];
  assert(ratio>(['cheek','jaw'].includes(name)?1.10:1.20),sex+' '+name+' high-fat change is too small: '+ratio);
 }
 // The skull and eye region must not be ballooned to fake a fuller face.
 const protectedIds=ids.filter(i=>baseline[i][1]>h[1]+length*.26);
 let maxCraniumChange=0;
 for(const i of protectedIds)maxCraniumChange=Math.max(maxCraniumChange,Math.hypot(...samples.at(-1).vertices[i].map((x,k)=>x-baseline[i][k])));
 assert(maxCraniumChange<.008,'Cranium should stay stable');
 for(const {vertices} of samples)assert(vertices.flat().every(Number.isFinite));
 results.push({sex,samples:samples.map(s=>s.bodyFatPercent),meanRadialOrHalfWidth:metrics,maxCraniumChange});
}
fs.writeFileSync(new URL('./validation/fat-distribution-regression.json',import.meta.url),JSON.stringify({results,scope:'Illustrative soft-tissue appearance response, not a clinically calibrated mapping.'},null,2));
console.log('PASS: both sexes, bilateral arms/legs, cheeks/jaw, progressive body-fat response and stable cranium.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {POSE_IDS} from './poses.js';
import {newProfile,validateComparison,switchProfile} from './profiles.js';
import {fromLegacyParams} from './composition.js';
import {createHuman,disposeGroup} from './human.js';
const data=JSON.parse(fs.readFileSync(new URL('./assets/human.json',import.meta.url)));
let combinations=0;
const signatures={};
// Feet must stay planted while upper-body gestures change visibly. This also
// catches accidental rotations of a parent joint that would move the legs.
const feet=data.weights.flatMap((ws,i)=>ws.some(([bone,w])=>/^(foot|toe)/.test(bone)&&w>.5)?[i]:[]);
const hand=data.weights.flatMap((ws,i)=>ws.some(([bone,w])=>/^(finger|wrist)/.test(bone)&&w>.5)?[i]:[]);
assert(feet.length>20&&hand.length>20);
for(const sex of ['male','female'])for(const fat of [15,50,85])for(const garment of ['tee','knit','blouse']){
 let baseline;
 for(const pose of POSE_IDS){
  const p={...newProfile(sex),pose,garment,fit:fat===15?'tight':fat===85?'loose':'regular'};
  p.B=fromLegacyParams(sex,{height:p.B.height,fat,muscle:50});
  const restored=validateComparison(JSON.parse(JSON.stringify({version:2,...p})));
  assert.equal(restored.pose,pose);
  const profiles={},other=switchProfile(p,profiles,sex==='male'?'female':'male');
  assert.equal(switchProfile(other,profiles,sex).pose,pose);
  const model=createHuman(data,sex,p.B,p);
  for(const mesh of model.children){
   for(const kind of ['position','normal'])assert(mesh.geometry.attributes[kind].array.every(Number.isFinite),`${sex}/${pose}/${garment}: invalid ${kind}`);
   const count=mesh.geometry.attributes.position.count;
   assert(mesh.geometry.index.array.every(i=>i>=0&&i<count));
  }
  const pos=model.children.find(m=>m.name==='真实人体体表').geometry.attributes.position.array;
  const footPositions=feet.flatMap(i=>Array.from(pos.slice(i*3,i*3+3)));
  if(!baseline)baseline=footPositions;else assert.deepEqual(footPositions,baseline,'Upper-body gestures must not lift or move the feet');
  if(fat===50&&garment==='tee')signatures[sex+'-'+pose]=hand.flatMap(i=>Array.from(pos.slice(i*3,i*3+3)));
  disposeGroup(model);combinations++;
 }
}
const separation=[];
for(const sex of ['male','female'])for(let i=0;i<POSE_IDS.length;i++)for(let j=i+1;j<POSE_IDS.length;j++){
 const a=signatures[sex+'-'+POSE_IDS[i]],b=signatures[sex+'-'+POSE_IDS[j]];
 const rms=Math.sqrt(a.reduce((sum,v,k)=>sum+(v-b[k])**2,0)/(a.length/3));
 assert(rms>.025,'Presets must differ by more than a label');separation.push({sex,a:POSE_IDS[i],b:POSE_IDS[j],handRmsMeters:rms});
}
assert.throws(()=>validateComparison({version:2,...newProfile('male'),pose:'unknown'}));
const result={combinations,finiteMeshes:'PASS',stationaryFeet:'PASS',poseSaveRestore:'PASS',sexSwitchPreservation:'PASS',separation,scope:'Sampled geometry and state regression; visual review required, not full collision certification.'};
fs.writeFileSync(new URL('./validation/pose-regression.json',import.meta.url),JSON.stringify(result,null,2));
console.log(`PASS ${combinations} pose/sex/shape/garment combinations; planted feet; distinct hand gestures; pose persistence.`);

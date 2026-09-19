import {POSE_IDS} from './poses.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three/build/three.module.js';
import {createHuman,disposeGroup} from './human.js';
import {newProfile} from './profiles.js';
import {fromLegacyParams} from './composition.js';
const data=JSON.parse(fs.readFileSync(new URL('./assets/human.json',import.meta.url)));
const checks=[];
// Independent silhouette test: cast rays through the anatomical ankle transition from
// front, side and back. Finite vertices alone cannot detect the reported gap.
for(const pose of POSE_IDS)for(const fat of [15,50,85]){
  const profile={...newProfile('female'),pose};profile.B=fromLegacyParams('female',{height:165,fat,muscle:50});
  const model=createHuman(data,'female',profile.B,profile);model.updateMatrixWorld(true);
  const shoe=model.children.find(m=>m.name==='浅口高跟鞋'),p=shoe.geometry.attributes.position;
  const body=model.children.find(m=>m.name==='真实人体体表').geometry.attributes.position;
  // A pump has no boot cuff: sample around the anatomical ankle, not the
  // back of the shoe opening (which is intentionally behind the ankle).
  const ids=data.rig.joints[data.rig.bones['foot.L'].head];
  const center=ids.reduce((v,i)=>v.add(new THREE.Vector3().fromBufferAttribute(body,i)),new THREE.Vector3()).divideScalar(ids.length);
  const cuff=center.y;
  let shoeTop=-Infinity;for(let i=0;i<p.count;i++)shoeTop=Math.max(shoeTop,p.getY(i));
  assert(shoeTop<center.y+.01,'Pump opening must remain below the ankle');
  const surfaces=model.children.filter(m=>['真实人体体表','浅口高跟鞋','薄透丝袜'].includes(m.name));
  for(const angle of [0,Math.PI/2,Math.PI])for(let step=-12;step<=20;step++){
    const y=cuff+step*.001,dir=new THREE.Vector3(-Math.sin(angle),0,-Math.cos(angle)),origin=new THREE.Vector3(center.x+Math.sin(angle),y,center.z+Math.cos(angle));
    const ray=new THREE.Raycaster(origin,dir,0,2);
    assert(ray.intersectObjects(surfaces,false).length>0,`Ankle gap: pose=${pose}, fat=${fat}, angle=${angle}, y=${y}`);
  }
  checks.push({pose,fat,ankleSilhouetteRays:99});disposeGroup(model);
}
fs.writeFileSync(new URL('./validation/appearance-regression.json',import.meta.url),JSON.stringify({checks,scope:'Sampled ankle silhouette continuity; not full garment collision certification'},null,2));
console.log('PASS: 1188 ankle-transition rays across four poses and three body shapes.');

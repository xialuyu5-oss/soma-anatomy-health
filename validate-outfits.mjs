import assert from 'node:assert/strict';import fs from 'node:fs';import {newProfile,switchProfile} from './profiles.js';import {createHuman,disposeGroup} from './human.js';
const profiles={};let s=newProfile('male');s.A.height=s.B.height=182;s=switchProfile(s,profiles,'female');assert.equal(s.B.height,165);assert.equal(s.bottom,'skirt');s.A.height=s.B.height=168;s.bottom='pants';s=switchProfile(s,profiles,'male');assert.equal(s.B.height,182);s=switchProfile(s,profiles,'female');assert.equal(s.B.height,168);assert.equal(s.bottom,'pants');
const d=JSON.parse(fs.readFileSync('assets/human.json')),results=[];
for(const sex of ['male','female'])for(const pose of ['standard','natural'])for(const fat of [15,50,85])for(const garment of ['tee','knit','blouse']){
 const options={...newProfile(sex),pose,garment,fit:'loose'},params={height:sex==='female'?165:175,fat,muscle:fat===15?85:50};const model=createHuman(d,sex,params,options);
 for(const mesh of model.children){const p=mesh.geometry.attributes.position.array;assert(p.every(Number.isFinite));assert(mesh.geometry.attributes.normal.array.every(Number.isFinite));assert(mesh.geometry.index.array.every(i=>i<p.length/3));if(mesh.userData.texture)assert(fs.existsSync(mesh.userData.texture));}
 assert(model.children.some(m=>m.name===(options.shoeStyle==='heels'?'浅口高跟鞋':'运动鞋与中筒袜')));assert(model.children.some(m=>/短发|束发马尾/.test(m.name)));results.push({sex,pose,fat,garment,meshes:model.children.length});disposeGroup(model);
}
const options={...newProfile('female'),garment:'tee',pose:'standard',footwear:false},params=options.B;
const tight=createHuman(d,'female',params,{...options,fit:'tight'}),loose=createHuman(d,'female',params,{...options,fit:'loose'});
const a=tight.children.find(m=>m.name==='上衣').geometry.attributes.position.array,b=loose.children.find(m=>m.name==='上衣').geometry.attributes.position.array;let maxDelta=0,shoulder=0;
for(let i=0;i<a.length;i+=3){const delta=Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]);maxDelta=Math.max(maxDelta,delta);if(a[i+1]>1.37)shoulder=Math.max(shoulder,delta);}
assert(maxDelta>.005&&maxDelta<.035,'Fit should add modest, nonzero fabric ease');console.log({maxDelta,shoulder});assert(shoulder<.008,'Shoulders must not inflate with loose fit');disposeGroup(tight);disposeGroup(loose);
fs.writeFileSync('validation/outfit-regression.json',JSON.stringify({profileSwitch:'PASS',finiteGeometry:'PASS',cases:results,maximumFitChangeMetres:maxDelta,shoulderFitChangeMetres:shoulder,scope:'Geometry and preset regression, not cloth simulation or universal collision certification'},null,2));console.log('PASS',results.length,'outfit combinations; separate profile memory; maximum ease',maxDelta,'shoulder',shoulder);

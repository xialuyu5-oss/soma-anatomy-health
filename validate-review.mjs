import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {newProfile,switchProfile,validateComparison} from './profiles.js';
import {Vector3} from './vendor/three/build/three.module.js';

// Execute the application's actual validator/handler; stub only DOM and geometry scheduling.
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const line=prefix=>{const found=source.split('\n').find(s=>s.startsWith(prefix));assert(found,prefix);return found;};
function fixture(sex){
  const nodes=new Map(),$=key=>{if(!nodes.has(key))nodes.set(key,{});return nodes.get(key);};
  const context={$,validateComparison,state:newProfile(sex),profiles:{},ready:true,structuredClone,status:t=>context.message=t,update:async()=>{},JSON,Error};
  vm.createContext(context);vm.runInContext(line('function validateState(')+'\n'+line("$('#restore').onchange="),context);
  const restore=async value=>$('#restore').onchange({target:{files:[{size:1000,text:async()=>typeof value==='string'?value:JSON.stringify(value)}],value:'test'}});
  return {context,restore};
}
let cases=0;
for(const sex of ['male','female'])for(const cached of [false,true]){
  const {context:c,restore}=fixture(sex),other=sex==='male'?'female':'male';
  c.state.A.height=181;c.state.B.height=182;
  if(cached)c.profiles[sex]=newProfile(sex);
  const saved={version:2,...newProfile(other),ghost:true,wireframe:true,edit:'A'};
  await restore(saved);
  assert.equal(c.state.sex,other);assert.equal(c.state.ghost,true);assert.equal(c.state.wireframe,true);assert.equal(c.state.edit,'A');
  const back=switchProfile(c.state,c.profiles,sex);assert.equal(back.A.height,181);assert.equal(back.B.height,182);cases++;
}
{
  const {context:c,restore}=fixture('female');c.state.ghost=true;c.state.wireframe=true;c.state.edit='A';
  const legacy={version:1,...newProfile('female'),A:{height:165,fat:50,muscle:50},B:{height:165,fat:50,muscle:50}};delete legacy.ghost;delete legacy.wireframe;delete legacy.edit;
  await restore(legacy);assert.equal(c.state.ghost,false);assert.equal(c.state.wireframe,false);assert.equal(c.state.edit,'B');cases++;
  for(const invalid of [{ghost:'true'},{wireframe:1},{edit:'C'},{B:{height:999,fat:50,muscle:50}}]){
    const before=JSON.stringify({state:c.state,profiles:c.profiles});
    await restore({version:2,...newProfile('male'),...invalid});
    assert.equal(JSON.stringify({state:c.state,profiles:c.profiles}),before);assert.match(c.message,/未读取文件/);cases++;
  }
  await restore('{broken');assert.match(c.message,/不是有效的 JSON/);cases++;
}
const buttons=[0,90,180,-30].map(angle=>({dataset:{angle:String(angle)},classList:{toggle(_,on){this.selected=on;}},setAttribute(_,value){this.pressed=value;}}));
const camera={position:new Vector3(0,.96,5)},controls={target:new Vector3(0,.96,0)};
const c={camera,controls,$$:()=>buttons,Math,Number,String};vm.createContext(c);
vm.runInContext(line('function markAngle(')+'\n'+line('function syncAngle('),c);
function direction(x,y,z,expected){camera.position.set(x,y,z);vm.runInContext('syncAngle()',c);assert.deepEqual(buttons.filter(b=>b.pressed==='true').map(b=>Number(b.dataset.angle)),expected);cases++;}
direction(0,.96,5,[0]);direction(5,.96,0,[90]);direction(0,.96,-5,[180]);
direction(2,.96,4,[]);direction(0,2,5,[]);direction(0,.96,8,[0]);
assert(source.includes("controls.addEventListener('change',()=>{syncAngle();render();});"),'Orbit drag must refresh direction');
console.log(`PASS: ${cases} restore and camera state cases (actual handlers, simulated DOM).`);

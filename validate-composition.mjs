import {POSE_IDS} from './poses.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {COMPOSITION_MODEL,toMorphParams,fromLegacyParams,muscleAnchors,compositionHint} from './composition.js';
import {newProfile,validateComparison} from './profiles.js';
import {shape} from './human.js';
const data=JSON.parse(fs.readFileSync(new URL('./assets/human.json',import.meta.url)));
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let cases=0,maxVertexDifference=0;
for(const sex of ['male','female'])for(const height of [145,sex==='male'?175:165,200])for(const fat of [15,50,85])for(const muscle of [15,50,85]){
  const legacy={height,fat,muscle},physical=fromLegacyParams(sex,legacy),roundtrip=toMorphParams(sex,physical);
  for(const k of ['height','fat','muscle'])close(roundtrip[k],legacy[k]);
  const before=shape(data,sex,legacy),after=shape(data,sex,physical);
  for(let i=0;i<before.length;i++)for(let j=0;j<3;j++)maxVertexDifference=Math.max(maxVertexDifference,Math.abs(before[i][j]-after[i][j]));
  const v1={version:1,...newProfile(sex),A:legacy,B:legacy},migrated=validateComparison(v1);
  const v2=JSON.parse(JSON.stringify({version:2,compositionModel:COMPOSITION_MODEL,...migrated}));
  assert.deepEqual(validateComparison(v2),migrated);cases++;
}
assert(maxVertexDifference<1e-8,'Unit migration must preserve the original body');
assert.deepEqual(newProfile('male').B,{height:175,bodyFatPercent:20,skeletalMuscleKg:32});
assert.deepEqual(newProfile('female').B,{height:165,bodyFatPercent:28,skeletalMuscleKg:22});
for(const sex of ['male','female']){
  const p=newProfile(sex).B;
  const low=toMorphParams(sex,{...p,bodyFatPercent:10}),high=toMorphParams(sex,{...p,bodyFatPercent:40});
  assert(low.fat<high.fat);close(low.muscle,high.muscle);
  const more=toMorphParams(sex,{...p,skeletalMuscleKg:p.skeletalMuscleKg+4});assert(more.muscle>toMorphParams(sex,p).muscle);close(more.fat,toMorphParams(sex,p).fat);
  assert(toMorphParams(sex,{...p,height:190}).muscle<toMorphParams(sex,p).muscle,'Same mass on a taller body should look less muscular');
  assert.match(compositionHint(sex,{...p,skeletalMuscleKg:80}),/最接近/);
  assert.equal(toMorphParams(sex,{...p,skeletalMuscleKg:80}).muscle,85);
  assert.equal(toMorphParams(sex,{...p,skeletalMuscleKg:5}).muscle,15);
  close(muscleAnchors(sex,p.height)[1],p.skeletalMuscleKg);
}
for(const bad of [{bodyFatPercent:NaN},{bodyFatPercent:51},{skeletalMuscleKg:0},{skeletalMuscleKg:'32'},{height:Infinity}])assert.throws(()=>validateComparison({version:2,...newProfile('male'),B:{...newProfile('male').B,...bad}}));
assert.deepEqual(validateComparison({version:2,compositionModel:'soma-illustrative-v1',...newProfile('male')}),validateComparison({version:2,compositionModel:COMPOSITION_MODEL,...newProfile('male')}));
assert.deepEqual(validateComparison({version:2,compositionModel:'soma-regional-v2',...newProfile('female')}),validateComparison({version:2,compositionModel:COMPOSITION_MODEL,...newProfile('female')}));
assert.deepEqual(validateComparison({version:2,compositionModel:'soma-regional-v3',...newProfile('male')}),validateComparison({version:2,compositionModel:COMPOSITION_MODEL,...newProfile('male')}));
assert.throws(()=>validateComparison({version:2,compositionModel:'unknown',...newProfile('male')}));
assert.throws(()=>validateComparison({version:1,...newProfile('male')}),'Version 1 must not reinterpret kg as old weights');
// Exercise the actual page tool for both old and new callers, including invalid atomicity.
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8'),begin=source.indexOf(" context.registerTool({name:'set_soma_comparison'"),end=source.indexOf('\n}',begin);
let tool;
const sandbox={POSE_IDS,context:{registerTool:t=>tool=t},state:newProfile('male'),profiles:{},ready:true,newProfile,structuredClone,toMorphParams,fromLegacyParams,validateState:validateComparison,COMPOSITION_MODEL,compositionHint,$:()=>({checked:false}),update:async()=>{}};
vm.createContext(sandbox);vm.runInContext(source.slice(begin,end),sandbox);
await tool.execute({bodyFatPercent:25,skeletalMuscleKg:36});close(sandbox.state.B.bodyFatPercent,25);close(sandbox.state.B.skeletalMuscleKg,36);
const before=JSON.stringify({state:sandbox.state,profiles:sandbox.profiles});
await assert.rejects(()=>tool.execute({sex:'female',bodyFatPercent:999}));assert.equal(JSON.stringify({state:sandbox.state,profiles:sandbox.profiles}),before);
await assert.rejects(()=>tool.execute({fat:50,bodyFatPercent:20}));
await tool.execute({sex:'female',fat:50,muscle:50});close(sandbox.state.B.bodyFatPercent,28);close(sandbox.state.B.skeletalMuscleKg,22);
await tool.execute({sex:'male'});close(sandbox.state.B.bodyFatPercent,25);close(sandbox.state.B.skeletalMuscleKg,36);
const result={legacyRoundtrips:cases,maxVertexDifference,newUnits:'PASS',heightScaling:'PASS',saturationHint:'PASS',invalidInputAtomicity:'PASS',legacyToolCompatibility:'PASS',scope:'Tests the documented illustration mapping, not physiological validity.'};
fs.writeFileSync(new URL('./validation/composition-regression.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);

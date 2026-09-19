// Illustrative controls, NOT a validated body-composition estimator.
// These versioned anchors are product assumptions, not population/health norms.
export const COMPOSITION_MODEL='soma-regional-v4';
export const COMPOSITION_LIMITS={height:[145,200],bodyFatPercent:[5,50],skeletalMuscleKg:[5,80]};
const anchors={male:{height:175,fat:[5,20,50],muscle:[18,32,46]},female:{height:165,fat:[5,28,50],muscle:[12,22,32]}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function config(sex){if(!Object.hasOwn(anchors,sex))throw Error('未知人物类型');return anchors[sex];}
function interpolate(value,input,output){const i=value<=input[1]?0:1;return output[i]+(value-input[i])/(input[i+1]-input[i])*(output[i+1]-output[i]);}
export function validateBodyParams(p){
  for(const [key,[min,max]] of Object.entries(COMPOSITION_LIMITS))if(typeof p?.[key]!=='number'||!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error('参数超出允许范围：'+key);
  return {height:p.height,bodyFatPercent:p.bodyFatPercent,skeletalMuscleKg:p.skeletalMuscleKg};
}
export function muscleAnchors(sex,height){
  const a=config(sex);
  // Constant-shape volume scaling is an illustration convention, not physiology.
  return a.muscle.map(kg=>kg*(height/a.height)**3);
}
export const BODY_EXAMPLE_IDS=['lean','athletic','soft','solid'];
export function bodyExample(sex,height,id){
  config(sex);
  if(!BODY_EXAMPLE_IDS.includes(id))throw Error('未知体态示例');
  if(!Number.isFinite(height)||height<145||height>200)throw Error('参数超出允许范围：height');
  const highFat=id==='soft'||id==='solid',highMuscle=id==='athletic'||id==='solid';
  const muscle=muscleAnchors(sex,height)[highMuscle?2:0];
  return {height,bodyFatPercent:sex==='male'?(highFat?40:10):(highFat?45:18),skeletalMuscleKg:Math.round(muscle*10)/10};
}
export function toMorphParams(sex,params){
  const p=validateBodyParams(params),a=config(sex),muscle=muscleAnchors(sex,p.height);
  return {height:p.height,fat:interpolate(p.bodyFatPercent,a.fat,[15,50,85]),muscle:interpolate(clamp(p.skeletalMuscleKg,muscle[0],muscle[2]),muscle,[15,50,85])};
}
export function fromLegacyParams(sex,p){
  config(sex);
  for(const key of ['height','fat','muscle']){const [min,max]=key==='height'?[145,200]:[15,85];if(typeof p?.[key]!=='number'||!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error('旧版参数超出允许范围：'+key);}
  return {height:p.height,bodyFatPercent:interpolate(p.fat,[15,50,85],config(sex).fat),skeletalMuscleKg:interpolate(p.muscle,[15,50,85],muscleAnchors(sex,p.height))};
}
export function compositionHint(sex,p){
  const [lo,,hi]=muscleAnchors(sex,p.height);
  const base='肌肉量指骨骼肌质量；数值驱动近似外形，不是身体测量或训练效果预测。';
  return p.skeletalMuscleKg<lo-1e-8||p.skeletalMuscleKg>hi+1e-8?base+` 当前模型在此身高下仅能表现约 ${lo.toFixed(1)}–${hi.toFixed(1)} kg，已显示最接近的外形，输入值仍保留。`:base;
}

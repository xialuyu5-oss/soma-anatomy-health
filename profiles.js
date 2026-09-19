import {POSE_IDS} from './poses.js';
// Product presets, not population averages or recommended target heights.
import {COMPOSITION_MODEL,fromLegacyParams,validateBodyParams} from './composition.js';
export function newProfile(sex){
  const p=fromLegacyParams(sex,{height:sex==='female'?165:175,fat:50,muscle:50});
  return {sex,A:{...p},B:{...p},edit:'B',fit:'regular',garment:sex==='female'?'blouse':'tee',bottom:sex==='female'?'skirt':'pants',hair:true,footwear:true,shoeStyle:sex==='female'?'heels':'sneakers',stockings:sex==='female',pose:'natural',color:'#d5e9df',wireframe:false,ghost:false,triple:false};
}
export function validateComparison(s){
  if(!s||![1,2].includes(s.version)||!['male','female'].includes(s.sex))throw Error('不是受支持的 SOMA 对照文件');
  if(s.version===2&&s.compositionModel!==undefined&&![COMPOSITION_MODEL,'soma-regional-v3','soma-regional-v2','soma-illustrative-v1'].includes(s.compositionModel))throw Error('不支持此文件的外形换算版本');
  const convert=s.version===1?p=>fromLegacyParams(s.sex,p):validateBodyParams;
  const A=convert(s.A),B=convert(s.B);
  if(!['tee','knit','blouse','none'].includes(s.garment)||!['tight','regular','loose'].includes(s.fit)||!POSE_IDS.includes(s.pose)||!/^#[0-9a-f]{6}$/i.test(s.color))throw Error('服装或姿态参数无效');
  if(s.bottom!==undefined&&!['pants','skirt'].includes(s.bottom))throw Error('下装参数无效');
  if(s.shoeStyle!==undefined&&!['heels','sneakers'].includes(s.shoeStyle))throw Error('鞋履参数无效');
  for(const k of ['hair','footwear','stockings','ghost','wireframe'])if(s[k]!==undefined&&typeof s[k]!=='boolean')throw Error('外观参数无效');
  if(s.edit!==undefined&&!['A','B'].includes(s.edit))throw Error('编辑对象无效');
  return {sex:s.sex,A,B,ghost:s.ghost===true,wireframe:s.wireframe===true,edit:s.edit||'B',garment:s.garment,fit:s.fit,pose:s.pose,color:s.color,bottom:s.bottom||'pants',hair:s.hair!==false,footwear:s.footwear!==false,shoeStyle:s.shoeStyle||'sneakers',stockings:s.stockings===true};
}
export function switchProfile(current,profiles,sex){
  if(!['male','female'].includes(sex))throw Error('未知人物类型');
  profiles[current.sex]=structuredClone(current);
  return structuredClone(profiles[sex]||newProfile(sex));
}

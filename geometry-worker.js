import {createHuman,disposeGroup} from './human.js';
let data;
onmessage=event=>{const message=event.data;
 if(message.type==='init'){data=message.data;postMessage({type:'ready'});return;}
 try{
   const s=message.state,start=performance.now();
   const groups=(s.triple?['tight','regular','loose']:[s.fit,s.fit]).map((fit,i)=>createHuman(data,s.sex,s.triple?s.B:s[i?'B':'A'],{...s,fit}));
   const transfer=[];
   const models=groups.map(g=>{const meshes=g.children.map(m=>{const a=m.geometry.attributes,indices=m.geometry.index.array;transfer.push(a.position.array.buffer,a.normal.array.buffer,indices.buffer);if(a.uv)transfer.push(a.uv.array.buffer);return {name:m.name,positions:a.position.array,normals:a.normal.array,uv:a.uv?.array,indices,color:m.material.color.getHex(),roughness:m.material.roughness,transparent:m.material.transparent,opacity:m.material.opacity,depthWrite:m.material.depthWrite,wireframe:m.material.wireframe,side:m.material.side,sheen:m.material.sheen||0,alphaTest:m.material.alphaTest||0,texture:m.userData.texture};});const out={name:g.name,userData:g.userData,meshes};disposeGroup(g);return out;});
   postMessage({type:'result',models,ms:Math.round(performance.now()-start)},transfer);
 }catch(error){postMessage({type:'error',message:error.message});}
};

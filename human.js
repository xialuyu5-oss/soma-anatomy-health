import * as THREE from './vendor/three/build/three.module.js';
import {toMorphParams} from './composition.js';
import {boneRotation,forearmTwist} from './poses.js';
import {applyRegionalShape} from './regional-shape.js';
import {pumpOpening,clipPump,heelFootPoints} from './pumps.js';
const vec=(p)=>new THREE.Vector3(...p);
const identity=new THREE.Matrix4();
export function shape(data,sex,params){
  params=params.bodyFatPercent===undefined?params:toMorphParams(sex,params);
  const v=data.body.vertices.map(p=>p.slice());
  const add=(name,weight)=>{if(!weight)return;const target=data.targets[name];if(!target)throw new Error('缺少形态数据：'+name);for(const [i,x,y,z] of target){v[i][0]+=x*weight;v[i][1]+=y*weight;v[i][2]+=z*weight;}};
  for(const race of ['asian','african','caucasian'])add(`${race}-${sex}-young`,1/3);
  const tri=x=>x<50?[(50-x)/50,x/50,0]:[0,(100-x)/50,(x-50)/50];
  const levels=['min','average','max'];
  add(`universal-${sex}-young-averagemuscle-averageweight`,1);
  const neutral=v.map(p=>p.slice());
  // Independent base tissues; regional support/coverage interaction follows below.
  const mw=tri(params.muscle),fw=tri(params.fat);
  for(let k=0;k<3;k++){
    add(`universal-${sex}-young-${levels[k]}muscle-averageweight`,mw[k]-(k===1?1:0));
    add(`universal-${sex}-young-averagemuscle-${levels[k]}weight`,(params.fat<50?.9:1.6)*(fw[k]-(k===1?1:0)));
  }
  return applyRegionalShape(data,neutral,v,{...params,sex});
}
function geometry(v,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v.flat(),3));g.setIndex(indices);g.computeVertexNormals();return g;}
function rigMatrices(data,v,pose,params){
  const matrices={};
  const spread=Math.max(0,(params.fat-50)/35)*.13+Math.max(0,(params.muscle-50)/35)*.025;
  const head=b=>{const indices=data.rig.joints[data.rig.bones[b].head];const p=new THREE.Vector3();for(const i of indices)p.add(vec(v[i]));return p.divideScalar(indices.length);};
  const get=b=>{if(matrices[b])return matrices[b];const info=data.rig.bones[b],p=head(b),[x,y,z]=boneRotation(b,pose);
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z+(b.startsWith('upperarm01')?(b.endsWith('.L')?1:-1)*spread:0)));
    const twist=forearmTwist(b,pose);if(twist){const tail=new THREE.Vector3();const indices=data.rig.joints[info.tail];for(const i of indices)tail.add(vec(v[i]));tail.divideScalar(indices.length);q.multiply(new THREE.Quaternion().setFromAxisAngle(tail.sub(p).normalize(),twist));}
    const m=new THREE.Matrix4().makeTranslation(p.x,p.y,p.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-p.x,-p.y,-p.z));
    matrices[b]=(info.parent?get(info.parent):identity).clone().multiply(m);return matrices[b];};
  for(const b of Object.keys(data.rig.bones))get(b);return matrices;
}
function posedPoint(p,weights,matrices){
  if(!weights.length)return p.slice();const result=new THREE.Vector3();for(const [bone,w] of weights)result.addScaledVector(vec(p).applyMatrix4(matrices[bone]||identity),w);return result.toArray();
}
function mapCloth(asset,v){
  const scales=['x','y','z'].map((a,k)=>{const s=asset.meta[a+'_scale'];return s?Math.abs(v[+s[0]][k]-v[+s[1]][k])/(+s[2]):1;});
  return asset.maps.map(m=>[0,1,2].map(k=>m[3]*v[m[0]][k]+m[4]*v[m[1]][k]+m[5]*v[m[2]][k]+m[6+k]*scales[k]));
}
function clothWeights(data,asset){
  if(asset.weights)return asset.weights;
  asset.weights=asset.maps.map(m=>{const sum={};for(let j=0;j<3;j++)for(const [b,w] of data.weights[m[j]])sum[b]=(sum[b]||0)+Math.max(0,m[3+j])*w;const a=Object.entries(sum).sort((a,b)=>b[1]-a[1]).slice(0,4),t=a.reduce((s,x)=>s+x[1],0);return t?a.map(([b,w])=>[b,w/t]):[];});return asset.weights;
}
function adjacency(asset){if(asset.adjacency)return asset.adjacency;const a=asset.vertices.map(()=>new Set());for(let i=0;i<asset.indices.length;i+=3){const ids=asset.indices.slice(i,i+3);for(const j of ids)for(const k of ids)if(j!==k)a[j].add(k);}return asset.adjacency=a.map(s=>[...s]);}

// Loop refinement preserves shared topology, including the garment's open edges.
function refineSurface(points,indices){
  const edges=new Map(),neighbors=points.map(()=>new Set()),boundary=points.map(()=>[]);
  const edge=(a,b,c)=>{const key=a<b?a+','+b:b+','+a;let e=edges.get(key);if(!e){e={a,b,opposite:[]};edges.set(key,e);}e.opposite.push(c);neighbors[a].add(b);neighbors[b].add(a);};
  for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3);edge(a,b,c);edge(b,c,a);edge(c,a,b);}
  for(const e of edges.values())if(e.opposite.length===1){boundary[e.a].push(e.b);boundary[e.b].push(e.a);}
  const out=points.map((p,i)=>{const ns=[...neighbors[i]],bs=boundary[i];if(bs.length===2)return p.slice();if(!ns.length||bs.length)return p.slice();const beta=ns.length===3?3/16:3/(8*ns.length);return p.map((x,k)=>(1-beta*ns.length)*x+beta*ns.reduce((sum,j)=>sum+points[j][k],0));});
  for(const e of edges.values()){e.index=out.length;out.push([0,1,2].map(k=>e.opposite.length===2?.375*(points[e.a][k]+points[e.b][k])+.125*(points[e.opposite[0]][k]+points[e.opposite[1]][k]):.5*(points[e.a][k]+points[e.b][k])));}
  const midpoint=(a,b)=>edges.get(a<b?a+','+b:b+','+a).index,faces=[];
  for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);faces.push(a,ab,ca,b,bc,ab,c,ca,bc,ab,bc,ca);}
  return {points:out,indices:faces};
}
function textureGeometry(points,indices,asset){
  const smooth=geometry(points,indices),normal=smooth.attributes.normal.array;
  const positions=[],normals=[],uv=[];
  const wanted=new Set();for(let i=0;i<indices.length;i+=3)wanted.add(indices.slice(i,i+3).join(','));
  for(let i=0;i<asset.indices.length;i+=3){if(!wanted.has(asset.indices.slice(i,i+3).join(',')))continue;for(let j=i;j<i+3;j++){const id=asset.indices[j];positions.push(...points[id]);normals.push(...normal.slice(id*3,id*3+3));uv.push(...(asset.uv[asset.uvIndices[j]]||[0,0]));}}
  smooth.dispose();const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));result.setIndex(Array.from({length:positions.length/3},(_,i)=>i));return result;
}
// Query the actual posed body surface, not helper vertices or a torso envelope.
// Local triangle bins keep the clearance pass bounded as body shape changes.
function bodySurface(bodyGeometry){
  const pos=bodyGeometry.attributes.position,index=bodyGeometry.index.array,cell=.035,bins=new Map();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<index.length;i+=3){
    a.fromBufferAttribute(pos,index[i]);b.fromBufferAttribute(pos,index[i+1]);c.fromBufferAttribute(pos,index[i+2]);
    const lo=[Math.min(a.x,b.x,c.x),Math.min(a.y,b.y,c.y),Math.min(a.z,b.z,c.z)].map(v=>Math.floor(v/cell));
    const hi=[Math.max(a.x,b.x,c.x),Math.max(a.y,b.y,c.y),Math.max(a.z,b.z,c.z)].map(v=>Math.floor(v/cell));
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){const key=`${x},${y},${z}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);}
  }
  const triangle=new THREE.Triangle(),p=new THREE.Vector3(),near=new THREE.Vector3(),bestPoint=new THREE.Vector3(),normal=new THREE.Vector3(),bestNormal=new THREE.Vector3();
  return garment=>{
    const vertices=garment.attributes.position;
    for(let j=0;j<vertices.count;j++){
      p.fromBufferAttribute(vertices,j);const x=Math.floor(p.x/cell),y=Math.floor(p.y/cell),z=Math.floor(p.z/cell),seen=new Set();let best=cell*cell;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)for(const i of bins.get(`${x+dx},${y+dy},${z+dz}`)||[]){
        if(seen.has(i))continue;seen.add(i);triangle.a.fromBufferAttribute(pos,index[i]);triangle.b.fromBufferAttribute(pos,index[i+1]);triangle.c.fromBufferAttribute(pos,index[i+2]);triangle.closestPointToPoint(p,near);const distance=p.distanceToSquared(near);
        if(distance<best){triangle.getNormal(normal);if(normal.lengthSq()>.5){best=distance;bestPoint.copy(near);bestNormal.copy(normal);}}
      }
      if(best<cell*cell){const signed=p.clone().sub(bestPoint).dot(bestNormal),clearance=.003;if(signed<clearance){p.addScaledVector(bestNormal,Math.min(clearance-signed,.015));vertices.setXYZ(j,p.x,p.y,p.z);}}
    }
    vertices.needsUpdate=true;
    // Shared topology allows smooth normals; textured UV islands keep their source normals.
    if(!garment.attributes.uv)garment.computeVertexNormals();
  };
}
function tailor(asset,body,indices,fit,kind,topHem){
  let points=mapCloth(asset,body);
  if(!['top','skirt','pants'].includes(kind))return points;
  const adj=adjacency(asset),active=new Set(indices),edgeCounts=new Map(),boundary=new Set();
  for(let i=0;i<indices.length;i+=3){const f=indices.slice(i,i+3);for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],key=a<b?a+','+b:b+','+a;edgeCounts.set(key,(edgeCounts.get(key)||0)+1);}}
  for(const [edge,count] of edgeCounts)if(count===1)edge.split(',').forEach(i=>boundary.add(+i));
  // Relax broad cloth panels before adding ease. No pointwise body-normal inflation.
  const passes=kind==='top'?6:3;
  for(let pass=0;pass<passes;pass++){const prev=points;points=prev.map((p,i)=>{if(!active.has(i)||boundary.has(i)||adj[i].some(n=>boundary.has(n)))return p;const ns=adj[i].filter(n=>active.has(n));if(!ns.length)return p;return p.map((x,k)=>x*.7+.3*ns.reduce((sum,n)=>sum+prev[n][k],0)/ns.length);});}
  if(kind==='skirt'){const low=Math.min(...[...active].map(i=>points[i][1])),hemIds=[...boundary].filter(i=>points[i][1]<low+.65),hem=hemIds.reduce((sum,i)=>sum+points[i][1],0)/hemIds.length;const hemSet=new Set(hemIds);points=points.map((p,i)=>{if(!active.has(i))return p;const r=Math.hypot(p[0],p[2]-.1)||1;return[p[0]+.16*p[0]/r,hemSet.has(i)?hem:p[1],p[2]+.16*(p[2]-.1)/r];});}
  if(['skirt','pants'].includes(kind)&&Number.isFinite(topHem))points=points.map(p=>{const tuck=1-(kind==='pants'?.08:.15)*THREE.MathUtils.smoothstep(p[1]-topHem,-.4,.35);return[p[0]*tuck,p[1],.1+(p[2]-.1)*tuck];});
  if(kind==='top'){
    const ease={tight:.015,regular:.085,loose:.21}[fit]??.085;
    points=points.map((p,i)=>{if(!active.has(i))return p;const [x,y,z]=p;
      // Neck and shoulders carry the shirt; fabric hangs below them.
      const hang=THREE.MathUtils.smoothstep(5.2-y,0,2.0);
      const torso=1-THREE.MathUtils.smoothstep(Math.abs(x),1.9,3.2);
      const radius=Math.hypot(x,(z-.2)*1.3)||1;
      const allowance=ease*hang*torso;
      return [x+allowance*x/radius,y,z+allowance*(z-.2)/radius];
    });
  }
  return points;
}
export function createHuman(data,sex,params,options){
  const v=shape(data,sex,params),matrices=rigMatrices(data,v,options.pose,params.bodyFatPercent===undefined?params:toMorphParams(sex,params)),ids=new Set(data.body.indices);
  const bottom=Math.min(...[...ids].map(i=>v[i][1])),top=Math.max(...[...ids].map(i=>v[i][1]));
  const scale=params.height/100/(top-bottom),footwear=options.footwear!==false,heels=footwear&&options.shoeStyle==='heels';
  const bodyPoints=heels?heelFootPoints(data,v):v,pumpCut=heels?pumpOpening(mapCloth(data.garments.heels,v)):null;
  const normalize=arr=>arr.map(p=>[p[0]*scale,(p[1]-bottom)*scale,p[2]*scale]);
  const trimExposedFoot=g=>{if(!heels)return;const a=g.attributes.position,points=Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)]),cut=clipPump(points,Array.from(g.index.array),z=>(pumpCut(z/scale)-bottom-.012)*scale,{above:true,preserveVertices:true});const trimmed=geometry(cut.points,cut.indices);g.copy(trimmed);trimmed.dispose();};
  const root=new THREE.Group();root.name=`${sex}-${params.height}-${params.fat}-${params.muscle}`;
  const bodyGeometry=geometry(normalize(bodyPoints.map((p,i)=>posedPoint(p,data.weights[i],matrices))),data.body.indices);
  const clearBody=bodySurface(bodyGeometry);
  const skin=new THREE.MeshStandardMaterial({color:'#c5a18b',roughness:.78,transparent:options.ghost,opacity:options.ghost?.28:1,depthWrite:!options.ghost});
  const body=new THREE.Mesh(bodyGeometry,skin);body.name='真实人体体表';body.castShadow=true;body.receiveShadow=true;root.add(body);
  const occluded=new Set(),skirtOccluded=new Set();
  const topAsset=options.garment==='knit'?data.garments.knit:options.garment==='blouse'?data.garments.skirt:data.garments.casual,topPoints=mapCloth(topAsset,v),topIndices=options.garment==='knit'?topAsset.indices:topAsset.upperIndices;
  const topHem=options.garment==='none'?undefined:Math.min(...[...new Set(topIndices)].map(i=>topPoints[i][1]));
  const add=(asset,name,color,kind,{indices=asset.indices,texture,alphaTest=0,fit=options.fit,refine=false}={})=>{
    const points=tailor(asset,v,indices,fit,kind,topHem),used=[...new Set(indices)];
    if(!options.ghost&&!['eyes','hair','brows'].includes(kind)){
      const lo=Math.min(...used.map(i=>points[i][1]))-.05,hi=Math.max(...used.map(i=>points[i][1]))+.05;
      if(kind!=='skirt')for(const id of asset.occludedBodyVertices||[])if(kind==='shoes'&&heels?false:v[id][1]>=lo&&v[id][1]<=hi-(kind==='shoes'?.18:0))occluded.add(id);
      if(kind==='skirt')for(const id of ids)if(v[id][1]>lo+.35&&v[id][1]<hi&&data.weights[id].some(([bone,w])=>w>.15&&/pelvis|upperleg|spine/.test(bone)))skirtOccluded.add(id);
    }
    const ws=clothWeights(data,asset);let posed=normalize(points.map((p,i)=>posedPoint(p,ws[i],matrices)));
    let g;
    if(kind==='shoes'&&heels){const cut=clipPump(posed,indices,z=>(pumpCut(z/scale)-bottom)*scale);g=geometry(cut.points,cut.indices);}
    else if(texture)g=textureGeometry(posed,indices,asset);
    else if(refine){const refined=refineSurface(posed,indices);g=geometry(refined.points,refined.indices);}
    else g=geometry(posed,indices);
    if(kind==='top'||kind==='pants')clearBody(g);
    const mat=new THREE.MeshPhysicalMaterial({color,roughness:kind==='eyes'?.4:kind==='shoes'?.45:.87,metalness:0,sheen:['top','skirt','pants'].includes(kind)?.25:0,side:THREE.DoubleSide,alphaTest,wireframe:options.wireframe&&['top','skirt','pants'].includes(kind)});
    const mesh=new THREE.Mesh(g,mat);mesh.name=name;mesh.userData={texture};mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  };
  const skirt=options.bottom==='skirt',lower=skirt?data.garments.skirt:data.garments.pants;
  add(lower,skirt?'半身裙':'休闲裤',skirt?(options.garment==='blouse'?'#3d3d42':'#465465'):'#35414b',skirt?'skirt':'pants',{indices:lower.lowerIndices,refine:true});
  if(options.garment!=='none'){
    const shirt=options.garment==='knit'?data.garments.knit:options.garment==='blouse'?data.garments.skirt:data.garments.casual;
    add(shirt,'上衣',options.garment==='blouse'?'#ffffff':options.color,'top',{indices:options.garment==='knit'?shirt.indices:shirt.upperIndices,refine:options.garment!=='blouse',texture:options.garment==='blouse'?'./assets/system/clothes/female_elegantsuit01/female_elegantsuit01_diffuse.png':undefined});
  }
  if(footwear){if(heels)add(data.garments.heels,'浅口高跟鞋','#302b30','shoes');else add(data.garments.shoes,'运动鞋与中筒袜','#ffffff','shoes',{texture:'./assets/system/clothes/shoes05/shoes05_diffuse.png'});}
  if(options.stockings){
    const stockingFaces=[],shoeMask=new Set(footwear?(heels?data.garments.heels:data.garments.shoes).occludedBodyVertices.filter(j=>occluded.has(j)):[]);
    for(let i=0;i<data.body.indices.length;i+=3){const face=data.body.indices.slice(i,i+3);if(face.every(j=>v[j][1]<-.5&&data.weights[j].some(([bone,w])=>w>.15&&/upperleg|lowerleg|foot|toe/.test(bone)))&&!face.every(j=>shoeMask.has(j))&&!face.every(j=>skirtOccluded.has(j))&&(skirt||!face.every(j=>occluded.has(j))))stockingFaces.push(...face);}
    const g=bodyGeometry.clone();g.setIndex(stockingFaces);const a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<a.count;i++){a.setXYZ(i,a.getX(i)+n.getX(i)*.0012,a.getY(i)+n.getY(i)*.0012,a.getZ(i)+n.getZ(i)*.0012);}a.needsUpdate=true;trimExposedFoot(g);const m=new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:'#242126',transparent:true,opacity:.48,roughness:.55,depthWrite:false,side:THREE.FrontSide}));m.name='薄透丝袜';m.receiveShadow=true;root.add(m);
  }
  if(options.hair!==false){const key=sex==='female'?'hairFemale':'hairMale',folder=sex==='female'?'ponytail01':'short01';add(data.garments[key],sex==='female'?'束发马尾':'短发','#ffffff','hair',{texture:`./assets/system/hair/${folder}/${folder}_diffuse.png`,alphaTest:.4});}
  add(data.garments.brows,'眉毛','#ffffff','brows',{texture:'./assets/system/eyebrows/eyebrow001/eyebrow001.png',alphaTest:.4});
  add(data.garments.eyes,'眼部','#ffffff','eyes',{texture:'./assets/system/eyes/materials/brown_eye.png'});
  if(!options.ghost){const visible=[];for(let i=0;i<data.body.indices.length;i+=3){const face=data.body.indices.slice(i,i+3);if(!face.every(j=>occluded.has(j))&&!face.every(j=>skirtOccluded.has(j)))visible.push(...face);}bodyGeometry.setIndex(visible);}
  if(!options.ghost)trimExposedFoot(bodyGeometry);
  // Place soles on the floor; the displayed height remains barefoot stature.
  if(footwear){const shoe=root.children.find(m=>m.name===(heels?'浅口高跟鞋':'运动鞋与中筒袜')),a=shoe.geometry.attributes.position.array;let sole=Infinity;for(let i=1;i<a.length;i+=3)sole=Math.min(sole,a[i]);if(sole<0)for(const mesh of root.children)mesh.geometry.translate(0,-sole,0);}
  root.userData={sex,pose:options.pose,params:{...params},source:'MakeHuman CC0',clothing:'geometric-fit',bodyVertices:ids.size,bottom:skirt?'skirt':'pants',footwear,shoeStyle:options.shoeStyle,stockings:!!options.stockings,hair:options.hair!==false};return root;
}
export function disposeGroup(group){group.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}

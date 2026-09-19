// Low-cut pump derived from the bundled CC0 stiletto mesh. The vamp and
// heel remain; a continuous curved opening replaces the ankle boot shaft.
const clamp=x=>Math.max(0,Math.min(1,x));
export function pumpOpening(points){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of points)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
 return z=>{const t=clamp((z-lo[2])/(hi[2]-lo[2]));return lo[1]+(hi[1]-lo[1])*(.52-.28*Math.sin(Math.PI*t)**1.5+.10*clamp((t-.65)/.25));};
}
export function clipPump(points,indices,cutoff,{above=false,preserveVertices=false}={}){
 const out=points.map(p=>p.slice()),faces=[],edges=new Map();
 const distance=i=>(above?-1:1)*(out[i][1]-cutoff(out[i][2]));
 const crossing=(a,b)=>{const key=a<b?a+':'+b:b+':'+a;if(edges.has(key))return edges.get(key);const da=distance(a),db=distance(b),t=da/(da-db),p=out[a].map((v,k)=>v+(out[b][k]-v)*t),id=out.length;out.push(p);edges.set(key,id);return id;};
 for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3),poly=[];
  for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],inside=distance(a)<=0,next=distance(b)<=0;if(inside)poly.push(a);if(inside!==next)poly.push(crossing(a,b));}
  for(let j=1;j+1<poly.length;j++)faces.push(poly[0],poly[j],poly[j+1]);
 }
 if(preserveVertices)return {points:out,indices:faces};
 const used=[...new Set(faces)],remap=new Map(used.map((id,i)=>[id,i]));
 return {points:used.map(i=>out[i]),indices:faces.map(i=>remap.get(i))};
}
export function heelFootPoints(data,vertices){
 const pivots={};
 for(const side of ['L','R']){const ids=data.rig.joints[data.rig.bones['foot.'+side].head];pivots[side]=ids.reduce((p,i)=>p.map((v,k)=>v+vertices[i][k]/ids.length),[0,0,0]);}
 return vertices.map(p=>{
  const pivot=pivots[p[0]>0?'L':'R'],amount=clamp((pivot[1]+.35-p[1])/.6),angle=.46*amount;
  if(!amount)return p.slice();
  const dy=p[1]-pivot[1],dz=p[2]-pivot[2];
  return [pivot[0]+(p[0]-pivot[0])*(1-.09*amount),pivot[1]+dy*Math.cos(angle)-dz*Math.sin(angle),pivot[2]+dy*Math.sin(angle)+dz*Math.cos(angle)];
 });
}

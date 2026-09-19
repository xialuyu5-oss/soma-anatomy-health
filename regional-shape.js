// Art-directed tissue response, not a physiological estimator. Input quantities
// remain independent; muscle support and fat coverage jointly shape the silhouette.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const bell=(y,c,r)=>Math.exp(-(((y-c)/r)**2));
export function applyRegionalShape(data,neutral,vertices,{fat,muscle,sex}){
 const m=(muscle-50)/35*(muscle<50?.90:1),f=(fat-50)/35*(fat<50?.45:1);
 if(!m&&!f)return vertices;
 const joint=name=>{const ids=data.rig.joints[name];return ids.reduce((p,i)=>p.map((x,k)=>x+neutral[i][k]/ids.length),[0,0,0]);};
 const head=joint(data.rig.bones.head.head),headTop=joint(data.rig.bones.head.tail),headLength=headTop[1]-head[1];
 const shoulders=['L','R'].map(side=>joint(data.rig.bones['upperarm01.'+side].head));
 const pelvis=['L','R'].map(side=>joint(data.rig.bones['upperleg01.'+side].head));
 const hipY=(pelvis[0][1]+pelvis[1][1])/2,shoulderY=(shoulders[0][1]+shoulders[1][1])/2;
 const torsoLength=shoulderY-hipY,halfShoulder=Math.abs(shoulders[0][0]-shoulders[1][0])/2;
 const fatCover=Math.max(0,f),muscleSupport=Math.max(0,m),lowSupport=Math.max(0,-m);
 const softness=fatCover*lowSupport;
 const definition=muscleSupport*(1-.78*smooth(0,1,fatCover));
 const limbs=[];
 for(const side of ['L','R'])for(const [start,end,mass,fatMass,radius] of [
  ['upperleg01','lowerleg01',.44,.42,1.25],['lowerleg01','foot',.20,.30,.80],['upperarm01','lowerarm01',.36,.42,.72],['lowerarm01','wrist',.16,.28,.72]]){
  const a=data.rig.bones[start+'.'+side],b=data.rig.bones[end+'.'+side];
  if(a&&b)limbs.push({a:joint(a.head),b:joint(b.head),mass,fatMass,radius});
 }
 return vertices.map((out,i)=>{
  const [x,y,z]=neutral[i],p=out.slice();
  // Locate torso fields on each person's rig; fixed male Y bands put female
  // chest/waist changes in the wrong places.
  const ty=(y-hipY)/torsoLength,trunk=1-smooth(halfShoulder*.88,halfShoulder*1.45,Math.abs(x));
  const back=bell(ty,.78,.25)*trunk,waist=bell(ty,.32,.20)*trunk;
  const abdomen=bell(ty,.19,.28)*trunk,hips=bell(ty,-.28,.24)*trunk;
  const chest=bell(ty,sex==='female'?.80:.70,.19)*trunk,lowerBelly=bell(ty,.19,.20)*trunk;
  // Lat/deltoid silhouette differs from abdominal/flank fat accumulation.
  p[0]+=x*(m*(.19*back-.005*waist)+f*((f<0?.18:.24)*waist+.14*abdomen+.10*hips)
            +fatCover*muscleSupport*.035*waist);
  const front=smooth(-.15,.65,z),rear=1-smooth(-.65,.25,z);
  p[2]+=m*((sex==='female'?.09:.18)*chest*front-.14*back*rear-.045*waist*front-.12*hips*rear)
       +f*(.72*abdomen*front+.20*waist*front-.22*hips*rear-.12*back*rear);
  // Lower muscle support gives high-fat bodies a more projecting, lower belly.
  // High-muscle/high-fat keeps the full fat layer and a thicker supported trunk.
  p[2]+=softness*.42*lowerBelly*front;
  p[1]-=softness*.24*lowerBelly*front;
  // Restrained pectoral contour at low fat; coverage softens it at high fat.
  const pec=bell(Math.abs(x)/halfShoulder,.48,.25)*chest*front;
  p[2]+=definition*(sex==='female'?.04:.10)*pec;
  // Soft facial tissue is relative to each neutral head, not a fixed male Y band.
  // Keep the cranium, eye sockets and central nose/lips outside the cheek field.
  const hy=(y-head[1])/headLength,frontFace=smooth(-.05,.30,(z-head[2])/headLength);
  const cheek=bell(hy,-.18,.22)*(1-smooth(-.01,.15,hy));
  const jaw=bell(hy,-.43,.18),sideFace=smooth(.10,.30,Math.abs(x)/headLength);
  const lowerFace=(.34*cheek+.30*jaw)*frontFace*sideFace;
  p[0]+=f*x*lowerFace;
  p[2]+=f*headLength*.07*(cheek+.7*jaw)*frontFace*sideFace;
  // Soften the jaw-to-neck transition and add restrained submental fullness.
  const neck=bell(hy,-.72,.18)*(1-smooth(.48,.72,Math.abs(x)/headLength));
  p[0]+=f*x*.24*neck;
  p[2]+=f*(z-head[2])*.22*neck;
  p[1]-=f*headLength*.035*jaw*frontFace*(1-smooth(.3,.55,Math.abs(x)/headLength));
  // Inflate cross-sections about limb axes, not about the body's origin:
  // thighs/arms gain volume without moving the knees, ankles or wrists apart.
  for(const limb of limbs){
   const ab=limb.b.map((v,k)=>v-limb.a[k]),ap=neutral[i].map((v,k)=>v-limb.a[k]);
   const t=ap.reduce((s,v,k)=>s+v*ab[k],0)/ab.reduce((s,v)=>s+v*v,0);
   if(t<=-.1||t>=1.12)continue;
   const radial=ap.map((v,k)=>v-t*ab[k]),distance=Math.hypot(...radial);
   const radius=limb.radius;
   const support=t>0&&t<1?(1-smooth(radius*.75,radius*1.2,distance))*Math.sin(Math.PI*t)**.8:0;
   // Fat extends softly towards joints instead of only bulging at muscle bellies.
   // Taper at wrists/ankles rather than moving or uniformly scaling the skeleton.
   const fatSupport=(1-smooth(radius*.85,radius*1.3,distance))*smooth(-.1,.20,t)*(1-smooth(.78,1.12,t));
   const gain=m*limb.mass*support+f*limb.fatMass*fatSupport;
   for(let k=0;k<3;k++)p[k]+=radial[k]*gain;
  }
  return p;
 });
}

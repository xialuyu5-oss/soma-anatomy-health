// Restrained static upper-body presets shared by male and female rigs.
export const POSE_LABELS={standard:'标准对照',natural:'自然舒展',poised:'从容站姿',conversational:'轻松交流'};
export const POSE_IDS=Object.keys(POSE_LABELS);
// Angles are radians in the source rig frame; feet remain planted.
const presets={
 natural:{arm:[.54,.50],armX:[.035,.025],elbow:[.42,.36],wrist:[.10,.10],spine:[.008,.012],head:[-.012,-.025]},
 poised:{arm:[.48,.55],armX:[-.035,.035],elbow:[-.16,.40],wrist:[.02,.10],spine:[.005,-.018],head:[.008,.055]},
 conversational:{arm:[.47,.52],armX:[-.06,.025],elbow:[-.62,.38],wrist:[-.08,.10],spine:[.01,-.01],head:[-.012,.045]}
};
export function boneRotation(b,pose){
 if(!POSE_IDS.includes(pose))throw Error('未知姿态：'+pose);
 const sign=b.endsWith('.L')?1:-1,side=sign===1?0:1;
 let x=0,y=0,z=0;
 if(pose==='standard'){if(b.startsWith('upperarm01'))z=-sign*.40;return [x,y,z];}
 const p=presets[pose];
 if(b.startsWith('upperarm01')){z=-sign*p.arm[side];x=p.armX[side];}
 if(b.startsWith('lowerarm01'))x=p.elbow[side];
 if(b.startsWith('wrist.')){x=p.wrist[side];z=-sign*.025;}
 const finger=/^finger([1-5])-([1-3])\./.exec(b);
 if(finger){
   const digit=Number(finger[1]),joint=Number(finger[2]);
   if(digit===1){y=sign*(joint===1?.17:.07);z=sign*.06;}
   else {const curl=(pose==='conversational'&&side===0?.35:1)*(1+(digit-2)*.12);const flex=[.22,.32,.18][joint-1]*curl;/* Bend into the palm (YZ axis), not sideways within its plane. */y=-sign*flex*.72;z=-sign*flex*.69;}
 }
 if(b==='spine01'){x=p.spine[0];z=p.spine[1];}
 if(b==='head'){z=p.head[0];y=p.head[1];}
 return [x,y,z];
}

export function forearmTwist(b,pose){return pose==='conversational'&&/^lowerarm0[12]\.L$/.test(b)?-.38:0;}

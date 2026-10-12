// Landmark-based limb construction: no endpoint-only silhouette warping.
const fs=require('node:fs/promises'),path=require('node:path');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=path.resolve(__dirname,'../output/spine-lab'),skin=process.argv[2]||'sakura';
if(skin!=='sakura')throw Error('Only reviewed Sakura landmark profile exists');
(async()=>{const file=path.join(dir,skin+'.json'),raw=JSON.parse(await fs.readFile(file,'utf8'));
const cal=JSON.parse(await fs.readFile(path.join(dir,skin+'-calibration.json'),'utf8'));
const profile=[
 {slot:'右手_1无袖',attachment:'右手_1无袖',box:cal.body['右手_1无袖'],bones:['arm_R1','arm_R2','arm_R3'],points:[[.5,.15],[.5,.55],[.5,.87]],rootOffset:5},
 {slot:'左手_1无袖',attachment:'左手_1无袖',box:cal.body['左手_1无袖'],bones:['arm_L1','arm_L2','arm_L3'],points:[[.5,.15],[.5,.55],[.5,.87]],rootOffset:5},
 {slot:'腿右',attachment:'右腿',box:[94,182,124,240],bones:['leg_R0','knee_R','foot_R','foot_R'],points:[[.55,.08],[.57,.5],[.57,.72],[.57,.99]],rootOffset:0,ankleOffset:16},
 {slot:'腿左',attachment:'左腿',box:[114,181,144,240],bones:['leg_L0','knee_L','foot_L','foot_L'],points:[[.5,.08],[.55,.5],[.55,.72],[.55,.99]],rootOffset:0,ankleOffset:16}
];
const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')],env:{...process.env,SPINE_LAB_URL:'http://127.0.0.1:24361/?skin='+skin}});
try{const page=await app.firstWindow();await page.waitForFunction(()=>document.body.dataset.ready==='true');
const result=await page.evaluate(profile=>{
 const sk=new spine.Skeleton(spineLab.skeletons[1].data);sk.setToSetupPose();sk.updateWorldTransform();const patches=[];
 for(const p of profile){
  const bones=p.bones.map(n=>sk.findBone(n));if(bones.some(b=>!b))throw Error('Unknown landmark bone');
  const isLeg=p.slot.startsWith('腿'),side=p.slot==='腿右'?'R':'L';
  if(isLeg){p.bones[0]='leg_'+side+'11';p.bones[2]='foot_'+side+'2';bones[0]=sk.findBone(p.bones[0]);bones[2]=sk.findBone(p.bones[2]);}
  const dest=bones.map((b,i)=>b.localToWorld(new spine.Vector2(i===0?p.rootOffset:(isLeg&&i===2?p.ankleOffset:0),0)));
  const [l,t,r,b]=p.box,src=p.points.map(([x,y])=>({x:l+x*(r-l),y:t+y*(b-t)}));
  const vertices=[],uvs=[],triangles=[],n=48;
  for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){
   const x=col/n*256,y=row/n*256;uvs.push(col/n,row/n);
   const segment=y<src[1].y?0:(src.length===4&&y>src[2].y?2:1),a=src[segment],z=src[segment+1],dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy);
   const q=((x-a.x)*dx+(y-a.y)*dy)/(len*len),across=((x-a.x)*dy-(y-a.y)*dx)/len;
   const da=dest[segment],db=dest[segment+1],wx=db.x-da.x,wy=db.y-da.y,wlen=Math.hypot(wx,wy),scale=wlen/len;
   const world=new spine.Vector2(da.x+q*wx+across*(-wy/wlen)*scale,da.y+q*wy+across*(wx/wlen)*scale);
   // Blend only within a small hinge band. Whole-segment linear blending
   // cancels opposing transforms and collapses shin/forearm cross sections.
   const first=bones[0],second=isLeg?bones[2]:bones[1];
   const zt=Math.max(0,Math.min(1,(y-src[1].y+2)/4)),blend=zt*zt*(3-2*zt);
   const v1=first.worldToLocal(new spine.Vector2(world.x,world.y)),v2=second.worldToLocal(new spine.Vector2(world.x,world.y));
   vertices.push(2,first.data.index,v1.x,v1.y,1-blend,second.data.index,v2.x,v2.y,blend);
   if(row<n&&col<n){const i=row*(n+1)+col;triangles.push(i,i+1,i+n+1,i+1,i+n+2,i+n+1);}
  }
  patches.push({slot:p.slot,attachment:p.attachment,vertices,uvs,triangles,hull:0,anchors:src.map(q=>({u:q.x/256,v:q.y/256})),bones:p.bones,rootOffset:p.rootOffset,ankleOffset:p.ankleOffset||0,ankleAxis:'x',n});
 }return patches;
},profile);
for(const p of result){for(const m of Object.values(raw.skins[0].attachments[p.slot]))if(m.type==='mesh')Object.assign(m,{vertices:p.vertices,uvs:p.uvs,triangles:p.triangles,hull:0});for(const anim of Object.values(raw.animations))for(const s of Object.values(anim.deform||{}))delete s[p.slot];}
await fs.writeFile(file,JSON.stringify(raw));await fs.writeFile(path.join(dir,skin+'-landmarks.json'),JSON.stringify({landmarkSource:'assistant-reviewed normalized profile, not independent API detection',limbs:result.map(({vertices,uvs,triangles,...p})=>p)},null,2));
console.log('Rigged four limbs from proximal/hinge/distal anchors');
}finally{await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

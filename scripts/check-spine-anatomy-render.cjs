const fs=require('node:fs/promises'),path=require('node:path');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {checkChain,releaseStatus}=require('./spine-anatomy-check.cjs');
const dir=path.resolve(__dirname,'../output/spine-lab'),skin=process.argv[2]||'sakura';
(async()=>{const profile=JSON.parse(await fs.readFile(path.join(dir,skin+'-landmarks.json'),'utf8')),out=process.argv[3]?path.resolve(process.argv[3]):path.join(dir,skin+'-self-check');await fs.mkdir(out,{recursive:true});
const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')],env:{...process.env,SPINE_LAB_URL:'http://127.0.0.1:24361/?skin='+skin+'&expressions=1'}});
try{const page=await app.firstWindow();await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.evaluate(()=>spineLab.setPaused(true));const geometry=[];
await page.evaluate(profile=>{
 const sk=new spine.Skeleton(spineLab.skeletons[1].data);sk.setToSetupPose();sk.updateWorldTransform();window.qbotAnatomyAreas={};
 for(const p of profile.limbs){const s=sk.findSlot(p.slot),m=s.getAttachment(),xy=new Float32Array(m.worldVerticesLength);m.computeWorldVertices(s,0,xy.length,xy,0,2);const triangles=[];
 for(let i=0;i<m.triangles.length;i+=3){const ids=m.triangles.slice(i,i+3),u=ids.reduce((a,j)=>a+m.regionUVs[j*2],0)/3,v=ids.reduce((a,j)=>a+m.regionUVs[j*2+1],0)/3;
 if(Math.abs(u-p.anchors[1].u)<.025&&v>p.anchors[1].v&&v<p.anchors[2].v){const [a,b,c]=ids,area=Math.abs((xy[b*2]-xy[a*2])*(xy[c*2+1]-xy[a*2+1])-(xy[c*2]-xy[a*2])*(xy[b*2+1]-xy[a*2+1]))/2;triangles.push({ids:Array.from(ids),area});}}
 window.qbotAnatomyAreas[p.slot]=triangles;
 }
},profile);
const actions=['ship_spine_idle','ship_spine_walk','ship_spine_run','town_face_xinxi','ship_spine_sleep_cute','town_post_player_taketea','town_shuangren_tietie01'];
for(let ai=0;ai<actions.length;ai++)for(let frame=0;frame<8;frame++){
 const result=await page.evaluate(({action,frame,profile})=>{
  const lab=spineLab;lab.setAnimation(action);const time=lab.data.findAnimation(action).duration*frame/8;lab.draw(time);const sk=lab.skeletons[1];
  const limbs=profile.limbs.map(p=>{
   const slot=sk.findSlot(p.slot),mesh=slot.getAttachment();if(!mesh)return {slot:p.slot,error:'Missing attachment'};
   const xy=new Float32Array(mesh.worldVerticesLength);mesh.computeWorldVertices(slot,0,xy.length,xy,0,2);
   const actual=p.anchors.slice(0,3).map(({u,v})=>{const xx=u*p.n,yy=v*p.n,x=Math.floor(xx),y=Math.floor(yy),a=xx-x,b=yy-y,i=y*(p.n+1)+x;
    const ids=a+b<=1?[i,i+1,i+p.n+1]:[i+1,i+p.n+2,i+p.n+1],weights=a+b<=1?[1-a-b,a,b]:[1-b,a+b-1,1-a];return {x:ids.reduce((s,j,k)=>s+xy[j*2]*weights[k],0),y:ids.reduce((s,j,k)=>s+xy[j*2+1]*weights[k],0)};
   });
   const expected=p.bones.slice(0,3).map((n,i)=>{const q=sk.findBone(n).localToWorld(new spine.Vector2(i===0?p.rootOffset:(i===2&&p.ankleAxis==='x'?p.ankleOffset:0),i===2&&p.ankleAxis!=='x'?p.ankleOffset:0));return {x:q.x,y:q.y};});
   const areas=window.qbotAnatomyAreas[p.slot],baseArea=areas.reduce((s,t)=>s+t.area,0),currentArea=areas.reduce((s,{ids:[a,b,c]})=>s+Math.abs((xy[b*2]-xy[a*2])*(xy[c*2+1]-xy[a*2+1])-(xy[c*2]-xy[a*2])*(xy[b*2+1]-xy[a*2+1]))/2,0);
   return {slot:p.slot,actual,expected,lowerSegmentAreaRatio:currentArea/baseArea};
  });
  return {time,limbs,png:document.querySelector('canvas').toDataURL().split(',')[1]};
 },{action:actions[ai],frame,profile});
 const evidence=`${ai}-${frame}.png`;await fs.writeFile(path.join(out,evidence),Buffer.from(result.png,'base64'));
 for(const limb of result.limbs){const check=checkChain(limb.expected,limb.actual);if(!Number.isFinite(limb.lowerSegmentAreaRatio)||limb.lowerSegmentAreaRatio<.3){check.issues.push('lower_segment_area_collapse');check.status='fail';}geometry.push({action:actions[ai],time:result.time,slot:limb.slot,evidence,...check,lowerSegmentAreaRatio:limb.lowerSegmentAreaRatio});}
}
let visual=null;try{visual=JSON.parse(await fs.readFile(path.join(out,'visual-review.json'),'utf8'));}catch{}
const assetHash=require('node:crypto').createHash('sha256').update(await fs.readFile(path.join(dir,skin+'.json'))).update(await fs.readFile(path.join(dir,skin+'-atlas.png'))).digest('hex');
if(visual?.assetHash!==assetHash)visual=null;
const report={assetHash,skin,samples:56,landmarkSource:profile.landmarkSource,geometry,status:releaseStatus({geometry,visual,samples:56}),visual};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({samples:56,checks:geometry.length,failures:geometry.filter(g=>g.status==='fail').length,status:report.status,out}));
}finally{await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

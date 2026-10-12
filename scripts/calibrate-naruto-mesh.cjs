// Rebind only Naruto's jacket to the chest/waist chain, using the original central UV plane.
// The inherited body_X/pelvis weights pull newly painted jacket pixels into spikes.
const fs=require('node:fs/promises'),path=require('node:path');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'output/spine-lab');
const skinName=process.argv[2]||'naruto';if(!['naruto','sasuke','sasuke-gpt','sakura'].includes(skinName))throw Error('Unsupported trial skin');
(async()=>{
 const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')],env:{...process.env,SPINE_LAB_URL:'http://127.0.0.1:24361/?skin='+skinName}});
 try{
  const page=await app.firstWindow();await page.waitForFunction(()=>document.body.dataset.ready==='true');
  const result=await page.evaluate(()=>{
   const sk=new spine.Skeleton(spineLab.data);sk.setToSetupPose();sk.updateWorldTransform();
   const slot=sk.findSlot('躯干上部'),mesh=slot.getAttachment(),xy=new Float32Array(mesh.worldVerticesLength);
   mesh.computeWorldVertices(slot,0,xy.length,xy,0,2);
   const upper=sk.findBone('body_2'),lower=sk.findBone('body_1');
   // The template triangulation folds transparent/outside areas back over the
   // painted jacket. Fit its central UV plane, then use a regular non-folding grid.
   const samples=[];
   for(let i=0;i<xy.length/2;i++){const u=mesh.regionUVs[2*i],v=mesh.regionUVs[2*i+1];if(u>.39&&u<.52&&v>.60&&v<.74)samples.push([u,v,xy[2*i],xy[2*i+1]]);}
   if(samples.length<6)throw Error('Insufficient torso core vertices');
   function fit(axis){
    const m=Array.from({length:3},()=>[0,0,0,0]);
    for(const p of samples){const q=[p[0],p[1],1];for(let i=0;i<3;i++){for(let j=0;j<3;j++)m[i][j]+=q[i]*q[j];m[i][3]+=q[i]*p[axis];}}
    for(let i=0;i<3;i++){let k=i;for(let j=i+1;j<3;j++)if(Math.abs(m[j][i])>Math.abs(m[k][i]))k=j;[m[i],m[k]]=[m[k],m[i]];let div=m[i][i];if(Math.abs(div)<1e-9)throw Error('Singular UV fit');for(let j=i;j<4;j++)m[i][j]/=div;for(let k=0;k<3;k++)if(k!==i){const f=m[k][i];for(let j=i;j<4;j++)m[k][j]-=f*m[i][j];}}
    return m.map(r=>r[3]);
   }
   const fx=fit(2),fy=fit(3),vertices=[],uvs=[],triangles=[];let maxError=0;
   const count=32;
   for(let row=0;row<=count;row++)for(let col=0;col<=count;col++){
    const u=col/count,v=row/count;uvs.push(u,v);
    // Keep the central collar under the chin, but drop the jacket shoulders.
    // Moving only the sleeve leaves the high torso shoulder touching the head.
    const side=Math.min(1,Math.max(0,(Math.abs(u*256-118)-5)/14));
    const shoulderDrop=8*side*side*(3-2*side)*Math.max(0,Math.min(1,(183-v*256)/25));
    const fittedV=v+shoulderDrop/256;
    const world=new spine.Vector2(fx[0]*u+fx[1]*fittedV+fx[2],fy[0]*u+fy[1]*fittedV+fy[2]);
    const t=Math.max(0,Math.min(1,(v*256-160)/50)),weight=t*t*(3-2*t);
    const a=upper.worldToLocal(new spine.Vector2(world.x,world.y)),b=lower.worldToLocal(new spine.Vector2(world.x,world.y));
    vertices.push(2,upper.data.index,a.x,a.y,1-weight,lower.data.index,b.x,b.y,weight);
    const aa=upper.localToWorld(new spine.Vector2(a.x,a.y)),bb=lower.localToWorld(new spine.Vector2(b.x,b.y));
    maxError=Math.max(maxError,Math.hypot(aa.x*(1-weight)+bb.x*weight-world.x,aa.y*(1-weight)+bb.y*weight-world.y));
    if(row<count&&col<count){const i=row*(count+1)+col;triangles.push(i,i+1,i+count+1,i+1,i+count+2,i+count+1);}
   }
   return {vertices,uvs,triangles,maxRebindError:maxError,vertexCount:uvs.length/2};
  });
  if(result.maxRebindError>1e-3)throw Error('Rebinding failed to preserve the fitted plane');
  const file=path.join(dir,skinName+'.json'),raw=JSON.parse(await fs.readFile(file,'utf8'));
  const source=JSON.parse(await fs.readFile(path.join(dir,'source/smalltown_spine_player/smalltown_spine_player.json'),'utf8'));
  // A small neck shortening moves the head and facial attachments together.
  // Always derive from the template so repeated calibration never accumulates.
  raw.bones.find(b=>b.name==='body_3').x=source.bones.find(b=>b.name==='body_3').x-(skinName==='sakura'?12:4);
  const backup=path.join(dir,skinName+'-before-jacket-repair.json');try{await fs.access(backup);}catch{await fs.copyFile(file,backup);}
  const jacket=raw.skins[0].attachments['躯干上部']['躯干上部'];Object.assign(jacket,{vertices:result.vertices,uvs:result.uvs,triangles:result.triangles,hull:0});delete jacket.edges;
  let removed=0;
  for(const anim of Object.values(raw.animations))for(const skin of Object.values(anim.deform||{})){
   if(skin['躯干上部']){delete skin['躯干上部'];removed++;}
  }
  await fs.writeFile(file,JSON.stringify(raw));
  await fs.writeFile(path.join(dir,skinName+'-mesh-calibration.json'),JSON.stringify({version:1,slot:'躯干上部',bones:['body_2','body_1'],maxRebindError:result.maxRebindError,vertexCount:result.vertexCount,removedTorsoDeformTimelines:removed,reason:'Replace folded template triangles with a regular UV grid fitted to the torso core, and rebind chest/waist. Original vertex positions outside the fitted plane are intentionally not preserved.'},null,2));
  console.log(JSON.stringify({maxRebindError:result.maxRebindError,vertices:result.vertexCount,removed}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

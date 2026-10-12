// Bounded sleeve-root alignment for the existing nine-part humanoid template.
// Rebuilds from the deterministic sleeve calibrator output, never stacks offsets.
const fs=require('node:fs/promises'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'output/spine-lab');
const skin=process.argv[2];
if(!['sasuke-gpt','sasuke'].includes(skin))throw Error('Only reviewed trial profiles are supported');
(async()=>{
 const existing=JSON.parse(await fs.readFile(path.join(dir,skin+'.json'),'utf8'));
 if(existing.slots.some(s=>s.name==='qbot_near_sleeve_cap'))throw Error('Layered asset: repack from parts before recalibrating');
 const baseline=spawnSync(process.execPath,[path.join(__dirname,'calibrate-spine-sleeves.cjs'),skin],{env:process.env,encoding:'utf8'});
 if(baseline.status!==0)throw Error('Baseline sleeve rebuild failed: '+baseline.stderr);
 const file=path.join(dir,skin+'.json'),raw=JSON.parse(await fs.readFile(file,'utf8'));
 const cal=JSON.parse(await fs.readFile(path.join(dir,skin+'-calibration.json'),'utf8'));
 const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')],env:{...process.env,SPINE_LAB_URL:'http://127.0.0.1:24361/?skin='+skin}});
 try{
 const page=await app.firstWindow();await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const result=await page.evaluate(async({skin,cal})=>{
  const sk=new spine.Skeleton(spineLab.skeletons[1].data);sk.setToSetupPose();sk.updateWorldTransform();
  const image=new Image();image.src=skin+'-atlas.png';await image.decode();
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
  const atlas=(await fetch(skin+'.atlas').then(r=>r.text())).replace(/\r/g,'');
  const patches={},report=[];
  for(const [name,side] of [['右手_1无袖','R'],['左手_1无袖','L']]){
   const match=atlas.match(new RegExp('(?:^|\\n)'+name+'\\nbounds:([0-9,]+)'));
   if(!match)throw Error('Missing region '+name);
   const [rx,ry,rw,rh]=match[1].split(',').map(Number),pixels=ctx.getImageData(rx,ry,rw,rh).data;
   const box=cal.body[name],h=box[3]-box[1];
   // Root centroid from actual opaque silhouette near the rounded cap.
   let sx=0,sy=0,count=0;
   for(let y=Math.ceil(box[1]+h*.10);y<box[1]+h*.23;y++)for(let x=box[0];x<box[2];x++)if(pixels[(y*rw+x)*4+3]>160){sx+=x+.5;sy+=y+.5;count++;}
   if(count<5)throw Error('No reliable sleeve root '+name);
   const anchor={u:sx/count/rw,v:sy/count/rh};
   const slot=sk.findSlot(name),m=slot.getAttachment(),xy=new Float32Array(m.worldVerticesLength);m.computeWorldVertices(slot,0,xy.length,xy,0,2);
   const n=32,point=(u,v)=>{const x=Math.max(0,Math.min(n-.00001,u*n)),y=Math.max(0,Math.min(n-.00001,v*n)),i=Math.floor(y)*(n+1)+Math.floor(x),a=x%1,b=y%1;return {x:xy[i*2]*(1-a)*(1-b)+xy[(i+1)*2]*a*(1-b)+xy[(i+n+1)*2]*(1-a)*b+xy[(i+n+2)*2]*a*b,y:xy[i*2+1]*(1-a)*(1-b)+xy[(i+1)*2+1]*a*(1-b)+xy[(i+n+1)*2+1]*(1-a)*b+xy[(i+n+2)*2+1]*a*b};};
   const from=point(anchor.u,anchor.v),upper=sk.findBone('arm_'+side+'1'),lower=sk.findBone('arm_'+side+'2');
   // Mount slightly down the upper-arm axis, below the jaw; do not move bones.
   const mount=upper.localToWorld(new spine.Vector2(upper.data.length*.18,0));
   // Template bone origins sit above the painted shoulder line. Preserve the
   // reviewed cap height instead of lifting short sleeves into the jaw.
   const across=point((box[2]-1)/rw,anchor.v).x-point((box[0]+1)/rw,anchor.v).x;
   const to=new spine.Vector2(mount.x+(side==='R'?-1:1)*Math.abs(across)*.22,from.y);
   const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy);
   if(distance>upper.data.length*.85)throw Error('Root outside bounded correction '+name);
   let hx=0,hy=0,hcount=0;
   for(let y=Math.ceil(box[1]+h*.82);y<box[3];y++)for(let x=box[0];x<box[2];x++)if(pixels[(y*rw+x)*4+3]>160){hx+=x+.5;hy+=y+.5;hcount++;}
   if(hcount<5)throw Error('Missing hand silhouette');
   const hand=point(hx/hcount/rw,hy/hcount/rh);
   const handDx=skin==='sasuke-gpt'?to.x+(side==='R'?-1:1)*upper.data.length*.12-hand.x:0;
   const vertices=[],chest=sk.findBone('body_2');let maxHandMovement=0;
   for(let i=0;i<m.regionUVs.length/2;i++){
    const v=m.regionUVs[i*2+1],t=Math.max(0,Math.min(1,(v*rh-(box[1]+h*.40))/(h*.30))),f=1-t*t*(3-2*t);
    const ht=Math.max(0,Math.min(1,(v*rh-(box[1]+h*.38))/(h*.40))),handWeight=ht*ht*(3-2*ht);
    const world=new spine.Vector2(xy[i*2]+dx*f+handDx*handWeight,xy[i*2+1]+dy*f);
    if(v*rh>=box[1]+h*.70)maxHandMovement=Math.max(maxHandMovement,Math.hypot(world.x-xy[i*2],world.y-xy[i*2+1]));
    const a=upper.worldToLocal(new spine.Vector2(world.x,world.y)),b=lower.worldToLocal(new spine.Vector2(world.x,world.y));
    const bend=Math.max(0,Math.min(1,(a.x-upper.data.length+8)/16)),w=bend*bend*(3-2*bend);
    const pin=.65*(1-Math.max(0,Math.min(1,(v*rh-(box[1]+h*.10))/(h*.30))));
    const body=chest.worldToLocal(new spine.Vector2(world.x,world.y));
    vertices.push(3,chest.data.index,body.x,body.y,pin,upper.data.index,a.x,a.y,(1-pin)*(1-w),lower.data.index,b.x,b.y,(1-pin)*w);
   }
   patches[name]={vertices};report.push({slot:name,opaqueSamples:count,anchor,from,to:{x:to.x,y:to.y},correction:distance,handDx,maxHandMovement});
  }
  return {patches,report};
 },{skin,cal});
 for(const [name,patch] of Object.entries(result.patches))Object.assign(raw.skins[0].attachments[name][name],patch);
 await fs.writeFile(file,JSON.stringify(raw));
 await fs.writeFile(path.join(dir,skin+'-shoulder-calibration.json'),JSON.stringify({version:1,scope:'template sleeve-root alignment; visual review required',report:result.report},null,2));
 console.log(JSON.stringify(result.report));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

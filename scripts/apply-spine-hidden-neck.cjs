// Experimental silhouette profile: compress visible collar, lower shoulder caps.
// Run on a freshly packed/calibrated asset, before sleeve-cap layering.
const fs=require('node:fs/promises'),path=require('node:path');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=path.resolve(__dirname,'../output/spine-lab');
(async()=>{
const file=path.join(dir,'sasuke-gpt.json'),raw=JSON.parse(await fs.readFile(file,'utf8'));
if(raw.slots.some(s=>s.name==='qbot_near_sleeve_cap'))throw Error('Repack before applying hidden-neck profile');
const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')],env:{...process.env,SPINE_LAB_URL:'http://127.0.0.1:24361/?skin=sasuke-gpt'}});
try{
const page=await app.firstWindow();await page.waitForFunction(()=>document.body.dataset.ready==='true');
const patches=await page.evaluate(()=>{
const sk=new spine.Skeleton(spineLab.skeletons[1].data);sk.setToSetupPose();sk.updateWorldTransform();const patches={};
for(const name of ['躯干上部','右手_1无袖','左手_1无袖']){
 const m=sk.findSlot(name).getAttachment(),vertices=Array.from(m.vertices);
 for(let i=0;i<m.regionUVs.length/2;i++){
  const x=m.regionUVs[2*i]*256,y=m.regionUVs[2*i+1]*256;
  let drop;
  if(name==='躯干上部'){
   const edge=Math.min(1,Math.abs(x-118)/15);
   const collar=10*Math.max(0,Math.min(1,(165-y)/14));
   const shoulder=8*edge*Math.max(0,Math.min(1,(190-y)/28));
   drop=Math.max(collar,shoulder);
  }else{const t=Math.max(0,Math.min(1,(y-177)/28));drop=8*(1-t*t*(3-2*t));}
  // Each bone-local coordinate must receive the same world displacement.
  const t=Math.max(0,Math.min(1,(y-178)/25));
  const inset=name==='躯干上部'?0:(name==='右手_1无袖'?1:-1)*9*(1-t*t*(3-2*t));
  patches[name]??={vertices,worldDrop:[],worldInset:[]};patches[name].worldDrop.push(drop);patches[name].worldInset.push(inset);
 }
 // Runtime weighted vertices are x,y,weight triples; bones has count+indices.
 let bi=0,vi=0;
 let vertexIndex=0;
 for(const drop of patches[name].worldDrop){const inset=patches[name].worldInset[vertexIndex++],n=m.bones[bi++];for(let j=0;j<n;j++){
  const bone=sk.bones[m.bones[bi++]],p=bone.localToWorld(new spine.Vector2(vertices[vi],vertices[vi+1]));p.y-=drop;p.x+=inset;bone.worldToLocal(p);vertices[vi]=p.x;vertices[vi+1]=p.y;vi+=3;
 }}
 // Serialize back to Spine JSON's interleaved influence representation.
 const packed=[];bi=0;vi=0;while(bi<m.bones.length){const n=m.bones[bi++];packed.push(n);for(let j=0;j<n;j++){packed.push(m.bones[bi++],vertices[vi++],vertices[vi++],vertices[vi++]);}}
 patches[name]={vertices:packed};
}return patches;
});
for(const [name,p]of Object.entries(patches))Object.assign(raw.skins[0].attachments[name][name],p);
const source=JSON.parse(await fs.readFile(path.join(dir,'source/smalltown_spine_player/smalltown_spine_player.json'),'utf8'));
raw.bones.find(b=>b.name==='body_3').x=source.bones.find(b=>b.name==='body_3').x-10;
await fs.writeFile(file,JSON.stringify(raw));console.log('Applied hidden-neck experiment: collar compression and shoulder drop, no bone deletion.');
}finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

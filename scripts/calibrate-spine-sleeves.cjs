// Rebuild sleeve topology in the source UV plane, preserving hand endpoints.
const fs=require('node:fs/promises'),path=require('node:path');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'output/spine-lab');
(async()=>{const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')]});try{
const page=await app.firstWindow();await page.waitForFunction(()=>document.body.dataset.ready==='true');
const patches=await page.evaluate(()=>{
const sk=new spine.Skeleton(spineLab.data);sk.setToSetupPose();sk.updateWorldTransform();const patches={};
for(const [name,side] of [['右手_1无袖','R'],['左手_1无袖','L']]){
const mesh=sk.findSlot(name).getAttachment(),xy=new Float32Array(mesh.worldVerticesLength);mesh.computeWorldVertices(sk.findSlot(name),0,xy.length,xy,0,2);
const samples=[];for(let i=0;i<xy.length/2;i++)samples.push([mesh.regionUVs[i*2],mesh.regionUVs[i*2+1],xy[i*2],xy[i*2+1]]);
   function fit(axis){
    const m=Array.from({length:3},()=>[0,0,0,0]);
    for(const p of samples){const q=[p[0],p[1],1];for(let i=0;i<3;i++){for(let j=0;j<3;j++)m[i][j]+=q[i]*q[j];m[i][3]+=q[i]*p[axis];}}
    for(let i=0;i<3;i++){let k=i;for(let j=i+1;j<3;j++)if(Math.abs(m[j][i])>Math.abs(m[k][i]))k=j;[m[i],m[k]]=[m[k],m[i]];let div=m[i][i];if(Math.abs(div)<1e-9)throw Error('Singular UV fit');for(let j=i;j<4;j++)m[i][j]/=div;for(let k=0;k<3;k++)if(k!==i){const f=m[k][i];for(let j=i;j<4;j++)m[k][j]-=f*m[i][j];}}
    return m.map(r=>r[3]);
   }

const fx=fit(2),fy=fit(3),upper=sk.findBone('arm_'+side+'1'),lower=sk.findBone('arm_'+side+'2');
const vertices=[],uvs=[],triangles=[],n=32;
for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){
const u=col/n,v=row/n;uvs.push(u,v);const world=new spine.Vector2(fx[0]*u+fx[1]*v+fx[2],fy[0]*u+fy[1]*v+fy[2]);
// Blend around the actual elbow in setup space, not around an arbitrary UV row.
const a=upper.worldToLocal(new spine.Vector2(world.x,world.y)),b=lower.worldToLocal(new spine.Vector2(world.x,world.y));
const t=Math.max(0,Math.min(1,(a.x-upper.data.length+8)/16)),w=t*t*(3-2*t);
vertices.push(2,upper.data.index,a.x,a.y,1-w,lower.data.index,b.x,b.y,w);
if(row<n&&col<n){const i=row*(n+1)+col;triangles.push(i,i+1,i+n+1,i+1,i+n+2,i+n+1);}
}
patches[name]={vertices,uvs,triangles,hull:0};
}return patches;});
for(const skin of (['sasuke','sasuke-gpt'].includes(process.argv[2])?[process.argv[2]]:['hood','wuxie'])){const file=path.join(dir,skin+'.json'),raw=JSON.parse(await fs.readFile(file,'utf8'));for(const [name,patch]of Object.entries(patches)){Object.assign(raw.skins[0].attachments[name][name],patch);delete raw.skins[0].attachments[name][name].edges;for(const a of Object.values(raw.animations))for(const s of Object.values(a.deform||{}))delete s[name];}await fs.writeFile(file,JSON.stringify(raw));}
console.log('Rebuilt sleeves for '+(['sasuke','sasuke-gpt'].includes(process.argv[2])?process.argv[2]:'hood and wuxie'));
}finally{await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

// Split the near sleeve into a cap behind the torso and a foreground lower arm.
// Preserve each animation's complete draw order when inserting the new slot.
const fs=require('fs'),path=require('path');
const dir=path.resolve(__dirname,'../output/spine-lab');
const skin=process.argv[2];if(skin!=='sasuke-gpt')throw Error('Reviewed GPT Sasuke only');
const file=path.join(dir,skin+'.json'),raw=JSON.parse(fs.readFileSync(file,'utf8'));
const pairs=[['右手_1无袖','qbot_far_sleeve_cap'],['左手_1无袖','qbot_near_sleeve_cap']],torso='躯干上部';
if(raw.slots.some(s=>pairs.some(p=>p[1]===s.name)))throw Error('Rebuild shoulder baseline before layering');
const old=raw.slots.map(s=>s.name),insert=old.indexOf(torso);
const reports=[];
for(const [name,cap]of pairs){
const slot=raw.slots.find(s=>s.name===name);
raw.slots.splice(raw.slots.findIndex(s=>s.name===torso),0,{...slot,name:cap,attachment:cap});
const mesh=raw.skins[0].attachments[name][name],upper=[],lower=[];
const cutoff=23/32;
for(let i=0;i<mesh.triangles.length;i+=3){const tri=mesh.triangles.slice(i,i+3);const v=tri.reduce((s,j)=>s+mesh.uvs[j*2+1],0)/3;(v<cutoff?upper:lower).push(...tri);}
raw.skins[0].attachments[cap]={[cap]:{...structuredClone(mesh),path:mesh.path||name,triangles:upper}};
mesh.triangles=lower;
reports.push({cap,capTriangles:upper.length/3,lowerTriangles:lower.length/3});
}
const all=raw.slots.map(s=>s.name);
for(const animation of Object.values(raw.animations))for(const frame of animation.drawOrder||animation.draworder||[]){
 const order=Array(old.length).fill(-1),unchanged=[];let cursor=0;
 for(const offset of frame.offsets||[]){const idx=old.indexOf(offset.slot);while(cursor<idx)unchanged.push(cursor++);order[cursor+offset.offset]=cursor++;}
 while(cursor<old.length)unchanged.push(cursor++);
 for(let i=old.length-1;i>=0;i--)if(order[i]===-1)order[i]=unchanged.pop();
 const names=order.map(i=>old[i]);names.splice(names.indexOf(torso),0,...pairs.map(p=>p[1]));
 frame.offsets=all.map((slot,i)=>({slot,offset:names.indexOf(slot)-i}));
}
fs.writeFileSync(file,JSON.stringify(raw));
console.log(JSON.stringify({bothCapsBehindTorso:true,reports}));

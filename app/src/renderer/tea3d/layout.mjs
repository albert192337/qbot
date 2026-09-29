// World units: metres, +Y up, furniture fronts face +Z. Save data never contains meshes.
export const CATALOG = [
  {id:'jade-sofa',name:'青竹软榻',category:'seat',w:2.7,d:1.05,seats:[[-.62,.64,.05],[.62,.64,.05]]},
  {id:'walnut-bench',name:'月白长榻',category:'seat',w:2.7,d:1.05,seats:[[-.62,.64,.05],[.62,.64,.05]]},
  {id:'tea-table',name:'青瓷茶几',category:'table',w:2,d:1.05},
  {id:'round-table',name:'团圆茶几',category:'table',w:1.25,d:1.25},
  {id:'tea-cabinet',name:'煮茶柜',category:'cabinet',w:1.65,d:.75},
  {id:'broadleaf',name:'雨叶陶盆',category:'plant',w:.85,d:.85},
  {id:'lantern',name:'听雨灯笼',category:'light',w:.5,d:.5},
  {id:'jade-rug',name:'青纹织毯',category:'rug',w:3.7,d:2.6},
];
export const BY_ID=Object.fromEntries(CATALOG.map(x=>[x.id,x]));
export const SAVE_KEY='qbot.tea3d.layout.v1';
export const DEFAULT_LAYOUT=[
  {key:'rug',asset:'jade-rug',x:.25,z:.65,angle:0},
  {key:'sofa',asset:'jade-sofa',x:.25,z:-.95,angle:0},
  {key:'table',asset:'tea-table',x:.25,z:.9,angle:0},
  {key:'cabinet',asset:'tea-cabinet',x:-3,z:-1.2,angle:0},
  {key:'plant',asset:'broadleaf',x:3.2,z:-1.35,angle:0},
  {key:'lamp',asset:'lantern',x:2.25,z:.6,angle:0},
];
export function extent(p){const a=BY_ID[p.asset],c=Math.abs(Math.cos(p.angle)),s=Math.abs(Math.sin(p.angle));return {x:(a.w*c+a.d*s)/2,z:(a.w*s+a.d*c)/2};}
export function legal(p,others){
  if(!BY_ID[p.asset]||![p.x,p.z,p.angle].every(Number.isFinite))return false;
  const e=extent(p);if(Math.abs(p.x)+e.x>4.4||Math.abs(p.z)+e.z>2.55)return false;
  return BY_ID[p.asset].category==='rug'||others.every(q=>{if(q.key===p.key||BY_ID[q.asset]?.category==='rug')return true;const f=extent(q);return Math.abs(p.x-q.x)>=e.x+f.x+.035||Math.abs(p.z-q.z)>=e.z+f.z+.035;});
}
export function restore(raw){
  if(!Array.isArray(raw)||raw.length>40)return structuredClone(DEFAULT_LAYOUT);
  const accepted=[],keys=new Set();
  for(const p of raw){if(!p||typeof p.key!=='string'||p.key.length>80||keys.has(p.key)||!BY_ID[p.asset])continue;
    const clean={key:p.key,asset:p.asset,x:p.x,z:p.z,angle:p.angle};if(legal(clean,accepted)){accepted.push(clean);keys.add(p.key);}}
  return accepted.length||raw.length===0?accepted:structuredClone(DEFAULT_LAYOUT);
}
export function seatWorld(p,index=0){const a=BY_ID[p.asset]?.seats?.[index];if(!a)return null;const c=Math.cos(p.angle),s=Math.sin(p.angle);return {x:p.x+a[0]*c+a[2]*s,y:a[1],z:p.z-a[0]*s+a[2]*c,angle:p.angle};}

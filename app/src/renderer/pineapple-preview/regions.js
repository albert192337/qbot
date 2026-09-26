import * as T from 'three';

// The source's colour-based split left tiny islands assigned to the other region.
// Keep each region's main connected surface, transfer detached islands, never delete faces.
export function repairPineappleRegions(parts){
 const fruit=parts.find(p=>!p.leaf),crown=parts.find(p=>p.leaf);
 if(parts.length!==2||!fruit||!crown)throw Error('Expected two pineapple regions');
 const buckets=[[],[]],stats={triangles:0,fruitToCrown:0,crownToFruit:0};
 for(const part of parts){
  const geo=part.geometry,position=geo.getAttribute('position'),index=geo.index;
  const ids=index?Array.from(index.array):Array.from({length:position.count},(_,i)=>i);
  const keys=Array.from({length:position.count},(_,i)=>[position.getX(i),position.getY(i),position.getZ(i)].map(x=>Math.round(x*100000)).join(','));
  const parent=new Map();
  const find=x=>{if(!parent.has(x))parent.set(x,x);while(parent.get(x)!==x){parent.set(x,parent.get(parent.get(x)));x=parent.get(x);}return x;};
  for(let i=0;i<ids.length;i+=3){const root=find(keys[ids[i]]);for(let j=1;j<3;j++)parent.set(find(keys[ids[i+j]]),root);}
  const counts=new Map();for(let i=0;i<ids.length;i+=3){const root=find(keys[ids[i]]);counts.set(root,(counts.get(root)||0)+1);}
  const largest=[...counts].sort((a,b)=>b[1]-a[1])[0][0];
  for(let i=0;i<ids.length;i+=3){const island=find(keys[ids[i]])!==largest,leaf=island?!part.leaf:part.leaf;stats.triangles++;if(island)stats[part.leaf?'crownToFruit':'fruitToCrown']++;buckets[leaf?1:0].push({geo,ids:ids.slice(i,i+3)});}
 }
 const repaired=[fruit,crown].map((part,region)=>{
  const geo=new T.BufferGeometry();for(const name of ['position','normal','uv']){const size=name==='uv'?2:3,values=[];for(const face of buckets[region]){const a=face.geo.getAttribute(name);for(const i of face.ids)for(let k=0;k<size;k++)values.push(a.getComponent(i,k));}geo.setAttribute(name,new T.Float32BufferAttribute(values,size));}
  geo.computeBoundingBox();geo.computeBoundingSphere();return {...part,geometry:geo};
 });parts.forEach(p=>p.geometry.dispose());return {parts:repaired,stats};
}

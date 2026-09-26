import * as T from 'three';

// Sample the source UV colours so fruit traits never recolour the green calyx.
export function strawberryParts(root){
 root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(root),center=box.getCenter(new T.Vector3()),scale=2.15/box.getSize(new T.Vector3()).y,parts=[];
 root.traverse(o=>{
  if(!o.isMesh)return;
  const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
  g.translate(-center.x,-center.y,-center.z);g.scale(scale,scale,scale);g.translate(0,-.05,0);
  const image=o.material.map.image,c=document.createElement('canvas');c.width=image.width;c.height=image.height;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data,uv=g.getAttribute('uv'),ids=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),buckets=[[],[]];
  const green=i=>{const x=Math.min(c.width-1,Math.max(0,Math.floor(uv.getX(i)*c.width))),y=Math.min(c.height-1,Math.max(0,Math.floor((o.material.map.flipY?1-uv.getY(i):uv.getY(i))*c.height))),k=(y*c.width+x)*4;return pixels[k+1]>pixels[k]*1.12&&pixels[k+1]>pixels[k+2]*1.12;};
  for(let i=0;i<ids.length;i+=3){const face=ids.slice(i,i+3);buckets[face.filter(green).length>=2?1:0].push(...face);}
  for(let region=0;region<2;region++){if(!buckets[region].length)continue;const geo=g.clone();geo.setIndex(buckets[region]);geo.computeBoundingBox();geo.computeBoundingSphere();parts.push({geometry:geo,material:o.material,leaf:region===1});}
  g.dispose();o.geometry.dispose();
 });
 if(!parts.some(p=>p.leaf)||!parts.some(p=>!p.leaf))throw Error('草莓果实与叶冠分区失败');
 return parts;
}

export function strawberryBase(root){
 root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),center=box.getCenter(new T.Vector3()),scale=2.9/box.getSize(new T.Vector3()).x,parts=[];
 root.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(scale,scale,scale);const positions=geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const lift=T.MathUtils.smoothstep(positions.getY(i),.18,.6);positions.setZ(i,positions.getZ(i)-.95*lift);}geometry.computeVertexNormals();geometry.translate(0,-1.38,-.16);parts.push({geometry,material:o.material,base:true});o.geometry.dispose();});return parts;
}

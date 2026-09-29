export type SpineExpression = 'neutral' | 'happy' | 'curious' | 'annoyed' | 'sleepy' | 'surprised';

/** Eyes use the already reviewed face-space calibration, never the reference body's proportions. */
export function createCapsuleEyes(api:any, gl:WebGLRenderingContext, skin:'hood'|'wuxie') {
  const textures:any[]=[];
  const regions=new Map<string,any>();
  const boxes=skin==='hood'?[[70,56,80,73],[31,57,39,73]]:[[64,54,73,70],[27,58,34,73]];
  for(const expression of ['neutral','happy','curious','annoyed','sleepy','surprised'] as const){
    boxes.forEach(([x1,y1,x2,y2],side)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=516;
      const c=canvas.getContext('2d')!;c.scale(4,4);c.fillStyle=c.strokeStyle='#171719';c.lineCap='round';c.lineJoin='round';
      const w=x2-x1,h=y2-y1,cx=(x1+x2)/2,cy=(y1+y2)/2;
      const stroke=(points:number[])=>{c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.stroke();};
      if(expression==='happy'){
        c.lineWidth=2.5;c.beginPath();c.moveTo(x1-1,cy+1);c.quadraticCurveTo(cx,cy-6,x2+1,cy+1);c.stroke();
      }else if(expression==='sleepy'){
        c.lineWidth=2.8;stroke([x1,cy+2,x2,cy+2]);
      }else{
        const height=expression==='annoyed'?h*.55:expression==='surprised'?h*1.18:expression==='curious'&&side===0?h*.8:h;
        c.beginPath();c.roundRect(x1,expression==='annoyed'?cy-2:y1,w,height,w*.5);c.fill();
        if(expression==='annoyed'||(skin==='hood'&&expression==='neutral')){c.lineWidth=2.8;stroke([x1-1.5,expression==='annoyed'?cy-2:y1,x2+1.5,expression==='annoyed'?cy-2:y1]);}
        if(expression==='curious'){c.lineWidth=2;stroke([x1-1,y1-4+(side?1:-1),x2+1,y1-4+(side?-1:1)]);}
      }
      const texture=new api.GLTexture(gl,canvas);textures.push(texture);
      // A plain TextureRegion preserves the original calibrated mesh and UV orientation.
      regions.set(expression+side,{renderObject:{page:{texture}},u:0,v:0,u2:1,v2:1});
    });
  }
  return { apply(sk:any,expression:SpineExpression){
    ['eye_LA0','eye_RA0'].forEach((name,i)=>{const mesh=sk.findSlot(name).getAttachment();mesh.region=regions.get(expression+i);mesh.updateUVs();});
    sk.findSlot('mouth_A0').color.a=0;
  },dispose(){textures.forEach(t=>t.dispose());}};
}

import { DECOR_PACK } from '../furniture/catalog';
import { BASIC_ITEMS, SLOTS, type Layout } from './layout';
import type { FurnitureCategory, FurnitureTheme } from './library';

export const TEA_SHELL = new URL('./art/tea-shell.png', import.meta.url).href;
export const ITEMS = [
  ...BASIC_ITEMS.map(item => ({ ...item, image:'', basic:true })),
  ...DECOR_PACK.map(item => ({id:item.id,name:item.name,surface:item.anchor,image:item.image,cell:-1,basic:false,theme:'collection' as const,category:'collection' as const,width:item.defaultW,height:item.defaultW*item.aspect})),
];
export type ShelfTheme = FurnitureTheme | 'collection' | 'all';
export type ShelfCategory = FurnitureCategory | 'collection' | 'all';
const ATLAS_URLS = {
  tea:new URL('./art/tea-furniture.png',import.meta.url).href,
  scholar:new URL('./art/furniture-scholar.png',import.meta.url).href,
  reading:new URL('./art/furniture-reading.png',import.meta.url).href,
  rattan:new URL('./art/furniture-rattan.png',import.meta.url).href,
};
// Actual alpha gutters are measured after generation; a nominal grid is not a crop contract.
const TEA_RECTS = [[0,0,420,700],[435,360,845,680],[850,0,1280,700],[0,700,435,1280],[435,700,810,1280],[810,700,1280,1280]];
const PACK_RECTS:Record<Exclude<FurnitureTheme,'tea'>,number[][]> = {
 scholar:[[0,0,512,512],[512,0,1024,512],[1024,0,1536,512],[0,512,512,1024],[512,512,1024,1024],[1024,512,1536,1024]],
 reading:[[0,0,512,570],[512,0,1024,570],[1024,0,1536,570],[0,570,512,1024],[512,570,1024,1024],[1024,570,1536,1024]],
 rattan:[[0,0,520,520],[520,0,1050,520],[1050,0,1536,520],[0,520,512,1024],[512,520,1000,1024],[1000,520,1536,1024]],
};
interface Sprite { image:HTMLImageElement; x:number; y:number; w:number; h:number; tint?:string }
export class FurnitureArt {
  private sprites = new Map<string,Sprite>();
  async load():Promise<void> {
    await Promise.all((Object.keys(ATLAS_URLS) as FurnitureTheme[]).map(async theme=>{
      const atlas=new Image();atlas.src=ATLAS_URLS[theme];await atlas.decode();
      const canvas=document.createElement('canvas');canvas.width=atlas.naturalWidth;canvas.height=atlas.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(atlas,0,0);
      const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
      for(const item of BASIC_ITEMS.filter(item=>item.atlas===theme)){
        const rect=theme==='tea'?TEA_RECTS[item.cell].map(v=>v/1280):PACK_RECTS[theme][item.cell].map((v,i)=>v/(i%2?1024:1536));
        const left=Math.floor(rect[0]*canvas.width),top=Math.floor(rect[1]*canvas.height),right=Math.floor(rect[2]*canvas.width),bottom=Math.floor(rect[3]*canvas.height);
        let x=right,y=bottom,r=left,b=top;
        for(let py=top;py<bottom;py++)for(let px=left;px<right;px++)if(data[(py*canvas.width+px)*4+3]>24){x=Math.min(x,px);y=Math.min(y,py);r=Math.max(r,px);b=Math.max(b,py);}
        if(r<x||b<y)throw Error(`家具素材为空：${item.name}`);
        this.sprites.set(item.id,{image:atlas,x,y,w:r-x+1,h:b-y+1});
      }
    }));
    await Promise.all(DECOR_PACK.map(async item=>{
      const image=new Image();image.src=item.image;
      try{await image.decode();const cell=item.cell??0,w=image.naturalWidth/3,h=image.naturalHeight/2;this.sprites.set(item.id,{image,x:(cell%3)*w,y:Math.floor(cell/3)*h,w,h,tint:item.tint});}catch{/* Optional collection art must not block built-in sets. */}
    }));
  }
  drawItem(ctx:CanvasRenderingContext2D,id:string,x:number,y:number,w:number,h:number,projectRug=false):void {
    const s=this.sprites.get(id);if(!s)return;
    const scale=Math.min(w/s.w,h/s.h),dw=projectRug?w:s.w*scale,dh=projectRug?h:s.h*scale;
    ctx.save();if(s.tint)ctx.filter=s.tint;
    ctx.drawImage(s.image,s.x,s.y,s.w,s.h,x-dw/2,y-dh,dw,dh);ctx.restore();
  }
  draw(ctx:CanvasRenderingContext2D,layout:Layout):void {
    const layer={rug:0,wall:1,floor:2};
    const ordered=[...SLOTS].sort((a,b)=>layer[a.surface]-layer[b.surface]||a.y-b.y);
    for(const slot of ordered){
      const id=layout[slot.id],item=BASIC_ITEMS.find(item=>item.id===id);
      this.drawItem(ctx,id,slot.x,slot.y,Math.min(slot.w,item?.width??slot.w),Math.min(slot.h,item?.height??slot.h),slot.surface==='rug');
    }
  }
}
export function drawShell(ctx:CanvasRenderingContext2D,image:HTMLImageElement):void {
  const h=image.naturalWidth*.295;
  ctx.drawImage(image,0,(image.naturalHeight-h)/2,image.naturalWidth,h,0,0,1000,295);
}

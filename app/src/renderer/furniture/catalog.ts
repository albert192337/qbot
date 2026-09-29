import { FURNITURE_SHOP, REGIONAL_FURNITURE } from '../../shared/social-economy';
export interface DecorSticker {
 id:string;name:string;image:string;defaultW:number;anchor:'wall'|'floor';category:'墙面'|'家具';aspect:number;tint?:string;cell?:number;
}
const atlas=new URL('../garden/assets/capsule/furniture.png',import.meta.url).href;
export const DECOR_PACK:DecorSticker[]=FURNITURE_SHOP.map((item,cell)=>({id:item.id,name:item.name,image:atlas,cell,defaultW:[80,85,150,180,110,130][cell],anchor:'floor',category:'家具',aspect:1}));
for(const item of REGIONAL_FURNITURE){const base=DECOR_PACK.find(x=>x.id===item.base)!;DECOR_PACK.push({...base,id:item.id,name:item.name,tint:item.tint});}
export const DECOR_BY_ID:ReadonlyMap<string,DecorSticker>=new Map(DECOR_PACK.map(item=>[item.id,item]));
export function anchorOf(id:string):'wall'|'floor'{return DECOR_BY_ID.get(id)?.anchor??'wall';}
export function furnitureThumbnail(id:string,name:string):HTMLElement {
 const item=DECOR_BY_ID.get(id),span=document.createElement('span');span.className='garden-furniture-thumb';span.setAttribute('role','img');span.setAttribute('aria-label',name);
 if(item){span.style.backgroundImage='url("'+item.image+'")';span.style.backgroundSize='300% 200%';span.style.backgroundPosition=((item.cell??0)%3)*50+'% '+Math.floor((item.cell??0)/3)*100+'%';if(item.tint)span.style.filter=item.tint;}
 return span;
}

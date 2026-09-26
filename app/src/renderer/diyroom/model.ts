export type Theme = 'warm' | 'pink';
export type Kind = 'sofa' | 'table' | 'window' | 'cabinet' | 'lamp' | 'plant' | 'rug' | 'curtain' | 'accessory';
export type Piece = { id: string; theme: Theme; index: number; kind: Kind; label: string; layer: 'wall' | 'floor' | 'ground' | 'top'; width: number; x: number; y: number; scale: number; visible: boolean; flip: boolean };
export type Room = { version: 1; wall: Theme; floor: Theme; furniture: Piece[] };
const kinds: Kind[] = ['sofa','table','window','cabinet','lamp','plant','rug','curtain','accessory'];
const widths = [450,360,400,245,115,190,760,470,130];
const anchors = [[390,725],[810,815],[790,515],[1310,698],[1120,704],[1110,784],[640,953],[790,545],[810,701]];
export function createRoom(theme: Theme = 'pink'): Room {
  const names = { warm:['苔绿沙发','橡木茶几','花园木窗','橡木书柜','奶油落地灯','龟背竹','编织地毯','亚麻窗帘','陶瓷茶具'], pink:['贝壳沙发','描金茶几','拱形花窗','蝴蝶结衣柜','丝带落地灯','玫瑰花瓶','蕾丝地毯','粉纱窗帘','蝴蝶结镜子'] };
  const furniture: Piece[] = [];
  for (const variant of ['warm','pink'] as const) kinds.forEach((kind,index) => {
    const layer = kind === 'window' || kind === 'curtain' || (variant === 'pink' && kind === 'accessory') ? 'wall' : kind === 'rug' ? 'ground' : kind === 'accessory' ? 'top' : 'floor';
    furniture.push({id:`${variant}-${kind}`,theme:variant,index,kind,label:names[variant][index],layer,width:widths[index],x:anchors[index][0],y:anchors[index][1],scale:1,visible:variant===theme,flip:false});
  });
  const mirror = furniture.find(p => p.id === 'pink-accessory')!; mirror.x = 380; mirror.y = 364; mirror.width = 140;
  // Both windows have a different aspect ratio. Curtains remain independent.
  const pinkWindow = furniture.find(p => p.id === 'pink-window')!; pinkWindow.width = 285; pinkWindow.y = 520;
  const pinkCurtain = furniture.find(p => p.id === 'pink-curtain')!; pinkCurtain.width = 495; pinkCurtain.y = 546;
  const roses = furniture.find(p => p.id === 'pink-plant')!; roses.width = 118; roses.x=1065; roses.y=775;
  return {version:1,wall:theme,floor:theme,furniture};
}
export const clamp = (n:number, min:number, max:number) => Math.max(min,Math.min(max,n));
export function restoreRoom(raw: unknown): Room {
  const room=createRoom();
  if(!raw || typeof raw !== 'object' || (raw as Room).version!==1)return room;
  const saved=raw as Partial<Room>;
  if(saved.wall==='warm'||saved.wall==='pink')room.wall=saved.wall;
  if(saved.floor==='warm'||saved.floor==='pink')room.floor=saved.floor;
  if(Array.isArray(saved.furniture))for(const p of room.furniture){
    const s=saved.furniture.find(v=>v&&v.id===p.id);if(!s)continue;
    if(Number.isFinite(s.x))p.x=clamp(s.x,90,1446);
    if(Number.isFinite(s.y))p.y=clamp(s.y,p.layer==='wall'?170:650,p.layer==='wall'?610:984);
    if(Number.isFinite(s.scale))p.scale=clamp(s.scale,.65,1.4);
    if(typeof s.visible==='boolean')p.visible=s.visible;
    if(typeof s.flip==='boolean')p.flip=s.flip;
  }
  return room;
}

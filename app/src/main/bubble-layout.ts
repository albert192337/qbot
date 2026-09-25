interface Rect { x: number; y: number; width: number; height: number }

/** Only exterior available space may contain content, never the actor artwork. */
export function aboveBubbleLayout(pet: Rect, area: Rect, width = 340, height = 500, _overlap = 0) {
  const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(v,max));
  const x=Math.round(clamp(pet.x+(pet.width-width)/2,area.x,area.x+area.width-width));
  const headroom=pet.y-area.y-10;
  if(headroom>=100){const y=Math.round(Math.max(area.y,pet.y-height-10));return {x,y,side:'above' as const,contentHeight:Math.min(height,pet.y-10-y)};}
  const right=pet.x+pet.width+10,left=pet.x-width-10;
  if(right+width<=area.x+area.width||left>=area.x){
    return {x:Math.round(right+width<=area.x+area.width?right:left),y:Math.round(clamp(pet.y,area.y,area.y+area.height-height)),side:'below' as const,contentHeight:Math.min(height,area.height)};
  }
  const y=pet.y+pet.height+10,room=area.y+area.height-y;
  return {x,y:Math.round(room>0?y:area.y),side:'below' as const,contentHeight:Math.max(0,Math.min(height,room))};
}

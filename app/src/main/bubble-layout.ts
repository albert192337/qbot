interface Rect { x: number; y: number; width: number; height: number }

/** Keep visible content close to the actor; the transparent window need not fit in full. */
export function aboveBubbleLayout(pet: Rect, area: Rect, width = 340, height = 500, _overlap = 0) {
  const gap = 6;
  const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(v,max));
  const x=Math.round(clamp(pet.x+(pet.width-width)/2,area.x,area.x+area.width-width));
  const headroom=pet.y-area.y-gap;
  if(headroom>=100){const y=Math.round(Math.max(area.y,pet.y-height-gap));return {x,y,side:'above' as const,contentHeight:Math.min(height,pet.y-gap-y)};}
  const bottom=pet.y+pet.height+gap,footroom=area.y+area.height-bottom;
  if(footroom>=100)return {x,y:Math.round(bottom),side:'below' as const,contentHeight:Math.min(height,footroom)};
  const right=pet.x+pet.width+gap,left=pet.x-width-gap;
  if(right+width<=area.x+area.width||left>=area.x){
    // Clamping the full 500px window to the bottom used to push short bubbles far above the pet.
    const y=Math.round(clamp(pet.y,area.y,area.y+area.height));
    return {x:Math.round(right+width<=area.x+area.width?right:left),y,side:'below' as const,contentHeight:Math.min(height,area.y+area.height-y)};
  }
  if(headroom>footroom&&headroom>0)return {x,y:area.y,side:'above' as const,contentHeight:Math.min(height,headroom)};
  return {x,y:Math.round(footroom>0?bottom:area.y),side:'below' as const,contentHeight:Math.max(0,Math.min(height,footroom))};
}

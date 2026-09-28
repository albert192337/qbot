export type PetHint = { kind: 'wish' | 'interaction' | 'speech'; icon?: string; text: string; title?: string; experience?: import('./experience-progress').ExperienceGain; invitation?:{id:string;expiresAt:number} };
export type PetHintAction = 'open'|'dismiss'|{invitationId:string;accept:boolean};
type Rect = { x: number; y: number; width: number; height: number };
export const HINT_SIZE = {width: 240, height: 112};
import {headProgressWidth} from './head-progress-size';
export const EXPERIENCE_SIZE = {width:180,height:76};
export const experienceHintSize=(actorWidth:number)=>({...EXPERIENCE_SIZE,width:headProgressWidth(actorWidth)});
export function experienceHintPosition(pet:Rect,area:Rect):{x:number;y:number}|null {
  const size=experienceHintSize(pet.width);
  const x=Math.max(area.x,Math.min(pet.x+(pet.width-size.width)/2,area.x+area.width-size.width));
  const y=pet.y-EXPERIENCE_SIZE.height-8;
  return y<area.y||size.width>area.width?null:{x,y};
}
/** Never clamp an exterior hint back across the actor. If no exterior slot fits, suppress it. */
export function exteriorHintPosition(pet: Rect, area: Rect, size = HINT_SIZE): {x:number;y:number}|null {
  const gap=6, clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(v,max));
  const x=clamp(pet.x+(pet.width-size.width)/2,area.x,area.x+area.width-size.width);
  const y=clamp(pet.y+(pet.height-size.height)/2,area.y,area.y+area.height-size.height);
  const candidates=[{x,y:pet.y-size.height-gap},{x,y:pet.y+pet.height+gap},{x:pet.x+pet.width+gap,y},{x:pet.x-size.width-gap,y}];
  return candidates.find(p=>p.x>=area.x&&p.y>=area.y&&p.x+size.width<=area.x+area.width&&p.y+size.height<=area.y+area.height)??null;
}

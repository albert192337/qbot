import {traitSlot,type Produce,type Seed} from './garden';
import {coopRareChance} from './garden-life';
import {geneSlots} from './garden-v3';

export type FriendBreedCommand =
  | {type:'companionGardenRefresh';owner:string}
  | {type:'friendBreedRequest';owner:string;plant:string;parent:string;oil:'normal'|'rich'}
  | {type:'friendBreedAnswer';request:string;accept:boolean}
  | {type:'friendBreedCancel';request:string};
export interface FriendBreedRequest {
  id:string;from:string;to:string;fromName:string;toName:string;
  plant:Produce;parent:Produce;oil:'normal'|'rich';expiresAt:number;
}

/** Each qualified participant receives a seed from the crop they helped reveal. */
export function cultivationSeed(fruit:Produce,participants:number,rng:{id:()=>string;random:()=>number}):Seed {
  const pool=[...new Set(fruit.traits.filter(t=>traitSlot(t)!=='size'))];
  const genes=pool.length&&rng.random()<coopRareChance(participants)
    ? [pool[Math.min(pool.length-1,Math.floor(rng.random()*pool.length))]] : [];
  return {id:rng.id(),species:fruit.species,genes,slots:geneSlots(genes),bred:false};
}

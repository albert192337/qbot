/** Account unlocks: one item can be assigned to exactly one own character. */
export const APPEARANCES = [
  {id:'eclipse-portal',name:'月蚀之门',slot:'entrance',tier:'epic',price:9000,duplicateTokens:60,description:'银紫裂隙展开，角色从暗处显现。'},
  {id:'petal-steps',name:'步生花',slot:'footsteps',tier:'rare',price:4000,duplicateTokens:30,description:'随左右脚落地，留下少量轻盈花瓣。'},
] as const;
export type AppearanceId=typeof APPEARANCES[number]['id'];
export interface AppearanceInventory {owned:Partial<Record<AppearanceId,true>>;equipped:Partial<Record<AppearanceId,string>>}
export function appearance(id:string){return APPEARANCES.find(a=>a.id===id);}
export function equippedAppearance(inventory:AppearanceInventory|undefined,actor:string|undefined,id:AppearanceId){return !!actor&&inventory?.owned[id]===true&&inventory.equipped[id]===actor;}

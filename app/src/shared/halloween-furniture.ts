/** Stable inventory IDs shared by the capsule service and the 3D room. */
export const HALLOWEEN_FURNITURE = [
  {id:'halloween-candles',name:'幽夜烛台',tier:'common',weight:3},
  {id:'halloween-books',name:'女巫书堆',tier:'common',weight:2},
  {id:'halloween-lantern',name:'南瓜囚灯',tier:'rare',weight:6},
  {id:'halloween-pumpkins',name:'笑脸南瓜堆',tier:'rare',weight:4},
  {id:'halloween-fireplace',name:'万圣壁炉',tier:'epic',weight:10},
  {id:'halloween-chandelier',name:'古堡烛光吊灯',tier:'epic',weight:10},
  {id:'halloween-cauldron',name:'女巫魔药锅',tier:'epic',weight:10},
] as const;

export function validateFurniture3dInventory(layout: {asset:string}[], inventory:Record<string,number>) {
  for(const item of HALLOWEEN_FURNITURE) {
    const count=layout.filter(p=>p.asset===item.id).length;
    if(count>Math.max(0,Math.floor(inventory[item.id]??0)))throw new Error(`${item.name}数量不足，请先从扭蛋机收集`);
  }
}

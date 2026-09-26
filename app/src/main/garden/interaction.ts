import { MAX_GARDEN_PLOTS } from '../../shared/garden-progression';
import { gardenLane, gardenSide } from '../../shared/garden-layout';
/** 与桌面土地共用七个固定槽位，未解锁空地不展示。 */
export function plotPetPosition(plot: number, pet: {x:number;y:number;width:number;height:number}, strip: {x:number;y:number;width:number}, area: {x:number;y:number;width:number;height:number}, farm?: {left:number;baseline:number}) {
  const left = pet.x - strip.x, right = left + pet.width;
  const side = gardenSide(pet, area), lane = farm ? {left:farm.left,width:455} : gardenLane(left, right, strip.width, side);
  const cell = (lane.width - 7 * (MAX_GARDEN_PLOTS - 1)) / MAX_GARDEN_PLOTS;
  const center = strip.x + lane.left + plot * (cell + 7) + cell / 2;
  const x = center + (side === 'left' ? 45 : -45) - pet.width / 2;
  return { x: Math.round(Math.max(area.x, Math.min(x, area.x + area.width - pet.width))), y: farm ? Math.round(Math.max(area.y,Math.min(strip.y+farm.baseline-pet.height+25,area.y+area.height-pet.height))) : pet.y };
}

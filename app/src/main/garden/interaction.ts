import { gardenLane, gardenSide } from '../../shared/garden-layout';
/** 与单侧六格土地使用同一布局。 */
export function plotPetPosition(plot: number, pet: {x:number;y:number;width:number;height:number}, strip: {x:number;y:number;width:number}, area: {x:number;y:number;width:number;height:number}) {
  const left = pet.x - strip.x, right = left + pet.width;
  const side = gardenSide(pet, area), lane = gardenLane(left, right, strip.width, side);
  const cell = (lane.width - 35) / 6;
  const center = strip.x + lane.left + plot * (cell + 7) + cell / 2;
  const x = center + (side === 'left' ? 45 : -45) - pet.width / 2;
  return { x: Math.round(Math.max(area.x, Math.min(x, area.x + area.width - pet.width))), y: pet.y };
}

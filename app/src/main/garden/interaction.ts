/** Mirrors the strip's soil grid, in screen DIP. Stand inward of the selected crop. */
export function plotPetPosition(plot: number, pet: {x:number;y:number;width:number;height:number}, strip: {x:number;y:number;width:number}, area: {x:number;y:number;width:number;height:number}) {
  const left = pet.x - strip.x, right = left + pet.width;
  const start = plot < 3 ? 15 : right + 10;
  const width = plot < 3 ? left - 25 : strip.width - right - 25;
  const cell = (width - 14) / 3;
  const center = strip.x + start + (plot % 3) * (cell + 7) + cell / 2;
  const x = center + (plot < 3 ? 65 : -65) - pet.width / 2;
  return { x: Math.round(Math.max(area.x, Math.min(x, area.x + area.width - pet.width))), y: pet.y };
}

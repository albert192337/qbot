export function gardenSide(pet: { x: number; width: number }, area: { x: number; width: number }): 'left' | 'right' {
  return pet.x - area.x >= area.x + area.width - pet.x - pet.width ? 'left' : 'right';
}
/** 六块地排在同一侧，最外侧单独留工具列，不与植物共用空间。 */
export function gardenLane(left: number, right: number, width: number, side: 'left' | 'right') {
  const start = side === 'left' ? 64 : right + 20;
  const end = side === 'left' ? left - 20 : width - 64;
  return { left: start, width: Math.max(60, end - start), toolsLeft: side === 'left' ? 12 : width - 48 };
}

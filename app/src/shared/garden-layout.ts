export function gardenSide(pet: { x: number; width: number }, area: { x: number; width: number }): 'left' | 'right' {
  return pet.x - area.x >= area.x + area.width - pet.x - pet.width ? 'left' : 'right';
}
/** 土地排在同一侧，最外侧单独留工具列，不与植物共用空间。 */
export function gardenLane(left: number, right: number, width: number, side: 'left' | 'right') {
  const laneWidth = 455;
  const desired = side === 'left' ? left - 20 - laneWidth : right + 20;
  const start = Math.max(54, Math.min(desired, width - laneWidth - 54));
  return { left: start, width: laneWidth, toolsLeft: side === 'left' ? start - 48 : start + laneWidth + 12 };
}

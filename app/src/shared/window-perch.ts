export interface PerchState { action: string; title: string; capturedAt?: number; }
export interface PerchRect { x: number; y: number; width: number; height: number }
/** Contact line within the normalized square animation canvas. */
export function perchAnchor(action: string, calibrated?: number): number {
  return typeof calibrated === 'number' && Number.isFinite(calibrated) && calibrated > 0 && calibrated <= 1
    ? calibrated : action === 'perch' ? 0.86 : action === 'perch_sit' ? 0.61 : 0.81;
}
export function perchPosition(target: PerchRect, pet: PerchRect, area: PerchRect, fraction: number, anchor: number): { x: number; y: number } | null {
  if (target.width < 120 || target.height < 80) return null;
  const y = Math.round(target.y - pet.height * anchor);
  if (y < area.y || y + pet.height > area.y + area.height) return null;
  const center = target.x + Math.max(0, Math.min(1, fraction)) * target.width;
  return { x: Math.round(Math.max(area.x, Math.min(center - pet.width / 2, area.x + area.width - pet.width))), y };
}

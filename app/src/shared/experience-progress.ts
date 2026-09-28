import { CHARACTER_XP, characterLevel } from './garden-life';

export type ExperienceGain = { actor: string; from: number; to: number };
export function experienceProgress(xp: number) {
  const level = Math.max(1, characterLevel(xp));
  const start = CHARACTER_XP[level - 1], end = CHARACTER_XP[level];
  return { level, fraction: end === undefined ? 1 : Math.max(0, Math.min(1, (xp - start) / (end - start))), max: end === undefined };
}

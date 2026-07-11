/**
 * 气泡文案挑选：scene 过滤 → weight 加权随机 → 不与上一句连续重复。
 * 纯函数（rng 注入），vitest 可单测。
 */

export type Mood = 'happy' | 'sleepy' | 'neutral' | 'curious' | 'annoyed';

export interface Utterance {
  id: string;
  text: string;
  mood: Mood;
  scenes: string[];
  weight: number;
}

export interface PickerRng {
  /** [0,1) */
  random(): number;
}

export function pickUtterance(
  all: Utterance[],
  scene: string,
  rng: PickerRng,
  lastId?: string,
): Utterance | null {
  let pool = all.filter((u) => u.scenes.includes(scene));
  if (pool.length > 1 && lastId) pool = pool.filter((u) => u.id !== lastId);
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, u) => sum + Math.max(0, u.weight || 1), 0);
  let roll = rng.random() * total;
  for (const u of pool) {
    roll -= Math.max(0, u.weight || 1);
    if (roll < 0) return u;
  }
  return pool[pool.length - 1]; // 浮点边界兜底
}

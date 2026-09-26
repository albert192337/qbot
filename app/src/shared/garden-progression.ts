import type { GardenState, Produce } from './garden';
import { characterLevel, currentGrowth, wishMatches } from './garden-life';

export const MAX_GARDEN_PLOTS = 7;
export const plotsAtLevel = (level: number): number => Math.min(7, Math.max(3, level + 2));
export const unlockedPlots = (state: GardenState): number => plotsAtLevel(characterLevel(currentGrowth(state)?.xp ?? 0));
// Changing characters never deletes crops. Occupied locked plots can finish all harvests.
export const visiblePlot = (state: GardenState, index: number): boolean => index < unlockedPlots(state) || !!state.plots[index];
export const emptyPlots = (state: GardenState): number => state.plots.filter((p, i) => !p && i < unlockedPlots(state)).length;
export function feedingWish(state: GardenState, fruit: Produce) {
  if (state.life?.pending?.target === fruit.id || (state.v3?.appraisals[fruit.id] && !state.v3.appraisals[fruit.id].done)) return undefined;
  return currentGrowth(state)?.wishes.filter(w => wishMatches(w, fruit)).sort((a, b) => b.xp - a.xp)[0];
}
export const FRUIT_DRAG_TYPE = 'application/x-qbot-garden-fruit';

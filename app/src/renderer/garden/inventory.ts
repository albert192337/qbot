import type { Seed } from '../../shared/garden';

/** Equivalent seeds share a row, but inherited genes and parentage stay distinct. */
export function groupSeeds(seeds: Seed[]): { seed: Seed; count: number }[] {
  const groups = new Map<string, { seed: Seed; count: number }>();
  for (const seed of seeds) {
    const key = JSON.stringify([seed.species, seed.bred, [...seed.genes].sort(), seed.parents ? [...seed.parents].sort() : []]);
    const group = groups.get(key);
    if (group) group.count++;
    else groups.set(key, { seed, count: 1 });
  }
  return [...groups.values()];
}

import { SPECIES, TRAITS, tier, type Produce } from '../../shared/garden';

/** 只挑值得庆祝的收获，不记录每次点击或普通种植。 */
export function harvestHighlight(p: Produce): string | null {
  const quality = tier(p.traits);
  if (quality !== 'gold' && quality !== 'rainbow') return null;
  return `用户收获了${quality === 'gold' ? '金色品质' : '彩色传奇品质'}的${SPECIES[p.species].name}（${p.traits.map(t => TRAITS[t].name).join('、')}，${p.kg.toFixed(3)} kg）`;
}

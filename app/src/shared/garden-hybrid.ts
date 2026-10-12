import { growth, needsReveal, SPECIES, type GardenState, type Trait, type Species } from './garden';
import { visiblePlot } from './garden-progression';
import { DYE_COLORS } from './garden-life';

export type GardenRenderMode = '2d' | '3d' | 'hybrid';
export interface HybridPlant {
  index: number; id?: string; species?: Species;
  stage: 'empty' | 'sprout' | 'young' | 'ripe' | 'hidden';
  ratio: number; traits: Trait[]; dyeHue?: number; label: string;
}
/** Only public, currently visible appearance reaches the scene. */
export function hybridPlants(state: GardenState, now = Date.now()): HybridPlant[] {
  return state.plots.flatMap<HybridPlant>((p,index) => {
    if (!state.cultivationVisit && !visiblePlot(state,index)) return [];
    if (!p) return [{index,stage:'empty' as const,ratio:0,traits:[],label:`${index+1}号土地 种植`}];
    const ratio=growth(p,now), hidden=needsReveal(p), ripe=p.readyAt<=now;
    const stage=hidden&&(ripe||ratio>=.55)?'hidden':ripe?'ripe':ratio<.22&&!p.harvestIndex?'sprout':'young';
    return [{index,id:p.id,species:stage==='hidden'?undefined:p.species,stage,ratio:Math.round(ratio*20)/20,
      traits:ripe&&!hidden?[...p.traits]:[],dyeHue:ripe&&!hidden&&p.dye?DYE_COLORS[p.dye]?.hue:undefined,
      label:`${index+1}号土地 ${stage==='hidden'?'待培育':SPECIES[p.species].name}`}];
  });
}
export function hybridClick(state: GardenState, index: number, twice: boolean, now=Date.now()): 'none'|'shake'|'open'|'harvest' {
  if (!Number.isInteger(index)||index<0||index>=state.plots.length||state.cultivationVisit||!visiblePlot(state,index)) return 'none';
  const p=state.plots[index];
  if (!p) return 'open';
  if (!twice) return 'shake';
  return p.readyAt<=now&&!needsReveal(p)&&!p.keep?'harvest':'open';
}

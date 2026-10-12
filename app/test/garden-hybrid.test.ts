import { describe,it,expect } from 'vitest';
import { hybridPlants,hybridClick } from '../src/shared/garden-hybrid';
import { initialGarden } from '../src/main/garden/rules';
import type { Plant,Species } from '../src/shared/garden';
const now=2_000_000_000_000;
function plant(species:Species='strawberry',extra:Partial<Plant>={}):Plant{return{id:'crop',species,traits:['purple','giant'],bred:false,kg:1,value:5,plantedAt:now-10000,readyAt:now-1,fertilizers:[],revealed:true,...extra};}
function garden(){return initialGarden(now,{random:()=>.9,id:()=>Math.random().toString()});}
describe('hybrid garden production state',()=>{
 it('renders existing crops without modifying state or inventing plots',()=>{const s=garden();s.plots=[plant('lotus'),null,plant('apple'),null,null,null,plant('carrot')];const before=structuredClone(s),shown=hybridPlants(s,now);expect(shown.map(p=>p.index)).toEqual([0,1,2,6]);expect(shown[0].species).toBe('lotus');expect(s).toEqual(before);});
 it('withholds unrevealed species, factors and dye from mystery appearances',()=>{const s=garden();s.plots[0]=plant('pineapple',{growthVersion:3,revealed:false,traits:['rainbow'],publicQuality:'rainbow',dye:'lilac'});const p=hybridPlants(s,now)[0];expect(p).toMatchObject({stage:'hidden',species:undefined,traits:[],dyeHue:undefined});expect(JSON.stringify(p)).not.toContain('pineapple');expect(hybridClick(s,0,true,now)).toBe('open');});
 it('checks maturity, preservation, visitor ownership and unlocked cells before harvesting',()=>{const s=garden();s.plots[0]=plant();expect(hybridClick(s,0,false,now)).toBe('shake');expect(hybridClick(s,0,true,now)).toBe('harvest');s.plots[0]!.keep=true;expect(hybridClick(s,0,true,now)).toBe('open');s.plots[0]=plant('lotus',{readyAt:now+5000});expect(hybridClick(s,0,true,now)).toBe('open');expect(hybridClick(s,1,false,now)).toBe('open');expect(hybridClick(s,6,true,now)).toBe('none');expect(hybridClick(s,-1,true,now)).toBe('none');s.cultivationVisit={owner:'friend',plot:0};expect(hybridClick(s,0,true,now)).toBe('none');});
 it('shows sprouts and young plants without premature mutations',()=>{const s=garden();s.plots[0]=plant('apple',{plantedAt:now,readyAt:now+10000,dye:'lilac'});expect(hybridPlants(s,now)[0]).toMatchObject({stage:'sprout',traits:[],dyeHue:undefined});expect(hybridPlants(s,now+5000)[0].stage).toBe('young');expect(hybridPlants(s,now+10001)[0]).toMatchObject({stage:'ripe',traits:['purple','giant'],dyeHue:260});});
});

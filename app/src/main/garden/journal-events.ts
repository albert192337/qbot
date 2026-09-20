import { SPECIES, FERTILIZERS, type GardenCommand, type GardenState, type GardenReveal } from '../../shared/garden';
export function gardenJournalSummary(before:GardenState,after:GardenState,command:GardenCommand,reveal?:GardenReveal):string|undefined {
  if(command.type==='plant'||command.type==='plantMany'){
    const plants=after.plots.filter((p,i)=>p&&!before.plots[i]);
    if(plants.length)return '种下了'+plants.map(p=>SPECIES[p!.species].name).join('、');
  }
  if(command.type==='harvest'||command.type==='harvestMany'){
    const items=reveal?.harvests??(reveal?.produce?[reveal.produce]:[]);
    if(items.length)return '收获了'+items.map(p=>SPECIES[p.species].name).join('、');
  }
  if(command.type==='sell'||command.type==='sellMany'){
    const sold=before.produce.filter(p=>!after.produce.some(a=>a.id===p.id));
    if(sold.length)return '出售了'+sold.map(p=>SPECIES[p.species].name).join('、');
  }
  if(command.type==='fertilize')return '为'+SPECIES[before.plots[command.plot]!.species].name+'使用了'+FERTILIZERS[command.fertilizer].name;
  return;
}

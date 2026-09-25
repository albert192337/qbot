import {fruitQuality,needsReveal,type Plant,type GardenState} from './garden';

/** Outbound projection only. Never persist this view over the authoritative crop. */
export function publicGardenPlant(plant:Plant):Plant {
 const p=structuredClone(plant);
 if(p.batch)p.batch.seed=0;
 if(plant.growthVersion===3)p.publicQuality=fruitQuality(plant.traits,plant) as Plant['publicQuality'];
 if(!needsReveal(plant))return p;
 p.publicQuality=fruitQuality(plant.traits,plant) as Plant['publicQuality'];
 p.traits=[];p.kg=0;p.value=0;
 delete p.slots;delete p.baseTraits;delete p.lineage;delete p.dye;
 if(p.batch){p.batch.candidates=[];p.batch.slots=[null,null,null,null];delete p.batch.massGene;}
 return p;
}
export function publicGardenState(state:GardenState):GardenState {
 const s=structuredClone(state),hidden=new Set(state.plots.filter(p=>p&&needsReveal(p)).map(p=>p!.id));
 s.plots=s.plots.map(p=>p?publicGardenPlant(p):null);
 if(s.v3){
  for(const a of Object.values(s.v3.appraisals))a.board=[];
  for(const r of s.v3.records)if(r.plant&&hidden.has(r.plant)&&['settlement','choose','rainbowPity'].includes(r.kind))r.message='发现神秘果实 · ？ ？ ？ · 培育后揭晓';
 }
 return s;
}

import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {GardenState} from '../src/shared/garden';
import {initialTravel,localDay} from '../src/shared/travel';
const m=vi.hoisted(()=>({dir:'',online:false,remote:{} as GardenState,send:vi.fn()}));
vi.mock('electron',()=>({app:{getPath:()=>m.dir},BrowserWindow:{getAllWindows:()=>[]}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:'host',gardenOnline:m.online})}));
vi.mock('../src/main/garden/network',()=>({networkGarden:async()=>structuredClone(m.remote),networkAction:m.send}));
beforeEach(async()=>{vi.resetModules();m.dir=await mkdtemp(path.join(os.tmpdir(),'qbot-local-moments-'));m.online=false;vi.clearAllMocks();});
afterEach(async()=>{expect(path.dirname(m.dir)).toBe(os.tmpdir());await rm(m.dir,{recursive:true,force:true});});
it('keeps local cards and likes across online views and restart without changing server assets or publishing a card',async()=>{
 let api=await import('../src/main/garden/service');
 m.remote=structuredClone(await api.getGarden());m.remote.coins=7654;
 const now=Date.now();
 await api.updateGardenJournal(s=>{s.travel=initialTravel(now);s.travel.moments=[{id:'local-moment',actor:'host',at:now,day:localDay(now),name:'小青',text:'今天一起种花。',liked:false}];});
 m.online=true;
 expect((await api.getGarden()).travel?.moments).toHaveLength(1);
 const liked=await api.gardenAction({type:'travelMomentLike',id:'local-moment'});
 expect(liked.ok).toBe(true);
 if(liked.ok){expect(liked.state.coins).toBe(7654);expect(liked.state.travel?.moments?.[0].liked).toBe(true);}
 expect(m.remote.travel?.moments??[]).toHaveLength(0);expect(m.send).not.toHaveBeenCalled();
 vi.resetModules();api=await import('../src/main/garden/service');
 expect((await api.getGarden()).travel?.moments?.[0].liked).toBe(true);
 m.online=false;const offline=await api.getGarden();expect(offline.coins).not.toBe(7654);expect(offline.travel?.moments).toHaveLength(1);
});

import { createHybridScene } from '../garden/hybrid-scene.js';
import { hybridPlants,hybridClick } from '../../shared/garden-hybrid';
import type { GardenState } from '../../shared/garden';
const api=window.qbot.garden,element=document.querySelector<HTMLElement>('#garden')!;
window.addEventListener('error',e=>api.desktopFailed(e.message||'草地渲染失败'));
window.addEventListener('unhandledrejection',e=>api.desktopFailed(String(e.reason)));
let state:GardenState|undefined,busy=false,fetching=false,closed=false,revision=0,lastPlacement='';
const scene=createHybridScene(element,p=>{const key=JSON.stringify(p);if(key!==lastPlacement){lastPlacement=key;api.scenePlacement(p);}},message=>api.desktopFailed(message));
async function refresh(){if(fetching||closed||busy)return;fetching=true;const version=revision;try{const next=await api.get();if(closed||version!==revision)return;state=next;await scene.update(hybridPlants(visiting?{...next,plots:visiting.plots}:next));}catch(e){api.desktopFailed(String(e));}finally{fetching=false;}}
let visiting:import('../../shared/garden-life').GardenVisit|null=null;
const removeVisit=api.onVisit(v=>{visiting=v;seed=null;void refresh();});
let seed:string|null=null;const removeSeed=api.onSeed(value=>{seed=value;});
const removePointer=api.onDesktopPointer(async p=>{
 if(closed||busy||!state)return;const index=scene.pick(p.x,p.y);if(index===null)return;
 if(visiting){api.focusPlot(index);return;}
 if(seed&&!state.plots[index]){const chosen=seed;seed=null;api.selectSeed(null);busy=true;try{await api.act({type:'plant',plot:index,seed:chosen});}finally{busy=false;void refresh();}return;}
 const action=hybridClick(state,index,p.double);if(action==='none')return;if(action==='shake'){scene.shake(index);return;}
 if(action==='open'){api.open(`plot:${index}`);return;}
 const expected=state.plots[index]?.id;busy=true;const version=++revision;
 try{const fresh=await api.get();if(closed||version!==revision)return;state=fresh;if(expected!==fresh.plots[index]?.id||hybridClick(fresh,index,true)!=='harvest'){await scene.update(hybridPlants(fresh));return;}
  const result=await api.act({type:'harvest',plot:index});if(closed)return;
  if(result.ok){state=result.state;await scene.update(hybridPlants(result.state));}else api.open(`plot:${index}`);
 }catch{if(!closed)api.open(`plot:${index}`);}finally{busy=false;}
});
const removeChanged=api.onChanged(()=>void refresh());
const removeActor=window.qbot.characters.onActivated(()=>{revision++;state=undefined;void refresh();});
// The offscreen document may be hidden; its lifetime is owned by desktop-layer.ts.
const timer=setInterval(()=>void refresh(),2500);void refresh();
window.addEventListener('pagehide',()=>{closed=true;revision++;clearInterval(timer);removePointer();removeVisit();removeSeed();removeChanged();removeActor();scene.dispose();},{once:true});

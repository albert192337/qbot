import {currentGrowth,FOOD_ICONS,wishLabel,characterLevel} from '../../shared/garden-life';
import {TRAITS} from '../../shared/garden';
import './food-wish.css';

/** A quiet, clickable wish. No mutation happens until explicit submission in the garden. */
export function mountFoodWish():()=>void{
  const root=document.createElement('div');root.id='food-wish';root.hidden=true;
  const open=document.createElement('button');open.className='food-wish-open';
  const close=document.createElement('button');close.className='food-wish-close';close.textContent='×';close.setAttribute('aria-label','收起食物心愿');
  root.append(open,close);document.body.append(root);let disposed=false,version=0,hiddenKey='',currentKey='',effectActive=false;
  const published=new Map<string,boolean>();
  const publish=(kind:'wish'|'interaction'|'speech',active:boolean)=>{if(published.get(kind)===active)return;published.set(kind,active);window.qbot.overlays.report(kind,active);};
  const syncPriority=()=>{
    if(disposed)return;
    const visible=(node:HTMLElement)=>!document.hidden&&!node.hidden&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';
    publish('wish',visible(root));publish('interaction',visible(effect));
    publish('speech',!document.hidden&&!!document.querySelector('#bubble.show'));
  };
  const overlayOff=window.qbot.overlays.onChanged(s=>{document.body.dataset.headOverlay=s.winner??'';});
  root.onpointerdown=e=>e.stopPropagation();open.onclick=()=>window.qbot.garden.open('feeding');close.onclick=()=>{hiddenKey=currentKey;root.hidden=true;syncPriority();};
  const refresh=async()=>{const request=++version;try{const s=await window.qbot.garden.get();if(disposed||request!==version)return;const c=currentGrowth(s),w=c?.wishes.find(w=>!w.done);currentKey=`${s.activeActor}:${w?.id}`;
    root.hidden=effectActive||!w||currentKey===hiddenKey;if(w&&c){open.replaceChildren();const icon=document.createElement('span');icon.textContent=FOOD_ICONS[w.species];const hint=document.createElement('small');hint.textContent=w.traits.length?w.traits.map(t=>TRAITS[t].name).join('＋'):'想吃这个';open.append(icon,hint);open.title=`Lv.${characterLevel(c.xp)} · 想吃 ${wishLabel(w)} · 点击投喂`;open.setAttribute('aria-label',open.title);}
  }catch{root.hidden=true;}finally{syncPriority();}};
  const off=window.qbot.garden.onChanged(()=>void refresh());const settingsOff=window.qbot.settings.onChanged(()=>void refresh());
  let effectTimer:ReturnType<typeof setTimeout>|undefined;
  const effect=document.createElement('div');effect.id='network-interaction';effect.hidden=true;document.body.append(effect);
  const interactionOff=window.qbot.garden.onInteraction(e=>{clearTimeout(effectTimer);effectActive=true;effect.replaceChildren();effect.dataset.kind=e.kind;const prop=document.createElement('span');prop.textContent=e.kind==='feed'?e.effect:({flower:'🌷',photo:'📷 ✨',celebrate:'🎉',heart:'♥',tea:'☕',wave:'✦'} as Record<string,string>)[e.effect]??'💬';const caption=document.createElement('small');caption.textContent=e.caption;effect.append(prop,caption);effect.hidden=false;root.hidden=true;syncPriority();effectTimer=setTimeout(()=>{effectActive=false;effect.hidden=true;void refresh();},4500);});
  const observer=new MutationObserver(()=>syncPriority());observer.observe(document.body,{attributes:true,attributeFilter:['class','hidden','style'],subtree:true});
  document.addEventListener('visibilitychange',syncPriority);
  const timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);void refresh();
  return ()=>{disposed=true;version++;observer.disconnect();document.removeEventListener('visibilitychange',syncPriority);overlayOff();for(const kind of ['wish','interaction','speech'] as const)window.qbot.overlays.report(kind,false);off();settingsOff();interactionOff();clearTimeout(effectTimer);clearInterval(timer);root.remove();effect.remove();};
}

import {currentGrowth,FOOD_ICONS,wishLabel,characterLevel} from '../../shared/garden-life';
import {TRAITS} from '../../shared/garden';
import './food-wish.css';
import {canRemind,recordReminder,reminderDay,type WishReminder} from '../../shared/wish-reminder';
import type {ContactSnapshot} from '../../shared/social';
import type {PetHint} from '../../shared/pet-hint';

/** A quiet, clickable wish. No mutation happens until explicit submission in the garden. */
export function mountFoodWish():()=>void{
  const quiet=()=>document.body.classList.contains('desktop-hidden')||!!document.body.dataset.peek;
  const root=document.createElement('div');root.id='food-wish';root.hidden=true;root.inert=true;
  const open=document.createElement('button');open.className='food-wish-open';
  const close=document.createElement('button');close.className='food-wish-close';close.textContent='×';close.setAttribute('aria-label','收起食物心愿');
  root.append(open,close);document.body.append(root);let disposed=false,version=0,hiddenKey='',currentKey='',effectActive=false;
  let actor='',until=0,wishTimer:ReturnType<typeof setTimeout>|undefined,lastHint='';
  const records:Record<string,WishReminder>=(()=>{try{return JSON.parse(localStorage.getItem('qbot-wish-reminders-v1')??'{}')??{};}catch{return {};}})();
  const save=()=>{try{localStorage.setItem('qbot-wish-reminders-v1',JSON.stringify(records));}catch{/* session cap still applies */}};
  const published=new Map<string,boolean>();
  let invitations:ContactSnapshot['invitations']=[],contactRevision=0,answering=false;
  const answered=new Set<string>();
  const invitation=()=>!quiet()&&!document.hidden&&!document.body.classList.contains('pair-mode')&&!document.body.classList.contains('garden-performing')?invitations.find(i=>i.pair&&i.expiresAt>Date.now()&&!answered.has(i.id)):undefined;
  const publish=(kind:'wish'|'interaction'|'speech',active:boolean)=>{if(published.get(kind)===active)return;published.set(kind,active);window.qbot.overlays.report(kind,active);};
  const syncPriority=()=>{
    if(disposed)return;
    const visible=(node:HTMLElement)=>!quiet()&&!document.hidden&&!node.hidden&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';
    const invite=invitation();
    publish('wish',!invite&&visible(root));publish('interaction',!!invite||visible(effect));
    const node=visible(effect)?effect:visible(root)?open:null;
    const hint:PetHint|null=invite?{kind:'interaction',icon:'✉',text:`${invite.nickname} 邀请你${invite.pair!.label}`,invitation:{id:invite.id,expiresAt:invite.expiresAt}}:node?{kind:node===effect?'interaction':'wish',icon:node.querySelector('span')?.textContent??'',text:node.querySelector('small')?.textContent??'',title:node.title}:null;
    const key=JSON.stringify(hint);if(key!==lastHint){lastHint=key;window.qbot.overlays.hint(hint);}
    publish('speech',!quiet()&&!document.hidden&&!!document.querySelector('#bubble.show'));
  };
  const overlayOff=window.qbot.overlays.onChanged(s=>{document.body.dataset.headOverlay=s.winner??'';});
  root.onpointerdown=e=>e.stopPropagation();open.onclick=()=>window.qbot.garden.open('feeding');close.onclick=()=>{hiddenKey=currentKey;until=0;root.hidden=true;if(actor){records[actor]={...(records[actor]??recordReminder(undefined,Date.now())),day:reminderDay(Date.now()),dismissed:true};save();}syncPriority();};
  const hintOff=window.qbot.overlays.onHintAction(action=>{
    if(typeof action==='string'){if(action==='dismiss')close.click();else {open.click();close.click();}return;}
    const invite=invitation();if(answering||!invite||invite.id!==action.invitationId)return;
    answering=true;answered.add(invite.id);syncPriority();
    void window.qbot.garden.answerInteraction(invite.id,action.accept,invite.pair?.kind==='relay'?'happy':undefined).catch(error=>{
      answered.delete(invite.id);
      const current=invitations.find(i=>i.id===invite.id);if(current)current.pair={...current.pair!,label:`（${String(error).replace(/^.*Error: /,'').slice(0,65)}，可重试）`};
    }).finally(()=>{answering=false;syncPriority();});
  });
  const refresh=async()=>{const request=++version;try{const s=await window.qbot.garden.get();if(disposed||request!==version)return;const c=currentGrowth(s),w=c?.wishes.find(w=>!w.done);currentKey=`${s.activeActor}:${w?.id}`;
    if(actor!==s.activeActor){actor=s.activeActor??'';until=0;hiddenKey='';}
    const now=Date.now(),blocked=quiet()||document.hidden||document.body.classList.contains('pair-mode')||document.body.classList.contains('garden-performing');
    if(!w||blocked)until=0;
    if(w&&actor&&!blocked&&!effectActive&&until<=now&&canRemind(records[actor],now)){
      records[actor]=recordReminder(records[actor],now);save();until=now+8000;hiddenKey='';clearTimeout(wishTimer);
      wishTimer=setTimeout(()=>{until=0;root.hidden=true;syncPriority();},8000);
    }
    root.hidden=blocked||effectActive||!w||until<=now||currentKey===hiddenKey;if(w&&c){open.replaceChildren();const icon=document.createElement('span');icon.textContent=FOOD_ICONS[w.species];const hint=document.createElement('small');hint.textContent=w.traits.length?w.traits.map(t=>TRAITS[t].name).join('＋'):'想吃这个';open.append(icon,hint);open.title=`Lv.${characterLevel(c.xp)} · 想吃 ${wishLabel(w)} · 点击投喂`;open.setAttribute('aria-label',open.title);}
  }catch{root.hidden=true;}finally{syncPriority();}};
  const off=window.qbot.garden.onChanged(()=>void refresh());const settingsOff=window.qbot.settings.onChanged(()=>void refresh());
  let effectTimer:ReturnType<typeof setTimeout>|undefined;
  const effect=document.createElement('div');effect.id='network-interaction';effect.hidden=true;document.body.append(effect);
  const contactsOff=window.qbot.social.onContacts(snapshot=>{contactRevision++;invitations=snapshot.available?snapshot.invitations:[];syncPriority();});
  const initialRevision=contactRevision;
  void window.qbot.social.contacts(false).then(snapshot=>{if(!disposed&&contactRevision===initialRevision){invitations=snapshot.available?snapshot.invitations:[];syncPriority();}}).catch(()=>{});
  const invitationTimer=setInterval(syncPriority,500);
  const interactionOff=window.qbot.garden.onInteraction(e=>{if(quiet())return;clearTimeout(effectTimer);effectActive=true;effect.replaceChildren();effect.dataset.kind=e.kind;const prop=document.createElement('span');prop.textContent=e.kind==='feed'?e.effect:({flower:'🌷',photo:'📷 ✨',celebrate:'🎉',heart:'♥',tea:'☕',wave:'✦'} as Record<string,string>)[e.effect]??'💬';const caption=document.createElement('small');caption.textContent=e.caption;effect.append(prop,caption);effect.hidden=false;root.hidden=true;syncPriority();effectTimer=setTimeout(()=>{effectActive=false;effect.hidden=true;void refresh();},4500);});
  const observer=new MutationObserver(()=>{if(quiet()){until=0;if(!root.hidden)root.hidden=true;if(effectActive){clearTimeout(effectTimer);effectActive=false;effect.hidden=true;}}syncPriority();});observer.observe(document.body,{attributes:true,attributeFilter:['class','hidden','style','data-peek'],subtree:true});
  const visibility=()=>{if(document.hidden){until=0;root.hidden=true;syncPriority();}else void refresh();};
  document.addEventListener('visibilitychange',visibility);
  const timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);void refresh();
  return ()=>{disposed=true;version++;contactsOff();clearInterval(invitationTimer);observer.disconnect();document.removeEventListener('visibilitychange',visibility);overlayOff();hintOff();window.qbot.overlays.hint(null);for(const kind of ['wish','interaction','speech'] as const)window.qbot.overlays.report(kind,false);off();settingsOff();interactionOff();clearTimeout(effectTimer);clearTimeout(wishTimer);clearInterval(timer);root.remove();effect.remove();};
}

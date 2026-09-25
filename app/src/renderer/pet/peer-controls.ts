import { GARDEN_ICON, HEART_ICON } from './toolbar-icons';
import { EYE_ICON } from './desktop-visibility';
import './peer-controls.css';
const icons:Record<string,string>={heart:'♥',tea:'☕',chat:'☏',wave:'👋',flower:'🌷',photo:'📷',relay:'🎭',celebrate:'🎉'};
export function mountPeerControls(stage:HTMLElement,owner:()=>string|undefined) {
  const root=document.createElement('div');root.className='peer-controls';root.hidden=true;
  const row=document.createElement('div');row.className='peer-control-row';
  const wheel=document.createElement('div');wheel.className='peer-wheel';wheel.hidden=true;wheel.setAttribute('role','group');wheel.setAttribute('aria-label','选择互动');
  const feedback=document.createElement('div');feedback.className='peer-feedback';feedback.hidden=true;feedback.setAttribute('role','status');
  root.append(wheel,row,feedback);document.body.append(root);
  let timer:ReturnType<typeof setTimeout>|undefined,busy=false,version=0,loading=false;
  const close=()=>{clearTimeout(timer);version++;loading=false;root.hidden=!document.body.classList.contains('member-hidden');wheel.hidden=true;feedback.hidden=true;interaction.setAttribute('aria-expanded','false');interaction.removeAttribute('aria-busy');};
  const show=()=>{clearTimeout(timer);if(document.body.classList.contains('desktop-hidden')||document.body.dataset.peek)return;if(root.hidden){root.hidden=false;window.qbot.desktop.openPeerControls();}};
  const button=(name:string,icon:string)=>{const b=document.createElement('button');b.className='hud-chat';b.title=name;b.setAttribute('aria-label',name);b.innerHTML=icon;row.append(b);return b;};
  const garden=button('查看房友的花园',GARDEN_ICON);garden.onclick=()=>{const id=owner();if(id)window.qbot.garden.open('visit:'+id);};
  const interaction=button('互动',HEART_ICON);interaction.setAttribute('aria-expanded','false');
  const hide=button('在我的桌面隐藏',EYE_ICON);hide.classList.add('peer-hide');hide.onclick=()=>{const id=owner();if(id)void window.qbot.desktop.setMemberHidden(id,!document.body.classList.contains('member-hidden')).then(close).catch(error=>message(error));};
  let feedbackTimer:ReturnType<typeof setTimeout>|undefined;
  function message(value:unknown){feedback.textContent=String(value instanceof Error?value.message:value);feedback.hidden=false;window.qbot.overlays.hint({kind:'interaction',text:feedback.textContent});clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>window.qbot.overlays.hint(null),4500);}
  interaction.onclick=async()=>{
    if(loading||busy)return;
    if(!wheel.hidden){wheel.hidden=true;interaction.setAttribute('aria-expanded','false');return;}
    clearTimeout(timer);show();
    const request=++version;loading=true;interaction.setAttribute('aria-busy','true');
    try{
      const choices=await window.qbot.roomPet.interactions();if(request!==version)return;
      wheel.replaceChildren();
      for(const item of choices){const b=document.createElement('button');b.textContent=icons[item.id];b.title=item.label+(item.level?` · Lv.${item.level} 解锁`:'');b.setAttribute('aria-label',b.title);b.disabled=!!item.level;if(item.level){const lock=document.createElement('small');lock.textContent='🔒';b.append(lock);}
        b.onclick=async()=>{if(busy)return;busy=true;wheel.querySelectorAll('button').forEach(b=>b.disabled=true);try{const text=await window.qbot.roomPet.interact(item.id);if(request===version){wheel.hidden=true;message(text);interaction.setAttribute('aria-expanded','false');}}catch(error){if(request===version)message(error);}finally{busy=false;wheel.hidden=true;interaction.setAttribute('aria-expanded','false');}};wheel.append(b);}
      wheel.hidden=false;interaction.setAttribute('aria-expanded','true');
    }catch(error){if(request===version)message(error);}finally{if(request===version){loading=false;interaction.removeAttribute('aria-busy');}}
  };
  root.onpointerdown=e=>e.stopPropagation();root.onpointerenter=show;
  const leave=()=>{
    clearTimeout(timer);
    // A clicked menu remains open while loading, selecting or moving through gaps.
    if(loading||!wheel.hidden||busy||root.contains(document.activeElement))return;
    timer=setTimeout(()=>{if(!loading&&wheel.hidden&&!busy&&!root.contains(document.activeElement))close();},500);
  };root.onpointerleave=leave;stage.addEventListener('pointerenter',show);stage.addEventListener('pointerleave',leave);
  root.addEventListener('focusin',show);root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget as Node))leave();});
  document.addEventListener('pointerdown',e=>{if(!root.contains(e.target as Node))close();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});window.addEventListener('blur',close);
  window.qbot.desktop.onPeerControlsClose(close);const update=(s:import('../../shared/desktop-visibility').DesktopVisibility)=>{const hidden=s.hiddenMembers.includes(owner()??'');document.body.classList.toggle('member-hidden',hidden);hide.title=hidden?'显示这个角色':'在我的桌面隐藏';hide.setAttribute('aria-label',hide.title);hide.setAttribute('aria-pressed',String(hidden));if(s.hidden||s.peek||hidden)close();};window.qbot.desktop.onChanged(update);
  return {show,close,update};
}

import { PettingGesture } from '../../shared/petting';
import { isDesktopQuiet } from './desktop-visibility';
import './petting.css';

/** The action owns a lease, renewed by motion; chat is emitted only at entry. */
export function mountPetting(stage:HTMLElement, ready:()=>boolean, react:()=>()=>void): {stop():void} {
  const gesture=new PettingGesture();
  let active=false,owned=false,pending=false,version=0;
  let until=0,lastMotion=0,lastPulse=0;
  let cleanup:(()=>void)|undefined;
  const allowed=()=>!document.hidden&&!isDesktopQuiet()&&ready();
  const stop=()=>{
    version++;gesture.reset();
    const notify=owned;owned=false;
    if(active){active=false;stage.classList.remove('petting');const end=cleanup;cleanup=undefined;end?.();}
    if(notify)void window.qbot.social.pet('end').catch(()=>{});
  };
  const start=()=>{
    until=performance.now()+1500;
    if(active)return;
    active=true;stage.classList.add('petting');cleanup=react();
  };
  stage.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||e.buttons||!allowed()||(e.target as Element).closest('button,[role="button"],.player-nameplate')){stop();return;}
    const now=performance.now();
    lastMotion=now;
    if(active&&owned){
      until=now+1500;
      if(now-lastPulse>=500){lastPulse=now;void window.qbot.social.pet('keep').catch(()=>stop());}
      return;
    }
    if(pending||active||!gesture.move(e.clientX,e.clientY,now,e.buttons))return;
    pending=true;owned=true;const request=++version;
    void window.qbot.social.pet().then(()=>{
      if(request!==version||!allowed()){if(owned)stop();return;}
      // A slow response must not turn an abandoned gesture into a new session.
      if(performance.now()-lastMotion>1500){stop();return;}
      start();
    }).catch(error=>{
      if(request!==version)return;
      stop();
      if(allowed())window.qbot.bubble.say(String(error instanceof Error?error.message:error).replace(/^Error invoking remote method '[^']+': Error: /,''),4000);
    }).finally(()=>{pending=false;});
  });
  const unsubscribe=window.qbot.social.onPet((phase='start')=>{
    if(phase==='end'){if(!owned)stop();return;}
    if(!allowed())return;
    // The requesting window waits for its own promise, so cancelled requests cannot revive it.
    if(pending)return;
    if(phase==='keep'&&!active)return;
    start();
  });
  const tick=setInterval(()=>{if(active&&(!allowed()||performance.now()>=until))stop();},100);
  stage.addEventListener('pointerleave',()=>{if(owned||pending)stop();else gesture.reset();});
  stage.addEventListener('pointerdown',stop);
  window.addEventListener('blur',()=>{if(owned||pending)stop();});
  document.addEventListener('visibilitychange',stop);
  const unhide=window.qbot.desktop.onChanged(()=>{if(!allowed())stop();});
  window.addEventListener('pagehide',()=>{stop();clearInterval(tick);unsubscribe();unhide();},{once:true});
  return {stop};
}

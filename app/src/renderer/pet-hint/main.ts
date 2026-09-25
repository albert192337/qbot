import './style.css';
const root=document.getElementById('hint')!,open=document.getElementById('open') as HTMLButtonElement,close=document.getElementById('dismiss')!;
const actions=document.createElement('div');actions.id='invitation-actions';actions.hidden=true;root.append(actions);
let invitation:import('../../shared/pet-hint').PetHint['invitation'];
for(const [label,accept] of [['一起玩',true],['暂时不了',false]] as const){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{if(invitation&&invitation.expiresAt>Date.now()){window.qbot.overlays.hintAction({invitationId:invitation.id,accept});actions.hidden=true;}};actions.append(button);}
window.qbot.overlays.onHint(value=>{
  root.hidden=false;root.dataset.kind=value.kind;open.title=value.title??'';
  document.getElementById('icon')!.textContent=value.icon??'';
  document.getElementById('text')!.textContent=value.text;
  open.disabled=value.kind!=='wish';close.hidden=value.kind!=='wish';
  invitation=value.invitation;actions.hidden=!invitation||invitation.expiresAt<=Date.now();root.classList.toggle('invitation',!!invitation);
});
open.onclick=()=>window.qbot.overlays.hintAction('open');close.onclick=()=>window.qbot.overlays.hintAction('dismiss');
setInterval(()=>{if(invitation&&invitation.expiresAt<=Date.now()){root.hidden=true;window.qbot.overlays.hintHover(false);}},250);
document.addEventListener('pointermove',e=>window.qbot.overlays.hintHover((!open.disabled||!actions.hidden)&&root.contains(e.target as Node)));
document.addEventListener('pointerleave',()=>window.qbot.overlays.hintHover(false));

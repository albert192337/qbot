import './style.css';
const root=document.getElementById('hint')!,open=document.getElementById('open') as HTMLButtonElement,close=document.getElementById('dismiss')!;
window.qbot.overlays.onHint(value=>{
  root.hidden=false;root.dataset.kind=value.kind;open.title=value.title??'';
  document.getElementById('icon')!.textContent=value.icon??'';
  document.getElementById('text')!.textContent=value.text;
  open.disabled=value.kind!=='wish';close.hidden=value.kind!=='wish';
});
open.onclick=()=>window.qbot.overlays.hintAction('open');close.onclick=()=>window.qbot.overlays.hintAction('dismiss');
document.addEventListener('pointermove',e=>window.qbot.overlays.hintHover(!open.disabled&&root.contains(e.target as Node)));
document.addEventListener('pointerleave',()=>window.qbot.overlays.hintHover(false));

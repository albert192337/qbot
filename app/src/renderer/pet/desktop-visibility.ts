import type { DesktopVisibility } from '../../shared/desktop-visibility';
import './desktop-visibility.css';

export const EYE_ICON = '<svg viewBox="0 0 32 32" fill="none"><path d="M3 16s5-9 13-9 13 9 13 9-5 9-13 9S3 16 3 16Z" fill="#fff8eb" stroke="#594235" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#83b589" stroke="#594235" stroke-width="2"/><path class="eye-slash" d="m5 4 23 24" stroke="#594235" stroke-width="2.5" stroke-linecap="round"/></svg>';
export const isDesktopQuiet = () => document.body.classList.contains('desktop-hidden') || document.body.classList.contains('member-hidden') || !!document.body.dataset.peek;

export function mountDesktopVisibility(onChange: (s: DesktopVisibility) => void): void {
  let previous = '';
  window.qbot.desktop.onChanged(s => {
    document.body.classList.remove('desktop-loading');
    const key=JSON.stringify([s.hidden,s.peek,document.body.classList.contains('room-pet')?s.hiddenMembers:[]]);
    document.body.classList.toggle('desktop-hidden',s.hidden);
    document.body.dataset.peek=s.peek??'';
    document.querySelectorAll<HTMLButtonElement>('.hud-hide').forEach(b=>{
      b.title=s.hidden?'显示角色':'隐藏全部角色'; b.setAttribute('aria-label',b.title); b.setAttribute('aria-pressed',String(s.hidden));
    });
    if(key!==previous){document.body.classList.remove('peek-controls');previous=key;onChange(s);}
    report();
  });
  function report(): void {
    const hits: Array<{x:number;y:number;width:number;height:number}>=[];
    const peek=document.body.dataset.peek;
    if(peek&&!document.body.classList.contains('desktop-hidden')) hits.push({x:peek==='left'?0:innerWidth*.68,y:innerHeight*.04,width:innerWidth*.32,height:innerHeight*.63});
    for(const el of document.querySelectorAll<HTMLElement>('#pet-hud button,#pet-hud .hud-pill,.peer-controls button')) {
      const style=getComputedStyle(el), r=el.getBoundingClientRect();
      if(style.visibility!=='hidden'&&style.display!=='none'&&r.width&&r.height) hits.push({x:r.x,y:r.y,width:r.width,height:r.height});
    }
    window.qbot.desktop.reportHits(hits);
  }
  document.addEventListener('pointermove',e=>{
    if(!document.body.dataset.peek)return;
    const left=document.body.dataset.peek==='left', near=left?e.clientX<innerWidth*.32:e.clientX>innerWidth*.68;
    const hud=document.getElementById('pet-hud');
    if(near&&e.clientY<innerHeight*.6)document.body.classList.add('peek-controls');
    else if(!hud?.contains(e.target as Node)&&!(document.body.classList.contains('peek-controls')&&e.clientY>=innerHeight*.08&&e.clientY<innerHeight*.75&&e.clientX>=0&&e.clientX<innerWidth))document.body.classList.remove('peek-controls');
    report();
  });
  document.addEventListener('mouseleave',()=>{document.body.classList.remove('peek-controls');report();});
  const timer=setInterval(report,150);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}

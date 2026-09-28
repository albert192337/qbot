import { experienceProgress, type ExperienceGain } from '../../shared/experience-progress';

export function mountExperience(root:HTMLElement) {
  const view=document.createElement('div');view.id='experience';view.hidden=true;
  view.innerHTML='<div class="experience-levelup">LEVEL UP!</div><div class="experience-row"><div class="experience-level"></div><div class="experience-track" role="progressbar" aria-label="角色经验"><div class="experience-fill"></div><span class="experience-gain"></span></div></div>';
  root.append(view);
  const level=view.querySelector<HTMLElement>('.experience-level')!,fill=view.querySelector<HTMLElement>('.experience-fill')!,track=view.querySelector<HTMLElement>('.experience-track')!,gain=view.querySelector<HTMLElement>('.experience-gain')!,up=view.querySelector<HTMLElement>('.experience-levelup')!;
  let key='',frame=0;
  return (value:ExperienceGain|undefined)=>{
    view.hidden=!value;root.classList.toggle('has-experience',!!value);
    if(!value){key='';cancelAnimationFrame(frame);return;}
    const next=JSON.stringify(value);if(key===next)return;key=next;cancelAnimationFrame(frame);
    const final=experienceProgress(value.to),initial=experienceProgress(value.from);
    up.hidden=final.level===initial.level;
    gain.textContent=`+${value.to-value.from} 经验`;
    level.textContent=String(final.level);level.setAttribute('aria-label',`当前等级 ${final.level}`);
    const draw=(xp:number)=>{const p=experienceProgress(xp);fill.style.width=`${p.fraction*100}%`;track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(Math.round(p.fraction*100)));track.setAttribute('aria-valuetext',`Lv.${final.level}，增加 ${value.to-value.from} 经验${final.max?'，已满级':''}`);};
    const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick=(now:number)=>{const t=reduced?1:Math.min(1,(now-start)/1100);draw(value.from+(value.to-value.from)*(1-(1-t)**3));if(t<1)frame=requestAnimationFrame(tick);};
    tick(start);
  };
}

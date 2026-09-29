import { Player } from '../pet/player';
import type { SpineExpression } from '../pet/spine-face';
const players:Player[]=[];
const stages:HTMLElement[]=[];
const names=['吴邪','张起灵'];
async function init(){
  for(const [i,id] of ['spine-wuxie','spine-zhangqiling'].entries()){
    const manifest=await(await fetch(`qbot-asset://${id}/manifest.json`)).json();
    const card=document.createElement('article');card.className='card';card.innerHTML=`<div class="stage"></div><div class="name">${names[i]}</div><div class="status">实时动画</div>`;document.querySelector('#cards')!.append(card);
    const stage=card.querySelector<HTMLElement>('.stage')!;stages.push(stage);
    const player=new Player(stage,()=>{player.play('idle');card.querySelector('.status')!.textContent='已回到实时动画';});players.push(player);player.load(id,manifest);player.play('idle');
    stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);player.playLooping('drag');card.querySelector('.status')!.textContent='拖拽 · 已打断演出';});
    const end=()=>player.play('idle');stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  }
  const play=(action:string)=>{players.forEach(p=>action==='highlight'?p.playOnce(action):p.playLooping(action));document.querySelectorAll('.status').forEach(el=>el.textContent=action==='highlight'?'高光视频 → 自动回到实时':action==='perch'?'实时坐姿 · 固定板凳':'实时动画');};
  for(const [label,action]of [['待机','idle'],['走路','walk'],['坐板凳','perch'],['开心','talk_happy'],['高光动画','highlight']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>play(action);document.querySelector('#actions')!.append(b);}
  for(const [label,value]of [['淡定','neutral'],['微开心','happy'],['疑惑','curious'],['嫌弃','annoyed'],['困倦','sleepy'],['惊讶','surprised'],['随动作变化',null]] as const){const b=document.createElement('button');b.textContent=label;b.onclick=()=>players.forEach(p=>p.setSpineExpression(value));document.querySelector('#faces')!.append(b);}
  (window as any).hybrid={players,stages,play,expression:(v:SpineExpression|null)=>players.forEach(p=>p.setSpineExpression(v))};
}
void init().catch(e=>{document.querySelector('#error')!.textContent=String(e);});

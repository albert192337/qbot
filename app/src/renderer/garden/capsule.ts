import {appearanceThumbnail} from './appearance-shop';
import type {GardenState,GardenCommand} from '../../shared/garden';
import {CAPSULE,CAPSULE_POOL,capsulePoolFor,type CapsuleReward,type CapsuleMachine} from '../../shared/social-economy';
import {furnitureThumbnail} from '../furniture/catalog';
import {HALLOWEEN_FURNITURE} from '../../shared/halloween-furniture';
import './capsule.css';
const machineArt=new URL('./assets/capsule/machine.png',import.meta.url).href;
const tierName={common:'普通',rare:'稀有',epic:'史诗'};
const node=(tag:string,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const button=(text:string,fn:()=>unknown,disabled=false,cls='')=>{const b=node('button',text,cls) as HTMLButtonElement;b.type='button';b.disabled=disabled;b.onclick=()=>void fn();return b;};
let spinning=false;
let selectedMachine:CapsuleMachine='2d';
const is3d=(item:CapsuleReward)=>item.kind==='furniture'&&HALLOWEEN_FURNITURE.some(x=>x.id===item.item);
function rewardArt(item:CapsuleReward){
 if(item.kind==='appearance')return appearanceThumbnail(item.item);
 if(item.kind==='furniture')return furnitureThumbnail(item.item,item.name);
 const art=node('div','',`supply-art ${item.kind}`);art.setAttribute('role','img');art.setAttribute('aria-label',item.name);
 art.append(node('span',item.kind==='seed'?'✿':'↟','supply-symbol'),node('small',item.kind==='seed'?'SEEDS':'GROW'));
 return art;
}
function rewardCard(item:CapsuleReward,index=0,interactive=true){const card=node('article','',`capsule-reward ${item.tier}`);card.style.setProperty('--delay',`${index*65}ms`);card.append(node('span',tierName[item.tier],'reward-tier'),rewardArt(item),node('strong',item.name),node('span',item.duplicateTokens?`重复 · 返还 ${item.duplicateTokens} 代币`:`× ${item.count}`,'reward-count'));if(interactive&&is3d(item)){const view=button('旋转查看 3D',()=>void show3d([item],false));view.className='capsule-view-model';card.append(view);}return card;}
function dialog(title:string){const d=document.createElement('dialog');d.className='capsule-dialog';d.setAttribute('aria-label',title);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d;}
function showRewards(rewards:CapsuleReward[]){const d=dialog('本次扭蛋奖励');d.append(node('h2','本次获得'));const grid=node('div','','capsule-results');rewards.forEach((r,i)=>grid.append(rewardCard(r,i)));d.append(grid,button('收下',()=>d.close(),false,'capsule-primary'));}
async function show3d(rewards:CapsuleReward[],summary=true){
 const models=rewards.filter(is3d).sort((a,b)=>({common:0,rare:1,epic:2}[b.tier]-{common:0,rare:1,epic:2}[a.tier]));
 if(!models.length){showRewards(rewards);return;}
 try{const {showFurnitureReveal}=await import('./capsule-reveal');showFurnitureReveal(models,()=>{if(summary)showRewards(rewards);});}
 catch{showRewards(rewards);}
}
async function draw(s:GardenState,count:1|10,machine:CapsuleMachine,act:(c:GardenCommand)=>Promise<void>){
 if(spinning)return;spinning=true;
 const previous=s.economy?.lastCapsule?.id,started=Date.now(),d=dialog('扭蛋抽取中');d.classList.add('drawing');
 d.append(node('div','','rolling-capsule'),node('h2','正在打开…'));d.addEventListener('cancel',event=>event.preventDefault());
 try{
  await act({type:machine==='3d'?'capsuleDraw3d':'capsuleDraw',count});const fresh=await window.qbot.garden.get();
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,(matchMedia('(prefers-reduced-motion: reduce)').matches?0:1100)-(Date.now()-started))));
  const result=fresh.economy?.lastCapsule;
  if(!result||result.id===previous)throw Error('未收到新奖励，请检查余额和上次收获后再试。');
  d.close();await show3d(result.rewards);
 }catch(error){d.replaceChildren(node('h2','暂时没能展示奖励'),node('p',error instanceof Error?error.message:String(error)),node('p','若代币已扣除，可从「查看上次收获」找回奖励。'),button('关闭',()=>d.close()));}
 finally{spinning=false;}
}
function poolDialog(s:GardenState,machine:CapsuleMachine){const d=dialog('完整奖池与概率');d.append(node('h2','奖池与概率'),node('p','普通 70% · 稀有 25% · 史诗 5%。以下为未触发保底时的单项概率。'));const list=node('div','','capsule-pool-list');for(const item of capsulePoolFor(s.economy??{},machine)){const row=node('div');row.append(rewardArt(item),node('span',`${item.name} ×${item.count}`),node('strong',`${(({common:70,rare:25,epic:5}[item.tier])*item.weight/100).toFixed(2)}%`));list.append(row);}d.append(list,node('p','最多 10 抽获得稀有以上，最多 20 抽获得史诗收藏；史诗保底优先，提前获得会重置对应计数。稀有保底内仍按本档权重抽取。所有种子无额外遗传因子；加速肥沿用花园效果，不改变繁育金色门槛。'),button('知道了',()=>d.close(),false,'capsule-primary'));}
export function renderCapsule(host:HTMLElement,s:GardenState,act:(c:GardenCommand)=>Promise<void>){
 const e=s.economy;if(!e)return;const machine=selectedMachine,is3D=machine==='3d',supported=e.capsuleMachineRevision===1,available=!is3D||supported;
 const legacyMixed=!supported&&e.furniture3dRevision===1;
 const progress=is3D?(e.capsule3d??{rareMisses:0,epicMisses:0}):e;
 const last=is3D?e.capsule3d?.lastCapsule:(e.lastCapsule2d??(!supported?e.lastCapsule:undefined));
 const section=node('section','','garden-capsule'+(is3D?' machine-3d':''));section.dataset.machine=machine;
 const tabs=node('nav','','capsule-machine-tabs');tabs.setAttribute('aria-label','选择扭蛋机');
 for(const [id,label] of [['2d',legacyMixed?'原版扭蛋机 · 混合池':'2D 扭蛋机'],['3d','3D 扭蛋机']] as const){const tab=button(label,()=>{selectedMachine=id;const temp=document.createElement('div');renderCapsule(temp,s,act);section.replaceWith(...Array.from(temp.childNodes));});tab.setAttribute('aria-pressed',String(machine===id));tab.dataset.machine=id;tabs.append(tab);}section.append(tabs);
 const header=node('header','','capsule-header'),heading=node('div');heading.append(node('h2',is3D?'3D 扭蛋机':legacyMixed?'原版扭蛋机':'2D 扭蛋机'));const wallet=node('div','','capsule-wallet');wallet.append(node('small','扭蛋代币'),node('strong',`◈ ${e.tokens}`),button('模拟充值 +300',()=>act({type:'capsuleTopUp'}),e.topUpDay>=e.day,'capsule-topup'));header.append(heading,wallet);section.append(header);
 const stage=node('div','','capsule-stage'),left=node('div','','capsule-feature');left.append(node('span','本期主题','capsule-tag'),node('h3',is3D?'万圣夜的\n魔法小屋':'月光下的\n小小花园'),node('p',e.appearances?'种子 · 加速肥 · 家具 · 角色外观':'种子 · 加速肥 · 主题家具'));const showcase=node('div','','capsule-showcase');for(const id of (is3D?['halloween-fireplace','halloween-cauldron']:['moon-terrarium','cloud-fountain'])){const item=CAPSULE_POOL.find(x=>x.id===id)!;showcase.append(rewardCard(item,0,false));}left.append(showcase,node('p',is3D?'7 件 3D 家具 · 抽中后旋转鉴赏，布置 3D 房间':legacyMixed?'旧服务混合奖池 · 以公示概率为准':'2D 家具 · 用于二维房间','capsule-muted'));
 const center=node('div','','capsule-machine');const img=new Image();img.src=machineArt;img.alt='装满彩色胶囊的花园扭蛋机';img.draggable=false;center.append(node('div','','machine-halo'),img);
 const right=node('aside','','capsule-progress');right.append(node('span','你的好运进度','capsule-tag'));for(const [label,left,total] of [['稀有以上',10-progress.rareMisses,10],['史诗收藏',20-progress.epicMisses,20]] as const){const row=node('div','','pity-track');row.append(node('span',label),node('strong',`${left} 抽内必得`));const meter=document.createElement('progress');meter.max=total;meter.value=total-left;meter.setAttribute('aria-label',label+'保底进度');row.append(meter);right.append(row);}const pool=node('div','','capsule-inline-pool');
 const ranked=[...capsulePoolFor(e,machine)].sort((a,b)=>(b.kind==='appearance'?10:0)+({common:0,rare:1,epic:2}[b.tier])-(a.kind==='appearance'?10:0)-({common:0,rare:1,epic:2}[a.tier]));
 for(const item of ranked){const entry=node('div','','capsule-pool-entry');entry.append(rewardArt(item),node('span',item.name),node('small',item.kind==='appearance'?'外观':tierName[item.tier]));pool.append(entry);}
 right.prepend(node('h3','奖池'),pool);right.append(button('概率',()=>poolDialog(s,machine),!available,'capsule-link'));if(last)right.append(button('查看上次收获',()=>void show3d(last.rewards),false,'capsule-link'));stage.append(center,right);section.append(stage);
 if(!available)section.append(node('p','3D 扭蛋机暂未开放 · 等待服务器更新后即可抽取。','capsule-unavailable'));else section.append(node('p','共用代币 · 两台机的保底分别累计','capsule-disclaimer'));
 const controls=node('div','','capsule-controls');controls.append(button('转一次  ·  ◈ 60',()=>draw(s,1,machine,act),!available||e.tokens<CAPSULE.cost,'capsule-primary'),button('转十次  ·  ◈ 600',()=>draw(s,10,machine,act),!available||e.tokens<CAPSULE.cost*10,'capsule-secondary'));section.append(controls,node('p','模拟付费试玩 · 每日可领取 300 代币 · 不会发生真实扣款','capsule-disclaimer'));if(e.tokens<60)section.append(node('p','代币不足，领取今日模拟充值后再来转一转。','capsule-disclaimer'));host.append(section);
}


import type {GardenState,GardenCommand} from '../../shared/garden';
import {CAPSULE,CAPSULE_POOL,type CapsuleReward} from '../../shared/social-economy';
import {furnitureThumbnail} from '../furniture/catalog';
import './capsule.css';
const machine=new URL('./assets/capsule/machine.png',import.meta.url).href;
const tierName={common:'普通',rare:'稀有',epic:'史诗'};
const node=(tag:string,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const button=(text:string,fn:()=>unknown,disabled=false,cls='')=>{const b=node('button',text,cls) as HTMLButtonElement;b.type='button';b.disabled=disabled;b.onclick=()=>void fn();return b;};
let spinning=false;
function rewardArt(item:CapsuleReward){
 if(item.kind==='furniture')return furnitureThumbnail(item.item,item.name);
 const art=node('div','',`supply-art ${item.kind}`);art.setAttribute('role','img');art.setAttribute('aria-label',item.name);
 art.append(node('span',item.kind==='seed'?'✿':'↟','supply-symbol'),node('small',item.kind==='seed'?'SEEDS':'GROW'));
 return art;
}
function rewardCard(item:CapsuleReward,index=0){const card=node('article','',`capsule-reward ${item.tier}`);card.style.setProperty('--delay',`${index*65}ms`);card.append(node('span',tierName[item.tier],'reward-tier'),rewardArt(item),node('strong',item.name),node('span',`× ${item.count}`,'reward-count'));return card;}
function dialog(title:string){const d=document.createElement('dialog');d.className='capsule-dialog';d.setAttribute('aria-label',title);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d;}
function showRewards(rewards:CapsuleReward[]){const d=dialog('本次扭蛋奖励');d.append(node('p','一点好运，带回花园','capsule-kicker'),node('h2','收下这份小惊喜'));const grid=node('div','','capsule-results');rewards.forEach((r,i)=>grid.append(rewardCard(r,i)));d.append(grid,node('p','种子与加速肥已入背包，家具已入收藏。','capsule-muted'),button('开心收下',()=>d.close(),false,'capsule-primary'));}
async function draw(s:GardenState,count:1|10,act:(c:GardenCommand)=>Promise<void>){
 if(spinning)return;spinning=true;const previous=s.economy?.lastCapsule?.id,started=Date.now(),d=dialog('扭蛋抽取中');d.classList.add('drawing');
 d.append(node('p','咔哒——好运正在滚过来','capsule-kicker'),node('div','','rolling-capsule'),node('h2','正在打开花园补给'));d.addEventListener('cancel',event=>event.preventDefault());
 try{
  await act({type:'capsuleDraw',count});const fresh=await window.qbot.garden.get();
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,(matchMedia('(prefers-reduced-motion: reduce)').matches?0:1100)-(Date.now()-started))));
  d.close();if(fresh.economy?.lastCapsule?.id&&fresh.economy.lastCapsule.id!==previous)showRewards(fresh.economy.lastCapsule.rewards);
 }catch(error){d.replaceChildren(node('h2','暂时没能打开'),node('p',error instanceof Error?error.message:String(error)),button('关闭',()=>d.close()));}
 finally{spinning=false;}
}
function poolDialog(){const d=dialog('完整奖池与概率');d.append(node('h2','每一份惊喜，都写清楚'),node('p','普通 70% · 稀有 25% · 史诗 5%。以下为未触发保底时的单项概率。'));const list=node('div','','capsule-pool-list');for(const item of CAPSULE_POOL){const row=node('div');row.append(rewardArt(item),node('span',`${item.name} ×${item.count}`),node('strong',`${(({common:70,rare:25,epic:5}[item.tier])*item.weight/100).toFixed(2)}%`));list.append(row);}d.append(list,node('p','最多 10 抽获得稀有以上，最多 20 抽获得史诗家具；史诗保底优先，提前获得会重置对应计数。稀有保底内仍按本档权重抽取。所有种子无额外遗传因子；加速肥沿用花园效果，不改变繁育金色门槛。'),button('知道了',()=>d.close(),false,'capsule-primary'));}
export function renderCapsule(host:HTMLElement,s:GardenState,act:(c:GardenCommand)=>Promise<void>){
 const e=s.economy;if(!e)return;const section=node('section','','garden-capsule');
 const header=node('header','','capsule-header'),heading=node('div');heading.append(node('p','THE LITTLE GARDEN · VOL. 01','capsule-kicker'),node('h2','花园补给站'),node('p','把今天的小幸运，种进明天的花园。','capsule-subtitle'));const wallet=node('div','','capsule-wallet');wallet.append(node('small','扭蛋代币'),node('strong',`◈ ${e.tokens}`),button('模拟充值 +300',()=>act({type:'capsuleTopUp'}),e.topUpDay>=e.day,'capsule-topup'));header.append(heading,wallet);section.append(header);
 const stage=node('div','','capsule-stage'),left=node('div','','capsule-feature');left.append(node('span','本期主题','capsule-tag'),node('h3','月光下的\n小小花园'),node('p','种子 · 加速肥 · 主题家具'));const showcase=node('div','','capsule-showcase');for(const id of ['moon-terrarium','cloud-fountain']){const item=CAPSULE_POOL.find(x=>x.id===id)!;showcase.append(rewardCard(item));}left.append(showcase,node('p','史诗奖励 · 月光玻璃庭院 / 云朵叠泉','capsule-muted'));
 const center=node('div','','capsule-machine');const img=new Image();img.src=machine;img.alt='装满彩色胶囊的花园扭蛋机';img.draggable=false;center.append(node('div','','machine-halo'),img,node('span','转动一下，遇见惊喜','machine-label'));
 const right=node('aside','','capsule-progress');right.append(node('span','你的好运进度','capsule-tag'));for(const [label,left,total] of [['稀有以上',10-e.rareMisses,10],['史诗家具',20-e.epicMisses,20]] as const){const row=node('div','','pity-track');row.append(node('span',label),node('strong',`${left} 抽内必得`));const meter=document.createElement('progress');meter.max=total;meter.value=total-left;meter.setAttribute('aria-label',label+'保底进度');row.append(meter);right.append(row);}right.append(node('p','每份补给都能用上','capsule-tag'),node('p','普通种子直接播种\n加速肥缩短生长等待\n新家具随心布置','capsule-benefits'),button('查看奖池与概率',poolDialog,false,'capsule-link'));if(e.lastCapsule)right.append(button('查看上次收获',()=>showRewards(e.lastCapsule!.rewards),false,'capsule-link'));stage.append(left,center,right);section.append(stage);
 const controls=node('div','','capsule-controls');controls.append(button('转一次  ·  ◈ 60',()=>draw(s,1,act),e.tokens<CAPSULE.cost,'capsule-primary'),button('转十次  ·  ◈ 600',()=>draw(s,10,act),e.tokens<CAPSULE.cost*10,'capsule-secondary'));section.append(controls,node('p','模拟付费试玩 · 每日可领取 300 代币 · 不会发生真实扣款','capsule-disclaimer'));if(e.tokens<60)section.append(node('p','代币不足，领取今日模拟充值后再来转一转。','capsule-disclaimer'));host.append(section);
}


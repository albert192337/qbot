import type { GardenState, GardenCommand } from '../../shared/garden';
import { renderCapsule, renderFurnitureShop } from '../garden/social-economy';
import { el,button } from './dom';
import { errorMessage } from './model';
let root:HTMLElement,state:GardenState|undefined,busy=false,off:(()=>void)|undefined;
const message=el('p');message.setAttribute('role','status');
export async function mount(host:HTMLElement){root=host;off=window.qbot.garden.onChanged(()=>{if(!busy)void onVisible().catch(e=>{message.textContent=errorMessage(e);});});await onVisible();}
export async function onVisible(){state=await window.qbot.garden.get();render();}
export function unmount(){off?.();}
function render(){if(!root||!state)return;root.replaceChildren(message);if(!state.economy){root.append(el('h2','花园补给站尚未开放'),el('p','当前服务器需要更新，请稍后重新检查。'),button('布置已有家具',()=>window.qbot.ui.openConsole('furnish'),'btn primary'),button('重新检查',()=>void onVisible().catch(e=>{message.textContent=errorMessage(e);}),'btn'));return;}renderCapsule(root,state,act);const shop=el('details');shop.append(el('summary','逛逛花园家具小店'));renderFurnitureShop(shop,state,act);root.append(shop,button('去布置房间',()=>window.qbot.ui.openConsole('furnish'),'btn primary'));if(busy)for(const b of root.querySelectorAll('button'))b.disabled=true;}
async function act(command:GardenCommand){if(busy)return;busy=true;render();try{const result=await window.qbot.garden.act(command);if(!result.ok)throw Error(result.error);state=result.state;message.textContent=command.type==='capsuleDraw'?'奖励已收入背包与收藏，可查看上次收获。':result.reveal?.message??'已完成';window.dispatchEvent(new Event('house:reward'));}catch(e){message.textContent=errorMessage(e);}finally{busy=false;render();}}


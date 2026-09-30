import './furnish.css';
import { el, button } from './dom';
import { errorMessage } from './model';
import { FurnitureArt, ITEMS, TEA_SHELL, drawShell, type ShelfTheme, type ShelfCategory } from '../online-room/furniture';
import { ROOM_DECOR_KEY, SLOTS, DEFAULT_LAYOUT, canPlace, restoreLayout, serializeLayout, layoutForTheme, type Layout, type SlotId } from '../online-room/layout';

import { FURNITURE_THEMES, CATEGORY_NAMES, BASIC_ITEMS } from '../online-room/library';
let filterTheme:ShelfTheme='all', filterCategory:ShelfCategory='all';
let root:HTMLElement, canvas:HTMLCanvasElement, controls:HTMLElement, shelf:HTMLElement, status:HTMLElement;
let layout:Layout={...DEFAULT_LAYOUT}, baseline='', inventory:Record<string,number>={}, selected:SlotId='left', busy=false;
const art=new FurnitureArt(), shell=new Image();
let loaded=false;
export async function mount(host:HTMLElement):Promise<void> {
  root=host;root.classList.add('room-furnish');
  canvas=el('canvas');canvas.width=1000;canvas.height=295;canvas.setAttribute('aria-label','古风茶室布置预览');
  const board=el('div',undefined,'room-furnish-board');board.append(canvas);
  controls=el('div',undefined,'room-slots');controls.setAttribute('aria-label','选择摆放位置');
  shelf=el('div',undefined,'room-shelf');status=el('p',undefined,'room-save-status');status.setAttribute('role','status');
  const tools=el('div',undefined,'room-furnish-tools');
  const save=button('保存布置',()=>void saveAll(),'btn primary');save.id='save-furnish';
  tools.append(save,button('撤销修改',()=>{layout=restoreLayout(JSON.parse(baseline));render();},'btn'),button('恢复茶室套装',()=>{layout={...DEFAULT_LAYOUT};render();},'btn'),button('全部收起',()=>{for(const s of SLOTS)layout[s.id]='';render();},'btn'),button('在桌面查看',()=>window.qbot.room.openHome(),'btn'));
  for(const b of tools.querySelectorAll<HTMLButtonElement>('button'))b.disabled=true;
  const presets=el('div',undefined,'room-presets');presets.setAttribute('aria-label','整套布置');
  presets.append(el('span','整套试搭'));
  for(const theme of FURNITURE_THEMES){const b=button(theme.name,()=>{if(busy)return;layout=layoutForTheme(theme.id);status.textContent='套装已试摆，保存后生效。';render();},'btn');presets.append(b);}
  const filters=el('div',undefined,'room-library-filters');
  const themeSelect=el('select');themeSelect.setAttribute('aria-label','家具主题');
  for(const [value,label] of [['all','全部主题'],...FURNITURE_THEMES.map(t=>[t.id,t.name]),['collection','我的收藏']]){const option=el('option',label);option.value=value;themeSelect.append(option);}
  themeSelect.onchange=()=>{filterTheme=themeSelect.value as ShelfTheme;render();};
  const categorySelect=el('select');categorySelect.setAttribute('aria-label','家具类别');
  for(const [value,label] of [['all','全部类别'],...Object.entries(CATEGORY_NAMES),['collection','收藏家具']]){const option=el('option',label);option.value=value;categorySelect.append(option);}
  categorySelect.onchange=()=>{filterCategory=categorySelect.value as ShelfCategory;render();};
  filters.append(themeSelect,categorySelect,el('span',`${BASIC_ITEMS.length} 件常备家具 · 可跨套装混搭`));
  root.append(el('h2','布置古风茶室'),el('p','先选位置，再挑家具；也可以整套试搭后换掉其中几件。常备家具可直接使用，收藏家具按已有数量摆放。'),board,controls,presets,tools,status,filters,shelf,el('p','保存后同步到本机的横向茶室；其他背景保留原画。','room-furnish-note'));
  canvas.onclick=e=>{if(busy)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1000,y=(e.clientY-rect.top)/rect.height*295;
    const slot=[...SLOTS].reverse().find(s=>x>=s.x-s.w/2&&x<=s.x+s.w/2&&y>=s.y-s.h&&y<=s.y);
    if(slot){selected=slot.id;render();}
  };
  shell.src=TEA_SHELL;
  await Promise.all([shell.decode(),art.load()]);loaded=true;await load();
}
async function load():Promise<void> {
  busy=true;render();try {const [saved,p,garden]=await Promise.all([window.qbot.decor.get(ROOM_DECOR_KEY),window.qbot.progress.get(),window.qbot.garden.get()]);layout=restoreLayout(saved);inventory=combinedInventory(p.inventory,garden.economy?.furniture??{});baseline=JSON.stringify(serializeLayout(layout));status.textContent='';}
  catch(e){status.textContent=errorMessage(e);throw e;}finally{busy=false;render();}
}
export function hasUnsavedChanges():boolean {return !!baseline&&baseline!==JSON.stringify(serializeLayout(layout));}
export async function onVisible():Promise<void> {if(!hasUnsavedChanges())await load();else{const [p,g]=await Promise.all([window.qbot.progress.get(),window.qbot.garden.get()]);inventory=combinedInventory(p.inventory,g.economy?.furniture??{});render();}}
export async function discardChanges():Promise<void> {await load();}
function render():void {
  if(!loaded)return;
  const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,1000,295);drawShell(ctx,shell);art.draw(ctx,layout);
  const slot=SLOTS.find(s=>s.id===selected)!;
  ctx.strokeStyle='#efc974';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(slot.x-slot.w/2,slot.y-slot.h,slot.w,slot.h);ctx.setLineDash([]);
  controls.replaceChildren();
  for(const s of SLOTS){const b=button(s.name,()=>{if(busy)return;selected=s.id;render();},'btn');b.setAttribute('aria-pressed',String(s.id===selected));controls.append(b);}
  shelf.replaceChildren(el('h3',`${slot.name} · ${ITEMS.find(i=>i.id===layout[selected])?.name??'空位'}`));
  shelf.append(button('收起这件',()=>{if(busy)return;layout[selected]='';render();},'btn'));
  const visibleItems=ITEMS.filter(i=>i.surface===slot.surface&&(i.basic||inventory[i.id]>0)&&(filterTheme==='all'||i.theme===filterTheme)&&(filterCategory==='all'||i.category===filterCategory));
  if(!visibleItems.length)shelf.append(el('p','这个位置没有符合筛选的家具，试试全部主题或其他类别。'));
  for(const item of visibleItems){
    const b=button('',()=>{if(!busy&&canPlace(layout,selected,item.id,inventory)){layout[selected]=item.id;render();}},'room-item');
    b.dataset.itemId=item.id;
    const thumb=el('canvas');thumb.width=150;thumb.height=100;art.drawItem(thumb.getContext('2d')!,item.id,75,95,136,90);
    const used=SLOTS.filter(s=>layout[s.id]===item.id).length;
    b.append(thumb,el('strong',item.name),el('small',item.basic?(FURNITURE_THEMES.find(t=>t.id===item.theme)?.name+' · 常备'):`已摆 ${used} / 收藏 ${inventory[item.id]}`));
    b.setAttribute('aria-pressed',String(layout[selected]===item.id));b.disabled=!canPlace(layout,selected,item.id,inventory);shelf.append(b);
  }
  for(const b of root.querySelectorAll<HTMLButtonElement>('.room-furnish-tools button,.room-presets button'))b.disabled=busy||!baseline;
  for(const b of root.querySelectorAll<HTMLButtonElement>('.room-slots button,.room-shelf button'))b.disabled=busy||b.disabled;
  root.querySelector<HTMLButtonElement>('#save-furnish')!.disabled=busy||!hasUnsavedChanges();
  for(const select of root.querySelectorAll<HTMLSelectElement>('.room-library-filters select'))select.disabled=busy;
  root.dataset.dirty=String(hasUnsavedChanges());
}
async function saveAll():Promise<void> {
  if(busy)return;busy=true;render();
  try{const saved=serializeLayout(layout);await window.qbot.decor.set(ROOM_DECOR_KEY,saved);baseline=JSON.stringify(saved);status.textContent='已保存，横向茶室已更新。';}
  catch(e){status.textContent=`保存失败：${errorMessage(e)}。修改仍在，可以重试。`;}
  finally{busy=false;render();}
}

function combinedInventory(old:Record<string,number>,fresh:Record<string,number>){const result={...old};for(const [id,count] of Object.entries(fresh))result[id]=(result[id]??0)+count;return result;}

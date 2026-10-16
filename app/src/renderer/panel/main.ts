import { mountPanelWeather } from './weather';
import '../ui/direction-c.css';
import { uiIcon } from '../ui/icons';
import type { DesktopPanelPage } from '../../shared/panel-layout';
import { gardenQuest } from '../../shared/garden';

const api=window.qbot,root=document.getElementById('app')!;
let page=(new URLSearchParams(location.search).get('page')??'menu') as DesktopPanelPage;
let stopWeather=()=>{};
let tab='multiplayer', revision=0, body:HTMLElement, title:HTMLElement, back:HTMLButtonElement;
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
function error(e:unknown){const n=el('p',e instanceof Error?e.message:String(e),'c-error');body.append(n);}
function button(label:string,icon:string,run:()=>unknown,cls=''){const b=el('button','',cls);b.type='button';b.innerHTML=uiIcon(icon);b.title=label;b.setAttribute('aria-label',label);b.onclick=()=>{try{const r=run();if(r instanceof Promise)void r.catch(error);}catch(e){error(e);}};return b;}
function row(label:string,icon:string,run:()=>unknown,note='',cls=''){const b=button(label,icon,run,'c-row '+cls),labelEl=el('span');labelEl.append(el('strong',label));if(note)labelEl.append(el('small',note));b.append(labelEl);const arrow=el('span');arrow.innerHTML=uiIcon('arrow');arrow.style.flex='none';b.append(arrow);body.append(b);return b;}
function external(pane:string){api.ui.openConsole(pane);}
function embedded(path:string,label:string){body.classList.add('c-embedded');const f=el('iframe','','c-frame');f.title=label;f.src=new URL(path,location.href).href;body.replaceChildren(f);back.hidden=false;title.textContent=label;}
function gardenPage(p:string,label:string){embedded(`../garden/index.html?view=${encodeURIComponent(p)}&compact=1`,label);}
async function content(){
 const rev=++revision;body.replaceChildren();body.classList.remove('c-embedded');back.hidden=true;
 if(page==='room'){embedded('../tea3d/index.html?editor=1&companion=1','我的房间');return;}
 if(page==='garden'){gardenPage('bag','花园');back.hidden=true;return;}
 if(page==='phone'){
   title.textContent='手机';const grid=el('div','','c-grid');body.append(grid);
   const apps:[string,string,()=>unknown][]=[['我的房间','home',()=>navigate('room')],['朋友圈','moments',()=>gardenPage('moments','朋友圈')],['旅行','travel',()=>gardenPage('travel','旅行')],['关系','friends',()=>external('relationships')],['扭蛋机','capsule',()=>api.garden.open('capsule')],['宝箱弹珠','bag',()=>api.pinball.open()],['记忆','book',()=>external('memory')]];
   for(const [label,icon,run] of apps){const b=button(label,icon,run,'c-app');b.append(el('span',label));grid.append(b);}return;
 }
 title.textContent='菜单';
 if(tab==='multiplayer'){
   const friends=row('朋友','friends',()=>showFriends());
   const room=row('房间','home',()=>api.rooms.open(),'','c-room-card');
   row('本地互动','heart',()=>localGuests());
   const results=await Promise.allSettled([api.social.contacts(),api.rooms.getCache()]);if(rev!==revision)return;
   if(results[0].status==='fulfilled'){const s=results[0].value;friends.querySelector('strong')!.after(el('small',`${s.people.filter(p=>p.relation==='friend'&&p.online).length} 人在线`));}
   if(results[1].status==='fulfilled')room.querySelector('strong')!.after(el('small',results[1].value.room?.name??'未加入'));
 } else if(tab==='tasks'){
   const s=await api.garden.get();if(rev!==revision)return;
   const goal=gardenQuest(s);row(goal.text,'task',()=>api.garden.open(goal.page));
   if(s.economy&&!s.economy.tutorial.claimed)row('领取新手物品','bag',async()=>{const r=await api.garden.act({type:'socialStarter'});if(!r.ok)throw Error(r.error);await content();});
   for(const wish of s.economy?.wishes??[])row(wish.label,'task',()=>api.garden.open('goals'),wish.done?'✓':'');
 } else if(tab==='characters'){
   row('角色库','characters',()=>external('characters'));row('创建角色','create',()=>external('hatch'));
   row('装扮市场','market',()=>external('market'));row('生成任务','task',()=>external('tasks'));
   row('角色外观','persona',()=>api.garden.open('appearance'));
   const actor=await api.characters.getActive();if(rev!==revision||!actor)return;
   const r=row(actor.manifest.name,'persona',()=>external('profile'),'当前角色');body.prepend(r);
 } else {
   row('偏好设置','settings',()=>external('settings'));row('物品','bag',()=>external('rewards'));row('动作与角色配置','actions',()=>external('persona'));row('连接','connection',()=>external('claude'));
   const settings=await api.settings.get();if(rev!==revision)return;if(settings.developerMode)row('开发者工具','developer',()=>external('devtools'));
 }
}
async function showFriends(){
 const rev=++revision;body.replaceChildren();title.textContent='朋友';back.hidden=false;
 const snapshot=await api.social.contacts(true);if(rev!==revision)return;
 for(const person of snapshot.people.filter(p=>p.relation==='friend'))row(person.nickname,'friends',()=>api.rooms.open(),person.online?'在线':'离线');
 row('管理朋友','friends',()=>api.rooms.open());
}
async function localGuests(){
 const rev=++revision;body.replaceChildren();title.textContent='本地互动';back.hidden=false;
 const guests=await api.social.guests();if(rev!==revision)return;
 for(const g of guests)row(g.name,'characters',async()=>{await api.social.startTest();await api.social.inviteTest(g.id);});
}
function render(){
 api.panel.ignoreMouse(false);stopWeather();
 const panel=el('section','','c-panel'+(page==='phone'?' c-device':page==='room'?' c-space':'')),head=el('header','','c-header');
 back=button('返回','back',()=>{if(page==='room')navigate('phone');else void content().catch(error);});back.hidden=true;
 title=el('h1',page==='menu'?'菜单':page==='phone'?'手机':page==='garden'?'花园':'我的房间');
 const eye=button('显示／隐藏','eye',()=>api.desktop.openMenu());
 const mute=button('静音','sound',async()=>{const s=await api.settings.get();await api.settings.set({voiceEnabled:s.voiceEnabled===false});await sound();});
 async function sound(){const s=await api.settings.get();if(!mute.isConnected)return;const muted=s.voiceEnabled===false;mute.innerHTML=uiIcon(muted?'mute':'sound');mute.setAttribute('aria-pressed',String(muted));mute.setAttribute('aria-label',muted?'取消静音':'静音');mute.title=muted?'取消静音':'静音';}
 head.append(back,title);if(page==='garden')stopWeather=mountPanelWeather(head);head.append(eye,mute,button('关闭','close',async()=>{await flushRoom();api.panel.close();}));panel.append(head);
 if(page==='menu'){
   const nav=el('nav','','c-tabs');nav.setAttribute('aria-label','菜单');nav.setAttribute('role','tablist');
   for(const [id,label,icon] of [['multiplayer','多人','friends'],['tasks','任务','task'],['characters','角色','characters'],['settings','设置','settings']]){const b=button(label,icon,()=>{tab=id;render();});b.append(el('span',label));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===id));nav.append(b);}panel.append(nav);
 }
 body=el('main','','c-content');panel.append(body);root.replaceChildren(panel);void sound().catch(error);void content().catch(error);
}
async function flushRoom(){const f=body?.querySelector('iframe');const w=f?.contentWindow as (Window&{tea3d?:{flush():Promise<void>}})|null;if(page==='room')await w?.tea3d?.flush();}
async function navigate(next:DesktopPanelPage){await flushRoom();page=next;api.panel.navigate(next);render();}
api.panel.onPage(next=>{void flushRoom().then(()=>{page=next;api.panel.navigate(next);render();}).catch(error);});
api.characters.onActivated(()=>{if(page==='menu'&&tab==='characters')render();});
window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!back.hidden)back.click();else void flushRoom().then(()=>api.panel.close()).catch(error);});
render();

document.addEventListener('pointermove',event=>{
 if(page!=='room')return;
 const target=event.target as Element;
 api.panel.ignoreMouse(!target.closest('.c-header,iframe'));
});

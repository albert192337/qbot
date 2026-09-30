import { el, button } from './dom';
import * as two from './furnish-2d';
let frame:HTMLIFrameElement, twoHost:HTMLElement, threeHost:HTMLElement, mode:'2d'|'3d'='3d', twoMounted=false;
let controls:HTMLButtonElement[]=[];
let observer:IntersectionObserver,unsubscribe:()=>void;
type SceneWindow=Window & { tea3d?: { stats():{dirty:boolean}; suspend(value:boolean):void } };
function dirty3d(){return !!(frame?.contentWindow as SceneWindow|null)?.tea3d?.stats().dirty;}
async function show(next:'2d'|'3d'){
 mode=next;twoHost.hidden=next!=='2d';threeHost.hidden=next!=='3d';
 controls.forEach((b,i)=>{const selected=(i===0?'3d':'2d')===next;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('primary',selected);});
 if(next==='2d'&&!twoMounted){twoMounted=true;try{await two.mount(twoHost);}catch(e){twoMounted=false;throw e;}}
 (frame.contentWindow as SceneWindow|null)?.tea3d?.suspend(next!=='3d');
}
export async function mount(host:HTMLElement){
 const bar=el('div');bar.style.cssText='display:flex;gap:8px;padding:12px 20px;align-items:center';bar.append(el('strong','装扮房间'));
 const note=el('span');note.style.fontSize='12px';
 controls=['3d','2d'].map(value=>button(value.toUpperCase(),()=>{void window.qbot.settings.set({roomRenderMode:value as '2d'|'3d'}).then(()=>show(value as '2d'|'3d')).catch(e=>{note.textContent=String(e);});},'btn'));bar.append(...controls,note);
 threeHost=el('div');twoHost=el('div');host.append(bar,threeHost,twoHost);
 frame=el('iframe');frame.title='3D 房间装扮';frame.style.cssText='display:block;border:0;width:100%;height:max(660px,calc(100vh - 230px))';
 // Resolve at runtime: Vite must preserve the multi-page HTML entry URL.
 frame.src=new URL('../tea3d/index.html?editor=1',window.location.href).href;
 frame.addEventListener('load',()=>{(frame.contentWindow as SceneWindow|null)?.tea3d?.suspend(mode!=='3d'||host.getClientRects().length===0);});
 threeHost.append(frame);
 observer=new IntersectionObserver(entries=>{(frame.contentWindow as SceneWindow|null)?.tea3d?.suspend(mode!=='3d'||!entries[0]?.isIntersecting);});observer.observe(host);
 unsubscribe=window.qbot.settings.onChanged(s=>{void show(s.roomRenderMode==='2d'?'2d':'3d');});
 const settings=await window.qbot.settings.get();await show(settings.roomRenderMode==='2d'?'2d':'3d');
}
export function hasUnsavedChanges(){return dirty3d()||(twoMounted&&two.hasUnsavedChanges());}
export async function discardChanges(){if(twoMounted)await two.discardChanges();frame.src=frame.src;}
export async function onVisible(){await show((await window.qbot.settings.get()).roomRenderMode==='2d'?'2d':'3d');if(mode==='2d'&&twoMounted)await two.onVisible();}
export function unmount(){observer?.disconnect();unsubscribe?.();frame?.remove();}

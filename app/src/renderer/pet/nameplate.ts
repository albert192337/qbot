import './nameplate.css';
import type { RoomsStatus } from '../../shared/ipc-types';

export function createNameplate(parent: HTMLElement): (name: string, title?: string) => void {
  const el=document.createElement('div');el.className='player-nameplate';
  const name=document.createElement('strong');const title=document.createElement('span');title.className='player-title';
  el.append(name,title);parent.append(el);el.hidden=true;
  return (text,subtitle='')=>{el.hidden=!text;name.textContent=text;el.title=text;title.textContent=subtitle;};
}
export function mountLocalNameplate(parent: HTMLElement):void {
  const set=createNameplate(parent);
  const update=(s:RoomsStatus)=>{const me=s.room?.members.find(m=>m.memberId===s.memberId);set(me ? `${s.room?.ownerId===me.memberId?'♔ ':''}${me.nickname}` : '',me?.title);};
  let revision=0;
  window.qbot.rooms.onStatus(s=>{revision++;update(s);});
  const initial=revision;
  void window.qbot.rooms.getStatus().then(s=>{if(revision===initial)update(s);}).catch(()=>{});
}

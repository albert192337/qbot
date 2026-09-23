import type { RoomChatMsg } from '../../shared/ipc-types';

export class ChatView {
  private messages: RoomChatMsg[] = [];
  private list: HTMLElement;
  private input: HTMLTextAreaElement;
  private button: HTMLButtonElement;
  private label: HTMLElement;
  private enabled = false;
  private busy = false;
  private scope = '';
  constructor(host: HTMLElement, private world: boolean, private self: () => string | undefined, private error: (text: string) => void) {
    host.classList.add('chat-box');
    host.innerHTML = '<div class="chat-caption"></div><div class="messages" role="log" aria-live="polite"></div><form class="composer"><textarea maxlength="200" rows="2" aria-label="聊天内容" placeholder="写句话吧…"></textarea><button type="submit" class="primary">发送</button></form>';
    this.list = host.querySelector('.messages')!;
    this.label = host.querySelector('.chat-caption')!;
    this.input = host.querySelector('textarea')!;
    this.button = host.querySelector('button')!;
    const submit = async () => {
      const text = this.input.value.trim();
      if (!text || this.busy || !this.enabled) return;
      const scope = this.scope;
      this.busy = true; this.button.disabled = true;
      try { await window.qbot.social.send(text, this.world); if(this.scope === scope && this.input.value.trim() === text) this.input.value = ''; }
      catch(e) { this.error(String(e)); }
      finally { this.busy = false; this.button.disabled = !this.enabled; }
    };
    host.querySelector('form')!.addEventListener('submit', e => {e.preventDefault(); void submit();});
    this.input.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); void submit(); } });
  }
  configure(scope: string, label: string, enabled: boolean): void {
    if (scope !== this.scope) { this.scope = scope; this.input.value = ''; this.set([]); }
    this.enabled = enabled; this.label.textContent = label;
    this.button.disabled = !enabled || this.busy; this.input.disabled = !enabled;
  }
  set(messages: RoomChatMsg[]): void {
    const bottom = this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight < 50;
    const oldTop = this.list.scrollTop;
    this.messages = [...new Map(messages.map(m => [m.id,m])).values()].slice(-50);
    this.list.replaceChildren();
    if (!this.messages.length) {const empty=document.createElement('p');empty.className='empty';empty.textContent=this.world ? '世界很安静，打个招呼吧。' : '聊天留在这里，安心做自己的事。';this.list.append(empty);}
    for (const m of this.messages) {
      const row=document.createElement('article');row.className='message' + (m.memberId === this.self() ? ' mine' : '');
      const who=document.createElement('div');who.className='message-who';who.textContent=`${m.nickname} · ${new Date(m.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
      who.tabIndex=0;who.setAttribute('role','button');who.title='查看土地和商店';who.onclick=()=>window.qbot.garden.open('visit:'+m.memberId);who.onkeydown=e=>{if(e.key==='Enter')who.click();};
      const text=document.createElement('p');text.textContent=m.text;
      const action=document.createElement('button');action.className='message-action';action.textContent=m.memberId === this.self() ? '撤回' : '举报';
      action.onclick=async () => {action.disabled=true;try {await window.qbot.social.moderate(m.id,m.memberId === this.self() ? 'delete' : 'report',this.world);if(m.memberId!==this.self())this.error('举报已提交，等待处理');}catch(e){this.error(String(e));}finally{action.disabled=false;}};
      row.append(who,text,action);this.list.append(row);
      const invitation=/\[培育:([0-9A-Z]{12}):([0-5])\]/.exec(m.text);
      if(m.garden){const traits=document.createElement('p');traits.textContent=(m.garden.species??'果实')+' · '+(m.garden.traits??[]).map(t=>t.name+'（'+t.quality+'）').join(' / ');row.append(traits);const status=document.createElement('p');status.textContent=m.garden.done?'已完成 · '+(m.garden.members??[]).map(p=>p.name).join('、'):`${m.garden.active??0} 人培育中 · 约 ${Math.ceil((m.garden.remaining??600)/Math.max(1,m.garden.active??0))} 秒 · 好奖励 ${((m.garden.chance??.18)*100).toFixed(1)}%`;row.append(status);}
      if(invitation&&invitation[1]===m.memberId){const join=document.createElement('button');join.textContent=m.garden?.done?'查看共同培育记录':'查看果实 · 一起培育';join.onclick=()=>window.qbot.garden.open('visit:'+invitation[1]+(m.garden?':'+m.garden.plot+':'+m.garden.plant:''));row.append(join);}
    }
    this.list.scrollTop = bottom ? this.list.scrollHeight : oldTop;
  }
  add(message: RoomChatMsg): void { this.set([...this.messages,message]); }
  remove(id: string): void { this.set(this.messages.filter(m => m.id !== id)); }
}

import './history.css';
import { uiIcon } from '../ui/icons';
const form = document.querySelector<HTMLFormElement>('#chat-form')!;
const input = document.querySelector<HTMLTextAreaElement>('#message')!;
const send = document.querySelector<HTMLButtonElement>('#send')!;
const status = document.querySelector<HTMLElement>('#status')!;
let busy = false;
let lastInputAt=0;
const reportInput=()=>window.qbot.presence?.input(!busy&&document.hasFocus()&&!!input.value.trim()&&Date.now()-lastInputAt<4500);
input.addEventListener('input',()=>{lastInputAt=Date.now();reportInput();});
input.addEventListener('compositionupdate',()=>{lastInputAt=Date.now();reportInput();});
input.addEventListener('blur',()=>window.qbot.presence?.input(false));
window.addEventListener('blur',()=>window.qbot.presence?.input(false));
const attentionTimer=setInterval(reportInput,2000);
window.addEventListener('pagehide',()=>{clearInterval(attentionTimer);window.qbot.presence?.input(false);});
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy || !input.value.trim()) return;
  const text = input.value;
  busy = true; send.disabled = true; input.readOnly = true;
  reportInput();
  status.className = ''; status.textContent = ''; status.title = '';
  form.setAttribute('aria-busy', 'true');
  try {
    const result = await window.qbot.bubble.sendChat(text);
    if (!result.ok) throw new Error(result.error || '发送失败，请重试');
    input.value = '';
    void refreshHistory();
    // Only an explicit help request asks for explanatory text; ordinary success stays silent.
    if (/^指令\s*[:：]?\s*(?:帮助|列表|有哪些)?[。！!？?]*$/.test(text.trim())) {
      status.textContent = result.message ?? ''; status.title = status.textContent;
    }
  } catch (error) { status.className = 'error'; status.textContent = String(error instanceof Error ? error.message : error); status.title = status.textContent; }
  finally { busy = false; form.setAttribute('aria-busy', 'false'); send.disabled = false; input.readOnly = false; input.focus(); }
});
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); form.requestSubmit(); }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') window.qbot.bubble.closeChat(); });
window.addEventListener('focus', () => input.focus());

const historyToggle=document.querySelector<HTMLButtonElement>('#history-toggle')!;
const emojiToggle=document.querySelector<HTMLButtonElement>('#emoji-toggle')!;
const history=document.querySelector<HTMLElement>('#history')!;
const picker=document.querySelector<HTMLElement>('#emoji-picker')!;
const publicChat=document.querySelector<HTMLButtonElement>('#public-chat')!;
const closeChat=document.querySelector<HTMLButtonElement>('#close-chat')!;
historyToggle.innerHTML=uiIcon('history');emojiToggle.innerHTML=uiIcon('smile');closeChat.innerHTML=uiIcon('close');
closeChat.onclick=()=>window.qbot.bubble.closeChat();
function resize(){window.qbot.bubble.resizeChat(!history.hidden||!picker.hidden);}
historyToggle.onclick=()=>{history.hidden=!history.hidden;picker.hidden=true;emojiToggle.setAttribute('aria-expanded','false');historyToggle.setAttribute('aria-expanded',String(!history.hidden));resize();void refreshHistory();};
emojiToggle.onclick=()=>{picker.hidden=!picker.hidden;history.hidden=true;historyToggle.setAttribute('aria-expanded','false');emojiToggle.setAttribute('aria-expanded',String(!picker.hidden));resize();};
for(const emoji of ['😊','🥰','😆','🥺','😴','😭','😮','😎','🤗','😤','❤️','✨']){const b=document.createElement('button');b.type='button';b.textContent=emoji;b.setAttribute('aria-label',emoji);b.onclick=()=>{input.setRangeText(emoji,input.selectionStart,input.selectionEnd,'end');input.dispatchEvent(new Event('input'));picker.hidden=true;emojiToggle.setAttribute('aria-expanded','false');resize();input.focus();};picker.append(b);}
let historyRevision=0,historyKey='';
async function refreshHistory(){if(history.hidden)return;const rev=++historyRevision;try{const snapshot=await window.qbot.bubble.history();if(rev!==historyRevision||history.hidden)return;const key=JSON.stringify(snapshot);if(key===historyKey)return;historyKey=key;history.replaceChildren();for(const line of snapshot.lines){const n=document.createElement('p');n.className=line.role;n.textContent=line.text;history.append(n);}history.scrollTop=history.scrollHeight;}catch{history.textContent='记录暂时无法读取';}}
const historyTimer=setInterval(()=>void refreshHistory(),2000);
const offActor=window.qbot.characters.onActivated(()=>{historyRevision++;historyKey='';history.replaceChildren();input.value='';void refreshHistory();});
function roomState(s:{phase:string}){publicChat.hidden=s.phase!=='in-room';}
void window.qbot.rooms.getStatus().then(roomState).catch(()=>{});
const offRoom=window.qbot.rooms.onStatus(roomState);
publicChat.onclick=()=>window.qbot.social.openChat();
window.addEventListener('pagehide',()=>{clearInterval(historyTimer);offActor();offRoom();});

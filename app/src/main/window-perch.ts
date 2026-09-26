import { screen } from 'electron';
import { getSettings } from './config';
import { getCharacter } from './characters';
import { getActivePlayables, getPetWindow, isRoomOpen, movePetWindow, showBubbleWindow } from './windows';
import { PerchNative, type PerchTarget } from './window-perch-native';
import { perchAnchor, perchPosition, type PerchState } from '../shared/window-perch';
import { chatComplete } from './llm-client';
import { setPerchObservation } from './perch-observation';
import { lastUserAt, rememberConversation } from './conversation-memory';
import { perchReplyPrompt, parsePerchReply } from './perch-reply';

let generation = 0;
let native: PerchNative | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let dock: { target: PerchTarget; fraction: number; state: PerchState; character: string | undefined; anchor: number } | null = null;
export function getPerchState(): PerchState | null { return dock?.state ?? null; }
function publish() { const pet=getPetWindow(); if(pet&&!pet.isDestroyed())pet.webContents.send('pet:perch',getPerchState()); }
export function detachPerch(): void {
  generation++; clearTimeout(timer); timer=undefined; native?.close(); native=null; dock=null; setPerchObservation(null); publish();
}
function position(target: PerchTarget): boolean {
  const pet=getPetWindow(); if(!pet||pet.isDestroyed()||!dock)return false;
  const bounds=screen.screenToDipRect(null,target.bounds);
  const next=perchPosition(bounds,pet.getBounds(),screen.getDisplayMatching(bounds).workArea,dock.fraction,dock.anchor);
  if(!next)return false;
  movePetWindow(next.x,next.y); return true;
}
async function track(token: number): Promise<void> {
  if(token!==generation||!dock||!native)return;
  const target=await native.query({handle:dock.target.handle});
  if(token!==generation||!dock)return;
  const settings=await getSettings();
  if(token!==generation||!dock)return;
  if(!target||target.pid!==dock.target.pid||settings.activeCharacter!==dock.character||isRoomOpen()||!getPetWindow()?.isVisible()||!position(target)){detachPerch();return;}
  if(!settings.freeMode||settings.behaviorMode!=='free')setPerchObservation(null);
  timer=setTimeout(()=>void track(token),200);
}
async function captureOnce(token: number): Promise<void> {
  if(!dock)return;
  const character=dock.character??'default', userAt=lastUserAt(character);
  const target=dock.target;
  let captureNative:PerchNative|undefined;
  const acknowledgement='停稳啦，我就在这个窗口边陪你。';
  let reply=acknowledgement;
  const deliver=async(text:string)=>{
    const latest=await getSettings();
    if(token!==generation||!dock||lastUserAt(character)!==userAt||latest.activeCharacter!==dock.character)return;
    if(text!==acknowledgement&&(!latest.freeMode||latest.behaviorMode!=='free'))return;
    const win=showBubbleWindow();
    const send=()=>{
      if(token!==generation||!dock||win.isDestroyed()||lastUserAt(character)!==userAt)return;
      win.webContents.send('behavior:say',{text,source:'llm',durationMs:20000});
      rememberConversation(character,{at:Date.now(),role:'assistant',source:'auto',text});
    };
    // Same LLM bubble session: replace the acknowledgement, rather than stacking two bubbles.
    if(win.webContents.isLoading())win.webContents.once('did-finish-load',()=>void deliver(text));else send();
  };
  try {
    await deliver(acknowledgement);
    const settings=await getSettings();
    if(token!==generation||!dock||!settings.freeMode||settings.behaviorMode!=='free'||!settings.arkApiKey)return;
    const {buildInput}=await import('./brain-llm');
    const input=await buildInput('chat');
    if(token!==generation||!dock)return;
    captureNative=new PerchNative();
    // PrintWindow targets this HWND only; no desktop or other-window thumbnails.
    const frame=await captureNative.capture(target.handle);
    if(token!==generation||!dock)return;
    if(!frame?.frame||frame.handle!==target.handle||frame.pid!==target.pid)return;
    const current=await getSettings();
    if(token!==generation||!current.freeMode||current.behaviorMode!=='free'||current.activeCharacter!==dock.character)return;
    const at=Date.now();
    const raw=await chatComplete({apiKey:settings.arkApiKey, imageUrl:`data:image/png;base64,${frame.frame}`,temperature:0.6,
      messages:[{role:'system',content:perchReplyPrompt(input,target.title)}],
    });
    const latest=await getSettings();
    if(token!==generation||!dock||!latest.freeMode||latest.behaviorMode!=='free'||latest.activeCharacter!==dock.character)return;
    const currentInput=await buildInput();
    if(token!==generation||!dock||input.memoryRevision!==currentInput.memoryRevision)return;
    const parsed=parsePerchReply(raw);if(!parsed)return;
    reply=parsed.say;
    setPerchObservation({title:target.title,at,summary:parsed.summary});
    dock.state.capturedAt=at; publish();
  }catch { /* Capture/model failure never breaks docking or falls back to desktop capture. */ }
  finally {
    captureNative?.close();
    if(reply!==acknowledgement)await deliver(reply);
  }
}
export async function tryPerch(): Promise<{ok:boolean; reason?:string}> {
  detachPerch();
  if(process.platform!=='win32')return {ok:false,reason:'窗口停靠目前支持 Windows'};
  const pet=getPetWindow(); if(!pet||pet.isDestroyed()||isRoomOpen())return {ok:false};
  const token=generation;
  const point=screen.getCursorScreenPoint();
  native=new PerchNative();
  const target=await native.query(screen.dipToScreenPoint(point));
  if(token!==generation)return {ok:false};
  if(!target){detachPerch();return {ok:false};}
  const actions=getActivePlayables().filter(a=>a==='perch'||a==='perch_sit'||a==='perch_lie');
  if(!actions.length){detachPerch();return {ok:false,reason:'这个角色还没有窗沿动作，请在动作库补充“窗沿停靠”'};}
  const settings=await getSettings(); if(token!==generation)return {ok:false};
  const character=settings.activeCharacter ? await getCharacter(settings.activeCharacter) : null;
  if(token!==generation)return {ok:false};
  const action=(actions.includes('perch') ? 'perch' : actions[Math.floor(Math.random()*actions.length)]) as 'perch'|'perch_sit'|'perch_lie';
  const bounds=screen.screenToDipRect(null,target.bounds);
  dock={target,fraction:(point.x-bounds.x)/bounds.width,state:{action,title:target.title},character:settings.activeCharacter,anchor:perchAnchor(action,character?.manifest.actions[action]?.perchAnchor)};
  if(!position(target)){detachPerch();return {ok:false,reason:'窗口上方空间不足，无法停靠'};}
  publish(); void track(token); void captureOnce(token);
  return {ok:true};
}

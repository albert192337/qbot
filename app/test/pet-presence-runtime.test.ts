import {beforeEach,afterEach,expect,it,vi} from 'vitest';
vi.mock('../src/main/perception',()=>({emitEvent:vi.fn(async()=>{})}));
const m=vi.hoisted(()=>({listeners:{} as Record<string,Function>,hooks:{} as Record<string,Function>,room:undefined as undefined|Function,chatChanged:undefined as undefined|Function,
 actor:'host',chatting:false,focused:true,visible:true,peerVisible:true,idle:0,locked:false,send:vi.fn(),audit:vi.fn(),input:vi.fn(),members:new Map(),chatSender:{},petSender:{}}));
vi.mock('electron',()=>({app:{once:()=>{}},ipcMain:{on:(id:string,cb:Function)=>m.listeners[id]=cb},powerMonitor:{getSystemIdleTime:()=>m.idle,getSystemIdleState:()=>m.locked?'locked':'active'}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:m.actor})}));
vi.mock('../src/main/windows',()=>({getPetWindow:()=>({webContents:Object.assign(m.petSender,{send:m.send}),isDestroyed:()=>false}),getPetChatWindow:()=>({id:2,webContents:Object.assign(m.chatSender,{on:()=>{}}),isDestroyed:()=>false,isVisible:()=>true,isFocused:()=>m.focused,on:(id:string,cb:Function)=>m.hooks[id]=cb}),getRoomPetWindow:()=>({peer:true})}));
vi.mock('../src/main/desktop-visibility',()=>({desktopActorVisible:(w:any)=>w.peer?m.peerVisible:m.visible}));
vi.mock('../src/main/conversation-memory',()=>({isChatting:()=>m.chatting,setInputAttention:m.input,onChattingChanged:(cb:Function)=>{m.chatChanged=cb;return ()=>{};}}));
vi.mock('../src/main/rooms/room-pets',()=>({memberStates:m.members,myMemberId:'self',onRoomPetEvent:(cb:Function)=>m.room=cb}));
vi.mock('../src/main/behavior-audit',()=>({behaviorAudit:{append:m.audit}}));
beforeEach(async()=>{vi.resetModules();vi.useFakeTimers();vi.setSystemTime(1000000);vi.clearAllMocks();m.listeners={};m.hooks={};m.actor='host';m.chatting=false;m.focused=true;m.visible=true;m.peerVisible=true;m.idle=0;m.locked=false;m.members.clear();m.audit.mockResolvedValue(undefined);(await import('../src/main/pet-presence')).wirePetPresence();});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
const input=(active:boolean,sender=m.chatSender)=>m.listeners['pet:inputAttention']({sender},active);
const signals=()=>m.send.mock.calls.map(c=>c[1]);
it('validates the input sender and focus, expires a stale lease, and retains attention while a reply is pending',async()=>{
 input(true,{});await vi.advanceTimersByTimeAsync(1);expect(m.send).not.toHaveBeenCalled();
 m.focused=false;input(true);await vi.advanceTimersByTimeAsync(1);expect(m.send).not.toHaveBeenCalled();
 m.focused=true;input(true);await vi.advanceTimersByTimeAsync(1);expect(signals().at(-1)).toEqual({actor:'host',kind:'attention',active:true});
 await vi.advanceTimersByTimeAsync(7000);expect(signals().at(-1).active).toBe(false);
 input(true);await vi.advanceTimersByTimeAsync(1);m.chatting=true;m.chatChanged!();m.hooks.blur();await vi.advanceTimersByTimeAsync(1);expect(signals().at(-1).active).toBe(true);
 m.chatting=false;m.chatChanged!();await vi.advanceTimersByTimeAsync(1);expect(signals().at(-1).active).toBe(false);
});
it('requires a real visible visitor, excludes room snapshots, and deduplicates reconnection',async()=>{
 m.room!({kind:'roomJoined'});m.room!({kind:'memberIn',member:{memberId:'old'}});m.members.set('old',{character:{}});
 await vi.advanceTimersByTimeAsync(100);expect(signals().some(s=>s.kind==='visitor')).toBe(false);
 m.room!({kind:'memberIn',member:{memberId:'new'}});await vi.advanceTimersByTimeAsync(1000);expect(signals().some(s=>s.kind==='visitor')).toBe(false);
 m.members.set('new',{character:{}});m.peerVisible=false;await vi.advanceTimersByTimeAsync(1000);expect(signals().some(s=>s.kind==='visitor')).toBe(false);
 m.peerVisible=true;await vi.advanceTimersByTimeAsync(1000);expect(signals().filter(s=>s.kind==='visitor')).toEqual([{actor:'host',kind:'visitor',target:'new'}]);
 m.room!({kind:'memberIn',member:{memberId:'new'}});await vi.advanceTimersByTimeAsync(1000);expect(signals().filter(s=>s.kind==='visitor')).toHaveLength(1);
});
it('greets a real return, drops hidden returns, and audits only the active pet renderer',async()=>{
 m.idle=300;await vi.advanceTimersByTimeAsync(1000);m.idle=0;await vi.advanceTimersByTimeAsync(1000);expect(signals().at(-1).kind).toBe('return');
 const report=m.listeners['pet:presenceReport'];await report({sender:{}},'host','return','wave','started');expect(m.audit).not.toHaveBeenCalled();
 await report({sender:m.petSender},'host','return','wave','started');expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({actor:'host',behavior:'return',source:'rule'}));
 m.visible=false;m.idle=400;await vi.advanceTimersByTimeAsync(601000);m.idle=0;await vi.advanceTimersByTimeAsync(1000);m.visible=true;await vi.advanceTimersByTimeAsync(1000);expect(signals().filter(s=>s.kind==='return')).toHaveLength(1);
});

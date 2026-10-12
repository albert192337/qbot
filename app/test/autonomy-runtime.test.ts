import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({settings:{} as any,events:[] as any[],room:{} as any,contacts:{} as any,visible:true,peerVisible:true,fresh:true,memory:1,relationship:{} as any,
  handlers:{} as Record<string,Function>,listeners:{} as Record<string,Function>,send:vi.fn(),invite:vi.fn(),contact:vi.fn(),moment:vi.fn(),garden:vi.fn(),
  sender:{mainFrame:{},id:1},characters:[] as any[],pause:false,execute:vi.fn(),icons:[] as any[],copy:vi.fn(),inputActive:false}));
vi.mock('../src/main/desktop-icon-copies',()=>({desktopInventory:async()=>({items:m.icons,source:'shell'}),desktopIconCopy:m.copy,readDesktopIconCopies:async()=>[]}));
vi.mock('electron',()=>({app:{},ipcMain:{handle:(id:string,fn:Function)=>m.handlers[id]=fn,on:(id:string,fn:Function)=>m.listeners[id]=fn}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({...m.settings})}));
vi.mock('../src/main/characters',()=>({getCharacter:async(id:string)=>m.characters.find(c=>c.dirId===id),listCharacters:async()=>m.characters}));
vi.mock('../src/main/windows',()=>({getPetWindow:()=>({webContents:m.sender,getBounds:()=>({x:0,y:0,width:300,height:300})}),getRoomPetWindow:()=>({peer:true,getBounds:()=>({x:300,y:0,width:300,height:300})})}));
vi.mock('../src/main/desktop-visibility',()=>({desktopQuiet:()=>!m.visible,desktopActorVisible:(win:any)=>win.peer?m.peerVisible:m.visible}));
vi.mock('../src/main/rooms/rooms',()=>({getRoomsCache:()=>({room:m.room}),getContacts:async()=>m.contacts,changeContact:m.contact,supportsIconFight:()=>false}));
vi.mock('../src/main/rooms/room-pets',()=>({getMemberSnapshot:()=>({character:m.characters[1]}),getContactRealm:()=> 'fixture-realm'}));
vi.mock('../src/main/relationships',()=>({relationships:{snapshot:async()=>({relationships:[m.relationship]})},localPerson:(c:any)=>({id:c.dirId}),peerPerson:()=>({id:'peer'})}));
vi.mock('../src/main/user-memory',()=>({initUserMemory:async()=>({revision:m.memory})}));
vi.mock('../src/main/conversation-memory',()=>({shouldPauseAutomatic:()=>m.pause,isInputActive:()=>m.inputActive,conversationFor:()=>[]}));
vi.mock('../src/main/meeting-monitor',()=>({getMeetingStatus:()=>({inMeeting:false})}));
vi.mock('../src/main/agent-server',()=>({getAgentStatus:()=>({activity:'idle'})}));
vi.mock('../src/main/garden/service',()=>({getGarden:async()=>({plots:[]}),gardenAction:m.garden}));
vi.mock('../src/main/garden/local-rehearsal',()=>({getRehearsal:()=>undefined}));
vi.mock('../src/main/garden/network',()=>({inviteInteraction:m.invite,setNetworkPairTracker:()=>{}}));
vi.mock('../src/main/garden/journal-service',()=>({hasNewMomentFacts:()=>m.fresh,generateMoment:m.moment}));
vi.mock('../src/main/behavior-executor',()=>({setBehaviorAudit:()=>{},execute:m.execute}));
vi.mock('../src/main/behavior-audit',()=>({behaviorAudit:{list:async()=>m.events,append:async(e:any)=>m.events.push(e),update:async(fn:Function)=>fn(m.events)}}));
const event=()=>({sender:m.sender,senderFrame:m.sender.mainFrame});
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();vi.useFakeTimers();vi.setSystemTime(new Date(2026,9,11,10));
 Object.assign(m.sender,{send:m.send});m.events=[];m.handlers={};m.listeners={};m.visible=true;m.peerVisible=true;m.fresh=true;m.memory=1;m.pause=false;
 m.settings={activeCharacter:'host',freeMode:true,arkApiKey:'mock',gardenOnline:true,roomsChatConsent:true};
 m.characters=['host','guest'].map(id=>({dirId:id,manifest:{name:id,actions:{idle:{webm:'idle.webm',status:'done'}},persona:'温和'}}));
 m.room={roomId:'12345678',members:[{memberId:'PEER00000001'}]};m.contacts={available:true,people:[{id:'FRIEND000001',nickname:'小叶',character:'小熊',online:true,relation:'friend'}]};
 m.relationship={people:['host','peer'],points:35,settings:{host:{note:'喜欢午后喝茶'}},memories:[{kind:'tea',at:1}]};
 m.invite.mockResolvedValue(undefined);m.moment.mockResolvedValue({ok:true});m.icons=[];m.inputActive=false;
});
it('all supported pair kinds and named desktop objects reach the same context, not just the first four',async()=>{
 await runtime();const {buildInteractionContext}=await import('../src/main/interaction-behaviors');
 m.icons=Array.from({length:12},(_,i)=>({id:`icon${i}`,name:i===11?'逆水寒手游':`图标${i}`,kind:'shortcut'}));
 const ctx=await buildInteractionContext('user');
 expect(ctx.desktopObjects.items).toHaveLength(12);expect(ctx.behaviorOpportunities).toContainEqual(expect.objectContaining({id:'icon:icon11',targetName:'逆水寒手游'}));
 expect(ctx.behaviorOpportunities.some(o=>o.kind==='flower')).toBe(true);expect(ctx.behaviorOpportunities.some(o=>o.id==='moment')).toBe(true);
});
it('a selected icon executes only its exact current copy, reports started/completed and rejects stale targets',async()=>{
 await runtime();const {buildInteractionContext,performInteractionBehavior}=await import('../src/main/interaction-behaviors');
 const icon={id:'game',name:'逆水寒手游',kind:'shortcut'};m.icons=[icon];m.copy.mockResolvedValue({object:icon,image:'data:image/png;base64,fixture'});
 const choice=(await buildInteractionContext('user')).behaviorOpportunities.find(o=>o.behavior==='iconPlay')!;
 expect(await performInteractionBehavior('host',choice,'用户要抛这个图标','user')).toBe(true);
 const sent=m.send.mock.calls.find(c=>c[1]?.type==='iconPlay')![1];expect(m.copy).toHaveBeenCalledWith('game');expect(sent.image).toContain('fixture');
 await m.listeners['autonomy:result'](event(),sent.requestId,'started');await m.listeners['autonomy:result'](event(),sent.requestId,'completed');
 await Promise.resolve();expect(m.events.some(e=>e.outcome==='completed'&&e.target==='game')).toBe(true);
 m.icons=[];m.send.mockClear();expect(await performInteractionBehavior('host',choice,'重试','user')).toBe(false);expect(m.send).not.toHaveBeenCalled();
});
it('reactive events can propose with automatic mode off, retain social budgets, and never execute before consent',async()=>{
 const api=await runtime();const {buildInteractionContext,performInteractionBehavior}=await import('../src/main/interaction-behaviors');m.settings.freeMode=false;
 const choice=(await buildInteractionContext('interaction')).behaviorOpportunities.find(o=>o.behavior==='pair')!;
 expect(await performInteractionBehavior('host',choice,'访客来了','interaction')).toBe(true);expect(m.invite).not.toHaveBeenCalled();
 await api.autonomy.answer(api.autonomy.get()!.id,true);expect(m.invite).toHaveBeenCalledOnce();
 expect((await buildInteractionContext('interaction')).behaviorOpportunities.some(o=>o.behavior==='pair')).toBe(false);
});
it('an icon lost during execution reports failure instead of successful dispatch',async()=>{
 await runtime();const {buildInteractionContext,performInteractionBehavior}=await import('../src/main/interaction-behaviors');
 m.icons=[{id:'game',name:'逆水寒手游',kind:'shortcut'}];m.copy.mockResolvedValue(null);
 const choice=(await buildInteractionContext('user')).behaviorOpportunities.find(o=>o.behavior==='iconPlay')!;
 expect(await performInteractionBehavior('host',choice,'抛一下','user')).toBe(false);
 expect(m.events.at(-1)).toMatchObject({behavior:'iconPlay',outcome:'failed'});expect(m.send.mock.calls.some(c=>c[1]?.type==='iconPlay')).toBe(false);
});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
async function runtime(){const api=await import('../src/main/autonomy');api.wireAutonomy();m.listeners['autonomy:ready'](event(),'host',true);return api;}
it('offers only visible nearby peers with relationship data, labels stored characters honestly, and does not send invitations while reading',async()=>{
 const api=await runtime(),choices=await api.behaviorOpportunities();
 expect(choices.find(c=>c.behavior==='pair')?.reason).toContain('喜欢午后喝茶');
 expect(choices.some(c=>c.kind==='fight'&&c.id.startsWith('local:'))).toBe(true);
 expect(choices.find(c=>c.id.startsWith('local:'))?.reason).toContain('目前不在旁边');expect(m.invite).not.toHaveBeenCalled();expect(m.contact).not.toHaveBeenCalled();
 m.peerVisible=false;expect((await api.behaviorOpportunities()).some(c=>c.behavior==='pair')).toBe(false);
});
it('routes a real outgoing peer request only after its exact visible approval and never sends a model-selected new target',async()=>{
 const api=await runtime(),choice=(await api.behaviorOpportunities()).find(c=>c.behavior==='pair')!;
 await api.proposeBehavior('host',choice,'想喝杯茶');expect(m.invite).not.toHaveBeenCalled();
 const id=api.autonomy.get()!.id;await m.handlers['autonomy:answer'](event(),id,true);expect(m.invite).toHaveBeenCalledOnce();expect(m.invite).toHaveBeenCalledWith('PEER00000001',choice.kind);
 await m.handlers['autonomy:answer'](event(),id,true);expect(m.invite).toHaveBeenCalledOnce();
});
it.each(['hidden','memory','relationship','actor','busy','leave'])('invalidates a pending proposal after %s changes',async change=>{
 const api=await runtime(),choice=(await api.behaviorOpportunities()).find(c=>c.behavior==='pair')!;
 await api.proposeBehavior('host',choice,'想喝茶');const id=api.autonomy.get()!.id;
 if(change==='hidden')m.visible=false;if(change==='memory')m.memory++;if(change==='relationship')m.relationship.settings.host.note='今天想独处';if(change==='actor')m.settings.activeCharacter='other';if(change==='busy')m.listeners['autonomy:ready'](event(),'host',false);if(change==='leave')m.room=null;
 await m.handlers['autonomy:answer'](event(),id,true);expect(m.invite).not.toHaveBeenCalled();expect(m.events.at(-1)?.outcome).toBe('cancelled');
});
it('runs the production daily tick only for a visible idle actor with fresh material',async()=>{
 const api=await runtime();await api.tickAutonomy();expect(m.moment).toHaveBeenCalledWith(expect.any(String),'auto');m.moment.mockClear();
 m.fresh=false;await api.tickAutonomy();expect(m.moment).not.toHaveBeenCalled();m.fresh=true;
 m.listeners['autonomy:ready'](event(),'host',false);await api.tickAutonomy();expect(m.moment).not.toHaveBeenCalled();
 m.listeners['autonomy:ready'](event(),'host',true);m.settings.freeMode=false;await api.tickAutonomy();expect(m.moment).not.toHaveBeenCalled();
});
it('chat command proposes local fight with no key or free mode, ignores automatic cooldown, and executes once after consent',async()=>{
 const api=await runtime(),{sendPetCommand}=await import('../src/main/pet-command');
 m.settings.freeMode=false;delete m.settings.arkApiKey;m.pause=true;
 m.events.push({id:'old',actor:'host',source:'auto',behavior:'invite',outcome:'proposed',at:Date.now()});
 expect((await sendPetCommand('指令双人打闹','host')).ok).toBe(true);
 const p=api.autonomy.get()!;expect(p.source).toBe('user');expect(p.opportunity.approvalText).toContain('我可以和guest一起打闹吗');
 expect(m.send.mock.calls.some(c=>c[0]==='pet:menuCommand')).toBe(false);
 await api.autonomy.answer(p.id,true);await api.autonomy.answer(p.id,true);
 expect(m.send.mock.calls.filter(c=>c[0]==='pet:menuCommand')).toEqual([['pet:menuCommand',expect.objectContaining({type:'pair',kind:'fight',guestId:'guest',requestId:p.id})]]);
 expect(m.events.at(-1)).toMatchObject({source:'user',outcome:'sent'});
});
it('keeps manual proposals valid during chat; rejection does not consume proactive budget and a new command replaces the pending ID',async()=>{
 const api=await runtime(),{sendPetCommand}=await import('../src/main/pet-command');m.pause=true;
 await sendPetCommand('指令双人打闹','host');const old=api.autonomy.get()!;
 await api.autonomy.refresh();expect(api.autonomy.get()?.id).toBe(old.id);
 await sendPetCommand('指令和guest一起喝茶','host');const fresh=api.autonomy.get()!;
 expect(fresh.id).not.toBe(old.id);expect(fresh.opportunity.kind).toBe('tea');
 await api.autonomy.answer(old.id,true);expect(m.invite).not.toHaveBeenCalled();
 await api.autonomy.answer(fresh.id,false);expect(m.send.mock.calls.some(c=>c[0]==='pet:menuCommand')).toBe(false);
 m.pause=false;expect((await api.behaviorOpportunities()).some(o=>o.id.startsWith('local:'))).toBe(true);
});
it('never substitutes a named unknown partner or performs a negated/multiple command; supported action uses only owned media',async()=>{
 const api=await runtime(),{sendPetCommand}=await import('../src/main/pet-command');
 for(const text of ['指令和陌生人一起打闹','指令不要打闹','指令先打闹再喝茶','指令删除文件'])expect((await sendPetCommand(text,'host')).ok).toBe(false);
 expect(api.autonomy.get()).toBeNull();expect(m.execute).not.toHaveBeenCalled();
 expect((await sendPetCommand('指令发呆','host')).ok).toBe(true);expect(m.execute.mock.calls[0][0].steps).toEqual([{op:'play',action:'idle',loops:1}]);
});
it('manual command cancellation, visibility and character changes still block execution, and moment limit failures are returned',async()=>{
 const api=await runtime(),{sendPetCommand}=await import('../src/main/pet-command');
 await sendPetCommand('指令双人打闹','host');let id=api.autonomy.get()!.id;
 m.visible=false;await api.autonomy.answer(id,true);expect(m.send.mock.calls.some(c=>c[0]==='pet:menuCommand')).toBe(false);
 m.visible=true;await sendPetCommand('指令双人打闹','host');id=api.autonomy.get()!.id;
 m.settings.activeCharacter='guest';await api.autonomy.answer(id,true);expect(m.send.mock.calls.some(c=>c[0]==='pet:menuCommand')).toBe(false);
 m.settings.activeCharacter='host';await sendPetCommand('指令双人打闹','host');await sendPetCommand('指令取消','host');expect(api.autonomy.get()).toBeNull();
 m.moment.mockResolvedValue({ok:false,error:'今日朋友圈已达3条上限'});
 expect(await sendPetCommand('指令发朋友圈','host')).toEqual({ok:false,error:'今日朋友圈已达3条上限'});expect(m.moment).toHaveBeenCalledWith(expect.any(String),'user');
});

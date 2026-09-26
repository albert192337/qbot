import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PairDialogue } from './pair-dialogue.mjs';
import { characterProfile } from './character-profile.mjs';
const beats = [{ speaker:'host',host:'wave',guest:'listen',caption:'备用甲' },{ speaker:'guest',host:'listen',guest:'tea',caption:'备用乙' }];
const setup = (timeoutMs=50) => {
  const dialogue=new PairDialogue({timeoutMs}),frames=[];
  const host={nickname:'甲',roomId:'room',pairDialogue:1},guest={nickname:'乙',roomId:'room',pairDialogue:1};
  for(const peer of [host,guest])peer.send=raw=>frames.push({peer,frame:JSON.parse(raw)});
  return {dialogue,frames,host,guest,args:{host,guest,actor:'a',guestActor:'b',kind:'tea',beats,valid:()=>true}};
};
test('character data survives pack extraction and never substitutes account nickname',async()=>{
 const manifest=Buffer.from(JSON.stringify({name:'小白',persona:'寡言的猫少年'}));
 const header=Buffer.from(JSON.stringify({files:[{path:'manifest.json',size:manifest.length}]}));
 const length=Buffer.alloc(4);length.writeUInt32BE(header.length);
 assert.deepEqual(characterProfile(Buffer.concat([length,header,manifest])),{name:'小白',persona:'寡言的猫少年'});
 assert.deepEqual(characterProfile(Buffer.from('bad')),{name:'伙伴',persona:''});
 const s=setup();s.guest.nickname='翻到第七页';s.guest.character={name:'小白',persona:'寡言的猫少年'};s.guest.pairDialogue=0;
 const pending=s.dialogue.prepare(s.args);const f=s.frames[0].frame;
 assert.equal(f.partner,'小白');assert.equal(f.partnerPersona,'寡言的猫少年');assert.ok(!JSON.stringify(f).includes('翻到第七页'));
 s.dialogue.answer(s.host,{request:f.request,line:'喝茶。'});await pending;
});
test('virtual user chat sends only user persona, authenticates answers and cancels on leaving',async()=>{
 const s=setup();s.host.companionChat=1;s.guest.profile={userPersona:'爱熬夜，直性子'};s.guest.character={name:'小白',persona:'角色寡言'};
 const args={peer:s.host,companion:s.guest,topic:'问候',history:[],valid:()=>true};
 const pending=s.dialogue.userChat(args),f=s.frames[0].frame;
 assert.equal(f.user.persona,'爱熬夜，直性子');assert.ok(!JSON.stringify(f).includes('角色寡言'));
 assert.equal(s.dialogue.answer(s.guest,{request:f.request,line:'冒名'}),false);
 s.dialogue.answer(s.host,{request:f.request,line:'还没睡呢？'});assert.equal(await pending,'还没睡呢？');
 const cancelled=s.dialogue.userChat(args);s.dialogue.cancel(s.host);assert.equal(await cancelled,null);
});
test('routes each turn to its owner, shares only speech, rejects forgery and duplicate answers',async()=>{
  const {dialogue,frames,host,guest,args}=setup();
  const result=dialogue.prepare(args),first=frames[0];
  assert.equal(first.peer,host);assert.equal(first.frame.actor,'a');
  assert.equal(dialogue.answer(guest,{request:first.frame.request,line:'伪造'}),false);
  assert.equal(dialogue.answer(host,{request:first.frame.request,line:'尝尝这杯茶。'}),true);
  assert.equal(dialogue.answer(host,{request:first.frame.request,line:'重复'}),false);
  await Promise.resolve();const second=frames[1];
  assert.equal(second.peer,guest);assert.deepEqual(second.frame.history,['尝尝这杯茶。']);
  dialogue.answer(guest,{request:second.frame.request,line:'茶香真好。'});
  assert.deepEqual(await result,['尝尝这杯茶。','茶香真好。']);assert.equal(dialogue.pending.size,0);
});
test('companion uses its public persona on the human client, regardless of initiating side',async()=>{
  for(const role of ['host','guest']){
    const s=setup(),npc=s[role],human=s[role==='host'?'guest':'host'];npc.companion=true;npc.profile={userPersona:'爱熬夜的直性子用户'};npc.character={name:'小白',persona:'安静爱读书'};
    const result=s.dialogue.prepare(s.args);
    for(let i=0;i<2;i++){
      const {peer,frame}=s.frames[i];assert.equal(peer,human);
      assert.equal(frame.companion?.persona, (role==='host'?i===0:i===1)?'安静爱读书':undefined);
      s.dialogue.answer(human,{request:frame.request,line:'一起休息吧。'});await Promise.resolve();
    }
    assert.equal((await result).length,2);
  }
});
test('old clients do not wait; timeouts, malformed output and cancellation are bounded',async()=>{
  const s=setup(5);s.host.pairDialogue=0;s.guest.pairDialogue=0;
  assert.deepEqual(await s.dialogue.prepare(s.args),['备用甲','备用乙']);assert.equal(s.frames.length,0);
  s.host.pairDialogue=1;
  assert.deepEqual(await s.dialogue.prepare(s.args),['备用甲','备用乙']);
  const result=s.dialogue.prepare(s.args);s.dialogue.answer(s.host,{request:s.frames.at(-1).frame.request,line:'字'.repeat(61)});
  assert.deepEqual(await result,['备用甲','备用乙']);
  let valid=true;s.args.valid=()=>valid;const cancelled=s.dialogue.prepare(s.args);valid=false;s.dialogue.cancel(s.guest);
  assert.equal(await cancelled,null);assert.equal(s.dialogue.pending.size,0);
});

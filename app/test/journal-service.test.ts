import {beforeEach,describe,it,expect,vi} from 'vitest';
import type {GardenState} from '../src/shared/garden';
import type {Settings} from '../src/shared/ipc-types';
import {initialGarden} from '../src/main/garden/rules';
import {initialTravel,travelTransition} from '../src/shared/travel';
const m=vi.hoisted(()=>({settings:{} as Settings,state:{} as GardenState,chat:vi.fn(),lines:[] as any[],memories:[] as any[],store:{revision:0,candidates:(_actor:string):any[]=>[]},interactions:vi.fn()}));
vi.mock('electron',()=>({app:{getPath:()=>'/unused'}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({...m.settings})}));
vi.mock('../src/main/characters',()=>({getCharacter:async()=>({manifest:{name:'小青',persona:'嘴硬心软，喜欢花草',actions:{}}})}));
vi.mock('../src/main/conversation-memory',()=>({conversationFor:()=>m.lines,conversationRevision:()=>m.store.revision}));
vi.mock('../src/main/user-memory',()=>({initUserMemory:async()=>m.store}));
vi.mock('../src/main/perception',()=>({getJournalInteractions:m.interactions}));
vi.mock('../src/main/llm-client',()=>({chatComplete:m.chat}));
vi.mock('../src/main/journal-animation',()=>({playJournalWriting:vi.fn(async()=>{})}));
vi.mock('../src/main/brain-log',()=>({beginBrainCall:async()=>'',updateBrainCall:async()=>{}}));
vi.mock('../src/main/garden/service',()=>({getGarden:async()=>structuredClone(m.state),updateGardenJournal:async(fn:any)=>{const next=structuredClone(m.state);const result=await fn(next);m.state=next;return result;}}));
import {generateMoment,rewriteDiary} from '../src/main/garden/journal-service';
import {saveRehearsal} from '../src/main/garden/rehearsal-store';
beforeEach(()=>{
 vi.clearAllMocks();m.settings={activeCharacter:'pet',freeMode:true,arkApiKey:'mock',travelDiaryPrompt:'自定义旅行写法',dailyMomentPrompt:'自定义朋友圈写法'};
 let n=0;m.state=initialGarden(Date.now(),{random:()=>.5,id:()=>String(n++)});m.lines=[];m.memories=[];m.store.revision=0;m.store.candidates=()=>m.memories;
 m.interactions.mockResolvedValue({click:2});m.chat.mockResolvedValue('今天的小事，我都悄悄放在心上了。');
});
describe('journal generation',()=>{
 it('persists test photos and generated diary, preserving paid progress and replay likes',async()=>{
  m.state.travel=initialTravel(Date.now());const before=structuredClone(m.state);
  const saved=await saveRehearsal({id:'test-session-01',city:1,progress:[0,0,0,0,1]});expect(saved.ok).toBe(true);
  const result=await rewriteDiary({city:1,rehearsalId:'test-session-01'});expect(result.ok).toBe(true);
  expect(m.state.travel.rehearsals?.[0].diary?.generated).toBe(true);expect(m.state.travel.rehearsals?.[0].posts[0].title).toBe('逛花园');
  expect({...m.state,travel:{...m.state.travel,rehearsals:undefined}}).toEqual({...before,travel:{...before.travel,rehearsals:undefined}});
  travelTransition(m.state,{type:'travelRehearsalLike',id:'test-session-01'},Date.now());
  await saveRehearsal({id:'test-session-01',city:1,progress:[0,0,0,0,2]});await saveRehearsal({id:'test-session-01',city:1,progress:[0,0,0,0,1]});
  const entry=m.state.travel.rehearsals![0];expect(entry.posts).toHaveLength(2);expect(entry.progress[4]).toBe(2);expect(entry.liked).toBe(true);expect(entry.diary).toBeUndefined();
  await generateMoment('request-real-01');expect(m.chat.mock.calls.at(-1)![0].messages[1].content).not.toContain('逛花园');
 });
 it('rejects invalid test progress and reuse by a different character',async()=>{
  expect((await saveRehearsal({id:'test-invalid',city:1,progress:[4,0,0,0,0]})).ok).toBe(false);
  await saveRehearsal({id:'test-other-01',city:1,progress:[0,0,0,0,1]});m.settings.activeCharacter='other';
  expect((await saveRehearsal({id:'test-other-01',city:1,progress:[0,0,0,0,2]})).ok).toBe(false);
 });
 it('requires LLM mode and a key, leaving saves untouched on failure',async()=>{
  const before=structuredClone(m.state);m.settings.freeMode=false;
  expect((await generateMoment('request-01')).ok).toBe(false);m.settings.freeMode=true;m.settings.arkApiKey='';
  expect((await generateMoment('request-02')).ok).toBe(false);expect(m.chat).not.toHaveBeenCalled();expect(m.state).toEqual(before);
 });
 it('uses today’s available chat, interactions and garden records with persona and edited prompt',async()=>{
  const now=Date.now(),start=new Date().setHours(0,0,0,0);
  m.lines=[{at:now-1000,role:'user',source:'chat',text:'今天种的花开了'}, {at:start-1,role:'user',source:'chat',text:'昨天私事'}, {at:now+86400000,role:'user',source:'chat',text:'未来记录'}, {at:now,role:'assistant',source:'auto',text:'助手猜测用户失业'}];
  m.state.journalEvents=[{actor:'pet',at:now,summary:'收获了向日葵'},{actor:'other',at:now,summary:'别人的收获'},{actor:'pet',at:start-1,summary:'昨日记录'}];
  const result=await generateMoment('request-03');expect(result.ok).toBe(true);expect(m.state.travel?.moments).toHaveLength(1);
  const messages=m.chat.mock.calls[0][0].messages;expect(messages[0].content).toContain('自定义朋友圈写法');
  const data=messages[1].content;expect(data).toContain('嘴硬心软');expect(data).toContain('今天种的花开了');expect(data).toContain('收获了向日葵');expect(data).toContain('click');
  for(const excluded of ['昨天私事','未来记录','助手猜测用户失业','别人的收获','昨日记录'])expect(data).not.toContain(excluded);
  await generateMoment('request-03');expect(m.chat).toHaveBeenCalledTimes(1);expect(m.state.travel?.moments).toHaveLength(1);
 });
 it('rejects concurrent requests and merges the result with new garden activity',async()=>{
  let resolve!:(s:string)=>void;m.chat.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  const first=generateMoment('request-04');await vi.waitFor(()=>expect(m.chat).toHaveBeenCalled());
  expect((await generateMoment('request-05')).ok).toBe(false);m.state.coins=999;resolve('记得你说的小事。');
  expect((await first).ok).toBe(true);expect(m.state.coins).toBe(999);expect(m.state.travel?.moments).toHaveLength(1);
 });
 it.each(['memory','actor','prompt','mode'])('discards responses after %s changes',async change=>{
  m.chat.mockImplementationOnce(async()=>{if(change==='memory')m.store.revision++;if(change==='actor')m.settings.activeCharacter='other';if(change==='prompt')m.settings.dailyMomentPrompt='新写法';if(change==='mode')m.settings.freeMode=false;return '过期正文';});
  expect((await generateMoment('request-06')).ok).toBe(false);expect(m.state.travel?.moments).toBeUndefined();
 });
 it('allows retry after a model error without adding an empty or fake post',async()=>{
  m.chat.mockRejectedValueOnce(Error('offline'));expect((await generateMoment('request-07')).ok).toBe(false);expect(m.state.travel).toBeUndefined();
  expect((await generateMoment('request-08')).ok).toBe(true);
 });
 it('writes locked Paris rehearsal from actual test steps without changing real records',async()=>{
  const before=structuredClone(m.state);const result=await rewriteDiary({city:1,rehearsal:[0,0,0,0,1]});
  expect(result.ok).toBe(true);if(result.ok){expect(result.value.city).toBe(1);expect(result.value.generated).toBe(true);}
  const data=m.chat.mock.calls[0][0].messages;expect(data[0].content).toContain('自定义旅行写法');expect(data[1].content).toContain('逛花园');expect(data[1].content).not.toContain('喷泉边野餐');expect(m.state).toEqual(before);
 });
 it('rewrites a real city diary without changing paid experiences or coins',async()=>{
  m.state.coins=50000;m.state.travel=initialTravel(Date.now());travelTransition(m.state,{type:'travelExperience',city:0,project:0,step:0},Date.now());m.state.travel.posts[0].actor='pet';
  const coins=m.state.coins,posts=structuredClone(m.state.travel.posts);const result=await rewriteDiary({city:0});
  expect(result.ok).toBe(true);expect(m.state.coins).toBe(coins);expect(m.state.travel.posts).toEqual(posts);expect(m.state.travel.diaries[0].city).toBe(0);
 });
 it('rejects invalid rehearsal and no-record requests before calling the model',async()=>{
  for(const request of [{city:3},{city:0},{city:1,rehearsal:[4,0,0,0,0]},{city:1,rehearsal:[]}])expect((await rewriteDiary(request)).ok).toBe(false);
  expect(m.chat).not.toHaveBeenCalled();
 });
});

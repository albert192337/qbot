import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({chat:vi.fn(),trace:vi.fn(),key:'',enabled:true}));
vi.mock('electron',()=>({app:{getPath:()=>'/unused'}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:'pet',arkApiKey:mocks.key,freeMode:mocks.enabled})}));
vi.mock('../src/main/characters',()=>({getCharacter:async()=>({manifest:{name:'小青',persona:'好奇、爱吃甜食',actions:{}}})}));
vi.mock('../src/main/conversation-memory',()=>({conversationFor:()=>[],conversationRevision:()=>0}));
vi.mock('../src/main/llm-client',()=>({chatComplete:mocks.chat}));
vi.mock('../src/main/journal-animation',()=>({playJournalWriting:vi.fn(async()=>{})}));
vi.mock('../src/main/brain-log',()=>({beginBrainCall:async()=> 'trace',updateBrainCall:mocks.trace}));
import {prepareTravelMemory,writeTravelDiary} from '../src/main/garden/travel-memory';
import {initialTravel,travelTransition} from '../src/shared/travel';
beforeEach(()=>{vi.clearAllMocks();mocks.key='';mocks.enabled=true;});
describe('travel diary',()=>{
 it('upserts one factual diary per pet and local day, with no API key required',async()=>{
  const at=new Date(2026,8,15,10).getTime(),s={coins:5000,travel:initialTravel(at)};
  travelTransition(s,{type:'travelExperience',city:0,project:0,step:0},at);
  const first=await prepareTravelMemory(s.travel);
  expect(first.diary.text).toContain('尝一杯抹茶');expect(first.diary.actor).toBe('pet');
  expect(await writeTravelDiary(first)).toBeUndefined();expect(mocks.chat).not.toHaveBeenCalled();
  travelTransition(s,{type:'travelExperience',city:0,project:0,step:1},at+1000);
  await prepareTravelMemory(s.travel);expect(s.travel.diaries).toHaveLength(1);expect(s.travel.diaries[0].text).toContain('学做和菓子');
  travelTransition(s,{type:'travelExperience',city:0,project:0,step:2},at+86400000);
  await prepareTravelMemory(s.travel);expect(s.travel.diaries).toHaveLength(2);expect(s.travel.diaries[1].text).not.toContain('尝一杯抹茶');
 });
 it('passes persona and real facts to the model, logging errors and keeping fallback',async()=>{
  mocks.key='test-key';const s={coins:5000,travel:initialTravel(1)};
  travelTransition(s,{type:'travelExperience',city:0,project:0,step:0},1);
  const input=await prepareTravelMemory(s.travel);mocks.chat.mockResolvedValueOnce('今天尝到了抹茶。');
  expect(await writeTravelDiary(input)).toBe('今天尝到了抹茶。');
  expect(mocks.chat.mock.calls[0][0].messages[1].content).toContain('好奇、爱吃甜食');
  expect(mocks.chat.mock.calls[0][0].messages[1].content).toContain('尝一杯抹茶');
  mocks.chat.mockRejectedValueOnce(new Error('offline'));
  expect(await writeTravelDiary(input)).toBeUndefined();expect(s.travel.diaries[0].text).toContain('尝一杯抹茶');
 });
 it('does not call the model with LLM mode disabled even when a key exists',async()=>{
  mocks.key='test-key';mocks.enabled=false;const s={coins:5000,travel:initialTravel(1)};
  travelTransition(s,{type:'travelExperience',city:0,project:0,step:0},1);
  expect(await writeTravelDiary(await prepareTravelMemory(s.travel))).toBeUndefined();expect(mocks.chat).not.toHaveBeenCalled();
 });
});

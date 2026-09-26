import {expect,it,vi} from 'vitest';
vi.mock('../src/main/config',()=>({getSettings:vi.fn(async()=>({arkApiKey:'test'}))}));
vi.mock('../src/main/rooms/rooms',()=>({gardenRequest:vi.fn(async()=>({}))}));
vi.mock('../src/main/llm-client',()=>({chatComplete:vi.fn(async()=>'昨晚看书看晚了，今天先缓缓。'),BRAIN_MODEL:'test'}));
vi.mock('../src/main/brain-log',()=>({beginBrainCall:async()=> 'test',updateBrainCall:vi.fn()}));
import {respondCompanionUser,userChatMessages} from '../src/main/companion-user-dialogue';
import {gardenRequest} from '../src/main/rooms/rooms';
import {chatComplete} from '../src/main/llm-client';
it('keeps the virtual user separate from character identity and treats nickname as a label',()=>{
 const messages=userChatMessages({nickname:'翻到第七页',persona:'熬夜，直性子'},'问候',['用户甲：你好']);
 expect(JSON.parse(messages[1].content)).toEqual({user:{nickname:'翻到第七页',persona:'熬夜，直性子'},topic:'问候',history:['用户甲：你好']});
 expect(messages[0].content).toContain('不是用户携带的桌宠角色');
 expect(messages[0].content).toContain('不把昵称字面意思');
});
it('only sends a generated user response once and drops late responses after departure',async()=>{
 const frame={request:'user-one',user:{nickname:'夜猫',persona:'直性子'},topic:'喝茶'};
 await respondCompanionUser(frame,()=>true);await respondCompanionUser(frame,()=>true);
 expect(gardenRequest).toHaveBeenCalledTimes(1);
 let resolve!:(s:string)=>void;vi.mocked(chatComplete).mockImplementationOnce(()=>new Promise(r=>resolve=r));
 let connected=true;const pending=respondCompanionUser({...frame,request:'user-two'},()=>connected);
 await vi.waitFor(()=>expect(resolve).toBeDefined());connected=false;resolve('这杯茶挺好。');await pending;
 expect(gardenRequest).toHaveBeenCalledTimes(1);
});

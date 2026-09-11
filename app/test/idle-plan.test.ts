import {it,expect} from 'vitest';
import {IdleDirector,parseIdleDecision} from '../src/shared/idle-plan';
import {parseBrainResponse} from '../src/main/brain-llm-rules';
import {parseChatReply} from '../src/main/pet-chat-rules';
it('thinking and chatting choose an independently whitelisted idle, including silent thoughts',()=>{
 expect(parseBrainResponse('{"do":false,"idleAction":"relax","idleMinutes":5}',['dance'],['relax'])).toMatchObject({do:false,idleAction:'relax',idleMinutes:5});
 expect(parseChatReply('{"action":"dance","say":["辛苦啦"],"idleAction":"relax","idleMinutes":7}',['dance'],['relax'])).toMatchObject({action:'dance',idleAction:'relax',idleMinutes:7});
 expect(parseIdleDecision({idleAction:'dance'},['relax'])).toEqual({});
 expect(parseIdleDecision({idleAction:'relax',idleMinutes:0},['relax']).idleMinutes).toBe(3);
 expect(parseIdleDecision({idleAction:'relax',idleMinutes:99},['relax']).idleMinutes).toBe(15);
});
it('model idle never becomes random when expired, absent or replaced by a fresh plan',()=>{
 const d=new IdleDirector(),pool=['a','b'];
 expect(d.next(pool,'a',true,0,()=>.99)).toBe('a');
 d.accept({characterId:'pet',action:'b',chosenAt:0,until:300000});
 expect(d.next(pool,'a',true,1000,()=>0)).toBe('b');
 expect(d.next(pool,'a',true,900000,()=>0)).toBe('b');
 d.accept({characterId:'pet',action:'a',chosenAt:900001,until:1200001});
 expect(d.next(pool,'a',true,900002,()=>.99)).toBe('a');
 expect(d.next(['b'],'a',true,900003,()=>0)).toBe('b');
});
it('rule fallback stays for minutes, avoids repeats, and honors chat choices until expiry',()=>{
 const d=new IdleDirector(),pool=['a','b'];const first=d.next(pool,'a',false,0,()=>0);
 expect(d.next(pool,'a',false,12000,()=>.99)).toBe(first);
 expect(d.next(pool,'a',false,179999,()=>.99)).toBe(first);
 expect(d.next(pool,'a',false,180000,()=>0)).not.toBe(first);
 d.accept({characterId:'pet',action:'a',chosenAt:180001,until:480001});
 expect(d.next(pool,'a',false,400000,()=>.99)).toBe('a');
 d.reset();expect(d.plan).toBeNull();
});

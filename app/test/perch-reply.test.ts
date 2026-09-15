import {expect,it} from 'vitest';
import {parsePerchReply,perchReplyPrompt} from '../src/main/perch-reply';
import type {BrainInput} from '../src/main/brain-llm-rules';
it('uses persona, user context and explicit one-frame boundaries',()=>{
  const text=perchReplyPrompt({personaName:'小狗',personaTraits:'温柔',conversation:[{role:'user',source:'chat',at:Date.now(),text:'想做个游戏'}]} as BrainInput,'窗口标题');
  for(const phrase of ['小狗','温柔','想做个游戏','窗口标题','不受自动发言预算','不续讲助手未经确认','不声称持续观看'])expect(text).toContain(phrase);
});
it('requires structured observation and reply and bounds their lengths',()=>{
  expect(parsePerchReply('屏幕上有彩蛋')).toBeNull();
  expect(parsePerchReply('{"summary":"桌面"}')).toBeNull();
  expect(parsePerchReply('```json\n{"summary":"表格","say":"趴稳啦"}\n```')).toEqual({summary:'表格',say:'趴稳啦'});
  expect(parsePerchReply(JSON.stringify({summary:'甲'.repeat(200),say:'乙'.repeat(50)}))?.say).toHaveLength(40);
});

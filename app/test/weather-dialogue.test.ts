import {expect,it,vi} from 'vitest';
import {weatherMessages,writeWeatherLine} from '../src/main/weather-dialogue';
it('uses the actual persona and the selected weather rather than a suggested generic line',()=>{
 for(const kind of ['aurora','meteor'] as const){
  const messages=weatherMessages(kind,{name:'张起灵',persona:'寡言沉稳，不卖萌'});
  expect(JSON.parse(messages[1].content)).toMatchObject({character:{name:'张起灵',persona:'寡言沉稳，不卖萌'}});
  expect(messages[1].content).toContain(kind==='aurora'?'极光':'流星');
  expect(messages[0].content).toContain('寡言冷淡');expect(JSON.stringify(messages)).not.toContain('快看');
 }
});
it('validates model output and bounds stalled responses',async()=>{
 const messages=weatherMessages('aurora',{name:'角色'});
 expect(await writeWeatherLine('test',messages,vi.fn().mockResolvedValue('“抬头。”'))).toBe('抬头。');
 await expect(writeWeatherLine('test',messages,vi.fn().mockResolvedValue('字'.repeat(61)))).rejects.toThrow('格式');
 vi.useFakeTimers();
 try {const pending=expect(writeWeatherLine('test',messages,()=>new Promise(()=>{}))).rejects.toThrow('超时');await vi.advanceTimersByTimeAsync(8000);await pending;}
 finally{vi.useRealTimers();}
});

import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ settings: { activeCharacter: 'host', arkApiKey: 'test' }, persona: '寡言的书迷',
  write: vi.fn(), request: vi.fn() }));
vi.mock('../src/main/config', () => ({ getSettings: async () => ({ ...mock.settings }) }));
vi.mock('../src/main/characters', () => ({ getCharacter: async () => ({ manifest: { name: '小青', persona: mock.persona } }) }));
vi.mock('../src/main/rooms/rooms', () => ({ gardenRequest: mock.request }));
vi.mock('../src/main/pair-dialogue', () => ({ writePairLine: mock.write }));
import { respondPairLine } from '../src/main/pair-dialogue-network';
let sequence=0;
const frame=()=>({request:`req-${++sequence}`,actor:'host',kind:'tea',step:0,partner:'伙伴',history:[]});
beforeEach(()=>{mock.settings.activeCharacter='host';mock.persona='寡言的书迷';mock.write.mockReset().mockResolvedValue('这页读完了，喝口茶。');mock.request.mockReset().mockResolvedValue({ok:true});});
it('reads the owner persona locally and returns only the utterance; deduplicates requests',async()=>{
  const f=frame();await respondPairLine(f,()=>true);await respondPairLine(f,()=>true);
  expect(mock.write).toHaveBeenCalledTimes(1);
  expect(mock.write).toHaveBeenCalledWith('test',expect.objectContaining({voice:{name:'小青',persona:'寡言的书迷'},kind:'tea'}));
  expect(mock.request).toHaveBeenCalledWith({action:'pair:line',request:f.request,line:'这页读完了，喝口茶。'});
  expect(JSON.stringify(mock.request.mock.calls)).not.toContain('寡言');
});
it('uses the explicit companion persona, never the human persona for the other actor',async()=>{
  await respondPairLine({...frame(),companion:{name:'翻到第七页',persona:'克制的读书伙伴'}},()=>true);
  expect(mock.write).toHaveBeenCalledWith('test',expect.objectContaining({voice:{name:'翻到第七页',persona:'克制的读书伙伴'}}));
});
it('drops results after disconnect, role change or persona edit',async()=>{
  for(const change of ['disconnect','actor','persona']){
    mock.settings.activeCharacter='host';mock.persona='寡言的书迷';let connected=true;
    mock.write.mockImplementationOnce(async()=>{if(change==='disconnect')connected=false;else if(change==='actor')mock.settings.activeCharacter='other';else mock.persona='新设定';return '过期台词';});
    await respondPairLine(frame(),()=>connected);
  }
  expect(mock.request).not.toHaveBeenCalled();
});
it('does not call the model for an unrelated actor or invalid kind',async()=>{
  await respondPairLine({...frame(),actor:'other'},()=>true);
  await respondPairLine({...frame(),kind:'invalid'},()=>true);
  expect(mock.write).not.toHaveBeenCalled();
});

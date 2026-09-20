import {describe,it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({settings:{freeMode:true,activeCharacter:'pet'},getSettings:vi.fn(),getCharacter:vi.fn(),send:vi.fn(),paused:false}));
vi.mock('../src/main/config',()=>({getSettings:m.getSettings}));
vi.mock('../src/main/characters',()=>({getCharacter:m.getCharacter}));
vi.mock('../src/main/conversation-memory',()=>({isChatting:()=>m.paused}));
vi.mock('../src/main/windows',()=>({sendToWindows:m.send}));
import {chooseJournalAction,playJournalWriting} from '../src/main/journal-animation';
beforeEach(()=>{vi.clearAllMocks();m.settings={freeMode:true,activeCharacter:'pet'};m.paused=false;m.getSettings.mockImplementation(async()=>m.settings);m.getCharacter.mockResolvedValue({manifest:{actions:{writing:{status:'done',webm:'writing.webm'},idle:{status:'done',webm:'idle.webm'}},customActions:{phone:{status:'pending',webm:'phone.webm'},typing:{status:'done',webm:'typing.webm',motionDesc:'在电脑前打字'}},stickerLibrary:{items:[{id:'typing',enabled:false,name:'打字',tags:[]}]}}});});
describe('journal writing animation',()=>{
 it('selects writing, typing or phone gestures, never unrelated idle poses',()=>{
  expect(chooseJournalAction([{id:'idle',description:'呼吸'},{id:'st_1',description:'拿手机发消息'}],()=>0)).toBe('st_1');
  expect(chooseJournalAction([{id:'sleep',description:'睡觉'}])).toBeUndefined();
 });
 it('sends only an available completed and enabled action, without forcing playback',async()=>{
  await playJournalWriting('pet');expect(m.send).toHaveBeenCalledWith('behavior:action',{action:'writing',loops:2,preview:false});
 });
 it('does not play after a role change or during a chat',async()=>{
  m.getCharacter.mockImplementationOnce(async()=>{m.settings.activeCharacter='other';return {manifest:{actions:{writing:{status:'done',webm:'writing.webm'}}}};});await playJournalWriting('pet');expect(m.send).not.toHaveBeenCalled();
  m.settings.activeCharacter='pet';m.paused=true;await playJournalWriting('pet');expect(m.send).not.toHaveBeenCalled();
 });
});

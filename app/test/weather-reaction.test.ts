import {expect,it,vi,beforeEach} from 'vitest';
import {weatherReaction} from '../src/shared/weather-reaction';
const m=(actions:Record<string,unknown>,extra={})=>({actions,...extra}) as any;
const clip={webm:'x.webm',status:'done'};
it('prefers looking up over generic happiness and skips unfinished clips',()=>{
  expect(weatherReaction('meteor',m({talk_happy:clip,look_up:clip})).action).toBe('look_up');
  expect(weatherReaction('meteor',m({look_up:{...clip,status:'pending'},talk_happy:clip})).action).toBe('talk_happy');
});
it('uses sticker semantics and excludes disabled and negative clips',()=>{
  const manifest=m({}, {customActions:{a:clip,b:clip,c:clip},stickerLibrary:{scenes:{},items:[
    {id:'a',name:'抬头',tags:[],enabled:false},{id:'b',name:'不开心',tags:['开心'],enabled:true},{id:'c',name:'期待',tags:[],enabled:true}]}});
  expect(weatherReaction('meteor',manifest).action).toBe('c');
});
it('uses bubble only when no appropriate clip exists',()=>{
  expect(weatherReaction('aurora',m({angry:clip})).action).toBeNull();
  expect(weatherReaction('meteor',m({})).text).toContain('许个愿');
  expect(weatherReaction('aurora',m({})).text).toContain('极光');
});
const mock=vi.hoisted(()=>({settings:vi.fn(),character:vi.fn(),say:vi.fn(),play:vi.fn(),visible:true}));
vi.mock('../src/main/config',()=>({getSettings:mock.settings}));
vi.mock('../src/main/characters',()=>({getCharacter:mock.character}));
vi.mock('../src/main/windows',()=>{
 const pet={isDestroyed:()=>false,isVisible:()=>mock.visible,webContents:{send:mock.play}};
 return {getPetWindow:()=>pet,showBubbleWindow:()=>({isDestroyed:()=>false,webContents:{isLoading:()=>false,send:mock.say}})};
});
import {reactToWeather,cancelWeatherReaction} from '../src/main/weather-reaction';
beforeEach(()=>{cancelWeatherReaction();mock.visible=true;mock.say.mockClear();mock.play.mockClear();mock.settings.mockReset().mockResolvedValue({activeCharacter:'pet',freeMode:true});mock.character.mockReset().mockResolvedValue({manifest:m({look_up:clip})});});
it('delivers local bubble and one selected action even in free mode',async()=>{
 await reactToWeather('meteor');expect(mock.say).toHaveBeenCalledWith('behavior:say',expect.objectContaining({text:expect.stringContaining('流星'),durationMs:8000}));
 expect(mock.play).toHaveBeenCalledWith('pet:menuCommand',{type:'play',action:'look_up'});
});
it('does not deliver late feedback after restore or a character change',async()=>{
 let resolve!:(value:any)=>void;mock.character.mockImplementationOnce(()=>new Promise(r=>resolve=r));
 const task=reactToWeather('meteor');await Promise.resolve();cancelWeatherReaction();resolve({manifest:m({look_up:clip})});await task;
 expect(mock.say).not.toHaveBeenCalled();expect(mock.play).not.toHaveBeenCalled();
 mock.settings.mockResolvedValueOnce({activeCharacter:'pet'}).mockResolvedValueOnce({activeCharacter:'other'});
 await reactToWeather('aurora');expect(mock.say).not.toHaveBeenCalled();
});
it('does not reveal a hidden pet',async()=>{mock.visible=false;await reactToWeather('meteor');expect(mock.say).not.toHaveBeenCalled();});

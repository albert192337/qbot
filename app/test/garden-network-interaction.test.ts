import {beforeEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({send:vi.fn(),guest:true}));
vi.mock('electron',()=>({app:{getPath:()=>''},BrowserWindow:{getAllWindows:()=>[]}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:'host'}),setSettings:vi.fn()}));
vi.mock('../src/main/rooms/rooms',()=>({gardenRealm:()=>'',gardenRequest:vi.fn()}));
vi.mock('../src/main/windows',()=>({getPetWindow:()=>({webContents:{send:mock.send}})}));
vi.mock('../src/main/characters',()=>({getCharacter:async()=>({dirId:'host',manifest:{name:'主人',actions:{idle:{webm:'idle.webm'}}}})}));
vi.mock('../src/main/rooms/room-pets',()=>({getMemberSnapshot:()=>({character:mock.guest?{dirId:'cached-friend',manifest:{name:'伙伴',actions:{idle:{webm:'idle.webm'}}}}:null})}));
import {playNetworkInteraction} from '../src/main/garden/network';
beforeEach(()=>{mock.send.mockClear();mock.guest=true;});
it('shows both cached characters once after a consented photo begins, without restarting at each beat',async()=>{await playNetworkInteraction({actor:'host',partner:'friend',kind:'photo',intent:'happy',step:0});expect(mock.send).toHaveBeenCalledWith('pet:menuCommand',expect.objectContaining({type:'networkPair',kind:'photo',recipient:true,guest:expect.objectContaining({dirId:'cached-friend'})}));await playNetworkInteraction({actor:'host',partner:'friend',kind:'photo',intent:'happy',step:1});expect(mock.send).toHaveBeenCalledTimes(1);});
it('uses a compatible local action when partner media is unavailable, and ignores another role',async()=>{mock.guest=false;await playNetworkInteraction({actor:'host',partner:'friend',kind:'photo',intent:'happy',step:0});expect(mock.send).toHaveBeenCalledWith('pet:menuCommand',{type:'play',action:'idle'});mock.send.mockClear();await playNetworkInteraction({actor:'different',partner:'friend',kind:'photo',intent:'happy',step:0});expect(mock.send).not.toHaveBeenCalled();});

import {PAIR_INTERACTIONS,pairBeats} from '../src/shared/pair-interaction';
it('routes every kind and both roles into the shared director exactly once',async()=>{
 for(const {id:kind} of PAIR_INTERACTIONS){
  const first=pairBeats(kind)[0];expect(first.host).not.toBe(first.guest);
  for(const recipient of [false,true]){
   mock.send.mockClear();
   await playNetworkInteraction({actor:'host',partner:'friend',kind,intent:recipient?first.guest:first.host,step:0});
   expect(mock.send).toHaveBeenCalledWith('pet:menuCommand',expect.objectContaining({type:'networkPair',kind,recipient}));
   await playNetworkInteraction({actor:'host',partner:'friend',kind,intent:'happy',step:1});
   expect(mock.send).toHaveBeenCalledTimes(1);
  }
 }
});

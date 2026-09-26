import {expect,it,vi} from 'vitest';
vi.mock('../src/main/characters',()=>({charactersDir:()=>'/characters'}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:'a'})}));
vi.mock('../src/main/asset-pack',()=>({packCharacterDir:vi.fn(),chunkToBase64:()=>[],ChunkAssembler:class{},unpackCharacter:vi.fn()}));
import {packCharacterDir} from '../src/main/asset-pack';
import * as pets from '../src/main/rooms/room-pets';
it('queues the newest identity behind an in-flight package and cancels refresh on leaving',async()=>{
 vi.useFakeTimers();const send=vi.fn();pets.setRoomsSend(send);pets.startLocalTest('self');
 vi.mocked(packCharacterDir).mockResolvedValueOnce({hash:'a'.repeat(16),buffer:Buffer.from('old')}).mockResolvedValueOnce({hash:'b'.repeat(16),buffer:Buffer.from('new')});
 try{pets.notifyRoomCharacterChanged();await vi.advanceTimersByTimeAsync(250);expect(packCharacterDir).toHaveBeenCalledTimes(1);
 pets.notifyRoomCharacterChanged();await vi.advanceTimersByTimeAsync(500);expect(packCharacterDir).toHaveBeenCalledTimes(1);
 pets.handlePackFrame({t:'pack:have:ack',hash:'a'.repeat(16),cached:true});await vi.advanceTimersByTimeAsync(250);expect(packCharacterDir).toHaveBeenCalledTimes(2);
 pets.handlePackFrame({t:'pack:have:ack',hash:'b'.repeat(16),cached:true});expect(send).toHaveBeenLastCalledWith({t:'pack:announce',hash:'b'.repeat(16)});
 pets.notifyRoomCharacterChanged();pets.onLeftRoom();await vi.advanceTimersByTimeAsync(500);expect(packCharacterDir).toHaveBeenCalledTimes(2);
 }finally{pets.onLeftRoom();vi.useRealTimers();}
});

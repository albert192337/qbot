import { app, nativeImage, utilityProcess } from 'electron';
import path from 'node:path';
import { ROOMS } from '../../shared/config';
import * as Rooms from '../rooms/rooms';
import { createLoungeWindow, pushToLounge } from '../windows';
import { SteamBridge } from './bridge';
import { joinFromArgs, roomRealm, steamConfig } from './rules';

let service: SteamBridge | undefined;
export function getSteam(): SteamBridge {
  return service ??= new SteamBridge({
    config: steamConfig(process.env, app.isPackaged),
    realm: roomRealm(process.env.QBOT_ROOMS_URL || ROOMS.URL_CHAIN[0]),
    spawn: () => utilityProcess.fork(path.join(__dirname,'steam-worker.js'),[],{serviceName:'QBot Steam',stdio:'ignore'}),
    decode: state => {
      const decodeAvatar = (value?: string) => {
      if (!value?.startsWith('rgba:')) return undefined;
      const [,w,h,data] = value.split(':'); const width=Number(w),height=Number(h);
      if (!width || !height || width>256 || height>256) return undefined;
      const rgba=Buffer.from(data,'base64'); if (rgba.length!==width*height*4) return undefined;
      const bgra = Buffer.from(rgba);
      for (let i = 0; i < bgra.length; i += 4) { bgra[i] = rgba[i + 2]; bgra[i + 2] = rgba[i]; }
      return nativeImage.createFromBitmap(bgra, { width, height }).toDataURL();
      };
      if(state.self)state.self.avatar=decodeAvatar(state.self.avatar);
      for(const friend of state.friends)friend.avatar=decodeAvatar(friend.avatar);
      return state;
    },
    room: () => {
      const cache = Rooms.getRoomsCache();
      return cache.room ? { roomId: cache.room.roomId, testing: cache.room.testing, online: cache.status.phase === 'in-room' } : null;
    },
    changed: state => pushToLounge('steam:changed', state),
    incoming: () => { if (app.isReady()) createLoungeWindow(); },
  });
}
export function startSteam(): void {
  getSteam().start();
  handleSteamArgs(process.argv);
}
export function handleSteamArgs(args: string[]): void {
  const command = joinFromArgs(args);
  if (command) getSteam().receive(command);
}
export function stopSteam(): void { service?.stop(); }

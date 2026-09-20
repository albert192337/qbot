import { BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getSettings, setSettings } from './config';
import { getCharacter } from './characters';
import { createRoomChatWindow, getPetWindow } from './windows';
import * as Rooms from './rooms/rooms';
import * as RoomPets from './rooms/room-pets';
import { listTestGuests } from './rooms/test-guests';
import { choosePairAction, pairActions, type PairKind } from '../shared/pair-interaction';
import type { SocialProfile } from '../shared/social';
import { getSteam } from './steam/runtime';

/** Steam SDK identity is separate from legacy room authentication. */
export function registerSocialIpc(steamService: () => Pick<ReturnType<typeof getSteam>, 'snapshot'|'refresh'|'invite'|'dismiss'|'accept'> | import('./steam/service').SteamService = getSteam): void {
  const prepareJoin = async (event: Electron.IpcMainInvokeEvent) => {
    await Rooms.prepareSocialConnection();
    if ((await getSettings()).roomsChatConsent) return true;
    const win=BrowserWindow.fromWebContents(event.sender);if(!win)return false;
    const result=await dialog.showMessageBox(win,{type:'info',title:'一起玩之前',message:'让朋友看到你的小屋与桌宠',
      detail:'房间会同步昵称、角色动作、当前状态，以及桌宠实际举起的牌面文字（可能包含歌曲名或工作提示）。角色美术素材会缓存供房友展示，不含人设和私人对话。手动发送的聊天保留最近 50 条，世界聊天对广场用户公开。'+(Rooms.isSecureTransport()?'':'\n\n当前房间连接未加密，聊天与牌面文字将通过此连接传输。'),
      buttons:['知道了，继续','暂不加入'],defaultId:0,cancelId:1});
    if(result.response!==0)return false;
    await setSettings({roomsChatConsent:true});return true;
  };
  ipcMain.handle('social:prepareJoin', prepareJoin);
  const steamSender = (event: Electron.IpcMainInvokeEvent) => {
    const url = new URL(event.sender.getURL());
    url.search = ''; url.hash = '';
    const expected = process.env.ELECTRON_RENDERER_URL
      ? `${process.env.ELECTRON_RENDERER_URL}/social/index.html`
      : pathToFileURL(path.join(__dirname, '../renderer/social/index.html')).href;
    if (url.href !== expected || event.senderFrame !== event.sender.mainFrame) throw new Error('Steam 操作只允许来自一起玩窗口');
    return steamService();
  };
  ipcMain.handle('steam:get', event => steamSender(event).snapshot());
  ipcMain.handle('steam:refresh', event => steamSender(event).refresh());
  ipcMain.handle('steam:invite', (event, id) => steamSender(event).invite(id));
  ipcMain.handle('steam:dismiss', (event, id) => steamSender(event).dismiss(id));
  ipcMain.handle('steam:accept', (event, id) => steamSender(event).accept(id, async () => {
    const pending = steamService().snapshot().pendingJoin;
    const current = Rooms.getRoomsCache().room;
    if (current && pending && current.roomId !== pending.roomId) {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return false;
      const answer = await dialog.showMessageBox(win, {type:'question',title:'前往朋友的小屋',message:'加入后会离开当前房间，继续吗？',buttons:['前往','留在这里'],defaultId:1,cancelId:1});
      if (answer.response !== 0) return false;
    }
    return prepareJoin(event);
  }, code => Rooms.joinRoom(code)));
  ipcMain.handle('social:profile', async (): Promise<SocialProfile> => {
    const settings = await getSettings();
    const character = settings.activeCharacter ? await getCharacter(settings.activeCharacter) : null;
    const actions = character?.manifest ? [...pairActions(character.manifest)].map(([id,clip]) => ({id, label:clip.sourceName || id})) : [];
    const wanted = character && settings.socialPoses?.[character.dirId];
    const steam = steamService().snapshot();
    return {platform:{available:steam.phase === 'ready', label:steam.label, reason:steam.reason},
      nickname:settings.nickname || settings.marketNickname || '我', character, actions, pose:actions.some(a => a.id === wanted) ? wanted! : '',
      lastRoom:settings.socialLastRoom, favorites:settings.roomsFavorites || [], extended:Rooms.supportsSocial()};
  });
  ipcMain.handle('social:pose', async (_e, action: string) => {
    const settings = await getSettings(); const active = settings.activeCharacter;
    const character = active ? await getCharacter(active) : null;
    if (!active || !character) throw new Error('请先选择角色');
    if (typeof action !== 'string' || action && !pairActions(character.manifest).has(action)) throw new Error('这个角色没有此动作');
    await setSettings({socialPoses:{...settings.socialPoses, [active]:action}});
    await Rooms.refreshSocialPose();
  });
  ipcMain.on('social:openChat', () => createRoomChatWindow());
  ipcMain.handle('social:copyCode', () => {
    const room = Rooms.getRoomsCache().room;
    if (!room || room.testing) throw new Error('本地试演没有可分享的房间码');
    clipboard.writeText(room.roomId); return room.roomId;
  });
  ipcMain.handle('social:pin', (event, pin: boolean) => {
    const win=BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('聊天窗口已关闭');
    win.setAlwaysOnTop(pin === true, process.platform === 'win32' ? 'pop-up-menu' : 'floating');
    if (pin && !win.isAlwaysOnTop()) throw new Error('窗口置顶未生效，请再试一次');
  });
  ipcMain.on('social:close', event => BrowserWindow.fromWebContents(event.sender)?.close());
  ipcMain.handle('social:send', (_e, text, world) => Rooms.sendSocialChat(text, world === true));
  const subscribers = new Set<number>();
  ipcMain.handle('social:world', async (event, sub) => {
    if (sub) {
      if (!subscribers.has(event.sender.id)) {
        subscribers.add(event.sender.id);
        event.sender.once('destroyed', () => {
          subscribers.delete(event.sender.id);
          if (!subscribers.size) void Rooms.subscribeWorld(false).catch(() => {});
        });
      }
      try { return await Rooms.subscribeWorld(true); } catch (error) { subscribers.delete(event.sender.id); throw error; }
    }
    subscribers.delete(event.sender.id);
    return subscribers.size ? [] : Rooms.subscribeWorld(false);
  });
  ipcMain.handle('social:moderate', (_e, id, action, world) => Rooms.moderateSocial(id, action, world === true));
  ipcMain.handle('social:guests', () => listTestGuests());
  ipcMain.handle('social:startTest', () => Rooms.startTestRoom());
  ipcMain.handle('social:inviteTest', (_e, id) => Rooms.inviteTestGuest(id));
  ipcMain.handle('social:removeTest', (_e, id) => Rooms.removeTestGuest(id));
  ipcMain.handle('social:replyTest', (_e, id, text) => Rooms.replyTestGuest(id, text));
  ipcMain.handle('social:interactTest', async (_e, id: string, kind: PairKind) => {
    const intents = {heart:'heart', tea:'tea', chat:'talk', wave:'wave'} as const;
    if (!Object.hasOwn(intents, kind)) throw new Error('未知互动');
    const guest = Rooms.getTestGuest(id);
    if (!guest) throw new Error('测试访客不存在');
    const action = choosePairAction(guest.character.manifest, intents[kind]);
    if (action) RoomPets.onPresence(id, 'idle', action.id);
    const settings = await getSettings();
    const host = settings.activeCharacter && await getCharacter(settings.activeCharacter);
    if (host) {
      const hostAction = choosePairAction(host.manifest, intents[kind]);
      if (hostAction) getPetWindow()?.webContents.send('pet:menuCommand', {type:'play', action:hostAction.id});
    }
    if (!Rooms.getTestGuest(id)) return;
    Rooms.replyTestGuest(id, ({heart:'小心心收到了！',tea:'好呀，一起喝杯茶。',chat:'嗯嗯，我在听。',wave:'嗨！见到你真好。'})[kind]);
  });
}

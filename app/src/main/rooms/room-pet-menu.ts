import { BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import { findRoomPetMemberId, createLoungeWindow } from '../windows';
import { getMemberSnapshot } from './room-pets';
import { waveAt, leaveRoom } from './rooms';
import { PAIR_INTERACTIONS } from '../../shared/pair-interaction';
import { setMemberHidden, desktopHidden, memberHidden } from '../desktop-visibility';

async function interactions() {
  const { CHARACTER_UNLOCKS, currentGrowth, characterLevel } = await import('../../shared/garden-life');
  const { getGarden } = await import('../garden/service');
  const level=characterLevel(currentGrowth(await getGarden())?.xp??0);
  return PAIR_INTERACTIONS.map(k=>{const unlock=CHARACTER_UNLOCKS.find(u=>u.kind===k.id);return {...k,level:unlock&&level<unlock.level?unlock.level:undefined};});
}
async function interact(memberId:string,kind:import('../../shared/pair-interaction').PairKind):Promise<string> {
  if(desktopHidden()||memberHidden(memberId)||!getMemberSnapshot(memberId))throw Error('房友暂时不可见');
  const item=(await interactions()).find(k=>k.id===kind);
  if(!item)throw Error('无效的互动');if(item.level)throw Error(`角色 Lv.${item.level} 解锁`);
  const {getTestGuest}=await import('./rooms');
  if(getTestGuest(memberId)){await (await import('../social-ipc')).interactTestGuest(memberId,kind);return '试演互动开始';}
  if(kind==='wave'){waveAt(memberId);return '已打招呼';}
  await (await import('../garden/network')).inviteInteraction(memberId,kind);return '邀请已发出，等待对方回应';
}

export function registerRoomPetMenu(): void {
  const sender=(e:Electron.IpcMainInvokeEvent)=>{const win=BrowserWindow.fromWebContents(e.sender),id=win&&findRoomPetMemberId(win);if(!id)throw Error('不是房友窗口');return id;};
  ipcMain.handle('roomPet:interactions',e=>{sender(e);return interactions();});
  ipcMain.handle('roomPet:interact',(e,kind)=>interact(sender(e),kind));
  ipcMain.on('roomPet:popupMenu', async (ev) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    const memberId = win && findRoomPetMemberId(win);
    if (!win || !memberId) return;
    const { getTestGuest } = await import('./rooms');
    const { CHARACTER_UNLOCKS, currentGrowth, characterLevel } = await import('../../shared/garden-life');
    const { getGarden } = await import('../garden/service');
    const run = (action: () => Promise<unknown>) => { void action().catch(error => {
      if (!desktopHidden()&&!win.isDestroyed()&&win.isVisible()) void dialog.showMessageBox(win, {type:'info',message:String(error instanceof Error ? error.message : error)});
    }); };
    let level = 1;
    try { level = characterLevel(currentGrowth(await getGarden())?.xp ?? 0); } catch { /* Server still validates every invitation. */ }
    if (win.isDestroyed() || !getMemberSnapshot(memberId)) return;
    const local = !!getTestGuest(memberId);
    const items: Electron.MenuItemConstructorOptions[] = PAIR_INTERACTIONS.map(kind => {
      const unlock = CHARACTER_UNLOCKS.find(u => u.kind === kind.id);
      const locked = !!unlock && level < unlock.level;
      return {label: kind.label + (locked ? `（角色 Lv.${unlock!.level} 解锁）` : ''), enabled: !locked,
        click: () => run(async () => {
          if (local) await (await import('../social-ipc')).interactTestGuest(memberId, kind.id);
          else if (kind.id === 'wave') waveAt(memberId);
          else {
            await (await import('../garden/network')).inviteInteraction(memberId, kind.id);
            if (!desktopHidden()&&!win.isDestroyed()&&win.isVisible()) void dialog.showMessageBox(win, {type:'info',message:'邀请已发出，等待对方回应'});
          }
        })};
    });
    items.push({type:'separator'},
      {label:'在我的桌面隐藏',click:()=>setMemberHidden(memberId,true)},
      {label:'查看花园名片',click:()=>run(async()=>{(await import('../garden/windows')).openGardenPanel('visit:'+memberId);})},
      {label:'一起玩',click:()=>createLoungeWindow()},
      {label:'房间聊天',click:()=>{void import('../windows').then(m=>m.createRoomChatWindow());}},
      {label:'退出房间',click:()=>{void leaveRoom();}});
    if(!desktopHidden()&&win.isVisible())Menu.buildFromTemplate(items).popup({window:win});
  });
}

import { registerRoomPetMenu } from '../../src/main/rooms/room-pet-menu';
import { registerDesktopVisibility } from '../../src/main/desktop-visibility';
import { SteamService } from '../../src/main/steam/service';
import { roomRealm } from '../../src/main/steam/rules';
import { getSteam, startSteam, stopSteam } from '../../src/main/steam/runtime';
/** Isolated native QA with production rooms/social/window code and real loopback server. */
import { app, ipcMain, protocol, session, BrowserWindow } from 'electron';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { registerSocialIpc } from '../../src/main/social-ipc';
import * as Rooms from '../../src/main/rooms/rooms';
import * as Windows from '../../src/main/windows';
import * as Pets from '../../src/main/rooms/room-pets';
import { wireRoomPetDisplay, getRoomDisplayMode, setRoomDisplayMode } from '../../src/main/rooms/room-pet-display';

const root=process.env.QBOT_QA_ROOT!;
app.setPath('userData',process.env.QBOT_QA_DATA!);
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true,bypassCSP:true}}]);
app.whenReady().then(async()=>{
  registerDesktopVisibility();
  const chars=path.join(app.getPath('userData'),'characters');await mkdir(chars,{recursive:true});
  for(const [id,name] of [['host','小芽'],['guest','棉花糖'],['.peer-0123456789abcdef','老朋友']]){
    const target=path.join(chars,id);await cp(path.join(root,'app/resources/presets/mascot'),target,{recursive:true});
    const manifest=JSON.parse(await readFile(path.join(target,'manifest.json'),'utf8'));manifest.name=name;
    await writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest));
  }
  await writeFile(path.join(chars,'.peer-0123456789abcdef','.social-origin.json'),JSON.stringify({nickname:'昨日房友'}));
  await writeFile(path.join(app.getPath('userData'),'config.json'),JSON.stringify({activeCharacter:'host',nickname:'小岛来客',roomsShowMyPet:false,roomsChatConsent:true}));
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  protocol.handle('qbot-asset',async request=>{
    const u=new URL(request.url);const file=path.resolve(chars,u.hostname,decodeURIComponent(u.pathname).slice(1));
    if(!file.startsWith(chars+path.sep))return new Response(null,{status:403});
    try{return new Response(await readFile(file),{headers:{'Content-Type':file.endsWith('.webm')?'video/webm':'image/png'}});}catch{return new Response(null,{status:404});}
  });
  Rooms.setLoungePush(Windows.pushToLounge);wireRoomPetDisplay();
  let fakeSteam: SteamService | undefined;
  if (process.env.QBOT_QA_STEAM === 'fake') {
    let pending = '';
    const realm = roomRealm(process.env.QBOT_ROOMS_URL!);
    fakeSteam = new SteamService({config:{appId:480,demo:true},realm,
      room:()=>{const {room,status}=Rooms.getRoomsCache();return room?{roomId:room.roomId,testing:room.testing,online:status.phase==='in-room'}:null;},
      native:()=>({init:()=>{},shutdown:()=>{},launchCommand:()=>'',setConnect:()=>{},
        read:()=>({online:true,self:{steamId:'76561198000000001',name:'界面测试账号'},friends:[
          {steamId:'76561198000000002',name:'小岛来客（模拟好友）',state:1},
          {steamId:'76561198000000003',name:'<img src=x onerror=alert(1)>（转义测试）',state:0},
        ]}),
        invite:(_id,command)=>{pending=command;console.log('FAKE_STEAM_INVITE');return true;},
        pump:cb=>{if(pending){const value=pending;pending='';cb(value,'76561198000000002');}},
      }),changed:state=>Windows.pushToLounge('steam:changed',state),incoming:()=>Windows.createLoungeWindow()});
    fakeSteam.start();
    app.on('before-quit',()=>fakeSteam!.stop());
  } else if (process.env.QBOT_QA_STEAM === 'live') { startSteam(); app.on('before-quit',stopSteam); }
  registerRoomPetMenu();
  if(process.env.QBOT_QA_COMPANIONS==='1'){
    (await import('../../src/main/garden/windows')).registerGardenIpc();
    await (await import('../../src/main/config')).setSettings({gardenOnline:true});
  }
  registerSocialIpc(fakeSteam ? () => fakeSteam! : getSteam);
  const handlers:Record<string,(...args:any[])=>unknown>={
    'rooms:getCache':()=>Rooms.getRoomsCache(),'rooms:getStatus':()=>Rooms.getRoomsStatus(),
    'rooms:list':(_e,kind,q)=>Rooms.listRooms(kind,q),'rooms:create':(_e,input)=>Rooms.createRoom(input),'rooms:join':(_e,id)=>Rooms.joinRoom(id),
    'rooms:leave':()=>Rooms.leaveRoom(),'rooms:update':(_e,patch)=>Rooms.updateRoom(patch),'rooms:kick':(_e,id)=>Rooms.kickMember(id),
    'rooms:toggleFavorite':(_e,id)=>Rooms.toggleFavorite(id),'rooms:getDisplayMode':()=>getRoomDisplayMode(),'rooms:setDisplayMode':(_e,mode)=>setRoomDisplayMode(mode),
    'roomPet:getCache':event=>{const w=BrowserWindow.fromWebContents(event.sender);const id=w&&Windows.findRoomPetMemberId(w);const s=id&&Pets.getMemberSnapshot(id);return s?{hello:{nickname:s.nickname},character:s.character,state:{mode:s.mode,action:s.action,sign:s.sign}}:null;},
  };
  for(const [name,handler] of Object.entries(handlers))ipcMain.handle(name,handler);
  ipcMain.on('rooms:wave',(_event,id)=>Rooms.waveAt(id));
  ipcMain.on('rooms:open',()=>Windows.createLoungeWindow());
  ipcMain.on('roomPet:wave',event=>{const w=BrowserWindow.fromWebContents(event.sender);const id=w&&Windows.findRoomPetMemberId(w);if(id)Rooms.waveAt(id);});
  ipcMain.on('roomPet:leaveRoom',()=>Rooms.leaveRoom());
  ipcMain.on('roomPet:move',(event,x,y)=>{const win=BrowserWindow.fromWebContents(event.sender);if(win)Windows.moveRoomPetWindow(win,x,y);});
  (globalThis as any).qa={Rooms,Windows,Pets};
  const socialWindow = Windows.createLoungeWindow();
  if (process.env.QBOT_QA_WIDTH) socialWindow.setSize(Number(process.env.QBOT_QA_WIDTH), 620);
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>Rooms.disconnectRooms());

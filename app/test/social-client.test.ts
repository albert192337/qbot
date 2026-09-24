vi.mock('../src/main/rooms/contact-cache',()=>({readContactCache:()=>({}),saveContactCache:vi.fn()}));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const data=vi.hoisted(()=>({settings:{activeCharacter:'host',nickname:'我'} as Record<string,unknown>, guests:[] as any[]}));
vi.mock('../src/main/config',()=>({getSettings:async()=>data.settings,setSettings:async(p:object)=>Object.assign(data.settings,p)}));
vi.mock('../src/main/characters',()=>({getCharacter:async()=>null}));
vi.mock('../src/main/rooms/test-guests',()=>({listTestGuests:async()=>data.guests}));
vi.mock('../src/main/rooms/room-pets',()=>({setContactRealm:vi.fn(),setRoomsSend:vi.fn(),onLeftRoom:vi.fn(),onJoinedRoom:vi.fn(),startLocalTest:vi.fn(),addLocalTestGuest:vi.fn(),onMemberOut:vi.fn(),onMemberIn:vi.fn(),onPresence:vi.fn(),onChat:vi.fn(),onMemberPack:vi.fn(),handlePackError:vi.fn(),handlePackFrame:vi.fn(),notifyRoomCharacterChanged:vi.fn()}));
class Socket {
  static all:Socket[]=[];
  static enhanced=true;
  static autoOpen=true;
  static ignore='';
  readyState=0;sent:any[]=[];
  listeners=new Map<string,Array<(e:any)=>void>>();
  constructor(){Socket.all.push(this);if(Socket.autoOpen)queueMicrotask(()=>this.open());}
  addEventListener(type:string,fn:(e:any)=>void){this.listeners.set(type,[...(this.listeners.get(type)||[]),fn]);}
  fire(type:string,e:any={}){for(const fn of this.listeners.get(type)||[])fn(e);}
  open(){this.readyState=1;this.fire('open');}
  receive(f:object){this.fire('message',{data:JSON.stringify(f)});}
  send(raw:string){const f=JSON.parse(raw);this.sent.push(f);if(f.t===Socket.ignore)return;
    let out:any;
    if(f.t==='hello')out={t:'hello:ack',memberId:'ABCDEFGHIJKL',social:Socket.enhanced?1:undefined};
    if(f.t==='list')out={t:'rooms',rooms:[]};
    if(f.t==='world:subscribe')out={t:'world:history',messages:[]};
    if(out)queueMicrotask(()=>this.receive({...out,...(Socket.enhanced?{requestId:f.requestId}:{})}));
  }
  close(){this.readyState=3;this.fire('close');}
}
let rooms:typeof import('../src/main/rooms/rooms');
beforeEach(async()=>{
  vi.resetModules();vi.useFakeTimers();Socket.all=[];Socket.enhanced=true;Socket.autoOpen=true;Socket.ignore='';
  data.settings={activeCharacter:'host',nickname:'我'};data.guests=[];
  vi.stubGlobal('WebSocket',Socket);vi.stubEnv('QBOT_ROOMS_URL','ws://127.0.0.1:12345');
  rooms=await import('../src/main/rooms/rooms');
});
afterEach(()=>{rooms?.disconnectRooms();vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('social connection and local rehearsal boundaries',()=>{
  it('shares the hello barrier and correlates simultaneous requests',async()=>{
    await Promise.all([rooms.listRooms(),rooms.listRooms(),rooms.listRooms()]);
    expect(Socket.all).toHaveLength(1);
    expect(Socket.all[0].sent.filter(f=>f.t==='hello')).toHaveLength(1);
    expect(new Set(Socket.all[0].sent.map(f=>f.requestId)).size).toBe(4);
  });
  it('does not blindly retry a timed-out create',async()=>{
    await rooms.listRooms();Socket.ignore='create';
    const creating=rooms.createRoom({name:'测试',kind:'idle',capacity:6,listed:false});
    const result=expect(creating).rejects.toThrow('无响应');
    await vi.advanceTimersByTimeAsync(9000);await result;
    expect(Socket.all[0].sent.filter(f=>f.t==='create')).toHaveLength(1);
  });
  it('rejects pending work on disconnect and never replays an offline message',async()=>{
    await rooms.listRooms();Socket.ignore='list';
    const pending=rooms.listRooms();const result=expect(pending).rejects.toThrow();await vi.advanceTimersByTimeAsync(0);
    rooms.disconnectRooms();await result;rooms.sendChat('不能排队重发');Socket.ignore='';await rooms.listRooms();
    expect(Socket.all.flatMap(s=>s.sent).some(f=>f.t==='chat')).toBe(false);
  });
  it('cancels a half-open real connection before starting local rehearsal',async()=>{
    Socket.autoOpen=false;const pending=rooms.listRooms();const result=expect(pending).rejects.toThrow('取消');
    await rooms.startTestRoom();Socket.all[0].open();await result;
    expect(rooms.getRoomsCache().room?.testing).toBe(true);expect(Socket.all[0].sent).toEqual([]);
  });
  it('isolates local guests/messages and prevents duplicate invitations',async()=>{
    data.guests=[{id:'guest',name:'棉花糖',source:'角色库',character:{dirId:'guest',manifest:{},hasUnfinishedJob:false}}];
    await rooms.startTestRoom();await rooms.inviteTestGuest('guest');await expect(rooms.inviteTestGuest('guest')).rejects.toThrow('已经');
    const rehearsal=await import('../src/main/garden/local-rehearsal');
    expect(rehearsal.getRehearsal()!.visit('test:guest').plots).toHaveLength(6);
    rooms.replyTestGuest('test:guest','模拟回应');await rooms.sendSocialChat('我来测试');
    expect(rooms.getRoomsCache().chat).toHaveLength(2);expect(Socket.all).toHaveLength(0);
    await expect(rooms.listRooms()).rejects.toThrow('试演');
    rooms.removeTestGuest('test:guest');expect(rooms.getRoomsCache().room?.members).toHaveLength(1);
    expect(()=>rehearsal.getRehearsal()!.visit('test:guest')).toThrow('离开');
    rooms.leaveRoom();expect(rooms.getRoomsCache().chat).toEqual([]);expect(rooms.getTestGuest('test:guest')).toBeUndefined();
    expect(rehearsal.getRehearsal()).toBeUndefined();
  });
  it('does not merge public chat into room history or duplicate public messages',async()=>{
    const push=vi.fn();rooms.setLoungePush(push);await rooms.subscribeWorld(true);
    const msg={id:'one',memberId:'another',nickname:'路人',text:'世界',at:1};
    Socket.all[0].receive({t:'world:chat',msg});Socket.all[0].receive({t:'world:chat',msg});
    expect(rooms.getRoomsCache().chat).toEqual([]);
    expect(push.mock.calls.filter(c=>c[0]==='social:world').at(-1)?.[1]).toHaveLength(1);
  });
  it('identifies legacy servers without silently accepting unsupported settings',async()=>{
    Socket.enhanced=false;await rooms.listRooms();expect(rooms.supportsSocial()).toBe(false);
    await expect(rooms.subscribeWorld(true)).rejects.toThrow('尚未更新');
    await expect(rooms.createRoom({name:'测试',kind:'idle',capacity:6,listed:true,description:'不能丢失'})).rejects.toThrow('扩展设置');
    expect(Socket.all[0].sent.some(f=>f.t==='create')).toBe(false);
  });
});

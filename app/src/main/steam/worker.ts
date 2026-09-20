import { SteamService, type SteamRoom } from './service';
import { createSteamNative } from './native';

const port=process.parentPort!;
let service: SteamService | undefined;
let room: SteamRoom | null=null;
let sequence=0;
const callbacks=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
const callback=(id:number,method:string,roomId?:string):Promise<any>=>new Promise((resolve,reject)=>{
  const callbackId=++sequence; callbacks.set(callbackId,{resolve,reject});
  port.postMessage({type:'callback',id,callbackId,method,roomId});
});
port.on('message', async ({data:message})=>{
  if (message.type==='init') {
    service=new SteamService({config:message.config,realm:message.realm,room:()=>room,
      native:()=>createSteamNative({sdkRoot:process.env.QBOT_STEAM_SDK,
        avatar:(rgba,w,h)=>`rgba:${w}:${h}:${rgba.toString('base64')}`}),
      changed:state=>port.postMessage({type:'changed',state}),incoming:()=>port.postMessage({type:'incoming'})});
    service.start(); return;
  }
  if (message.type==='room') { room=message.room; return; }
  if (message.type==='receive') { service?.receive(message.command); return; }
  if (message.type==='stop') { service?.stop(); process.exit(0); }
  if (message.type==='callbackResult') {
    const call=callbacks.get(message.id); callbacks.delete(message.id);
    if(message.error)call?.reject(new Error(message.error));else call?.resolve(message.value); return;
  }
  if (message.type!=='call' || !service) return;
  try {
    switch(message.method) {
      case 'refresh': service.refresh(); break;
      case 'invite': service.invite(message.args[0]); break;
      case 'dismiss': service.dismiss(message.args[0]); break;
      case 'accept': await service.accept(message.args[0],()=>callback(message.id,'consent'),code=>callback(message.id,'join',code)); break;
      default: throw new Error('未知 Steam 操作');
    }
    port.postMessage({type:'result',id:message.id,state:service.snapshot()});
  } catch(error) { port.postMessage({type:'result',id:message.id,error:error instanceof Error?error.message:String(error)}); }
});

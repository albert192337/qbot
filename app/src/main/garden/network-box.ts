import {app} from 'electron';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {gardenRequest,gardenRealm} from '../rooms/rooms';
import {applyGardenTransaction} from '../progress';
import type {GardenResult} from '../../shared/garden';

type Pending={operation:string;owner:string;realm:string;phase:'prepare'|'pay'|'commit'|'cancel';token?:string};
const file=()=>path.join(app.getPath('userData'),'garden-box-pending.json');
async function read():Promise<Pending|undefined>{try{return JSON.parse(await readFile(file(),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
async function save(p:Pending){await mkdir(path.dirname(file()),{recursive:true});await writeFile(file()+'.tmp',JSON.stringify(p));await rename(file()+'.tmp',file());}
async function clear(){await unlink(file());}
let queue:Promise<unknown>=Promise.resolve();
/** One durable receipt spans local debit and remote delivery. Never refund an uncertain commit. */
export function onlineBox(create=true):Promise<GardenResult|undefined>{
 const job=queue.then(()=>run(create));queue=job.catch(()=>{});return job;
}
async function run(create:boolean):Promise<GardenResult|undefined>{
 let pending=await read();if(!pending&&!create)return;
 const snapshot=await gardenRequest({action:'get'});
 if(!snapshot.ok)throw Error(String(snapshot.error));
 if(snapshot.boxProtocol!==1)throw Error(pending?'联机开箱服务尚未更新，未完成的开箱记录已保留':'联机开箱服务尚未更新，本次未扣费');
 const owner=(snapshot.state as {life?:{owner?:string}})?.life?.owner,realm=gardenRealm();
 if(!owner)throw Error('无法确认开箱账号，本次未扣费');
 if(pending&&(pending.owner!==owner||pending.realm!==realm))throw Error('有一笔开箱尚未完成，请切回原账号和服务器后重试');
 pending??={operation:`${Date.now()}-${randomUUID()}`,owner,realm,phase:'prepare'};
 await save(pending);
 const request=async(action:string)=>{
  if(gardenRealm()!==pending!.realm)throw Error('连接已切换，开箱记录已保留，请重试');
  return gardenRequest({action,operation:pending!.operation,owner:pending!.owner,token:pending!.token,payment:action==='box:commit'?pending!.operation:undefined});
 };
 if(pending.phase==='prepare'){
  const prepared=await request('box:prepare');
  if(!prepared.ok)throw Error(String(prepared.error));
  if(prepared.points!==500||prepared.boxes!==1||typeof prepared.token!=='string')throw Error('开箱费用版本不一致，本次未扣费');
  pending.token=prepared.token;pending.phase='pay';await save(pending);
 }
 if(pending.phase==='pay'){
  if(gardenRealm()!==pending.realm)throw Error('连接已切换，请重试开箱');
  const paid=await applyGardenTransaction(`online-box:${pending.operation}`,-500,-1);
  pending.phase=paid?'commit':'cancel';await save(pending);
 }
 if(pending.phase==='cancel'){
  const cancelled=await request('box:cancel');if(!cancelled.ok)throw Error(String(cancelled.error));
  await clear();return {ok:false,error:'积分或宝箱不足，未消耗任何物品'};
 }
 const result=await request('box:commit');
 if(!result.ok)throw Error(`开箱奖励待领取，记录已保留，请重试：${String(result.error)}`);
 await clear();return result as unknown as GardenResult;
}

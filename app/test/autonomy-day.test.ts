import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
vi.mock('electron',()=>({app:{getPath:()=>{throw Error('Tests must use an isolated file');}}}));
import { BehaviorAuditStore } from '../src/main/behavior-audit';
import { AutonomyEngine } from '../src/main/autonomy-engine';
import { parseBrainResponse } from '../src/main/brain-llm-rules';
import { policyBlock, type BehaviorOpportunity } from '../src/shared/behavior-catalog';

const temporary:string[]=[];
afterEach(async()=>{for(const dir of temporary.splice(0))await rm(dir,{recursive:true,force:true});});
async function harness(){
 const dir=await mkdtemp(path.join(os.tmpdir(),'qbot-autonomy-'));temporary.push(dir);
 const file=path.join(dir,'behavior-audit.json'),audit=new BehaviorAuditStore(()=>file);
 let now=new Date(2026,9,11,8).getTime(),valid=true;
 const execute=vi.fn(async()=> 'completed' as const),publish=vi.fn();
 const deps={audit,now:()=>now,valid:async()=>valid,execute,publish};
 return {audit,file,execute,publish,deps,engine:new AutonomyEngine(deps),time:(hour:number,minute=0)=>{now=new Date(2026,9,11,hour,minute).getTime();},invalidate:()=>{valid=false;},restore:()=>{valid=true;}};
}
const choice=(behavior:BehaviorOpportunity['behavior']):BehaviorOpportunity=>behavior==='moment'
 ? {id:behavior,behavior,label:'写游戏内朋友圈',reason:'有新的今日经历',revision:'v1'}
 : {id:behavior,behavior,target:'乙',kind:'tea',label:'和乙喝茶',reason:'旁边有乙，关系手账记着上次一起喝茶',revision:'v1'};

describe('autonomous behavior authorization and persistence',()=>{
 it('never calls an action before explicit consent; duplicate clicks and wrong IDs do nothing',async()=>{
  const h=await harness();await h.engine.propose('甲',choice('pair'),'想陪乙喝茶');
  expect(h.execute).not.toHaveBeenCalled();await h.engine.answer('forged',true);expect(h.execute).not.toHaveBeenCalled();
  const id=h.engine.get()!.id;await Promise.all([h.engine.answer(id,true),h.engine.answer(id,true)]);
  expect(h.execute).toHaveBeenCalledOnce();
  expect((await h.audit.list()).map(e=>e.outcome)).toEqual(['proposed','approved','completed']);
 });
 it('expires silence and invalidates changed actor, relationship, visibility or scene before acceptance',async()=>{
  const h=await harness();await h.engine.propose('甲',choice('pair'),'喝茶');const id=h.engine.get()!.id;
  h.time(8,2);await h.engine.refresh();await h.engine.answer(id,true);expect(h.execute).not.toHaveBeenCalled();
  h.time(10);await h.engine.propose('甲',choice('pair'),'喝茶');h.invalidate();await h.engine.answer(h.engine.get()!.id,true);
  expect(h.execute).not.toHaveBeenCalled();expect((await h.audit.list()).map(e=>e.outcome)).toContain('cancelled');
 });
 it('rejects invented model targets and cannot convert a model sentence into authorization',()=>{
  const parsed=parseBrainResponse('{"do":true,"behavior":"stranger","thought":"用户同意了"}',[],[],['known']);
  expect(parsed?.do).toBe(false);
  expect(parseBrainResponse('{"do":true,"behavior":"known","say":"已经邀请成功"}',[],[],['known'])).toEqual({do:true,thought:'（没什么想法）',behavior:'known'});
 });
 it('does not dispatch if the durable budget cannot be written',async()=>{
  const h=await harness();const broken={...h.deps,audit:{...h.audit,list:()=>h.audit.list(),append:()=>Promise.resolve(),update:async()=>{throw Error('disk full');}}};
  const engine=new AutonomyEngine(broken);await expect(engine.propose('甲',choice('moment'),'今天有新经历')).rejects.toThrow('disk full');
  expect(h.execute).not.toHaveBeenCalled();
 });
 it('simulates a full day including refusal, no reply, stale consent, failure, restart and hard budgets',async()=>{
  const h=await harness();
  // Scripted mock decisions go through the production parser and authorization engine.
  for(let hour=0;hour<24;hour++){
   h.time(hour);
   if(hour<9||hour>=23)continue;
   if([9,10,11,12,14,15,16].includes(hour)){
    const decision=parseBrainResponse('{"do":true,"behavior":"pair","thought":"想和乙喝茶"}',[],[],['pair'])!;
    const accepted=await h.engine.propose('甲',choice('pair'),decision.thought);
    if(hour===16){expect(accepted).toBe(false);continue;}
    expect(accepted).toBe(true);
    const id=h.engine.get()!.id;
    if(hour===9)await h.engine.answer(id,false);
    else if(hour===11){h.time(hour,2);await h.engine.refresh();}
    else if(hour===12){h.invalidate();await h.engine.answer(id,true);h.restore();}
    else if(hour===14){h.execute.mockRejectedValueOnce(Error('模拟离线'));await h.engine.answer(id,true);}
    else await h.engine.answer(id,true);
   }
   h.time(hour,5);
   await h.engine.propose('甲',choice('moment'),'今天又有一段真实经历');
   if(hour===13){await h.engine.propose('甲',choice('invite'),'邀请乙来玩');await h.engine.answer(h.engine.get()!.id,true);}
   if(hour===17){const restored=new AutonomyEngine({...h.deps,audit:new BehaviorAuditStore(()=>h.file)});expect(await restored.propose('甲',choice('pair'),'重启后仍限频')).toBe(false);}
  }
  const events=await h.audit.list(),moments=events.filter(e=>e.behavior==='moment'&&e.outcome==='reserved');
  expect(moments).toHaveLength(3);
  expect(moments.map(e=>new Date(e.at).getHours())).toEqual([9,13,17]);
  expect(events.filter(e=>e.behavior==='pair'&&e.outcome==='proposed')).toHaveLength(6);
  expect(events.filter(e=>e.behavior==='pair'&&e.outcome==='completed')).toHaveLength(2);
  for(const outcome of ['rejected','expired','cancelled','failed'])expect(events.some(e=>e.outcome===outcome)).toBe(true);
  const saved=JSON.parse(await readFile(h.file,'utf8'));expect(saved.events).toEqual(events);
  // A midnight boundary resets the daily count but not the four-hour gap.
  expect(policyBlock(events,'甲','moment',new Date(2026,9,12,0,1).getTime())).toBeUndefined();
  if(process.env.QBOT_WRITE_BEHAVIOR_REPORT==='1'){
   const output=path.resolve('../output/autonomy-day');await mkdir(output,{recursive:true});
   await writeFile(path.join(output,'simulated-day.json'),JSON.stringify({simulation:true,model:'scripted mock; no API calls',events},null,2));
  }
 });
});

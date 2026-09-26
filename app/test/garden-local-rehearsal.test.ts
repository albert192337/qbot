import {describe,it,expect} from 'vitest';
import {LocalGardenRehearsal,setRehearsalMembers,clearRehearsal,getRehearsal} from '../src/main/garden/local-rehearsal';
import {growthLabel,sowingMinutes,canBreed} from '../src/shared/garden';
import {makeV3Plant} from '../src/main/garden/v3-rules';
const members=[{id:'test:me',name:'我'},{id:'test:guest',name:'测试朋友'}];
const now=Date.UTC(2026,8,24,8);
describe('local garden rehearsal',()=>{
 it('uses the existing own collection as a copy and initializes it only once',()=>{
  const source=new LocalGardenRehearsal(members,()=>now).get();source.coins=123;source.produce[0].id='my-existing-fruit';
  const r=new LocalGardenRehearsal(members,()=>now);r.initializeOwn(source);
  expect(r.get().coins).toBe(123);expect(r.get().produce[0].id).toBe('my-existing-fruit');
  expect(r.act({type:'sell',id:'my-existing-fruit'}).ok).toBe(true);r.initializeOwn(source);
  expect(r.get().produce.some(p=>p.id==='my-existing-fruit')).toBe(false);expect(source.produce[0].id).toBe('my-existing-fruit');
 });
 it('starts with isolated usable parents and supports breeding, sowing and simulated shops',()=>{
  const r=new LocalGardenRehearsal(members,()=>now),s=r.get('pet');
  expect(canBreed(s.plots[0]!)).toBe(true);expect(canBreed(s.produce[0])).toBe(true);
  const bred=r.act({type:'breed',first:s.plots[0]!.id,second:s.produce[0].id},'pet');expect(bred.ok).toBe(true);
  if(!bred.ok)throw Error(bred.error);expect(bred.reveal?.seed).toBeDefined();
  expect(r.act({type:'plant',plot:3,seed:bred.reveal!.seed!.id},'pet').ok).toBe(false); // Lv.1 has three plots.
  for(let i=0;i<3;i++){expect(r.act({type:'mature'},'pet').ok).toBe(true);expect(r.act({type:'harvest',plot:0},'pet').ok).toBe(true);}
  expect(r.act({type:'plant',plot:0,seed:bred.reveal!.seed!.id},'pet').ok).toBe(true);
  const visit=r.visit('test:guest'),offer=visit.offers[0];
  expect(r.act({type:'buyDaily',owner:visit.owner,offer:offer.id},'pet').ok).toBe(true);
  expect(r.get().coins).toBeLessThan(s.coins);expect(r.visit(visit.owner).plots).toEqual(visit.plots);
  const fresh=new LocalGardenRehearsal(members,()=>now);expect(fresh.get().coins).toBe(5000);
  s.coins=0;expect(r.get().coins).toBeGreaterThan(0);expect(()=>r.visit('REALACCOUNT1')).toThrow();
 });
 it('sprays only mature field crops and keeps rejected operations atomic',()=>{
  const r=new LocalGardenRehearsal(members,()=>now),s=r.get();
  expect(r.act({type:'spray',target:s.produce[0].id,kind:'color'}).ok).toBe(false);
  expect(r.get().life!.sprays.color).toBe(5);
  expect(r.act({type:'spray',target:s.plots[0]!.id,kind:'color'}).ok).toBe(true);

  const dye=r.get().plots[0]!.dye;expect(dye).toBeDefined();expect(r.get().life!.pending).toBeUndefined();
  expect(r.act({type:'harvest',plot:0}).ok).toBe(true);expect(r.get().produce.at(-1)?.dye).toBe(dye);
 });
 it('completes a friend cultivation with heartbeat leases and grants a reward once',()=>{
  let clock=now;const r=new LocalGardenRehearsal(members,()=>clock);
  r.cooperate('test:guest',2,'join');
  for(let i=0;i<120;i++){clock+=5000;r.cooperate('test:guest',2,'join');}
  const visit=r.visit('test:guest');expect(visit.tasks![0].done).toBe(true);expect(visit.plots[2]?.revealed).toBe(true);
  const count=r.get().seeds.length;r.cooperate('test:guest',2,'claim');r.cooperate('test:guest',2,'claim');expect(r.get().seeds).toHaveLength(count+1);
 });
 it('does not cultivate offline; rejects removed guests and resets the session',()=>{
  let clock=now;const r=new LocalGardenRehearsal(members,()=>clock);r.cooperate('test:guest',2,'join');clock+=600000;
  expect(r.visit('test:guest').tasks![0].remaining).toBe(64800-15*360);
  r.members=[members[0]];expect(()=>r.visit('test:guest')).toThrow('离开');
  setRehearsalMembers(members);expect(getRehearsal()).toBeDefined();clearRehearsal();expect(getRehearsal()).toBeUndefined();
 });
 it('shows maturity in minutes matching the actual current-level batch',()=>{
  const s=new LocalGardenRehearsal(members,()=>now).get();s.xp.apple=1000;
  const seed={id:'seed',species:'apple' as const,genes:[],bred:false};
  const p=makeV3Plant(s,seed,3,now,{id:()=> 'p',random:()=>.5});
  expect((p.readyAt-now)/60000).toBeCloseTo(sowingMinutes('apple',s));expect(growthLabel('apple',s)).toContain('436.8 分钟成熟');
 });
});

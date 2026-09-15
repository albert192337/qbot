import { describe,it,expect } from 'vitest';
import { initialGarden,transition,validateGarden } from '../src/main/garden/rules';
import { DESTINATIONS,travelComplete,travelAlbums } from '../src/shared/travel';
let id=0;const now=1000000,rng={random:()=>.99,id:()=>String(id++)};
const start=()=>{const s=initialGarden(now,rng);s.coins=50000;return s;};
describe('travel economy and memories',()=>{
 it('groups old per-experience records into one city album, preserves history and stable likes',()=>{
  let s=start();
  for(let project=0;project<5;project++)for(let step=0;step<3;step++)s=transition(s,{type:'travelExperience',city:0,project,step},now+project*3+step,rng).state;
  const albums=travelAlbums(s.travel!);
  expect(albums).toHaveLength(1);expect(albums[0].photos).toHaveLength(5);
  expect(albums[0].photos.every(p=>p.step===2)).toBe(true);
  expect(albums[0].likeId).toBe(s.travel!.posts[0].id);
  expect(s.travel!.posts).toHaveLength(15);
  s=transition(s,{type:'travelNext',city:0},now+20,rng).state;
  s=transition(s,{type:'travelExperience',city:1,project:0,step:0},now+21,rng).state;
  expect(travelAlbums(s.travel!).map(a=>a.city)).toEqual([1,0]);
 });
 it('atomically buys one unique experience; stale repeated clicks cannot charge twice',()=>{
  const s=start(),cmd={type:'travelExperience' as const,city:0,project:0,step:0};
  const next=transition(s,cmd,now,rng).state;
  expect(s.travel).toBeUndefined();expect(s.coins).toBe(50000);
  expect(next.coins).toBe(49920);expect(next.travel!.posts).toHaveLength(1);
  expect(()=>transition(next,cmd,now,rng)).toThrow('体验已更新');expect(next.coins).toBe(49920);
 });
 it('rejects insufficient funds, invalid indices and locked cities without spending',()=>{
  const s=start();s.coins=1;
  expect(()=>transition(s,{type:'travelExperience',city:0,project:0,step:0},now,rng)).toThrow('旅费');
  for(const project of [-1,5,.5,NaN])expect(()=>transition(start(),{type:'travelExperience',city:0,project,step:0},now,rng)).toThrow();
  expect(()=>transition(start(),{type:'travelExperience',city:1,project:0,step:0},now,rng)).toThrow('当前目的地');
  expect(s.coins).toBe(1);expect(s.travel).toBeUndefined();
 });
 it('requires every experience, keeps old memories, and restores across save/load',()=>{
  let s=start();expect(()=>transition(s,{type:'travelNext',city:0},now,rng)).toThrow('完成本站');
  for(let project=0;project<5;project++)for(let step=0;step<3;step++)s=transition(s,{type:'travelExperience',city:0,project,step},now,rng).state;
  expect(s.coins).toBe(50000-5*DESTINATIONS[0].costs.reduce((a,b)=>a+b,0));expect(travelComplete(s.travel!)).toBe(true);
  s=transition(s,{type:'travelNext',city:0},now,rng).state;
  s=validateGarden(JSON.parse(JSON.stringify(s)));expect(s.travel!.current).toBe(1);expect(s.travel!.posts).toHaveLength(15);
  const coins=s.coins;s=transition(s,{type:'travelLike',id:s.travel!.posts[0].id},now,rng).state;
  expect(s.travel!.posts[0].liked).toBe(true);expect(s.coins).toBe(coins);
  expect(()=>transition(s,{type:'travelNext',city:0},now,rng)).toThrow();
 });
 it('rejects corrupt travel data while preserving legacy garden saves',()=>{
  expect(validateGarden(start()).travel).toBeUndefined();
  const s=transition(start(),{type:'travelExperience',city:0,project:0,step:0},now,rng).state;
  s.travel!.progress[0][0]=4;expect(()=>validateGarden(s)).toThrow('旅行存档');
 });
});

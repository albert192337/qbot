import { describe, expect, it } from 'vitest';
import type { Manifest } from '@qbot/pipeline';
import { choosePairAction, pairActions, pairBeats, pairFlip, PAIR_INTERACTIONS } from '../src/shared/pair-interaction';
import type { StickerManifest } from '../src/shared/sticker-behavior';
const clip = (facing?: 'left' | 'right') => ({webm:'a.webm',gif:'a.gif',status:'done' as const,durationSec:5,facing});
const basic = () => ({actions:{idle:clip(),tea:clip('left'),talk_happy:clip('right')}} as unknown as Manifest);
describe('local pair choreography',()=>{
 it('selects each actor from their own playable inventory and uses the actual action facing',()=>{
  expect(choosePairAction(basic(),'tea')).toMatchObject({id:'tea',facing:'left'});
  const guest={actions:{idle:clip()},customActions:{st_1:clip('right'),st_2:clip('left')},stickerLibrary:{version:1,scenes:{},referenceId:'st_1',items:[{id:'st_1',name:'喝茶',tags:[],enabled:true,raw:''},{id:'st_2',name:'比心',tags:[],enabled:true,raw:''}]}} as unknown as StickerManifest;
  expect(choosePairAction(guest,'tea')).toMatchObject({id:'st_1',facing:'right'});
  expect(choosePairAction(guest,'heart')?.id).toBe('st_2');
  guest.stickerLibrary!.items[1].enabled=false;
  expect(choosePairAction(guest,'heart')?.id).toBe('idle');
 });
 it('ignores failed, pending, missing-media and disabled alias actions',()=>{
  const m={actions:{idle:clip(),tea:{...clip(),status:'failed'},heart:{...clip(),webm:''},wave:{...clip(),status:'pending'},talk_happy:clip()},stickerLibrary:{version:1,scenes:{talk_happy:'disabled'},referenceId:'disabled',items:[{id:'disabled',name:'开心',tags:[],enabled:false,raw:''}]}} as unknown as StickerManifest;
  expect([...pairActions(m).keys()]).toEqual(['idle']);
  for(const intent of ['tea','heart','happy','wave','talk','listen'] as const) expect(choosePairAction(m,intent)?.id).toBe('idle');
  expect(choosePairAction({actions:{}} as Manifest,'heart')).toBeNull();
 });
 it('preserves source merge priority and imported names',()=>{
  const m={actions:{tea:clip('left')},importedActions:{tea:{webm:'import.webm',sourceName:'喝茶',durationSec:3}},customActions:{tea:clip('right')}} as unknown as Manifest;
  expect(choosePairAction(m,'tea')).toMatchObject({facing:'right',durationMs:5000});
 });
 it('faces known directional clips inward and leaves unknown artwork unmirrored',()=>{
  expect(pairFlip('left','left')).toBe(true);expect(pairFlip('right','right')).toBe(true);
  expect(pairFlip('right','left')).toBe(false);expect(pairFlip('left','right')).toBe(false);
  expect(pairFlip(undefined,'right')).toBe(false);
 });
 it('all interactions contain a partner response and resolve for sparse characters',()=>{
  for(const {id} of PAIR_INTERACTIONS){const beats=pairBeats(id);expect(beats.length).toBeGreaterThan(1);
   for(const beat of beats){expect(choosePairAction(basic(),beat.host)).not.toBeNull();expect(choosePairAction(basic(),beat.guest)).not.toBeNull();}}
  expect(pairBeats('wave')[1].guest).toBe('wave');
  expect(pairBeats('chat').map(b=>b.effect)).toContain('guest-talk');
 });
});

import { pairWindowBounds } from '../src/main/pet-geometry';
it('keeps the pair inside a narrow negative-coordinate display and preserves a stable authoritative size',()=>{
 const area={x:-800,y:0,width:800,height:600};
 const b=pairWindowBounds(2,{x:-100,y:500},area);
 expect(b).toEqual({x:-800,y:200,width:800,height:400});
 for(let i=0;i<50;i++)expect(pairWindowBounds(2,b,area)).toEqual(b);
 expect(pairWindowBounds(1,{x:1800,y:800},{x:0,y:0,width:1920,height:1080})).toEqual({x:1200,y:720,width:720,height:360});
});

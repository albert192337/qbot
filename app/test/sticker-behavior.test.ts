import {it,expect} from 'vitest';
import {enrichStickerBehavior,filenameTags,chooseIdle,actionDisplayName,type StickerManifest} from '../src/shared/sticker-behavior';
import {ActionHold} from '../src/renderer/pet/action-hold';
import {collectActions} from '../src/renderer/console/panes/_studio-shared';
it('uses filenames as semantic labels, maps different events, and retains internal ids',()=>{
 const names=['伤心','打字、工作','思考，没有思绪','期待','开心','给你花花','安静坐在椅子上','无聊、趴地上'];
 const m={actions:{},customActions:Object.fromEntries(names.map((_,i)=>[`st_${i}`,{webm:`actions/${i}.webm`,status:'done'}])),stickerLibrary:{version:1,items:names.map((name,i)=>({id:`st_${i}`,name,tags:[name],enabled:true,raw:''})),referenceId:'st_6',scenes:{idle:'st_6'}}} as unknown as StickerManifest;
 expect(enrichStickerBehavior(m)).toBe(true);
 expect(m.agentActions?.error).toBe('st_0');expect(m.agentActions?.working).toBe('st_1');
 expect(actionDisplayName(m,'st_0')).toBe('伤心');expect(m.stickerLibrary?.items[0].tags).toContain('悲伤');
 expect(collectActions(m).find(a=>a.id==='st_0')?.label).toBe('伤心');
 expect(collectActions(m).find(a=>a.id==='st_0')?.motionDesc).toContain('悲伤');
 expect(m.stickerLibrary?.scenes.garden_sow).toBe('st_5');expect(m.stickerLibrary?.sceneNotes?.garden_sow).toContain('暂用');
 expect(m.stickerLibrary?.idleCandidates).toEqual(['st_6','st_7']);
 expect(enrichStickerBehavior(m)).toBe(false);
 expect(chooseIdle(['a','b'],'a',()=>0)).toBe('b');
 expect(filenameTags('沮丧、工作失败')).toEqual(expect.arrayContaining(['悲伤','工作']));
});
it('short expressions repeat complete loops for six seconds; long clips finish, and cancellation releases',()=>{
 const h=new ActionHold();h.begin('sad',1,0);
 for(let t=1000;t<6000;t+=1000)expect(h.ended(t)).toBe('sad');
 expect(h.ended(6000)).toBeNull();h.begin('long',1,0);expect(h.ended(10000)).toBeNull();
 h.begin('three',3,0);expect(h.ended(8000)).toBe('three');expect(h.ended(16000)).toBe('three');expect(h.ended(24000)).toBeNull();
 h.begin('x',1,0);h.cancel();expect(h.action).toBeNull();
});

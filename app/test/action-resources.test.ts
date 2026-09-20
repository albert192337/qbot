import { afterEach, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Manifest } from '@qbot/pipeline';
import { resourceText, scenePool, recommendedFor } from '../src/shared/action-resources';
import { saveResourceAnnotation, saveScenePools } from '../src/main/resource-settings';
import { editManifest } from '../src/main/manifest-store';
import { brainActions } from '../src/main/brain-actions';
import { ActionSessions } from '../src/main/action-sessions';

const clip = { status:'done' as const, webm:'actions/a.webm', gif:'actions/a.gif', durationSec:1 };
it('renaming sticker labels clears inherited generation text in aliases without replacing explicit prompts',async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'qbot-labels-'));
  const legacy={...clip,motionDesc:'扭呀扭；扭呀扭'};
  const file=path.join(dir,'manifest.json');
  await writeFile(file,JSON.stringify({actions:{idle:legacy,drag:{...legacy,motionDescSource:'user'}},customActions:{a:legacy,generated_idle:legacy},stickerLibrary:{items:[{id:'a',name:'扭呀扭',tags:['扭呀扭']}]}}));
  await saveResourceAnnotation(dir,'a',{name:'新名字',meaning:'新含义',tags:['新标签']});
  const m=JSON.parse(await readFile(file,'utf8'));
  expect(m.actions.idle.motionDesc).toBeUndefined();expect(m.customActions.a.motionDesc).toBeUndefined();
  expect(m.customActions.generated_idle.motionDesc).toBeUndefined();
  expect(m.actions.drag.motionDesc).toBe('扭呀扭；扭呀扭');
  expect(m.stickerLibrary.items[0].name).toBe('新名字');
});
let dir = '';
afterEach(async()=>{if(dir)await rm(dir,{recursive:true,force:true});});
it('preserves legacy idle candidates and prefers human annotations without changing resource IDs',()=>{
  const m = {actions:{idle:clip},customActions:{a:clip,b:clip},stickerLibrary:{scenes:{idle:'a'},idleCandidates:['a','b','missing'],items:[{id:'a',name:'旧名字',enabled:true,tags:['原标签']}]},resourceAnnotations:{a:{name:'静静陪你',meaning:'趴着等你回来',tags:['休息']}}} as unknown as Manifest;
  expect(scenePool(m,'idle')).toEqual(['a','b']);
  expect(resourceText(m,'a')).toEqual({name:'静静陪你',meaning:'趴着等你回来',tags:['休息']});
  expect(brainActions(m).find(a=>a.id==='a')?.description).toContain('趴着等你回来');
  expect(recommendedFor('idle','安静休息')).toBe(true);
  expect(recommendedFor('idle','挥手跳舞')).toBe(false);
});
it('merges simultaneous generation, annotation and pool saves; rejects invalid pools without partial writes',async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'qbot-resources-'));
  const file=path.join(dir,'manifest.json');
  await writeFile(file,JSON.stringify({actions:{idle:clip},customActions:{a:clip,b:clip}}));
  await Promise.all([
    saveResourceAnnotation(dir,'a',{name:'陪伴',meaning:'安静等待',tags:['休息']}),
    saveScenePools(dir,{idle:['b','a'],drag:['a','b']}),
    editManifest(file,async m=>{await new Promise(r=>setTimeout(r,5));m.customActions!.c=clip;}),
  ]);
  const m=JSON.parse(await readFile(file,'utf8'));
  expect(m.resourceAnnotations.a.meaning).toBe('安静等待');
  expect(m.scenePools.idle).toEqual(['b','a']);
  expect(m.customActions.c).toEqual(clip);
  expect(m.actions.idle).toEqual(clip);
  expect(m.actions.drag.webm).toBe(clip.webm);
  await expect(saveScenePools(dir,{idle:['missing']})).rejects.toThrow();
  expect(JSON.parse(await readFile(file,'utf8'))).toEqual(m);
});
it('runs different actions on one shared job, rejects duplicate actions, and finishes only after both settle',async()=>{
  const sessions=new ActionSessions<{values:string[]}>();
  let loads=0,finishes=0;
  const gates:Record<string,()=>void>={};
  const load=async()=>{loads++;return {values:[] as string[]};};
  const work=(id:string)=>sessions.run('pet',[id],load,async job=>{job.values.push(id);await new Promise<void>(r=>gates[id]=r);return job;},async()=>{finishes++;});
  const a=work('a'),b=work('b');
  await new Promise(r=>setTimeout(r,0));
  expect(loads).toBe(1);expect(Object.keys(gates)).toEqual(['a','b']);
  await expect(work('a')).rejects.toThrow('重复提交');
  gates.a();const first=await a;expect(finishes).toBe(0);
  gates.b();expect(await b).toBe(first);expect(first.values).toEqual(['a','b']);expect(finishes).toBe(1);
});

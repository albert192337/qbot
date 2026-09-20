import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const state=vi.hoisted(()=>({base:'',gates:{} as Record<string,()=>void>,video:[] as string[]}));
vi.mock('electron',()=>({webContents:{getAllWebContents:()=>[]}}));
vi.mock('../src/main/characters',()=>({charactersDir:()=>state.base,restoreGenerationTask:async()=>{},getCharacter:async()=>null}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({arkApiKey:'mock',generationMode:'local'})}));
vi.mock('../src/main/windows',()=>({broadcastCharacterActivated:()=>{},sendToWindows:()=>{}}));
vi.mock('../src/main/tray',()=>({rebuildTray:async()=>{}}));
vi.mock('../src/main/cloud-generation',()=>({isCloudJob:()=>false}));
vi.mock('../src/main/character-images',()=>({selectedImage:async()=>Buffer.from('reference')}));
vi.mock('@qbot/pipeline',async importOriginal=>{
  const actual=await importOriginal<typeof import('@qbot/pipeline')>();
  return {...actual,resolveFfmpegPath:async()=>'',createArkClient:()=>({}),runActions:async(job:import('@qbot/pipeline').Job,_ark:unknown,_ff:string,_sleep:unknown,_limit:unknown,ids:string[])=>{
    for(const id of ids){
      const a=job.state.actions[id as keyof typeof job.state.actions];
      if(a.needsFrameApproval){
        await new Promise<void>(r=>state.gates[id]=r);
        a.framePath=`${id}_frame.png`;a.frameQcPass=true;a.status='frame_qc';
        await writeFile(job.jobPath(a.framePath),`frame-${id}`);await job.save();
      }else{state.video.push(id);a.status='done';await mkdir(path.join(job.outDir,'actions'),{recursive:true});await writeFile(path.join(job.outDir,'actions',`${id}.webm`),'video');await job.save();}
    }
  }};
});
import { prepareActionFrame, approveActionFrame, getPrompts, saveActionPrompt } from '../src/main/pipeline-bridge';
afterEach(async()=>{if(state.base)await rm(state.base,{recursive:true,force:true});state.gates={};state.video=[];});
it('prompt preview uses the same legacy-label filtering as generation and preserves explicit saves',async()=>{
  state.base=await mkdtemp(path.join(os.tmpdir(),'qbot-prompt-preview-'));
  const dir=path.join(state.base,'pet');await mkdir(dir);
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({actions:{idle:{motionDesc:'扭呀扭；扭呀扭'}},generationMode:'original',stickerLibrary:{items:[{name:'扭呀扭',tags:['扭呀扭']}]}}));
  const before=await getPrompts('pet');
  expect(before.actions.idle.videoPrompt).toContain('轻微呼吸');expect(before.actions.idle.motionDesc).not.toContain('扭呀扭');
  await saveActionPrompt('pet','idle','','扭呀扭；扭呀扭');
  const after=await getPrompts('pet');expect(after.actions.idle.videoPrompt).toContain('扭呀扭');
});
it('prepares two actions concurrently, retains both references, and never submits a video without its own approval',async()=>{
  state.base=await mkdtemp(path.join(os.tmpdir(),'qbot-concurrent-'));
  const dir=path.join(state.base,'pet');await mkdir(dir);
  await writeFile(path.join(dir,'source.png'),'source');
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({id:'pet',name:'Pet',createdAt:'today',sourceImage:'source.png',actions:{},generationMode:'original'}));
  const first=prepareActionFrame('pet','idle',{kind:'source'});
  const second=prepareActionFrame('pet','drag',{kind:'source'});
  await vi.waitFor(()=>expect(Object.keys(state.gates).sort()).toEqual(['drag','idle']));
  await expect(prepareActionFrame('pet','idle',{kind:'source'})).rejects.toThrow('重复提交');
  state.gates.drag();const drag=await second;
  expect(state.video).toEqual([]);
  state.gates.idle();await first;
  const saved=JSON.parse(await readFile(path.join(dir,'.job/state.json'),'utf8'));
  expect(saved.actions.idle.framePath).toBe('idle_frame.png');expect(saved.actions.drag.framePath).toBe('drag_frame.png');
  expect(saved.actions.idle.referenceImage).not.toBe(saved.actions.drag.referenceImage);
  await approveActionFrame('pet','drag',drag);
  expect(state.video).toEqual(['drag']);
  const after=JSON.parse(await readFile(path.join(dir,'.job/state.json'),'utf8'));
  expect(after.actions.idle.needsFrameApproval).toBe(true);expect(after.actions.drag.status).toBe('done');
});

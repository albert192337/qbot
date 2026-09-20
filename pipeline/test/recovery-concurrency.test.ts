import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Job } from '../src/job';
import { ACTION_IDS } from '../src/types';
import type { ArkClient } from '../src/ark';
import { runActions, runPackage } from '../src/stages';
vi.mock('../src/chroma.js', () => ({
  computeAlphaStats: async()=>null, normalizeFilter:()=>'', probeSize:async()=>({width:640,height:640}),
  resolveFfmpegPath:async()=>'/mock',sampleBackgroundColors:async()=>[],sampleKeyColor:async()=>'00ff00',
  toGif:async()=>{},toWebm:async()=>{},ALPHA_ERODE_PX:0,RIM_DESPILL_MIX:1,
}));
vi.mock('../src/qc.js',()=>({checkGreenFrame:async()=>({pass:true}),checkVideoDrift:async()=>({fail:false}),selectDualKeys:()=>['00ff00']}));
vi.mock('../src/reference-color.js',()=>({referenceColorFilter:async()=>undefined}));
let dir:string;
afterEach(async()=>{if(dir)await rm(dir,{recursive:true,force:true});});
async function setup(){
 dir=await mkdtemp(path.join(os.tmpdir(),'qbot-retry-'));
 const src=path.join(dir,'ref.png');await writeFile(src,'png');const job=await Job.create(dir,{refImagePath:src});
 await writeFile(path.join(dir,'turnaround.png'),'png');job.state.turnaround.picked=0;
 for(const id of ACTION_IDS){await writeFile(job.jobPath(`${id}_frame.png`),'png');Object.assign(job.state.actions[id],{status:'failed',framePath:`${id}_frame.png`,frameQcPass:true,videoTaskId:`paid-${id}`,error:'network'});}
 return job;
}
describe('generation retry and concurrency',()=>{
 it('caps in-flight actions and resumes paid video IDs after a temporary failure',async()=>{
  const job=await setup();let active=0;let peak=0;
  const ark={generateImage:vi.fn(),submitVideoTask:vi.fn(),getVideoTask:vi.fn(async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return {status:'succeeded',videoUrl:'https://example.test/video'};}),downloadVideo:async(_u:string,d:string)=>{await writeFile(d,'mp4');}} as unknown as ArkClient;
  await runActions(job,ark,'/mock',async()=>{},2);
  expect(peak).toBe(2);expect(ark.generateImage).not.toHaveBeenCalled();expect(ark.submitVideoTask).not.toHaveBeenCalled();
  expect(ACTION_IDS.every(id=>job.state.actions[id].status==='done')).toBe(true);
 });
 it('clears a terminally failed task ID and explicitly retries it with the existing good frame',async()=>{
  const job=await setup();for(const id of ACTION_IDS.slice(1))job.state.actions[id].status='done';
  const ark={generateImage:vi.fn(),submitVideoTask:vi.fn(async()=>'new-task'),getVideoTask:vi.fn().mockResolvedValueOnce({status:'failed',error:'upstream rejected'}).mockResolvedValue({status:'succeeded',videoUrl:'https://example.test/video'}),downloadVideo:async(_u:string,d:string)=>{await writeFile(d,'mp4');}} as unknown as ArkClient;
  await runActions(job,ark,'/mock',async()=>{},1);
  expect(job.state.actions.idle.status).toBe('failed');expect(job.state.actions.idle.videoTaskId).toBeUndefined();
  await runActions(job,ark,'/mock',async()=>{},1);
  expect(ark.submitVideoTask).toHaveBeenCalledTimes(1);expect(ark.generateImage).not.toHaveBeenCalled();expect(job.state.actions.idle.status).toBe('done');
 });
});

it('repair packaging preserves the character name, persona and custom action metadata',async()=>{
 const job=await setup();for(const id of ACTION_IDS)job.state.actions[id].status='done';
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify({name:'My pet',persona:'gentle',actions:{idle:{poseDesc:'custom pose'}},customActions:{dance:{status:'done'}}}));
 await runPackage(job);const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
 expect(manifest.name).toBe('My pet');expect(manifest.persona).toBe('gentle');expect(manifest.actions.idle.poseDesc).toBe('custom pose');expect(manifest.customActions.dance.status).toBe('done');
});

it('a single-action repair does not submit other failed actions',async()=>{
 const job=await setup();
 const ark={generateImage:vi.fn(),submitVideoTask:vi.fn(),getVideoTask:vi.fn(async()=>({status:'succeeded',videoUrl:'https://example.test/video'})),downloadVideo:async(_u:string,d:string)=>{await writeFile(d,'mp4');}} as unknown as ArkClient;
 await runActions(job,ark,'/mock',async()=>{},2,['idle']);
 expect(job.state.actions.idle.status).toBe('done');expect(job.state.actions.drag.status).toBe('failed');expect(ark.getVideoTask).toHaveBeenCalledTimes(1);
});

it('an imported character without a turnaround uses its source image for selected regeneration',async()=>{
 const job=await setup();await rm(path.join(dir,'turnaround.png'));
 job.state.actions.idle={status:'pending',attempts:{frame:0,video:0}};
 const ark={generateImage:vi.fn(async()=>Buffer.from('frame')),submitVideoTask:vi.fn(async()=>'new'),getVideoTask:vi.fn(async()=>({status:'succeeded',videoUrl:'https://example.test/video'})),downloadVideo:async(_u:string,d:string)=>{await writeFile(d,'mp4');}} as unknown as ArkClient;
 await runActions(job,ark,'/mock',async()=>{},1,['idle']);
 expect(ark.generateImage).toHaveBeenCalledWith(expect.objectContaining({refImageDataUrl:'data:image/png;base64,cG5n'}));
 expect(job.state.actions.idle.status).toBe('done');expect(ark.submitVideoTask).toHaveBeenCalledTimes(1);
 expect(job.state.actions.drag.status).toBe('failed');
});

it('snapshots the selected reference and pauses before video until approval, including reload',async()=>{
 const job=await setup();job.state.generationMode='original';
 await writeFile(path.join(dir,'cover.png'),'wrong-cover');
 await writeFile(job.jobPath('selected.png'),'chosen-frame');
 job.state.actions.idle={status:'pending',attempts:{frame:0,video:0},referenceImage:'.job/selected.png',referenceSelection:{kind:'action',actionId:'st_original',seconds:0.4},needsFrameApproval:true};
 const ark={generateImage:vi.fn(async()=>Buffer.from('generated-frame')),submitVideoTask:vi.fn(async()=>'new'),getVideoTask:vi.fn(async()=>({status:'succeeded',videoUrl:'https://example.test/video'})),downloadVideo:async(_u:string,d:string)=>{await writeFile(d,'mp4');}} as unknown as ArkClient;
 await runActions(job,ark,'/mock',async()=>{},1,['idle']);
 expect(ark.generateImage).toHaveBeenCalledWith(expect.objectContaining({refImageDataUrl:`data:image/png;base64,${Buffer.from('chosen-frame').toString('base64')}`,prompt:expect.stringContaining('原画风')}));
 expect(ark.submitVideoTask).not.toHaveBeenCalled();
 const resumed=await Job.load(dir);await runActions(resumed,ark,'/mock',async()=>{},1,['idle']);
 expect(ark.generateImage).toHaveBeenCalledTimes(1);expect(ark.submitVideoTask).not.toHaveBeenCalled();
 const log=JSON.parse(await readFile(job.jobPath('idle_request.json'),'utf8'));expect(log.referenceSelection.seconds).toBe(0.4);expect(log.referenceImage).toBe('.job/selected.png');
 resumed.state.actions.idle.needsFrameApproval=false;await resumed.save();
 await runActions(resumed,ark,'/mock',async()=>{},1,['idle']);
 expect(ark.generateImage).toHaveBeenCalledTimes(1);expect(ark.submitVideoTask).toHaveBeenCalledTimes(1);
 expect(resumed.state.actions.idle.status).toBe('done');
});

it('legacy sticker labels never override idle motion, but explicitly saved prompts still do', async()=>{
 const job=await setup();job.state.generationMode='original';
 const manifest={actions:{idle:{motionDesc:'扭呀扭；扭呀扭'}},stickerLibrary:{items:[{name:'扭呀扭',tags:['扭呀扭']}]}};
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
 const ark={generateImage:vi.fn(async()=>Buffer.from('frame')),submitVideoTask:vi.fn(async()=>'task'),getVideoTask:vi.fn(async()=>({status:'succeeded',videoUrl:'https://example.test/video'})),downloadVideo:async(_u:string,d:string)=>{await writeFile(d,'mp4');}} as unknown as ArkClient;
 job.state.actions.idle={status:'pending',attempts:{frame:0,video:0}};
 await runActions(job,ark,'/mock',async()=>{},1,['idle']);
 expect(ark.submitVideoTask).toHaveBeenLastCalledWith(expect.objectContaining({prompt:expect.stringContaining('轻微呼吸')}));
 expect(ark.submitVideoTask).toHaveBeenLastCalledWith(expect.objectContaining({prompt:expect.not.stringContaining('扭呀扭')}));
 Object.assign(manifest.actions.idle,{motionDescSource:'user'});
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
 job.state.actions.idle={status:'pending',attempts:{frame:0,video:0}};
 await runActions(job,ark,'/mock',async()=>{},1,['idle']);
 expect(ark.submitVideoTask).toHaveBeenLastCalledWith(expect.objectContaining({prompt:expect.stringContaining('扭呀扭')}));
 Object.assign(manifest.actions.idle,{videoPromptFull:'只眨眼'});
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
 job.state.actions.idle={status:'pending',attempts:{frame:0,video:0}};
 await runActions(job,ark,'/mock',async()=>{},1,['idle']);
 expect(ark.submitVideoTask).toHaveBeenLastCalledWith(expect.objectContaining({prompt:expect.stringContaining('只眨眼')}));
 expect(ark.submitVideoTask).toHaveBeenLastCalledWith(expect.objectContaining({prompt:expect.not.stringContaining('扭呀扭')}));
});

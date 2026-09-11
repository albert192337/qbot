import { describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { Manifest } from '@qbot/pipeline';
import { brainActions } from '../src/main/brain-actions';
import { bindLibraryScenes, createStickerCharacter, libraryPreview, scanLibrary } from '../src/main/sticker-library';
import { packCharacterDir, unpackCharacter } from '../src/main/asset-pack';
import type { StickerLibrary } from '../src/shared/sticker-library';

describe('sticker library',()=>{
  it('scans more than 50 files without mixing child folders, strips numeric filename prefix',async()=>{
    const dir=await mkdtemp(path.join(tmpdir(),'qbot-sticker-scan-'));
    await mkdir(path.join(dir,'other-dog'));
    await Promise.all(Array.from({length:61},(_,i)=>writeFile(path.join(dir,`${i}开心.gif`),'GIF89a')));
    await writeFile(path.join(dir,'other-dog','mixed.gif'),'GIF89a');
    const draft=await scanLibrary(dir);
    expect(draft.names).toHaveLength(61);
    expect(draft.names[0].name).toBe('开心');
    expect(new Set(draft.names.map(i=>i.id)).size).toBe(61);
    expect(await libraryPreview(draft.token,draft.names[0].id)).toContain('data:image/gif;base64,');
    await expect(libraryPreview(draft.token,'../../secret')).rejects.toThrow();
    await expect(createStickerCharacter(dir,{token:draft.token,name:'dog',referenceId:draft.names[0].id,items:[],scenes:{}})).rejects.toThrow('待机');
  });
  it('many expressions share tags; disabled entries excluded, scene aliases retained',()=>{
    const m={actions:{},customActions:{a:{webm:'actions/a.webm',status:'done'},b:{webm:'actions/b.webm',status:'done'},pending:{status:'pending'}},stickerLibrary:{version:1,referenceId:'a',scenes:{},items:[{id:'a',name:'开心',tags:['庆祝','收获'],enabled:true},{id:'b',name:'欢呼',tags:['庆祝'],enabled:false}]}} as unknown as Manifest & {stickerLibrary:StickerLibrary};
    bindLibraryScenes(m,{idle:'a',garden_harvest:'a'});
    expect(brainActions(m).map(i=>i.id)).toEqual(['idle','garden_harvest','a']);
    expect(brainActions(m).find(i=>i.id==='a')?.description).toContain('收获');
    expect(()=>bindLibraryScenes(m,{idle:'pending'})).toThrow('已完成');
    expect(()=>bindLibraryScenes(m,{idle:'a','../../bad':'a'})).toThrow('无效场景');
    bindLibraryScenes(m,{idle:'a'});
    expect(m.actions).not.toHaveProperty('garden_harvest');
    m.customActions!.variant_new={webm:'actions/new.webm',gif:'',durationSec:5,status:'done'};
    m.stickerLibrary.variants={variant_new:{description:'平缓庆祝',enabled:false}};
    expect(brainActions(m).some(a=>a.id==='variant_new')).toBe(false);
    m.stickerLibrary.variants.variant_new.enabled=true;
    expect(brainActions(m).find(a=>a.id==='variant_new')?.description).toBe('平缓庆祝');
  });
  it('export includes imported + expression actions and deduplicates aliases without raw sources/prompts',async()=>{
    const dir=await mkdtemp(path.join(tmpdir(),'qbot-sticker-pack-'));
    await mkdir(path.join(dir,'actions'));await mkdir(path.join(dir,'imported'));
    await writeFile(path.join(dir,'imported','wave.webm'),'wave');
    await writeFile(path.join(dir,'actions','smile.webm'),'smile');
    await writeFile(path.join(dir,'source.png'),'source');
    await writeFile(path.join(dir,'manifest.json'),JSON.stringify({persona:'secret',actions:{idle:{webm:'actions/smile.webm',status:'done',framePromptFull:'private-prompt'}},customActions:{smile:{webm:'actions/smile.webm',status:'done'}},expressionActions:{happy:{webm:'actions/smile.webm',status:'done'}},importedActions:{wave:{webm:'imported/wave.webm',raw:'private-raw.gif'}},stickerLibrary:{items:[{id:'smile',name:'笑',tags:['开心'],enabled:true,raw:'private-raw.gif'}]}}));
    const p=await packCharacterDir(dir);
    const header=JSON.parse(p.buffer.subarray(4,4+p.buffer.readUInt32BE(0)).toString());
    expect(header.files).toHaveLength(4);
    expect(p.buffer.toString()).not.toContain('private-');
    const dest=await mkdtemp(path.join(tmpdir(),'qbot-sticker-unpack-'));
    await unpackCharacter(p.buffer,dest);
    const m=JSON.parse(await readFile(path.join(dest,'manifest.json'),'utf8'));
    expect(await readFile(path.join(dest,m.importedActions.wave.webm),'utf8')).toBe('wave');
    expect(await readFile(path.join(dest,'source.png'),'utf8')).toBe('source');
  });
});

it.skipIf(!process.env.QBOT_STICKER_SAMPLE)('real white-dog library: convert all, export and unpack locally',async()=>{
  const dir=process.env.QBOT_STICKER_SAMPLE!;
  const output=path.resolve('../.superpowers/sticker-demo');
  const draft=await scanLibrary(dir);
  const reference=draft.names.find(i=>i.name.includes('邋遢')) ?? draft.names[0];
  const idle=draft.names.find(i=>i.name==='安静坐在椅子上') ?? reference;
  const request={token:draft.token,name:'小白狗 · 表情包',referenceId:reference.id,
    items:draft.names.map(i=>({id:i.id,tags:[i.name],enabled:true})),
    scenes:{idle:idle.id,drag:reference.id,talk_happy:(draft.names.find(i=>i.name==='开心')??reference).id}};
  const result=await createStickerCharacter(output,request,p=>{if(p.completed%20===0)console.log(`${p.completed}/${p.total}, failed ${p.failed}`);});
  expect(result.failed).toEqual([]);
  const m=JSON.parse(await readFile(path.join(output,result.dirId,'manifest.json'),'utf8'));
  expect(Object.keys(m.customActions)).toHaveLength(draft.names.length);
  expect(brainActions(m).filter(a=>a.id.startsWith('st_'))).toHaveLength(draft.names.length);
  const packed=await packCharacterDir(path.join(output,result.dirId));
  await unpackCharacter(packed.buffer,path.join(output,`.download-${result.dirId}`));
  await writeFile(path.join(output,'latest.json'),JSON.stringify({dirId:result.dirId,count:draft.names.length,bytes:packed.buffer.length}));
  console.log('WHITE_DOG_RESULT',result.dirId,draft.names.length,packed.buffer.length);
},900000);

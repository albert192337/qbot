import { editManifest } from './manifest-store';
import { selectedImage } from './character-images';
import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { clearLegacyStickerMotionLabels, createArkClient, extractFrames, resolveFfmpegPath, type VisionPart } from '@qbot/pipeline';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { charactersDir, getCharacter } from './characters';
import { getSettings } from './config';
import { broadcastCharacterActivated } from './windows';
import { rebuildTray } from './tray';
import { addCustomAction, buildConfig } from './pipeline-bridge';
import { parseSemanticSuggestions, STICKER_SEMANTIC_PROMPT } from './sticker-semantics';
import { packCharacterDir } from './asset-pack';
import { bindLibraryScenes, createStickerCharacter, extractLibraryFrame, libraryPreview, saveLibraryManifest, scanLibrary } from './sticker-library';
import type { StickerCreateRequest, StickerLibrary } from '../shared/sticker-library';

async function character(dirId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(dirId)) throw new Error('无效角色');
  const meta = await getCharacter(dirId);
  if (!meta?.manifest) throw new Error('角色不存在');
  return meta.manifest as typeof meta.manifest & { stickerLibrary?: StickerLibrary };
}
export function registerStickerLibraryIpc(): void {
  ipcMain.handle('stickerLibrary:analyze', async (ev, dirId: string) => {
    const m=await character(dirId);
    if(!m.stickerLibrary)throw new Error('不是表情包角色');
    const cfg=await buildConfig();const ark=createArkClient(cfg);
    const ffmpeg=await resolveFfmpegPath(cfg.ffmpegPath);
    const suggestions:ReturnType<typeof parseSemanticSuggestions>={};
    let failed=0;
    for(let start=0;start<m.stickerLibrary.items.length;start+=12){
      const batch=m.stickerLibrary.items.slice(start,start+12);
      const parts:VisionPart[]=[];const ids:string[]=[];
      for(const item of batch){
        try{
          if(!/^imported\/_raw\/st_[a-f0-9]+\.gif$/.test(item.raw))throw new Error('原件缺失');
          const frames=await extractFrames(path.join(charactersDir(),dirId,item.raw),ffmpeg);
          parts.push({type:'text',text:`表情 ID=${item.id}`});
          frames.forEach(f=>parts.push({type:'image',dataUrl:`data:image/png;base64,${f.toString('base64')}`}));
          ids.push(item.id);
        }catch{failed++;}
      }
      if(ids.length)try{
        const result=parseSemanticSuggestions(await ark.visionChat({system:STICKER_SEMANTIC_PROMPT,parts,detail:'low',temperature:0}),ids);
        Object.assign(suggestions,result);failed+=ids.length-Object.keys(result).length;
      }catch{failed+=ids.length;}
      if(!ev.sender.isDestroyed())ev.sender.send('stickerLibrary:progress',{completed:Math.min(start+12,m.stickerLibrary.items.length),total:m.stickerLibrary.items.length,current:'分析表情语义',failed});
    }
    return {suggestions,failed};
  });
  ipcMain.handle('stickerLibrary:scan', async () => {
    const result = await dialog.showOpenDialog({ title:'选择单个角色的表情包文件夹', properties:['openDirectory'] });
    return result.canceled ? null : scanLibrary(result.filePaths[0]);
  });
  ipcMain.handle('stickerLibrary:preview', (_ev, token: string, id: string) => libraryPreview(token,id));
  ipcMain.handle('stickerLibrary:create', async (ev, req: StickerCreateRequest) => {
    const result = await createStickerCharacter(charactersDir(),req,p => {
      if (!ev.sender.isDestroyed()) ev.sender.send('stickerLibrary:progress',p);
    });
    await rebuildTray();
    return result;
  });
  ipcMain.handle('stickerLibrary:save', async (_ev, dirId: string, library: StickerLibrary) => {
    await character(dirId);
    const m = await editManifest(path.join(charactersDir(),dirId,'manifest.json'), m => {
    if (!m.stickerLibrary) throw new Error('不是表情包角色');
    if (m.stickerLibrary.items.length !== library.items.length) throw new Error('素材列表已变化，请重新打开');
    clearLegacyStickerMotionLabels(m);
    for (const item of m.stickerLibrary.items) {
      const patch = library.items.find(i => i.id === item.id);
      if (!patch) throw new Error('素材列表无效');
      item.name = String(patch.name||item.name).trim().slice(0,80);
      item.meaning = String(patch.meaning||'').trim().slice(0,500);
      item.enabled = !!patch.enabled;
      item.tags = [...new Set(patch.tags.map(t => String(t).trim()).filter(Boolean))].slice(0,20).map(t => t.slice(0,40));
      if(patch.suggestion) item.suggestion=parseSemanticSuggestions(JSON.stringify([{...patch.suggestion,id:item.id}]),[item.id])[item.id];
      m.resourceAnnotations={...m.resourceAnnotations,[item.id]:{name:item.name,meaning:item.meaning??'',tags:item.tags}};
    }
    for (const [id,variant] of Object.entries(m.stickerLibrary.variants ?? {})) {
      variant.enabled = m.customActions?.[id]?.status === 'done' && !!library.variants?.[id]?.enabled;
    }
    bindLibraryScenes(m,library.scenes,library.sceneCandidates);
    m.stickerLibrary.idleCandidates=[...new Set(library.sceneCandidates?.idle??library.idleCandidates??[])].filter(id=>m.customActions?.[id]?.status==='done');
    if(!m.stickerLibrary.idleCandidates.length)m.stickerLibrary.idleCandidates=[library.scenes.idle];
    });
    if ((await getSettings()).activeCharacter === dirId) broadcastCharacterActivated({ dirId, manifest:m, hasUnfinishedJob:false });
  });
  ipcMain.handle('stickerLibrary:frame', async (_ev, dirId: string, id: string, seconds: number) => {
    const m = await character(dirId);
    if (!m.stickerLibrary?.items.some(i=>i.id===id)) throw new Error('表情不存在');
    return `data:image/png;base64,${(await selectedImage(path.join(charactersDir(),dirId),{kind:'action',actionId:id,seconds})).toString('base64')}`;
  });
  ipcMain.handle('stickerLibrary:generate', async (_ev, dirId: string, sourceId: string|null, seconds: number, description: string) => {
    const m = await character(dirId);
    if (!m.stickerLibrary) throw new Error('不是表情包角色');
    if (!description.trim() || description.length > 1200) throw new Error('请输入动作描述（最多 1200 字）');
    const out = path.join(charactersDir(),dirId);
    await mkdir(path.join(out,'.job'),{recursive:true});
    const name = `variant_${randomUUID().replace(/-/g,'').slice(0,12)}`;
    let reference: Buffer|undefined;
    if (sourceId) {
      if (!m.stickerLibrary.items.some(i=>i.id===sourceId)) throw new Error('表情不存在');
      reference = await selectedImage(out,{kind:'action',actionId:sourceId,seconds});
      await writeFile(path.join(out,'.job',`${name}_reference.png`),reference);

    }
    await editManifest(path.join(out,'manifest.json'), latest => {
      latest.stickerLibrary!.variants = { ...latest.stickerLibrary!.variants, [name]: { description:description.trim(),enabled:false,sourceId:sourceId??undefined } };
    });
    await addCustomAction(dirId,name,description,
      `${description}。低幅度、缓慢自然的动作；首尾姿势一致，循环衔接平缓，不跳跃不变形。`,5,reference);
    return name;
  });
  ipcMain.handle('stickerLibrary:package', async (_ev, dirId: string) => {
    await character(dirId);
    const p = await packCharacterDir(path.join(charactersDir(),dirId));
    const header = JSON.parse(p.buffer.subarray(4,4+p.buffer.readUInt32BE(0)).toString());
    return { bytes:p.buffer.length, files:header.files.length, fitsMarket:p.buffer.length <= 50*1024*1024 };
  });
}

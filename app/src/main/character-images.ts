import { resourceText } from '../shared/action-resources';
import { readFile, mkdir, writeFile, rename, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveFfmpegPath, probeDurationSec, type Manifest } from '@qbot/pipeline';
import type { StickerManifest } from '../shared/sticker-behavior';
import type { ImageSelection, ImageChoice } from '../shared/character-images';
const exec = promisify(execFile);

export function imageAssetPath(dir: string, rel: string): string {
  if (!rel || path.isAbsolute(rel)) throw new Error('无效素材路径');
  const result = path.resolve(dir, rel);
  if (!result.startsWith(path.resolve(dir) + path.sep)) throw new Error('无效素材路径');
  return result;
}
export async function imageChoices(dir: string): Promise<ImageChoice[]> {
  const m: StickerManifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const choices: ImageChoice[] = [];
  if (m.sourceImage) try { await access(imageAssetPath(dir, m.sourceImage)); choices.push({ selection: {kind:'source'}, label:'原始参考图' }); } catch {}
  if (m.turnaround) try { await access(imageAssetPath(dir, m.turnaround)); choices.push({ selection:{kind:'turnaround-front'}, label:'已选三视图 · 第一幅（左侧正面）' }); } catch {}
  const clips = { ...m.actions, ...m.importedActions, ...m.expressionActions, ...m.customActions };
  for (const [id, clip] of Object.entries(clips)) if (clip.status === 'done' && (clip.gif || clip.webm)) {
    let duration=clip.durationSec;
    if(!Number.isFinite(duration)||duration<=0)try{duration=await probeDurationSec(imageAssetPath(dir,clip.webm),await resolveFfmpegPath())??0;}catch{}
    choices.push({ selection:{kind:'action',actionId:id,seconds:0}, label: resourceText(m,id).name, durationSec: duration });
  }
  return choices;
}
/** Decode to a fresh temporary PNG. WebM fallback supports downloaded packs without raw GIFs. */
export async function selectedImage(dir: string, selection: ImageSelection): Promise<Buffer> {
  const m: Manifest = JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
  let rel: string; let seconds = 0; let front = false;
  if (selection.kind === 'source') rel = m.sourceImage;
  else if (selection.kind === 'turnaround-front') { rel = m.turnaround; front = true; }
  else if (selection.kind === 'action') {
    seconds = selection.seconds;
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 600) throw new Error('帧时间无效');
    const clip = { ...m.actions, ...m.importedActions, ...m.expressionActions, ...m.customActions }[selection.actionId];
    if (!clip || clip.status !== 'done') throw new Error('动作不可用');
    rel = clip.webm;
    if (clip.gif) try { await access(imageAssetPath(dir,clip.gif)); rel = clip.gif; } catch {}
  } else throw new Error('无效图片来源');
  const input = imageAssetPath(dir,rel);
  await mkdir(path.join(dir,'.job'),{recursive:true});
  const tmp = path.join(dir,'.job',`image-${randomUUID()}.png`);
  const ffmpeg = (await resolveFfmpegPath()).replace('app.asar','app.asar.unpacked');
  try {
    await exec(ffmpeg, ['-v','error','-y', ...(input.endsWith('.webm') ? ['-c:v','libvpx-vp9'] : []), '-i',input,'-ss',String(seconds), ...(front ? ['-vf','crop=iw/3:ih:0:0'] : []), '-frames:v','1',tmp], {windowsHide:true});
    try { return await readFile(tmp); } catch { throw new Error('这个时间点没有可用帧，请选择视频范围内的时间'); }
  } finally { await rm(tmp,{force:true}); }
}
export async function saveCover(dir: string, selection: ImageSelection): Promise<void> {
  const png = await selectedImage(dir,selection);
  const tmp = path.join(dir,`cover-${randomUUID()}.tmp`);
  await writeFile(tmp,png); await rename(tmp,path.join(dir,'cover.png'));
  // Local display metadata only; deliberately absent from Manifest and asset packages.
  await writeFile(path.join(dir,'.cover.json'),JSON.stringify({selection,updatedAt:new Date().toISOString()},null,2));
}

import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, copyFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gifToWebm, probeDurationSec, resolveFfmpegPath, type Manifest } from '@qbot/pipeline';
import type { StickerCreateRequest, StickerDraft, StickerLibrary, StickerProgress } from '../shared/sticker-library';
import { STICKER_SCENES } from '../shared/sticker-library';

const exec = promisify(execFile);
type LibraryManifest = Manifest & { stickerLibrary?: StickerLibrary };
const drafts = new Map<string, { files: Map<string, string>; busy: boolean; result?: string }>();
export async function scanLibrary(dir: string): Promise<StickerDraft> {
  const files = new Map<string, string>();
  const names: StickerDraft['names'] = [];
  for (const file of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    if (!file.isFile() || !/\.gif$/i.test(file.name)) continue;
    const id = `st_${createHash('sha256').update(file.name).digest('hex').slice(0,16)}`;
    files.set(id, path.join(dir, file.name));
    names.push({ id, name: file.name.replace(/\.gif$/i, '').replace(/^\d+/, '') || file.name });
  }
  if (!names.length) throw new Error('这个文件夹中没有 GIF；请选择实际存放表情的子文件夹。');
  const token = randomUUID();
  drafts.set(token, { files, busy: false });
  // Expire only idle old scans; active imports retain their snapshot.
  if (drafts.size > 12) for (const [key,draft] of drafts) {
    if (key !== token && !draft.busy) { drafts.delete(key); break; }
  }
  return { token, names };
}
export async function libraryPreview(token: string, id: string): Promise<string> {
  const file = drafts.get(token)?.files.get(id);
  if (!file) throw new Error('素材预览已过期，请重新选择文件夹。');
  return `data:image/gif;base64,${(await readFile(file)).toString('base64')}`;
}
export async function extractLibraryFrame(input: string, output: string, seconds = 0): Promise<void> {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 600) throw new Error('帧时间无效');
  const ffmpeg = (await resolveFfmpegPath()).replace('app.asar','app.asar.unpacked');
  await exec(ffmpeg, ['-y', '-i', input, '-ss', String(seconds), '-frames:v', '1', output], { windowsHide:true });
  await readFile(output); // Seeking beyond the end can exit successfully without producing an image.
}
export async function saveLibraryManifest(file: string, manifest: LibraryManifest): Promise<void> {
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(manifest, null, 2));
  await rename(tmp, file);
}
export function bindLibraryScenes(m: LibraryManifest, scenes: Record<string,string>): void {
  if (!m.stickerLibrary) throw new Error('不是表情包角色');
  const allowed = new Set(STICKER_SCENES.map(([id]) => id as string));
  for (const [scene,id] of Object.entries(scenes)) {
    if (!allowed.has(scene)) throw new Error('无效场景');
    if (id && m.customActions?.[id]?.status !== 'done') throw new Error('场景只能选已完成的动作');
  }
  if (!scenes.idle) throw new Error('请先选择待机动作');
  for (const scene of Object.keys(m.stickerLibrary.scenes)) delete m.actions[scene as keyof typeof m.actions];
  for (const [scene,id] of Object.entries(scenes)) {
    if (id) m.actions[scene as keyof typeof m.actions] = { ...m.customActions![id] };
  }
  m.stickerLibrary.scenes = { ...scenes };
}
export async function createStickerCharacter(baseDir: string, req: StickerCreateRequest,
  progress: (p: StickerProgress) => void = () => {}): Promise<{ dirId: string; failed: string[] }> {
  const draft = drafts.get(req.token);
  if (!draft) throw new Error('导入已过期，请重新选文件夹。');
  if (draft.result) return { dirId: draft.result, failed: [] };
  if (draft.busy) throw new Error('这套素材正在导入，请稍候。');
  if (!req.name.trim() || req.name.length > 80) throw new Error('请输入 1～80 字的角色名');
  if (!draft.files.has(req.referenceId)) throw new Error('请选择主形象');
  if (!draft.files.has(req.scenes.idle)) throw new Error('请选择待机素材');
  const ids = new Set(req.items.map(i => i.id));
  if (ids.size !== req.items.length || req.items.some(i => !draft.files.has(i.id))) throw new Error('素材列表无效');
  if (!ids.has(req.referenceId) || !ids.has(req.scenes.idle)) throw new Error('主形象和待机必须包含在导入中');
  draft.busy = true;
  const dirId = randomUUID();
  const out = path.join(baseDir, dirId);
  const failed: string[] = [];
  try {
    await mkdir(path.join(out, 'actions'), { recursive:true });
    await mkdir(path.join(out, 'imported', '_raw'), { recursive:true });
    await mkdir(path.join(out, '.job'), { recursive:true });
    const ffmpeg = (await resolveFfmpegPath()).replace('app.asar','app.asar.unpacked'); // Local conversion never needs an API key.
    await extractLibraryFrame(draft.files.get(req.referenceId)!, path.join(out, 'source.png'));
    const library: StickerLibrary = { version:1, items:[], scenes:{}, referenceId:req.referenceId };
    const m: LibraryManifest = { id:dirId, name:req.name.trim(), createdAt:new Date().toISOString(), tier:'S',
      sourceImage:'source.png', turnaround:'', pipelineVersion:'1', actions:{} as Manifest['actions'], customActions:{}, stickerLibrary:library };
    let completed = 0;
    for (const item of req.items) {
      const file = draft.files.get(item.id)!;
      const name = path.basename(file, path.extname(file)).replace(/^\d+/, '');
      const raw = `imported/_raw/${item.id}.gif`;
      const tags = [...new Set(item.tags.map(t => String(t).trim()).filter(Boolean))].slice(0,20).map(t => t.slice(0,40));
      const entry = { id:item.id, name, tags, enabled:!!item.enabled, raw, error:undefined as string|undefined };
      try {
        await copyFile(file, path.join(out,raw));
        const webm = `actions/${item.id}.webm`;
        await gifToWebm(path.join(out,raw), path.join(out,webm), ffmpeg, 384, true);
        m.customActions![item.id] = { webm, gif:raw, status:'done',
          durationSec:await probeDurationSec(path.join(out,webm),ffmpeg) ?? 5,
          motionDesc:[name,...tags].join('；') };
      } catch (e) { entry.error = e instanceof Error ? e.message : String(e); failed.push(name); }
      library.items.push(entry);
      await saveLibraryManifest(path.join(out,'manifest.json'),m);
      progress({ completed:++completed, total:req.items.length, current:name, failed:failed.length });
    }
    // A broken optional clip must not discard the rest of the library.
    const scenes = Object.fromEntries(Object.entries(req.scenes).filter(([,id]) => m.customActions?.[id]?.status === 'done'));
    scenes.idle ||= Object.keys(m.customActions!)[0];
    if (!scenes.idle) throw new Error('所有素材均转码失败；原件已保留，可重新导入。');
    bindLibraryScenes(m,scenes);
    await saveLibraryManifest(path.join(out,'manifest.json'),m);
    draft.result = dirId;
    return { dirId, failed };
  } finally { draft.busy = false; }
}

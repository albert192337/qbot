import { editManifest } from './manifest-store';
/**
 * 角色资产包管理：扫描 userData/characters/、首启复制预置角色。
 * 预置与用户创角走同一加载路径，无特例（spec §1）。
 */
import { app } from 'electron';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Manifest } from '@qbot/pipeline';
import type { CharacterMeta } from '../shared/ipc-types';
import { assignVoice } from '../shared/voice-assign';
import { enrichStickerBehavior } from '../shared/sticker-behavior';

export function charactersDir(): string {
  return path.join(app.getPath('userData'), 'characters');
}

/** 预置角色源目录：打包后在 resources/presets，dev 时用 app/resources/presets */
function presetsDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'presets')
    : path.resolve(__dirname, '../../resources/presets');
}

/** 首启：把预置角色复制进 characters（存在即跳过） */
export async function seedPresets(): Promise<void> {
  const src = presetsDir();
  if (!existsSync(src)) return;
  await mkdir(charactersDir(), { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dest = path.join(charactersDir(), entry.name);
    if (existsSync(dest)) continue;
    await cp(path.join(src, entry.name), dest, {
      recursive: true,
      filter: (p) => !p.includes(`${path.sep}.job`), // 预置包不带生成中间产物
    });
  }
}

export async function listCharacters(): Promise<CharacterMeta[]> {
  const dir = charactersDir();
  if (!existsSync(dir)) return [];
  const out: CharacterMeta[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    // 点开头是保留目录（联机对端角色缓存 .peer-<hash> 等），不进角色列表
    if (entry.name.startsWith('.')) continue;
    const charDir = path.join(dir, entry.name);
    const manifestPath = path.join(charDir, 'manifest.json');
    const taskDismissed = existsSync(path.join(charDir, '.task-dismissed'));
    let cloudPending = false;
    try {
      const cloud = JSON.parse(await readFile(path.join(charDir, '.cloud-job.json'), 'utf8'));
      cloudPending = cloud.phase !== 'done' || !cloud.acknowledged;
    } catch {}
    const hasUnfinishedJob =
      existsSync(path.join(charDir, '.job/state.json')) && !existsSync(manifestPath);
    if (!existsSync(manifestPath)) {
      if (hasUnfinishedJob) {
        out.push({ dirId: entry.name, manifest: null as unknown as Manifest, hasUnfinishedJob, taskDismissed });
      }
      continue;
    }
    try {
      let manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
      if(enrichStickerBehavior(manifest)) {
        const backup=`${manifestPath}.before-sticker-semantics`;
        if(!existsSync(backup))await cp(manifestPath,backup);
        manifest = await editManifest(manifestPath, latest => { enrichStickerBehavior(latest); });
      }
      if (!manifest.voice) {
        // 声线懒迁移：老角色首次被列出时按 id 哈希分配并写回，之后永久稳定
        manifest = await editManifest(manifestPath, latest => { latest.voice ??= assignVoice(latest.id); });
      }
      let localPending = false;
      try { const state=JSON.parse(await readFile(path.join(charDir,'.job/state.json'),'utf8')); localPending=!existsSync(path.join(charDir,'.cloud-job.json')) && typeof state.stage==='string' && state.stage!=='done'; } catch {}
      out.push({ dirId: entry.name, coverImage: existsSync(path.join(charDir,'cover.png')) ? 'cover.png' : undefined, manifest, hasUnfinishedJob: cloudPending || localPending, taskDismissed });
    } catch {
      /* 损坏的包跳过 */
    }
  }
  return out;
}

export async function getCharacter(dirId: string): Promise<CharacterMeta | null> {
  const all = await listCharacters();
  return all.find((c) => c.dirId === dirId) ?? null;
}

/** 改名：写回 manifest.json（原子写，避免读到半截 JSON） */
export async function renameCharacter(dirId: string, name: string): Promise<void> {
  const manifestPath = path.join(charactersDir(), dirId, 'manifest.json');
  await editManifest(manifestPath, manifest => { manifest.name = name.trim() || manifest.name; });
}

/** 删除角色目录及所有资产 */
export async function deleteCharacter(dirId: string): Promise<void> {
  const dir = path.join(charactersDir(), dirId);
  if (!existsSync(dir)) throw new Error(`character not found: ${dirId}`);
  await rm(dir, { recursive: true, force: true });
}

/** Task dismissal lives outside manifests so background asset writes cannot undo it. */
function taskMarker(dirId: string): string {
  if (!dirId || dirId.startsWith('.') || /[\\/]/.test(dirId)) throw new Error('无效的角色 ID');
  return path.join(charactersDir(), dirId, '.task-dismissed');
}
export async function deleteGenerationTask(dirId: string): Promise<void> {
  const marker = taskMarker(dirId);
  await writeFile(marker, '1');
}
export async function restoreGenerationTask(dirId: string): Promise<void> {
  await rm(taskMarker(dirId), { force: true });
}

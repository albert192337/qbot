/**
 * 角色资产包管理：扫描 userData/characters/、首启复制预置角色。
 * 预置与用户创角走同一加载路径，无特例（spec §1）。
 */
import { app } from 'electron';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Manifest } from '@qbot/pipeline';
import type { CharacterMeta } from '../shared/ipc-types';

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
    const charDir = path.join(dir, entry.name);
    const manifestPath = path.join(charDir, 'manifest.json');
    const hasUnfinishedJob =
      existsSync(path.join(charDir, '.job/state.json')) && !existsSync(manifestPath);
    if (!existsSync(manifestPath)) {
      if (hasUnfinishedJob) {
        out.push({ dirId: entry.name, manifest: null as unknown as Manifest, hasUnfinishedJob });
      }
      continue;
    }
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
      out.push({ dirId: entry.name, manifest, hasUnfinishedJob: false });
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
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  manifest.name = name.trim() || manifest.name;
  const tmp = `${manifestPath}.tmp`;
  await writeFile(tmp, JSON.stringify(manifest, null, 2));
  await rename(tmp, manifestPath);
}

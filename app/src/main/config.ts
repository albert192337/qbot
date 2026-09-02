/** userData/config.json 读写；dev 模式 fallback 到仓库根 config.local.json（零配置开发） */
import { app } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Settings } from '../shared/ipc-types';

function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

export async function getSettings(): Promise<Settings> {
  let settings: Settings = {};
  try {
    settings = JSON.parse(await readFile(configPath(), 'utf8'));
  } catch {
    /* 首次运行无文件 */
  }
  // dev fallback：仓库根的 config.local.json 提供 API keys；userData 中已配置的值优先
  if ((!settings.arkApiKey || !settings.gptImageApiKey) && !app.isPackaged) {
    const devConfig = path.resolve(__dirname, '../../../config.local.json');
    if (existsSync(devConfig)) {
      try {
        const local = JSON.parse(readFileSync(devConfig, 'utf8')) as Settings;
        settings.arkApiKey ||= local.arkApiKey;
        settings.gptImageApiKey ||= local.gptImageApiKey;
      } catch {
        /* ignore */
      }
    }
  }
  return settings;
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await mkdir(path.dirname(configPath()), { recursive: true });
  await writeFile(configPath(), JSON.stringify(next, null, 2));
  return next;
}

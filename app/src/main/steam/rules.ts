import { createHash } from 'node:crypto';

export interface SteamConfig { appId?: number; demo: boolean; error?: string }
export function steamConfig(env: NodeJS.ProcessEnv, packaged: boolean): SteamConfig {
  const value = env.QBOT_STEAM_APP_ID;
  if (!value) return { demo: false };
  const appId = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(appId) || appId <= 0 || appId > 0xffffffff) {
    return { demo: false, error: 'Steam AppID 配置无效。' };
  }
  const demo = appId === 480;
  if (demo && (packaged || env.QBOT_STEAM_DEMO !== '1')) {
    return { demo, error: 'SpaceWar 仅用于显式开启的开发测试，不能用于发行包。' };
  }
  return { appId, demo };
}
/** Bind invitations to a configured service, never to a peer-supplied URL. */
export function roomRealm(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}
export function roomCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9]{8}$/.test(value);
}
export function steamId(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{17}$/.test(value)) return false;
  const id = BigInt(value);
  return id >= 76561197960265728n && id <= 76561202255233023n;
}
export function joinCommand(roomId: string, appId: number, realm: string): string {
  if (!roomCode(roomId) || !/^[a-f0-9]{16}$/.test(realm)) throw new Error('房间信息无效');
  return `+qbot_join qbot-v1:${appId}:${realm}:${roomId}`;
}
export function parseJoin(command: unknown, appId: number, realm: string): string | null {
  if (typeof command !== 'string' || command.length > 160) return null;
  const match = /^\+qbot_join qbot-v1:(\d+):([a-f0-9]{16}):([A-Z0-9]{8})$/.exec(command);
  return match && Number(match[1]) === appId && match[2] === realm ? match[3] : null;
}
export function joinFromArgs(args: string[]): string | null {
  const i = args.indexOf('+qbot_join');
  if (i < 0 || !args[i + 1] || args.lastIndexOf('+qbot_join') !== i) return null;
  return `+qbot_join ${args[i + 1]}`;
}

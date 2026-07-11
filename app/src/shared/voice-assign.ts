/**
 * 角色声线分配：按角色 id 哈希确定性派生（voice spec §5）。
 * 纯函数、零依赖——主进程（manifest 懒迁移）与渲染进程（缺字段回退）共用。
 */
import type { ManifestVoice } from '@qbot/pipeline';

export const VOICE_PACK_IDS = ['soft', 'bouncy', 'baby'] as const;
export type VoicePackId = (typeof VOICE_PACK_IDS)[number];

/** FNV-1a 32 位（够用且各端实现一致） */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** [0,1) 的确定性伪随机：同 id 同 salt 永远同值 */
function unit(id: string, salt: string): number {
  return fnv1a(`${salt}:${id}`) / 0x100000000;
}

export function assignVoice(characterId: string): ManifestVoice {
  return {
    pack: VOICE_PACK_IDS[fnv1a(characterId) % VOICE_PACK_IDS.length],
    pitchScale: round3(0.85 + unit(characterId, 'pitch') * 0.3), // [0.85, 1.15)
    rateScale: round3(0.9 + unit(characterId, 'rate') * 0.2), // [0.9, 1.1)
  };
}

/** 校验 manifest 里的 voice 字段；缺失或 pack 未知时回退到哈希分配 */
export function resolveVoice(
  characterId: string,
  voice: ManifestVoice | undefined,
): ManifestVoice {
  if (
    voice &&
    (VOICE_PACK_IDS as readonly string[]).includes(voice.pack) &&
    Number.isFinite(voice.pitchScale) &&
    Number.isFinite(voice.rateScale)
  ) {
    return voice;
  }
  return assignVoice(characterId);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

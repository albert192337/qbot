import type { Manifest } from '@qbot/pipeline';
import type { StickerManifest } from './sticker-behavior';

export function playableResources(m: Manifest) {
  return Object.fromEntries([...Object.entries(m.actions??{}), ...Object.entries(m.importedActions??{}), ...Object.entries(m.expressionActions??{}), ...Object.entries(m.customActions??{})]
    .filter(([, a]) => a.webm && (!('status' in a) || a.status === 'done')));
}
export function scenePool(m: Manifest, scene: string): string[] {
  const lib = (m as StickerManifest).stickerLibrary;
  const ids = m.scenePools?.[scene] ?? lib?.sceneCandidates?.[scene]
    ?? (scene === 'idle' ? lib?.idleCandidates : undefined)
    ?? [lib?.scenes?.[scene] || scene];
  const available = playableResources(m);
  return [...new Set(ids)].filter(id => !!available[id]);
}
export function resourceText(m: Manifest, id: string): { name: string; meaning: string; tags: string[] } {
  const lib = (m as StickerManifest).stickerLibrary;
  const key = lib?.scenes?.[id] ?? id;
  const item = lib?.items.find(i => i.id === key);
  const custom = m.resourceAnnotations?.[id] ?? m.resourceAnnotations?.[key];
  const action = { ...m.actions, ...m.importedActions, ...m.expressionActions, ...m.customActions }[id];
  return {
    name: custom?.name || item?.name || lib?.variants?.[key]?.description || id,
    meaning: custom ? custom.meaning : item?.meaning || (action && 'motionDesc' in action ? action.motionDesc : '') || '',
    tags: custom?.tags ?? item?.tags ?? [],
  };
}
const PATTERNS: Record<string, RegExp> = {
  idle: /待机|安静|发呆|惬意|休息|平静|趴地上|无聊至极/,
  drag: /拖拽|悬浮|提起|拎起/, sleep: /睡|瞌睡/, tea: /喝茶|放松|休息/,
  talk_happy: /开心|高兴|快乐|笑/, talk_annoyed: /生气|嫌弃|不高兴|愤怒/,
  wave: /招呼|挥手|你好|问候/, garden_sow: /播种|种花|浇水/,
  garden_harvest: /收获|采摘/, perch_sit: /坐.*窗|窗.*坐/,
  perch_lie: /趴.*窗|窗.*趴/, writing: /写字|手账|记录/,
};
export function recommendedFor(scene: string, text: string): boolean {
  return PATTERNS[scene]?.test(text) ?? false;
}

import path from 'node:path';
import { clearLegacyStickerMotionLabels } from '@qbot/pipeline';
import { editManifest } from './manifest-store';
import { playableResources } from '../shared/action-resources';
import { STICKER_SCENES } from '../shared/sticker-library';

export function saveResourceAnnotation(dir: string, id: string, value: { name: string; meaning: string; tags: string[] }) {
  return editManifest(path.join(dir, 'manifest.json'), m => {
    if (!Object.hasOwn({ ...m.actions, ...m.importedActions, ...m.expressionActions, ...m.customActions }, id)) throw new Error('资源不存在');
    if (typeof value.name !== 'string' || value.name.length > 80 || typeof value.meaning !== 'string' || value.meaning.length > 500 || !Array.isArray(value.tags)) throw new Error('名称最多 80 字，含义最多 500 字');
    const annotation = { name: value.name.trim(), meaning: value.meaning.trim(), tags: [...new Set(value.tags.map(t => String(t).trim()).filter(Boolean))].slice(0,20).map(t => t.slice(0,40)) };
    m.resourceAnnotations = { ...m.resourceAnnotations, [id]: annotation };
    const item = m.stickerLibrary?.items.find(i => i.id === id);
    clearLegacyStickerMotionLabels(m);
    if (item) { if(annotation.name) item.name = annotation.name; item.meaning = annotation.meaning; item.tags = annotation.tags; }
  });
}
export function saveScenePools(dir: string, pools: Record<string, string[]>) {
  return editManifest(path.join(dir, 'manifest.json'), m => {
    const available = playableResources(m);
    const allowed = new Set<string>(STICKER_SCENES.map(([id]) => id));
    const normalized: Record<string, string[]> = {};
    for (const [scene, ids] of Object.entries(pools)) {
      if (!allowed.has(scene) || !Array.isArray(ids) || ids.some(id => !Object.hasOwn(available, id))) throw new Error('请选择可播放的动作');
      normalized[scene] = [...new Set(ids)];
    }
    if (!normalized.idle?.length) throw new Error('待机至少选择一个动作');
    m.scenePools = { ...m.scenePools, ...normalized };
    for(const [scene,ids] of Object.entries(normalized)) {
      // Existing standard IDs are resources too: changing a pool must not replace their asset.
      if(ids.length && !available[scene]) m.actions[scene as keyof typeof m.actions]={...available[ids[0]], status:'done'};
      if(m.stickerLibrary && ids.length) m.stickerLibrary.scenes[scene]=ids[0];
    }
    if (m.stickerLibrary) {
      m.stickerLibrary.sceneCandidates = { ...m.stickerLibrary.sceneCandidates, ...normalized };
      m.stickerLibrary.idleCandidates = normalized.idle;
    }
  });
}

import type { Manifest } from '@qbot/pipeline';
import type { StickerLibrary } from '../shared/sticker-library';

/** 与 Player 的覆盖顺序一致；每次思考重新读取，新增动作无需重启。 */
export function brainActions(manifest?: Manifest): Array<{ id: string; description: string }> {
  if (!manifest) return [];
  const entries: Array<[string, { webm: string; status?: string; motionDesc?: string; category?: string }]> = [
    ...Object.entries(manifest.actions ?? {}),
    ...Object.entries(manifest.importedActions ?? {}),
    ...Object.entries(manifest.expressionActions ?? {}),
    ...Object.entries(manifest.customActions ?? {}),
  ];
  const library = (manifest as Manifest & { stickerLibrary?: StickerLibrary }).stickerLibrary;
  const disabled = new Set(library?.items.filter(i => !i.enabled).map(i => i.id));
  const playable = entries.filter(([id, a]) => !disabled.has(id)
    && (!library || !id.startsWith('variant_') || library.variants?.[id]?.enabled)
    && a.webm && (!('status' in a) || a.status === 'done'));
  return [...new Map(playable)].map(([id, a]) => ({
    id,
    description: library?.items.find(i => i.id === id) ? [library.items.find(i=>i.id===id)!.name,...library.items.find(i=>i.id===id)!.tags].join('；').slice(0,180)
      : library?.variants?.[id]?.description || ('motionDesc' in a ? a.motionDesc : undefined)?.slice(0, 180)
      || ('category' in a ? a.category : undefined) || id,
  }));
}

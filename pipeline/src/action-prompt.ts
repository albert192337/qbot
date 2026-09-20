import type { Manifest, ManifestAction } from './types.js';

type StickerMetadata = { items?: Array<{ name: string; meaning?: string; tags: string[] }> };
const normalized = (text: string) => text.split('；').map(v => v.trim()).filter(Boolean).join('；');

/** Legacy imports stored labels in the same field as an explicit generation instruction. */
export function generationMotionDesc(manifest: Manifest, action?: ManifestAction): string | undefined {
  if (!action?.motionDesc?.trim()) return undefined;
  if (action.motionDescSource === 'user') return action.motionDesc;
  const library = (manifest as Manifest & { stickerLibrary?: StickerMetadata }).stickerLibrary;
  const value = normalized(action.motionDesc);
  if (library?.items?.some(item => value === normalized([item.name, item.meaning ?? '', ...(item.tags ?? [])].join('；')))) {
    return undefined;
  }
  return action.motionDesc;
}

/** Remove known legacy labels before renaming metadata, so they cannot become unrecognisable. */
export function clearLegacyStickerMotionLabels(manifest: Manifest): void {
  for (const action of [...Object.values(manifest.actions), ...Object.values(manifest.customActions ?? {})]) {
    if (action?.motionDesc && generationMotionDesc(manifest, action) === undefined) delete action.motionDesc;
  }
}

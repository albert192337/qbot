import type { Manifest } from '@qbot/pipeline';

/** 与 Player 的覆盖顺序一致；每次思考重新读取，新增动作无需重启。 */
export function brainActions(manifest?: Manifest): Array<{ id: string; description: string }> {
  if (!manifest) return [];
  const entries: Array<[string, { webm: string; status?: string; motionDesc?: string; category?: string }]> = [
    ...Object.entries(manifest.actions ?? {}),
    ...Object.entries(manifest.importedActions ?? {}),
    ...Object.entries(manifest.expressionActions ?? {}),
    ...Object.entries(manifest.customActions ?? {}),
  ];
  const playable = entries.filter(([, a]) => a.webm && (!('status' in a) || a.status === 'done'));
  return [...new Map(playable)].map(([id, a]) => ({
    id,
    description: ('motionDesc' in a ? a.motionDesc : undefined)?.slice(0, 180)
      || ('category' in a ? a.category : undefined) || id,
  }));
}

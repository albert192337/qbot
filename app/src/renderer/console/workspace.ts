/** Editing a character never changes the pet currently on the desktop. */
import type { CharacterMeta } from '../../shared/ipc-types';
export interface ConsoleRoute { pane: string; dirId?: string; taskId?: string; fresh?: boolean }
let selectedId: string | null = null;
export const getSelectedCharacterId = (): string | null => selectedId;
export function selectCharacter(id: string | null): void { selectedId = id; }
export async function getEditingCharacter(): Promise<CharacterMeta | null> {
  if (selectedId) {
    const selected = (await window.qbot.characters.list()).find((c) => c.dirId === selectedId && c.manifest);
    if (selected) return selected;
    selectedId = null;
  }
  const active = await window.qbot.characters.getActive();
  selectedId = active?.dirId ?? null;
  return active;
}
export function navigate(route: ConsoleRoute): void {
  window.dispatchEvent(new CustomEvent('console:navigate', { detail: route }));
}
export function taskCharacters(characters: CharacterMeta[]): CharacterMeta[] {
  return characters.filter((c) => !c.taskDismissed && (c.hasUnfinishedJob ||
    Object.values(c.manifest?.actions ?? {}).some((a) => a.status === 'failed') ||
    [...Object.values(c.manifest?.customActions ?? {}), ...Object.values(c.manifest?.expressionActions ?? {})]
      .some((a) => a.status === 'pending' || a.status === 'failed')));
}

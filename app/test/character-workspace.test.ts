import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterMeta } from '../src/shared/ipc-types';
import { getEditingCharacter, getSelectedCharacterId, selectCharacter, taskCharacters } from '../src/renderer/console/workspace';
import { collectActions } from '../src/renderer/console/panes/_studio-shared';
const done = { status: 'done' as const, webm: 'idle.webm', gif: 'idle.gif', durationSec: 5 };
const character = (id: string): CharacterMeta => ({ dirId: id, manifest: { name: id, actions: { idle: done } }, hasUnfinishedJob: false }) as CharacterMeta;
beforeEach(() => selectCharacter(null));
afterEach(() => vi.unstubAllGlobals());
describe('character workspace context', () => {
  it('edits a library character without changing the desktop pet', async () => {
    const activate = vi.fn(); const first = character('desktop'); const second = character('editing');
    vi.stubGlobal('window', { qbot: { characters: { list: async () => [first, second], getActive: async () => first, activate } } });
    selectCharacter('editing');
    expect((await getEditingCharacter())?.dirId).toBe('editing');
    expect(activate).not.toHaveBeenCalled();
  });
  it('keeps the editing selection when desktop activation changes externally', async () => {
    const first = character('desktop'); const second = character('editing');
    vi.stubGlobal('window', { qbot: { characters: { list: async () => [first, second], getActive: async () => first } } });
    selectCharacter('editing'); await getEditingCharacter();
    expect(getSelectedCharacterId()).toBe('editing');
  });
  it('falls back to the active pet if the edited character was deleted', async () => {
    vi.stubGlobal('window', { qbot: { characters: { list: async () => [], getActive: async () => character('desktop') } } });
    selectCharacter('deleted'); expect((await getEditingCharacter())?.dirId).toBe('desktop');
  });
  it('handles an empty library', async () => {
    vi.stubGlobal('window', { qbot: { characters: { list: async () => [], getActive: async () => null } } });
    expect(await getEditingCharacter()).toBeNull();
  });
});
describe('unified action library', () => {
  it('shows the imported asset that actually overrides a standard slot', () => {
    const manifest = character('one').manifest;
    manifest.importedActions = { idle: { raw: 'raw.gif', webm: 'stickers/idle.webm', durationSec: 2, sourceName: 'cat' } };
    const actions = collectActions(manifest);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ id: 'idle', webm: 'stickers/idle.webm', isImported: true });
  });
  it('preserves custom precedence without duplicate action options', () => {
    const manifest = character('one').manifest;
    manifest.customActions = { idle: { ...done, webm: 'custom.webm' } };
    expect(collectActions(manifest)).toHaveLength(1);
    expect(collectActions(manifest)[0]).toMatchObject({ isCustom: true, webm: 'custom.webm' });
  });
});
describe('task inventory', () => {
  it('keeps dismissed records out of both task lists and counts', () => {
    const pet = character('hidden'); pet.hasUnfinishedJob = true; pet.taskDismissed = true;
    expect(taskCharacters([pet])).toEqual([]);
    pet.taskDismissed = false;
    expect(taskCharacters([pet])).toEqual([pet]);
  });
  it('deduplicates a job with failed actions and includes extension failures', () => {
    const unfinished = character('new'); unfinished.hasUnfinishedJob = true;
    unfinished.manifest.actions.idle = { ...done, status: 'failed' };
    const extension = character('extension'); extension.manifest.expressionActions = { cheer: { ...done, status: 'failed' } };
    expect(taskCharacters([unfinished, extension, character('ready')]).map((c) => c.dirId)).toEqual(['new', 'extension']);
  });
  it('includes pending custom generation', () => {
    const pet = character('custom'); pet.manifest.customActions = { dance: { ...done, status: 'pending' } };
    expect(taskCharacters([pet])).toEqual([pet]);
  });
});

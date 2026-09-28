import { ipcMain } from 'electron';
import { listCharacters, getCharacter } from './characters';
import { getSettings } from './config';
import { getPetWindow } from './windows';
import { listTestGuests } from './rooms/test-guests';
import { relationships, localPerson, peerPerson } from './relationships';
import type { PairKind } from '../shared/pair-interaction';

export function registerRelationshipsIpc(): void {
  ipcMain.handle('relationships:get', async () => {
    const [characters, guests, settings] = await Promise.all([listCharacters(),listTestGuests(),getSettings()]);
    const locals = characters.filter(c => c.manifest).map(localPerson);
    const peers = guests.filter(g => g.source === '房友缓存' && g.ownerId && g.ownerRealm)
      .map(g => peerPerson(g.character,g.ownerId!,g.ownerRealm!,g.owner));
    const prior = await relationships.snapshot();
    // A historical package must never replace a newer live profile.
    await relationships.remember([...locals,...peers.filter(p => !prior.people.some(old => old.id === p.id))]);
    const snapshot = await relationships.snapshot();
    return {...snapshot,people:snapshot.people.filter(p => p.source==='peer'||locals.some(l=>l.id===p.id)),activeId:locals.find(p => p.dirId === settings.activeCharacter)?.id};
  });
  ipcMain.handle('relationships:save', (_e, from, to, settings) => relationships.save(from,to,settings));
  ipcMain.handle('relationships:recordLocal', async (e, hostId: string, guestId: string, kind: PairKind, session: string) => {
    if (e.sender !== getPetWindow()?.webContents || e.senderFrame !== e.sender.mainFrame) throw Error('互动只能由桌宠记录');
    if ((await getSettings()).activeCharacter !== hostId) return;
    const [host,guest] = await Promise.all([getCharacter(hostId),getCharacter(guestId)]);
    // Cached friends in a rehearsal are not a real meeting with their owner.
    if (!host?.manifest || !guest?.manifest || hostId===guestId) return;
    await relationships.record(localPerson(host),localPerson(guest),kind,`local:${session}`);
  });
}

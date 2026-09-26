import { getSettings } from './config';
import { getCharacter } from './characters';
import { gardenRequest } from './rooms/rooms';
import { PAIR_INTERACTIONS, pairBeats, type PairKind } from '../shared/pair-interaction';
import { writePairLine, type PairVoice } from './pair-dialogue';

const seen = new Map<string, number>();
let busy = false;
export async function respondPairLine(frame: Record<string, unknown>, connected: () => boolean): Promise<void> {
  if (!connected() || typeof frame.request !== 'string' || !PAIR_INTERACTIONS.some(k => k.id === frame.kind) ||
      !Number.isInteger(frame.step) || !pairBeats(frame.kind as PairKind)[frame.step as number]) return;
  for (const [id, at] of seen) if (Date.now() - at > 60000) seen.delete(id);
  if (busy || seen.has(frame.request)) return;
  seen.set(frame.request, Date.now());
  busy = true;
  try {
    const settings = await getSettings();
    if (!settings.activeCharacter || settings.activeCharacter !== frame.actor) return;
    const character = await getCharacter(settings.activeCharacter);
    if (!character) return;
    let voice: PairVoice = character.manifest;
    if (frame.companion && typeof frame.companion === 'object') {
      const companion = frame.companion as Record<string, unknown>;
      if (typeof companion.name !== 'string' || typeof companion.persona !== 'string') return;
      voice = { name: companion.name, persona: companion.persona };
    }
    const line = await writePairLine(settings.arkApiKey, { kind: frame.kind as PairKind, step: frame.step as number, voice,
      partner: typeof frame.partner === 'string' ? frame.partner : '伙伴',
      partnerPersona: typeof frame.partnerPersona === 'string' ? frame.partnerPersona : undefined,
      history: Array.isArray(frame.history) ? frame.history.filter((s): s is string => typeof s === 'string').slice(0, 3) : [],
      intent: typeof frame.intent === 'string' ? frame.intent : undefined });
    const latest = await getSettings();
    const current = latest.activeCharacter === settings.activeCharacter ? await getCharacter(settings.activeCharacter) : null;
    if (!connected() || !current || latest.arkApiKey !== settings.arkApiKey ||
        current.manifest.persona !== character.manifest.persona || current.manifest.name !== character.manifest.name) return;
    // Only the resulting spoken sentence is shared. Never send the persona or key.
    void gardenRequest({ action: 'pair:line', request: frame.request, line }).catch(() => {});
  } finally { busy = false; }
}

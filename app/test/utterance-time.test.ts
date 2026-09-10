import { expect, it } from 'vitest';
import data from '../src/shared/utterances.json';
import { pickUtterance, type Utterance } from '../src/renderer/pet/voice/utterance-picker';

it('only picks the built-in goodnight line between 21:00 and 05:00 local time', () => {
  const lines = data.utterances.filter(u => u.id === 'idle-206') as Utterance[];
  for (const hour of [5, 8, 12, 17, 20]) expect(pickUtterance(lines, 'idle', { random: () => 0 }, undefined, hour)).toBeNull();
  for (const hour of [21, 23, 0, 4]) expect(pickUtterance(lines, 'idle', { random: () => 0 }, undefined, hour)?.id).toBe('idle-206');
});

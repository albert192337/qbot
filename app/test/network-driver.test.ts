import { describe, expect, it, vi } from 'vitest';
import { NetworkDriver } from '../src/renderer/pet/network-driver';

describe('NetworkDriver meeting mode', () => {
  it('uses the character meeting action for synchronized meetings', () => {
    const play = vi.fn();
    const driver = new NetworkDriver({ play });
    driver.setCharacter(['idle', 'tea'], { meetingAction: 'tea' });
    play.mockClear();

    driver.applyState({ mode: 'meeting', sign: '正在开会' });

    expect(play).toHaveBeenCalledWith('tea', true);
  });
});

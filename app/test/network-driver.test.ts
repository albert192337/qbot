import { describe, expect, it, vi } from 'vitest';
import { NetworkDriver } from '../src/renderer/pet/network-driver';

describe('NetworkDriver meeting mode', () => {
  it('keeps a chosen idle pose running across presence heartbeats', () => {
    const play=vi.fn();const driver=new NetworkDriver({play});driver.setCharacter(['idle','tea']);play.mockClear();
    driver.applyState({mode:'idle',action:'tea'});driver.applyState({mode:'idle',action:'tea'});
    expect(play).toHaveBeenCalledTimes(1);expect(play).toHaveBeenCalledWith('tea',true);
    driver.applyState({mode:'idle'});expect(play).toHaveBeenLastCalledWith('idle',true);
  });
  it('uses the character meeting action for synchronized meetings', () => {
    const play = vi.fn();
    const driver = new NetworkDriver({ play });
    driver.setCharacter(['idle', 'tea'], { meetingAction: 'tea' });
    play.mockClear();

    driver.applyState({ mode: 'meeting', sign: '正在开会' });

    expect(play).toHaveBeenCalledWith('tea', true);
  });
});

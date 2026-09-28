/** Only aggregate press activity leaves this module; no keys/text are stored or sent. */
export class WorkPressClock {
  private previousPoll = -Infinity;
  private lastPress = -Infinity;
  private seeded = false;
  private blocked = new Set<number>();
  sample(down: readonly number[], now: number): number {
    if (!this.seeded || now - this.previousPoll > 250) {
      this.seeded = true;
      this.blocked = new Set(down);
      this.lastPress = -Infinity;
    } else {
      for (const key of this.blocked) if (!down.includes(key)) this.blocked.delete(key);
      if (down.some(key => !this.blocked.has(key))) this.lastPress = now;
    }
    this.previousPoll = now;
    return now - this.lastPress;
  }
}
let readNative: (() => number) | undefined;
let attempted = false;
export function workIdleMilliseconds(): number {
  if (!attempted) {
    attempted = true;
    if (process.platform === 'win32') {
      try {
        const koffi: typeof import('koffi') = require('koffi');
        const state = koffi.load('user32.dll').func('int16_t __stdcall GetAsyncKeyState(int vKey)');
        const clock = new WorkPressClock();
        // Mouse buttons + keyboard only. Cursor position and movement never contribute.
        const buttons = [1, 2, 4, 5, 6, ...Array.from({ length: 247 }, (_, i) => i + 8)];
        readNative = () => {
          const down = buttons.filter(key => (state(key) & 0x8000) !== 0);
          return clock.sample(down, performance.now());
        };
      } catch { /* Unsupported native runtime fails quiet. */ }
    }
  }
  return readNative?.() ?? Infinity;
}

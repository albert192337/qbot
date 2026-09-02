import { describe, expect, it } from 'vitest';
import {
  foregroundEventType,
  foregroundSignature,
  isOwnForegroundApp,
  normalizeForegroundCapture,
  parseForegroundCollectorOutput,
} from '../src/main/foreground-app';

describe('foreground app capture normalization', () => {
  it('keeps supported macOS metadata and marks title access as full', () => {
    expect(
      normalizeForegroundCapture(
        {
          app: 'Visual Studio Code',
          windowTitle: 'qbot — perception.ts',
          processId: 123,
          processName: 'Electron',
          bundleId: 'com.microsoft.VSCode',
          executablePath: '/Applications/Visual Studio Code.app',
          windowBounds: { x: 10, y: 20, width: 1200, height: 800 },
          windowState: 'fullscreen',
        },
        'macos',
        'macos-nsworkspace-system-events',
        1000,
      ),
    ).toEqual({
      at: 1000,
      platform: 'macos',
      source: 'macos-nsworkspace-system-events',
      detailLevel: 'full',
      app: 'Visual Studio Code',
      windowTitle: 'qbot — perception.ts',
      processId: 123,
      processName: 'Electron',
      bundleId: 'com.microsoft.VSCode',
      executablePath: '/Applications/Visual Studio Code.app',
      windowBounds: { x: 10, y: 20, width: 1200, height: 800 },
      windowState: 'fullscreen',
    });
  });

  it('accepts app-only captures when window title permission is unavailable', () => {
    expect(
      normalizeForegroundCapture(
        { app: 'Finder', processId: 42 },
        'macos',
        'macos-nsworkspace-system-events',
        2000,
      ),
    ).toMatchObject({ app: 'Finder', detailLevel: 'basic', processId: 42 });
  });

  it('folds whitespace, bounds fields, and drops invalid process ids', () => {
    const capture = normalizeForegroundCapture(
      {
        app: `  ${'A'.repeat(200)}  `,
        windowTitle: `line one\n${'T'.repeat(500)}`,
        processId: -2,
        executablePath: ' C:\\Program Files\\Example\\example.exe ',
        windowBounds: { x: -100, y: 0, width: -1, height: 900 },
        windowState: 'floating',
      },
      'windows',
      'windows-user32',
      3000,
    );
    expect(capture?.app).toHaveLength(120);
    expect(capture?.windowTitle).toHaveLength(300);
    expect(capture?.windowTitle).not.toContain('\n');
    expect(capture?.processId).toBeUndefined();
    expect(capture?.executablePath).toBe('C:\\Program Files\\Example\\example.exe');
    expect(capture?.windowBounds).toBeUndefined();
    expect(capture?.windowState).toBeUndefined();
  });

  it('rejects malformed JSON and captures without an app name', () => {
    expect(parseForegroundCollectorOutput('{bad', 'windows', 'windows-user32', 1)).toBeNull();
    expect(parseForegroundCollectorOutput('{"windowTitle":"Untitled"}', 'windows', 'windows-user32', 1)).toBeNull();
  });

  it('deduplicates by app, title, and process identity rather than timestamp', () => {
    const first = normalizeForegroundCapture(
      { app: 'Code', windowTitle: 'a.ts', processId: 9 },
      'windows',
      'windows-user32',
      1,
    )!;
    const same = { ...first, at: 2 };
    const nextTitle = { ...first, at: 3, windowTitle: 'b.ts' };
    expect(foregroundSignature(first)).toBe(foregroundSignature(same));
    expect(foregroundSignature(first)).not.toBe(foregroundSignature(nextTitle));
    expect(foregroundEventType(null, first)).toBe('app_focus');
    expect(foregroundEventType(first, same)).toBeNull();
    expect(foregroundEventType(first, nextTitle)).toBe('foreground_change');
    expect(foregroundEventType(first, { ...first, app: 'Safari' })).toBe('app_focus');
  });

  it('recognizes the QBot process by pid or executable path', () => {
    const capture = normalizeForegroundCapture(
      { app: 'QBot', processId: 20, executablePath: 'C:\\Apps\\QBot.exe' },
      'windows',
      'windows-user32',
      1,
    )!;
    expect(isOwnForegroundApp(capture, 20, 'C:\\Other\\QBot.exe')).toBe(true);
    expect(isOwnForegroundApp(capture, 99, 'c:/apps/qbot.exe')).toBe(true);
    expect(isOwnForegroundApp(capture, 99, 'C:\\Apps\\Other.exe')).toBe(false);
  });
});

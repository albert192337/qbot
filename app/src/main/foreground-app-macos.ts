import { execFile } from 'node:child_process';

const JXA_SCRIPT = String.raw`
ObjC.import('AppKit');

const running = $.NSWorkspace.sharedWorkspace.frontmostApplication;
if (!running) {
  JSON.stringify({ app: '' });
} else {
  const unwrap = (value) => {
    try { return value ? ObjC.unwrap(value) : ''; } catch (_) { return ''; }
  };
  const appName = unwrap(running.localizedName);
  let windowTitle = '';
  let windowBounds = null;
  let windowState = 'unknown';
  let detailLevel = 'basic';
  try {
    const systemEvents = Application('System Events');
    const process = systemEvents.applicationProcesses.byName(appName);
    const windows = process.windows();
    if (windows.length > 0) {
      const frontWindow = windows[0];
      windowTitle = String(frontWindow.name());
      const position = frontWindow.position();
      const size = frontWindow.size();
      windowBounds = {
        x: Number(position[0]),
        y: Number(position[1]),
        width: Number(size[0]),
        height: Number(size[1]),
      };
      try {
        const fullscreen = Boolean(frontWindow.attributes.byName('AXFullScreen').value());
        windowState = fullscreen ? 'fullscreen' : 'normal';
      } catch (_) {
        windowState = 'normal';
      }
    }
    detailLevel = 'full';
  } catch (_) {}

  JSON.stringify({
    app: appName,
    windowTitle,
    processId: Number(running.processIdentifier),
    processName: appName,
    bundleId: unwrap(running.bundleIdentifier),
    executablePath: unwrap(running.executableURL.path),
    windowBounds,
    windowState,
    detailLevel,
  });
}
`;

export function collectMacForegroundJson(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'osascript',
      ['-l', 'JavaScript', '-e', JXA_SCRIPT],
      { timeout: 3_000, maxBuffer: 64 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message).trim().slice(0, 300)));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

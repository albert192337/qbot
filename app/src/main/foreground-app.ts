import type {
  ForegroundAppSnapshot,
  ForegroundCaptureSource,
  ForegroundPlatform,
  ForegroundWindowBounds,
  ForegroundWindowState,
} from '../shared/perception';
import { collectMacForegroundJson } from './foreground-app-macos';
import { collectWindowsForegroundJson } from './foreground-app-windows';

const APP_MAX = 120;
const TITLE_MAX = 300;
const ID_MAX = 200;
const PATH_MAX = 1_024;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return normalized || undefined;
}

function windowBounds(value: unknown): ForegroundWindowBounds | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const width = Number(raw.width);
  const height = Number(raw.height);
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) return undefined;
  return { x, y, width, height };
}

function windowState(value: unknown): ForegroundWindowState | undefined {
  return value === 'normal' || value === 'minimized' || value === 'maximized' || value === 'fullscreen' || value === 'unknown'
    ? value
    : undefined;
}

export function normalizeForegroundCapture(
  raw: Record<string, unknown>,
  platform: ForegroundPlatform,
  source: ForegroundCaptureSource,
  at = Date.now(),
): ForegroundAppSnapshot | null {
  const app = text(raw.app, APP_MAX);
  if (!app) return null;
  const windowTitle = text(raw.windowTitle, TITLE_MAX);
  const processId =
    typeof raw.processId === 'number' && Number.isInteger(raw.processId) && raw.processId > 0
      ? raw.processId
      : undefined;
  const bounds = windowBounds(raw.windowBounds);
  const state = windowState(raw.windowState);
  return {
    at,
    platform,
    source,
    detailLevel: raw.detailLevel === 'full' || windowTitle ? 'full' : 'basic',
    app,
    ...(windowTitle ? { windowTitle } : {}),
    ...(processId ? { processId } : {}),
    ...(text(raw.processName, ID_MAX) ? { processName: text(raw.processName, ID_MAX) } : {}),
    ...(text(raw.bundleId, ID_MAX) ? { bundleId: text(raw.bundleId, ID_MAX) } : {}),
    ...(text(raw.executablePath, PATH_MAX) ? { executablePath: text(raw.executablePath, PATH_MAX) } : {}),
    ...(bounds ? { windowBounds: bounds } : {}),
    ...(state ? { windowState: state } : {}),
    ...(typeof raw.isResponding === 'boolean' ? { isResponding: raw.isResponding } : {}),
  };
}

export function parseForegroundCollectorOutput(
  stdout: string,
  platform: ForegroundPlatform,
  source: ForegroundCaptureSource,
  at = Date.now(),
): ForegroundAppSnapshot | null {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return normalizeForegroundCapture(parsed as Record<string, unknown>, platform, source, at);
  } catch {
    return null;
  }
}

export function foregroundSignature(snapshot: ForegroundAppSnapshot): string {
  return JSON.stringify([
    snapshot.platform,
    snapshot.app,
    snapshot.windowTitle ?? '',
    snapshot.processId ?? 0,
    snapshot.processName ?? '',
    snapshot.bundleId ?? '',
    snapshot.executablePath ?? '',
    snapshot.windowBounds ?? null,
    snapshot.windowState ?? '',
    snapshot.isResponding ?? null,
    snapshot.detailLevel,
  ]);
}

export function foregroundEventType(
  previous: ForegroundAppSnapshot | null,
  next: ForegroundAppSnapshot,
): 'app_focus' | 'foreground_change' | null {
  if (!previous) return 'app_focus';
  if (foregroundSignature(previous) === foregroundSignature(next)) return null;
  return previous.app === next.app ? 'foreground_change' : 'app_focus';
}

export function isOwnForegroundApp(
  snapshot: ForegroundAppSnapshot,
  ownProcessId: number,
  ownExecutablePath: string,
): boolean {
  if (snapshot.processId === ownProcessId) return true;
  if (!snapshot.executablePath || !ownExecutablePath) return false;
  const normalizePath = (value: string): string =>
    snapshot.platform === 'windows' ? value.replace(/\\/g, '/').toLowerCase() : value;
  return normalizePath(snapshot.executablePath) === normalizePath(ownExecutablePath);
}

export async function captureForegroundApp(now = Date.now()): Promise<ForegroundAppSnapshot | null> {
  if (process.platform === 'darwin') {
    return parseForegroundCollectorOutput(
      await collectMacForegroundJson(),
      'macos',
      'macos-nsworkspace-system-events',
      now,
    );
  }
  if (process.platform === 'win32') {
    return parseForegroundCollectorOutput(
      await collectWindowsForegroundJson(),
      'windows',
      'windows-user32',
      now,
    );
  }
  return null;
}

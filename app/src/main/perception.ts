/**
 * 感知层（行为体系 spec §3）：事件总线 + 账本聚合 + 行为史 + 决策日志。
 *
 * 三份数据 + 一份日志：
 * - 原始事件流：内存环形缓冲 + 7 天滚动清理，**只进调试面板，永不进模型上下文**
 * - 账本：写入时聚合（字段宁多勿少——原始流 7 天后不可回扫），落盘
 * - 行为史：防重复自己，落盘
 * - 决策日志：每次触发的推理记录，落盘
 *
 * 落盘策略同 progress.ts：内存缓存 + 防抖写盘。账本按天键控。
 *
 * 前台应用追踪：macOS 上 Electron 的 browser-window-focus 在隐藏 dock 的
 * accessory 模式下不触发，改用 osascript 轮询 frontmost application（本机实测
 * 无需额外授权；轮询间隔长，开销可接受）。
 */
import { app } from 'electron';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  BehaviorEntry,
  DecisionLog,
  Ledger,
  PerceptionEvent,
  PerceptionSnapshot,
} from '../shared/perception';
import { aggregateEvent, emptyDay, todayKey } from './perception-rules';

/** 事件流保留窗口 */
const EVENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/** 事件流最大条数（7 天窗口内足够） */
const MAX_EVENTS = 5000;
/** 落盘防抖 */
const SAVE_DEBOUNCE_MS = 2_000;
/** 账本保留天数 */
const LEDGER_KEEP_DAYS = 60;

interface PerceptionState {
  events: PerceptionEvent[];
  ledger: Ledger;
  behaviors: BehaviorEntry[];
  decisions: DecisionLog[];
}

let cache: PerceptionState | null = null;
let loading: Promise<PerceptionState> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let emitListeners = new Set<(ev: PerceptionEvent) => void>();

function filePath(): string {
  return path.join(app.getPath('userData'), 'perception.json');
}

async function load(): Promise<PerceptionState> {
  if (cache) return cache;
  if (loading) return loading;
  loading = (async () => {
    try {
      const parsed = JSON.parse(await readFile(filePath(), 'utf8')) as Partial<PerceptionState>;
      cache = {
        events: Array.isArray(parsed.events) ? parsed.events : [],
        ledger:
          parsed.ledger && typeof parsed.ledger === 'object'
            ? (parsed.ledger as Ledger)
            : {},
        behaviors: Array.isArray(parsed.behaviors) ? parsed.behaviors : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      };
      prune();
    } catch {
      cache = { events: [], ledger: {}, behaviors: [], decisions: [] };
    }
    return cache;
  })();
  const s = await loading;
  loading = null;
  return s;
}

/** 过期清理：事件 7 天、账本 60 天（行为史/决策日志留最近 N 条即可） */
function prune(): void {
  if (!cache) return;
  const cutoff = Date.now() - EVENT_RETENTION_MS;
  cache.events = cache.events.filter((e) => e.at >= cutoff).slice(-MAX_EVENTS);
  const keepDays = new Set<string>();
  for (let i = 0; i < LEDGER_KEEP_DAYS; i++) {
    keepDays.add(todayKey(new Date(Date.now() - i * 86_400_000)));
  }
  for (const k of Object.keys(cache.ledger)) {
    if (!keepDays.has(k)) delete cache.ledger[k];
  }
  cache.behaviors = cache.behaviors.slice(-100);
  cache.decisions = cache.decisions.slice(-100);
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flush();
  }, SAVE_DEBOUNCE_MS);
}

/** 退出前调用，把防抖里没落的那笔写掉（同 progress.ts 的 flushProgress） */
export async function flush(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!cache) return;
  try {
    await mkdir(path.dirname(filePath()), { recursive: true });
    await writeFile(filePath(), JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('[perception] 写盘失败', err); // 写失败不阻塞感知
  }
}

function scheduleEmit(ev: PerceptionEvent): void {
  if (emitListeners.size === 0) return;
  for (const fn of emitListeners) fn(ev);
}

/** 订阅「有新感知事件」（行为规则引擎靠它做事件边沿触发；UI 刷新也用它） */
export function onPerceptionChanged(cb: (ev: PerceptionEvent) => void): () => void {
  emitListeners.add(cb);
  return () => emitListeners.delete(cb);
}

/** 聚合一条事件进账本（写入时聚合，字段宁多勿少） */
function aggregate(ev: PerceptionEvent): void {
  if (!cache) return;
  aggregateEvent(cache.ledger, ev);
}

/** 主入口：事件进流 + 聚合 + 广播。所有感知来源都走这里 */
export async function emitEvent(ev: PerceptionEvent): Promise<void> {
  const s = await load();
  s.events.push(ev);
  aggregate(ev);
  prune();
  scheduleSave();
  scheduleEmit(ev);
}

/** 行为史：桌宠说了/做了什么（防重复自己的依据） */
export async function recordBehavior(entry: BehaviorEntry): Promise<void> {
  const s = await load();
  s.behaviors.push(entry);
  scheduleSave();
}

/** 决策日志：一次触发想过的全部（命中/候选/选中/没做的原因） */
export async function recordDecision(log: DecisionLog): Promise<void> {
  const s = await load();
  s.decisions.push(log);
  scheduleSave();
}

/** 调试面板一次性快照（事件倒序、账本当日、行为史/决策倒序） */
export async function getSnapshot(): Promise<PerceptionSnapshot> {
  const s = await load();
  const key = todayKey();
  return {
    events: [...s.events].reverse().slice(0, 200),
    ledgerDate: key,
    ledger: s.ledger[key] ?? emptyDay(),
    behaviors: [...s.behaviors].reverse().slice(0, 100),
    decisions: [...s.decisions].reverse().slice(0, 100),
  };}

// ── 应用前台追踪：当前聚焦的窗口应用 + 停留时长 ──────────────
/** macOS 轮询前台应用（osascript）；非 mac 平台用 browser-window-focus（index.ts 接） */
const FRONT_POLL_MS = 10_000;
let currentApp: string | null = null;
let currentAppSince = 0;
let frontPollTimer: ReturnType<typeof setInterval> | null = null;

/** 上报前台应用（幂等：应用没变不重复发事件；变了才记录并累计） */
export async function onAppFocus(appName: string): Promise<void> {
  const now = Date.now();
  const name = appName.trim() || '(无标题)';
  if (currentApp !== name) {
    if (currentApp) {
      // 切走的时刻由下次上报时结算（focusMs 在账本里按「切换次数 + 时间戳」推导，
      // 完整时长累计在阶段 B 接入 use-duration 时补）
    }
    currentApp = name;
    currentAppSince = now;
    await emitEvent({ type: 'app_focus', at: now, app: name, windowTitle: name });
  }
}

/** macOS：osascript 轮询 frontmost application（失败静默，不阻塞） */
export function startFrontAppPolling(): void {
  if (process.platform !== 'darwin' || frontPollTimer) return;
  const poll = (): void => {
    execFile(
      'osascript',
      ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'],
      { timeout: 3_000 },
      (err, stdout) => {
        if (err) return; // 权限/进程退出等 → 静默跳过本轮
        const name = stdout.trim();
        if (name) void onAppFocus(name);
      },
    );
  };
  poll();
  frontPollTimer = setInterval(poll, FRONT_POLL_MS);
}

export function stopFrontAppPolling(): void {
  if (frontPollTimer) {
    clearInterval(frontPollTimer);
    frontPollTimer = null;
  }
}

/** 当前前台应用（快照/决策上下文用） */
export function currentFocus(): { app: string | null; since: number } {
  return { app: currentApp, since: currentAppSince };
}

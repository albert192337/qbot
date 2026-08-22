/**
 * 飞书会议监控：轮询飞书客户端会议模块（byteview）的本地明文日志，
 * 检测本机入会/离会，广播给 pet 窗口（举牌「正在开会」+ meeting 态动画）。
 *
 * 为什么读日志而不是 OpenAPI：飞书开放平台没有「查询/订阅某用户当前是否在会中」
 * 的能力（join/leave 事件只对 OpenAPI 预约的会议触发；企业级事件需管理员权限），
 * 而本地日志零权限、零网络、秒级延迟。详见 docs/feishu-meeting-monitor-design.md。
 *
 * 信号与失效保护：
 * - 入会/离会标记解析在 meeting-log-parser.ts（纯逻辑，可单测）
 * - 会中日志每秒 ~10 行持续写入 → 停滞 5min 视为飞书异常退出（崩溃不写离会标记）
 * - 飞书进程消失（30s 查一次，仅会中时）→ 立即归零
 * - IO 连续失败 10 次 → 降级禁用（只 console.error 一次）
 * - 1v1 语音通话与视频会议同走 RTC 房间，一并视为「会中」
 */
import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { sendToWindows } from './windows';
import { MeetingLogScanner, seedFromTail, type MeetingLogEvent } from './meeting-log-parser';
import type { MeetingStatus } from '../shared/ipc-types';

const POLL_MS = 2_000;
/** 启动播种：读当天日志尾部多少字节推断当前状态 */
const SEED_TAIL_BYTES = 256 * 1024;
/** 单次追读上限；落后太多说明睡眠恢复等长间隔，直接跳到尾部附近（只关心最新状态） */
const MAX_READ_BYTES = 4 * 1024 * 1024;
/** 会中日志停滞视为飞书异常退出的阈值 */
const STALL_MS = 5 * 60_000;
/** 会中时飞书进程存活检查间隔 */
const PROC_CHECK_MS = 30_000;
const MAX_IO_FAILURES = 10;

let currentStatus: MeetingStatus = { inMeeting: false };
let currentPath: string | null = null;
let offset = 0;
let scanner = new MeetingLogScanner();
let lastGrowthAt = 0;
let ioFailures = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let procTimer: ReturnType<typeof setInterval> | null = null;

function logDir(): string | null {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library/Application Support/LarkShell/sdk_storage/log/native-pc-sdk');
  }
  // Windows 客户端同源，日志路径按 mac 结构推断（未实测）；目录不存在会静默禁用
  if (process.platform === 'win32' && process.env.APPDATA) {
    return join(process.env.APPDATA, 'LarkShell', 'sdk_storage', 'log', 'native-pc-sdk');
  }
  return null;
}

/** 当天日志文件路径（本地时区，飞书按天轮转文件名） */
function todayLogPath(dir: string, now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return join(dir, `byteview-PCSDK-FALCON_${y}-${m}-${d}.log`);
}

async function readRange(path: string, start: number, end: number): Promise<string> {
  const fh = await open(path, 'r');
  try {
    const len = end - start;
    const buf = Buffer.alloc(len);
    const { bytesRead } = await fh.read(buf, 0, len, start);
    return buf.subarray(0, bytesRead).toString('utf8');
  } finally {
    await fh.close();
  }
}

function updateStatus(next: MeetingStatus): void {
  if (next.inMeeting === currentStatus.inMeeting) return;
  currentStatus = next;
  sendToWindows('meeting:status', next);
}

function applyEvents(events: MeetingLogEvent[]): void {
  // 一批增量里可能 join+leave 都有（短会），只认最后一个
  const last = events[events.length - 1];
  if (!last) return;
  if (last.kind === 'join') {
    updateStatus({ inMeeting: true, since: Date.now() });
  } else {
    updateStatus({ inMeeting: false });
  }
}

/** 会中飞书进程消失 → 崩溃/强杀不会写离会标记，直接归零 */
function checkProcessAlive(): void {
  if (!currentStatus.inMeeting || process.platform !== 'darwin') return;
  execFile('pgrep', ['-f', '(Lark|Feishu).app/Contents/MacOS/'], (err) => {
    if (err && currentStatus.inMeeting) {
      console.error('[meeting-monitor] 飞书进程消失，强制离会');
      updateStatus({ inMeeting: false });
    }
  });
}

async function tick(): Promise<void> {
  const dir = logDir();
  if (!dir) return;
  try {
    const path = todayLogPath(dir);
    if (path !== currentPath) {
      // 跨天：先榨干旧文件尾部（跨零点的离会标记在旧文件里），再切新文件从头读
      if (currentPath) {
        const st = await stat(currentPath).catch(() => null);
        if (st && st.size > offset) {
          applyEvents(scanner.push(await readRange(currentPath, offset, st.size)));
        }
      }
      currentPath = path;
      offset = 0;
      scanner = new MeetingLogScanner();
    }

    const st = await stat(currentPath).catch(() => null);
    if (!st) {
      // 今天还没有日志文件（未开过会/未装飞书）——会中态下停滞检查兜底
      checkStall();
      ioFailures = 0;
      return;
    }
    if (st.size < offset) {
      // 文件被轮转/清理重建
      offset = 0;
      scanner = new MeetingLogScanner();
    }
    if (st.size > offset) {
      if (st.size - offset > MAX_READ_BYTES) {
        // 落后太多（睡眠恢复）：跳到尾部用播种逻辑重定态
        const from = Math.max(0, st.size - SEED_TAIL_BYTES);
        const seed = seedFromTail(await readRange(currentPath, from, st.size));
        scanner = new MeetingLogScanner();
        updateStatus(seed.inMeeting ? { inMeeting: true, since: Date.now() } : { inMeeting: false });
      } else {
        applyEvents(scanner.push(await readRange(currentPath, offset, st.size)));
      }
      offset = st.size;
      lastGrowthAt = Date.now();
    } else {
      checkStall();
    }
    ioFailures = 0;
  } catch (err) {
    if (++ioFailures === MAX_IO_FAILURES) {
      console.error('[meeting-monitor] IO 连续失败，会议联动禁用:', (err as Error).message);
      stopMeetingMonitor();
      updateStatus({ inMeeting: false });
    }
  }
}

/** 会中日志每秒 ~10 行持续写入；停滞 = 飞书异常退出/日志被挪走，别把桌宠钉死在会中态 */
function checkStall(): void {
  if (currentStatus.inMeeting && Date.now() - lastGrowthAt > STALL_MS) {
    console.error('[meeting-monitor] 会中日志停滞超时，强制离会');
    updateStatus({ inMeeting: false });
  }
}

export function startMeetingMonitor(): void {
  const dir = logDir();
  if (!dir) return; // 平台不支持，静默禁用
  stopMeetingMonitor();

  // 启动播种：QBot 可能在会议中途启动/重启，从当天日志尾部推断初态
  void (async () => {
    try {
      const path = todayLogPath(dir);
      const st = await stat(path).catch(() => null);
      currentPath = path;
      offset = st?.size ?? 0;
      lastGrowthAt = Date.now();
      if (st && st.size > 0) {
        const from = Math.max(0, st.size - SEED_TAIL_BYTES);
        const seed = seedFromTail(await readRange(path, from, st.size));
        if (seed.inMeeting) updateStatus({ inMeeting: true, since: Date.now() });
      }
    } catch {
      // 播种失败不阻塞：轮询照常，初态维持不在会中
    }
    pollTimer = setInterval(() => void tick(), POLL_MS);
    procTimer = setInterval(checkProcessAlive, PROC_CHECK_MS);
  })();
}

export function stopMeetingMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (procTimer) {
    clearInterval(procTimer);
    procTimer = null;
  }
}

export function getMeetingStatus(): MeetingStatus {
  return currentStatus;
}

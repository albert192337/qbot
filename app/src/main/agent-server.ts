/**
 * Agent 状态服务：127.0.0.1 HTTP 服务接收各 agent CLI 的 hook 事件，
 * 按会话聚合 → 优先级合成单一活动状态 → 有变化时广播给 pet 窗口。
 *
 * 协议（兼容 clawd-on-desk 生态的字段形状，便于社区适配器直接指向本服务）：
 *   POST /state?agent=<id>  body = hook 原始 JSON（含 hook_event_name / session_id）
 *   GET  /state             健康检查 { app, port, sessions, activity }
 *
 * 服务发现：端口写 ~/.qbot/port（纯数字，shell hook 一行 cat）与
 * ~/.qbot/runtime.json（{ app, port }，给未来的富客户端）。
 * 多实例（QBOT_USER_DATA）时后启动者覆盖 port 文件 → hooks 只驱动最后一只，
 * M1 接受此限制。
 */
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AgentStatus } from '../shared/ipc-types';
import { EVENT_ACTIVITY, mergeSessions, type SessionEntry } from './agent-merge';
import {
  FALLBACK_TEXT,
  isSuperseded,
  MESSAGE_KIND,
  sessionKeyOf,
  sessionLabel,
  shortSession,
  toBubbleText,
} from './agent-message';
import { readLastAssistantEntry } from './transcript';
import { pushAgentMessage } from './bubble';
import { sendToWindows } from './windows';
import { pushLocalAgentActivity } from './link/link';
import { pushLocalAgentActivity as pushRoomsActivity } from './rooms/rooms';
import { addAgentRun } from './progress';

const PORTS = [24242, 24243, 24244, 24245, 24246];
const BODY_LIMIT = 64 * 1024;
/** 会话无事件超时（CLI 崩溃/断网收不到 SessionEnd） */
const STALE_MS = 10 * 60_000;
/** 扫描周期：TTL 衰减靠它兑现，所以要明显小于最短 TTL（done 45s） */
const SWEEP_MS = 10_000;
/** Stop 时 transcript 最后一行可能还没落盘 → 等一下重读 */
const TRANSCRIPT_RETRY_MS = 250;
/**
 * 回复的 timestamp 比事件到达时刻早于此值即视为「上一轮的回复」。
 * 读到过期内容比读不到更糟（会显示上一个问题的答案），宁可不冒泡。
 */
const STALE_REPLY_MS = 15_000;

const sessions = new Map<string, SessionEntry>();
/** 每会话的消息代际：新事件到达即让在飞的 transcript 读作废 */
const msgSeq = new Map<string, number>();
let lastBroadcast: AgentStatus = { activity: 'idle', sessions: 0 };
let server: http.Server | null = null;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

function qbotDir(): string {
  return path.join(os.homedir(), '.qbot');
}

export function getAgentStatus(): AgentStatus {
  return lastBroadcast;
}

function merge(): AgentStatus {
  return mergeSessions(sessions.values(), Date.now());
}

function broadcastIfChanged(): void {
  const next = merge();
  if (
    next.activity === lastBroadcast.activity &&
    next.sessions === lastBroadcast.sessions
  ) {
    return;
  }
  lastBroadcast = next;
  sendToWindows('agent:status', next);
  pushLocalAgentActivity(next.activity); // 1v1 联机钩子：只出状态枚举（spec §四）
  pushRoomsActivity(next.activity); // 公共房间钩子：同样只出枚举（2026-08-21 spec §5.3）
}

interface PendingMessage {
  key: string;
  seq: number;
  kind: 'done' | 'attention';
  agentId: string;
  sessionId: string;
  cwd: unknown;
  transcriptPath: unknown;
  message: unknown;
  /** Stop payload 的 last_assistant_message（新版 Claude Code 直接给，免读文件） */
  lastAssistantMessage: unknown;
  /** 事件到达主进程的时刻，用于判定读到的回复是不是上一轮的 */
  eventAt: number;
}

/**
 * 异步补气泡：HTTP 已经 200 应答，这里慢慢读文件都不影响 hook
 * （hook 侧 curl -m 2 + timeout 5）。整体 try/catch，绝不让浮动 Promise 炸主进程。
 */
async function emitAgentMessage(ev: PendingMessage): Promise<void> {
  try {
    let raw = '';
    if (ev.kind === 'attention') {
      raw = typeof ev.message === 'string' ? ev.message : '';
    } else if (typeof ev.lastAssistantMessage === 'string' && ev.lastAssistantMessage.trim()) {
      // 首选：Claude Code 的 Stop payload 直接带最后一条回复，无需读文件，
      // 也就没有落盘竞态和路径信任问题
      raw = ev.lastAssistantMessage;
    } else {
      // 兜底：老版本 CLI（或别的 agent）没有该字段时才去读 transcript
      let entry = await readLastAssistantEntry(ev.transcriptPath);
      if (!entry || (entry.at && ev.eventAt - entry.at > STALE_REPLY_MS)) {
        // 没读到，或读到的是上一轮 → 等最后一行落盘再试一次
        await new Promise((r) => setTimeout(r, TRANSCRIPT_RETRY_MS));
        if (isSuperseded(msgSeq.get(ev.key), ev.seq)) return;
        entry = await readLastAssistantEntry(ev.transcriptPath);
      }
      if (entry && entry.at && ev.eventAt - entry.at > STALE_REPLY_MS) {
        console.warn('agent-server: transcript 尾部仍是上一轮的回复，跳过气泡');
        return; // 显示过期内容比不显示更糟
      }
      raw = entry?.text ?? '';
    }
    if (isSuperseded(msgSeq.get(ev.key), ev.seq)) return; // 已被同会话的更新事件取代
    pushAgentMessage({
      sessionKey: ev.key,
      source: sessionLabel(ev.cwd, ev.agentId),
      sessionShort: shortSession(ev.sessionId),
      kind: ev.kind,
      text: toBubbleText(raw) || FALLBACK_TEXT[ev.kind],
      at: Date.now(),
    });
  } catch (err) {
    console.warn('agent-server: 消息富化失败', err);
  }
}

function handleStatePost(agentId: string, body: unknown): number {
  if (typeof body !== 'object' || body === null) return 400;
  const data = body as Record<string, unknown>;
  const event = typeof data.hook_event_name === 'string' ? data.hook_event_name : '';
  const rawSession = typeof data.session_id === 'string' && data.session_id ? data.session_id : 'default';
  const key = sessionKeyOf(agentId, rawSession);

  if (event === 'SessionEnd') {
    sessions.delete(key);
    msgSeq.delete(key);
    broadcastIfChanged();
    return 200;
  }
  const activity = EVENT_ACTIVITY[event];
  if (!activity) return 200; // 未知事件静默忽略（hook 端 fire-and-forget）
  sessions.set(key, { activity, updatedAt: Date.now() });
  broadcastIfChanged();

  // 「Claude Code 跑完一次 +10 点」。计在原始 Stop 事件上而不是合成状态的
  // done 跃迁上：合成态会被更高优先级会话遮住、还有 TTL 衰减，按状态数会漏。
  if (event === 'Stop') void addAgentRun();

  const kind = MESSAGE_KIND[event];
  if (kind) {
    const seq = (msgSeq.get(key) ?? 0) + 1;
    msgSeq.set(key, seq);
    // 先应答后富化：绝不让读文件拖住 hook
    void emitAgentMessage({
      key,
      seq,
      kind,
      agentId,
      sessionId: rawSession,
      cwd: data.cwd,
      transcriptPath: data.transcript_path,
      message: data.message,
      lastAssistantMessage: data.last_assistant_message,
      eventAt: Date.now(),
    });
  }
  return 200;
}

function sweep(): void {
  const now = Date.now();
  for (const [key, s] of sessions) {
    if (now - s.updatedAt > STALE_MS) {
      sessions.delete(key);
      msgSeq.delete(key);
    }
  }
  broadcastIfChanged(); // TTL 衰减（done/waiting/working…）也靠周期扫描兑现
}

function listen(port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/state') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ app: 'qbot', port, ...merge() }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/state') {
        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (c: Buffer) => {
          size += c.length;
          if (size > BODY_LIMIT) req.destroy();
          else chunks.push(c);
        });
        req.on('end', () => {
          let code = 400;
          try {
            code = handleStatePost(
              url.searchParams.get('agent') ?? 'unknown',
              JSON.parse(Buffer.concat(chunks).toString('utf8')),
            );
          } catch {
            /* 非法 JSON → 400 */
          }
          res.writeHead(code).end();
        });
        return;
      }
      res.writeHead(404).end();
    });
    srv.once('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

export async function startAgentServer(): Promise<void> {
  for (const port of PORTS) {
    try {
      server = await listen(port);
    } catch {
      continue; // 端口被占（多实例/残留进程）→ 试下一个
    }
    const dir = qbotDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'port'), String(port));
    await writeFile(
      path.join(dir, 'runtime.json'),
      JSON.stringify({ app: 'qbot', port }, null, 2),
    );
    sweepTimer = setInterval(sweep, SWEEP_MS);
    return;
  }
  console.error('agent-server: all ports busy, agent 联动不可用');
}

export function stopAgentServer(): void {
  if (sweepTimer) clearInterval(sweepTimer);
  sweepTimer = null;
  server?.close();
  server = null;
}

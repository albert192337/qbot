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
import { pushLocalAgentActivity as pushRoomsActivity } from './rooms/rooms';
import { emitEvent } from './perception';
import { addAgentRun } from './progress';
import { AGENT } from '../shared/config';
import { withTimeout } from '../shared/timeout';

// 已在shared/config.ts中定义，保留注释用于参考
// const PORTS = [24242, 24243, 24244, 24245, 24246];
const BODY_LIMIT = AGENT.BODY_LIMIT;
const STALE_MS = AGENT.STALE_MS;
const SWEEP_MS = AGENT.SWEEP_MS;
const TRANSCRIPT_RETRY_MS = AGENT.TRANSCRIPT_RETRY_MS;
const STALE_REPLY_MS = AGENT.STALE_REPLY_MS;

const sessions = new Map<string, SessionEntry>();
/** 每会话的消息代际：新事件到达即让在飞的 transcript 读作废 */
const msgSeq = new Map<string, number>();
// 已在shared/config.ts中定义，保留注释用于参考
// const MAX_SESSIONS = 1000;
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
  pushRoomsActivity(next.activity); // 公共房间钩子：只出状态枚举（2026-08-21 spec §5.3）
  void emitEvent({
    type: 'agent',
    at: Date.now(),
    activity: next.activity,
    sessions: next.sessions,
  }); // 感知层：事件流 + 账本（行为规则引擎在 perception 事件订阅里接边沿触发）
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
  console.debug('[agent-server] 收到事件:', event, 'agent:', agentId, 'session:', rawSession);

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
  let cleaned = 0;
  // 清理过期会话
  for (const [key, s] of sessions) {
    if (now - s.updatedAt > STALE_MS) {
      sessions.delete(key);
      msgSeq.delete(key);
      cleaned++;
    }
  }
  // 超过最大会话数时清理最旧的会话
  if (sessions.size > AGENT.MAX_SESSIONS) {
    const entries = Array.from(sessions.entries()).sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    const toDelete = entries.slice(0, sessions.size - AGENT.MAX_SESSIONS);
    for (const [key] of toDelete) {
      sessions.delete(key);
      msgSeq.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.debug('[agent-server] 清理了', cleaned, '个过期会话');
  }
  broadcastIfChanged(); // TTL 衰减（done/waiting/working…）也靠周期扫描兑现
}

function listen(port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      // 为每个请求设置超时
      req.setTimeout(30000, () => {
        console.error('agent-server: 请求超时', req.url);
        res.writeHead(408).end();
      });

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
          if (size > BODY_LIMIT) {
            req.destroy();
            res.writeHead(413).end();
            return;
          }
          chunks.push(c);
        });
        req.on('end', () => {
          let code = 400;
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            code = handleStatePost(
              url.searchParams.get('agent') ?? 'unknown',
              body,
            );
          } catch (err) {
            console.error('agent-server: 处理POST请求失败', err);
            /* 非法 JSON → 400 */
          }
          res.writeHead(code).end();
        });
        return;
      }
      res.writeHead(404).end();
    });
    srv.once('error', (err) => {
      console.error('[agent-server] 服务器错误', err);
      reject(err);
    });
    srv.listen(port, '127.0.0.1', () => {
      console.log('[agent-server] 服务器启动在端口', port);
      resolve(srv);
    });
  });
}

export async function startAgentServer(): Promise<void> {
  for (const port of AGENT.PORTS) {
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

  // 关闭HTTP服务器
  if (server) {
    server.close((err) => {
      if (err) console.error('agent-server: 关闭服务器失败', err);
    });
    server = null;
  }

  // 清空所有会话
  sessions.clear();
  msgSeq.clear();
  lastBroadcast = { activity: 'idle', sessions: 0 };
}

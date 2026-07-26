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
import { getPetWindow } from './windows';

const PORTS = [24242, 24243, 24244, 24245, 24246];
const BODY_LIMIT = 64 * 1024;
/** 会话无事件超时（CLI 崩溃/断网收不到 SessionEnd） */
const STALE_MS = 10 * 60_000;
/** 扫描周期：TTL 衰减靠它兑现，所以要明显小于最短 TTL（done 45s） */
const SWEEP_MS = 10_000;

const sessions = new Map<string, SessionEntry>();
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
  getPetWindow()?.webContents.send('agent:status', next);
}

function handleStatePost(agentId: string, body: unknown): number {
  if (typeof body !== 'object' || body === null) return 400;
  const data = body as Record<string, unknown>;
  const event = typeof data.hook_event_name === 'string' ? data.hook_event_name : '';
  const rawSession = typeof data.session_id === 'string' && data.session_id ? data.session_id : 'default';
  const key = `${agentId}:${rawSession}`;

  if (event === 'SessionEnd') {
    sessions.delete(key);
    broadcastIfChanged();
    return 200;
  }
  const activity = EVENT_ACTIVITY[event];
  if (!activity) return 200; // 未知事件静默忽略（hook 端 fire-and-forget）
  sessions.set(key, { activity, updatedAt: Date.now() });
  broadcastIfChanged();
  return 200;
}

function sweep(): void {
  const now = Date.now();
  for (const [key, s] of sessions) {
    if (now - s.updatedAt > STALE_MS) sessions.delete(key);
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

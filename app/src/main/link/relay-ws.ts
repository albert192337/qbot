/**
 * relay-ws：Transport 的中继实现。连用户 VPS 上的 @qbot/relay
 * （协议见 spec §3.1 + relay/server.mjs），控制帧配对，配对后帧盲转。
 *
 * 信任模型：relay 盲转意味着对端理论上能伪造 paired/peer-left 控制帧——
 * 1v1 好友链接接受这一点（spec §四把 relay 和对端都当不可信节点，
 * 防线是「敏感内容根本不发」而不是鉴别帧来源）。
 */
import type { LinkFrame, Transport, TransportEvents } from './transport';

/** relay 缺省地址（用户 VPS，spec §六）；开发调试可 QBOT_RELAY_URL 指到 localhost */
const DEFAULT_RELAY_URL = 'ws://14.103.59.73:24250';
const CONNECT_TIMEOUT_MS = 8_000;
const CONTROL_TIMEOUT_MS = 8_000;
const WS_OPEN = 1;

/** Node ≥22 内置全局 WebSocket（undici）；@types/node 旧版缺声明 → 本地补最小类型 */
interface WsLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: string, listener: (ev: { data?: unknown }) => void): void;
}
const WebSocketCtor = (globalThis as Record<string, unknown>).WebSocket as
  | (new (url: string) => WsLike)
  | undefined;

export class RelayWsTransport implements Transport {
  private ws: WsLike | null = null;
  private paired = false;
  private closedByUs = false;
  /** create/join 在飞的控制帧等待者（同时至多一个） */
  private pending: {
    resolve: (f: LinkFrame) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  constructor(
    private events: TransportEvents,
    private url = process.env.QBOT_RELAY_URL || DEFAULT_RELAY_URL,
  ) {}

  async create(): Promise<string> {
    const frame = await this.request({ t: 'create' }, 'room');
    return String(frame.code ?? '');
  }

  async join(code: string): Promise<void> {
    // join 成功的应答就是 paired（relay 不单发 ack）
    await this.request({ t: 'join', code }, 'paired');
  }

  send(frame: LinkFrame): void {
    if (this.ws && this.ws.readyState === WS_OPEN && this.paired) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  close(): void {
    this.closedByUs = true;
    this.takePending()?.reject(new Error('transport_closed'));
    this.ws?.close();
    this.ws = null;
  }

  // ── 内部 ────────────────────────────────────────────────

  private async request(frame: LinkFrame, expect: 'room' | 'paired'): Promise<LinkFrame> {
    const ws = await this.connect();
    return new Promise<LinkFrame>((resolve, reject) => {
      this.pending = {
        resolve: (f) => (f.t === expect ? resolve(f) : reject(new Error(`unexpected ${f.t}`))),
        reject,
        timer: setTimeout(() => {
          this.pending = null;
          reject(new Error('relay_timeout'));
        }, CONTROL_TIMEOUT_MS),
      };
      ws.send(JSON.stringify(frame));
    });
  }

  private connect(): Promise<WsLike> {
    if (this.ws && this.ws.readyState === WS_OPEN) return Promise.resolve(this.ws);
    if (!WebSocketCtor) {
      return Promise.reject(new Error('WebSocket unavailable (need Electron with Node >= 22)'));
    }
    return new Promise<WsLike>((resolve, reject) => {
      const ws = new WebSocketCtor!(this.url);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error(`relay connect timeout: ${this.url}`));
      }, CONNECT_TIMEOUT_MS);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        this.ws = ws;
        resolve(ws);
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error(`relay unreachable: ${this.url}`));
      });
      ws.addEventListener('message', (ev) => this.handleMessage(ev.data));
      ws.addEventListener('close', () => {
        clearTimeout(timer);
        this.takePending()?.reject(new Error('relay_closed'));
        if (!this.closedByUs && this.ws === ws) {
          this.ws = null;
          this.events.onClosed();
        }
      });
    });
  }

  private handleMessage(data: unknown): void {
    let frame: LinkFrame;
    try {
      frame = JSON.parse(String(data)) as LinkFrame;
    } catch {
      return; // 非 JSON 帧直接丢（relay 只转发文本 JSON）
    }
    switch (frame.t) {
      case 'room':
        this.takePending()?.resolve(frame);
        break;
      case 'paired':
        this.paired = true;
        this.takePending()?.resolve(frame);
        this.events.onPaired();
        break;
      case 'peer-left':
        this.paired = false;
        this.events.onPeerLeave();
        break;
      case 'error':
        this.takePending()?.reject(new Error(String(frame.code ?? 'relay_error')));
        break;
      default:
        if (this.paired) this.events.onFrame(frame);
    }
  }

  private takePending(): { resolve: (f: LinkFrame) => void; reject: (e: Error) => void } | null {
    const p = this.pending;
    if (!p) return null;
    clearTimeout(p.timer);
    this.pending = null;
    return p;
  }
}

import type { SteamSnapshot } from '../../shared/steam';
import type { SteamConfig } from './rules';
import type { SteamRoom } from './service';

export interface SteamWorker {
  postMessage(value: unknown): void;
  on(event: 'message' | 'exit', listener: (...args: any[]) => void): unknown;
  kill(): unknown;
}
type Callbacks = { consent: () => Promise<boolean>; join: (code: string) => Promise<unknown> };
type Pending = { resolve: (value: SteamSnapshot) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; callbacks?: Callbacks };

/** The SDK may call exit/abort inside native code. Keep it outside Electron's main process. */
export class SteamBridge {
  private worker?: SteamWorker;
  private timer?: ReturnType<typeof setInterval>;
  private calls = new Map<number, Pending>();
  private sequence = 0;
  private lastRoom = '';
  private state: SteamSnapshot;
  constructor(private options: {
    config: SteamConfig; realm: string; spawn: () => SteamWorker; room: () => SteamRoom | null;
    changed: (state: SteamSnapshot) => void; incoming: () => void;
    decode: (state: SteamSnapshot) => SteamSnapshot;
  }) { this.state = this.empty(options.config.error || '此启动方式尚未启用 Steam。', !!options.config.error); }
  private empty(reason: string, failed = false): SteamSnapshot {
    return {phase:failed?'unavailable':'disabled',appId:this.options.config.appId,demo:this.options.config.demo,
      label:'Steam 尚未连接',reason,friends:[],canInvite:false};
  }
  snapshot(): SteamSnapshot { return structuredClone(this.state); }
  private update(state: SteamSnapshot): void { this.state = this.options.decode(state); this.options.changed(this.snapshot()); }
  private ensure(): boolean {
    if (this.worker) return true;
    if (!this.options.config.appId || this.options.config.error) return false;
    try {
      const worker = this.options.spawn(); this.worker = worker;
      worker.on('message', message => {
        if (this.worker === worker) void this.message(message, worker).catch(error=>this.failed(`Steam 数据处理失败：${String(error)}`));
      });
      worker.on('exit', () => { if (this.worker === worker) this.failed('Steam 原生进程已退出；桌宠仍可使用，请启动 Steam 后重新连接。'); });
      worker.postMessage({type:'init',config:this.options.config,realm:this.options.realm});
      const sync = () => {
        const room = this.options.room(), json = JSON.stringify(room);
        if (json !== this.lastRoom) {
          try { worker.postMessage({type:'room',room}); this.lastRoom=json; }
          catch(error) { this.failed(`Steam 连接中断：${String(error)}`); }
        }
      };
      this.lastRoom=''; sync(); this.timer=setInterval(sync,100); this.timer.unref?.();
      return true;
    } catch (error) { this.failed(`Steam 进程启动失败：${String(error)}`); return false; }
  }
  start(): void { void this.refresh().catch(() => {}); }
  async refresh(): Promise<SteamSnapshot> {
    if (!this.ensure()) return this.snapshot();
    await this.request('refresh'); return this.snapshot();
  }
  receive(command: string): void { if (this.ensure()) this.worker!.postMessage({type:'receive',command}); }
  async invite(id: unknown): Promise<void> { await this.request('invite',[id]); }
  async dismiss(id: string): Promise<void> { await this.request('dismiss',[id]); }
  async accept(id: string, consent: Callbacks['consent'], join: Callbacks['join']): Promise<void> {
    await this.request('accept',[id],{consent,join});
  }
  private request(method: string, args: unknown[] = [], callbacks?: Callbacks): Promise<SteamSnapshot> {
    if (!this.worker) return Promise.reject(new Error(this.state.reason));
    const id = ++this.sequence;
    return new Promise((resolve,reject) => {
      const timer=setTimeout(()=>this.failed('Steam 响应超时，请重新连接。'),callbacks?180000:15000);
      this.calls.set(id,{resolve,reject,timer,callbacks});
      try { this.worker!.postMessage({type:'call',id,method,args}); }
      catch(error) { this.failed(`Steam 连接中断：${String(error)}`); }
    });
  }
  private async message(message: any, worker: SteamWorker): Promise<void> {
    if (message.type==='changed') { this.update(message.state); return; }
    if (message.type==='incoming') { this.options.incoming(); return; }
    const call=this.calls.get(message.id);
    if (!call) return;
    if (message.type==='result') {
      clearTimeout(call.timer); this.calls.delete(message.id);
      if (message.error) call.reject(new Error(message.error));
      else { if (message.state) this.update(message.state); call.resolve(this.snapshot()); }
    } else if (message.type==='callback' && call.callbacks) {
      try {
        const value=message.method==='consent' ? await call.callbacks.consent() : await call.callbacks.join(message.roomId);
        if (this.worker===worker) worker.postMessage({type:'callbackResult',id:message.callbackId,value});
      } catch(error) { if (this.worker===worker) worker.postMessage({type:'callbackResult',id:message.callbackId,error:String(error)}); }
    }
  }
  private failed(reason: string): void {
    const worker=this.worker; this.worker=undefined; clearInterval(this.timer); this.timer=undefined;
    for (const call of this.calls.values()) { clearTimeout(call.timer); call.reject(new Error(reason)); }
    this.calls.clear();
    try { worker?.kill(); } catch { /* the process may have already exited */ }
    this.update(this.empty(reason,true));
  }
  stop(): void {
    const worker=this.worker; this.worker=undefined; clearInterval(this.timer); this.timer=undefined;
    for (const call of this.calls.values()) { clearTimeout(call.timer); call.reject(new Error('Steam 连接已关闭')); }
    this.calls.clear();
    if (worker) {
      try { worker.postMessage({type:'stop'}); } catch { /* already exited */ }
      const deadline=setTimeout(()=>worker.kill(),1000); deadline.unref?.();
      worker.on('exit',()=>clearTimeout(deadline));
    }
    this.update(this.empty('Steam 连接已关闭。'));
  }
}

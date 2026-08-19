/**
 * 联机 transport 抽象（spec §二.1）：relay-ws 是首实现，
 * 未来 steam-p2p 实现同一接口即可整层替换，link.ts 不感知。
 */

/** 业务帧（hello/state/bye…），经 relay 盲转，peer ↔ peer */
export interface LinkFrame {
  t: string;
  [k: string]: unknown;
}

export interface TransportEvents {
  /** 配对成功（join 成功 / 对端加入 / 对端掉线后重连回来） */
  onPaired(): void;
  /** 对端业务帧（已 JSON 解析；只在配对期间投递） */
  onFrame(frame: LinkFrame): void;
  /** 对端断开（relay 保房 10min，可能重连回来） */
  onPeerLeave(): void;
  /** 本端连接断掉（网络故障/服务器重启），transport 已不可用（重连是 L3） */
  onClosed(): void;
}

export interface Transport {
  /** 建房，resolve 房间码；之后等对端 join 触发 onPaired */
  create(): Promise<string>;
  /** 加入房间；resolve 即已配对。房间不存在/已满/超时 reject */
  join(code: string): Promise<void>;
  /** 发业务帧（未配对时静默丢弃） */
  send(frame: LinkFrame): void;
  close(): void;
}

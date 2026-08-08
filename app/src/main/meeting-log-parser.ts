/**
 * 飞书会议日志解析（纯逻辑，vitest 可单测）。
 *
 * 信号源：飞书客户端会议模块（byteview / 字节 RTC）的明文按天日志
 *   <LarkShell>/sdk_storage/log/native-pc-sdk/byteview-PCSDK-FALCON_<YYYY-MM-DD>.log
 * 入会/离会各有稳定的单行标记（2026-08 实测，mac 客户端 131.x）：
 *   入会  join-work-flow: onRoomStateChanged: onJoinChannelSuccess room_id: 76711..., uid: ...
 *   离会  join-work-flow:leaveRoom（备用：RTCStreamManager::LeaveRoom()）
 *
 * 标记选的是 RTC 引擎入口函数名（跨版本稳定度高于业务日志文案）。
 * 1v1 语音通话与视频会议同走 RTC 房间，一并视为「会中」。
 */

export type MeetingLogEvent =
  | { kind: 'join'; roomId?: string }
  | { kind: 'leave' };

/** 入会：onJoinChannelSuccess 是加入 RTC 房间成功的唯一入口（重连成功也会再发，join→join 幂等） */
const JOIN_MARKER = 'onRoomStateChanged: onJoinChannelSuccess';
/** 离会主标记 + 备用标记（两条在真实日志里相隔 ~2s，都只在挂断时出现） */
const LEAVE_MARKERS = ['join-work-flow:leaveRoom', 'RTCStreamManager::LeaveRoom()'];

const ROOM_ID_RE = /room_id:\s*(\d+)/;

/** 解析单行日志；非标记行返回 null */
export function parseLine(line: string): MeetingLogEvent | null {
  if (line.includes(JOIN_MARKER)) {
    return { kind: 'join', roomId: ROOM_ID_RE.exec(line)?.[1] };
  }
  if (LEAVE_MARKERS.some((m) => line.includes(m))) return { kind: 'leave' };
  return null;
}

/**
 * 增量块扫描器：喂任意切割的字节块，吐完整行里的会议事件。
 * 末尾半行留到下一块（同 music-monitor 的 stdout 处理）。
 */
export class MeetingLogScanner {
  private buf = '';

  push(chunk: string): MeetingLogEvent[] {
    this.buf += chunk;
    const lines = this.buf.split(/\r?\n/);
    this.buf = lines.pop() ?? '';
    // 防御：半行永远不该膨胀（日志单行 < 1KB），异常时丢弃避免内存泄漏
    if (this.buf.length > 8192) this.buf = '';
    const events: MeetingLogEvent[] = [];
    for (const line of lines) {
      const ev = parseLine(line);
      if (ev) events.push(ev);
    }
    return events;
  }
}

/**
 * 启动播种：从当天日志的尾部片段推断当前是否在会中。
 * 取最后一个 join/leave 标记定态；片段开头可能截断半行，逐行扫即可
 * （截断行最坏丢一个标记，join 每场会只有一行 → 保守方向是「不在会中」，可接受）。
 */
export function seedFromTail(tail: string): { inMeeting: boolean; roomId?: string } {
  let last: MeetingLogEvent | null = null;
  for (const line of tail.split(/\r?\n/)) {
    const ev = parseLine(line);
    if (ev) last = ev;
  }
  if (last?.kind === 'join') return { inMeeting: true, roomId: last.roomId };
  return { inMeeting: false };
}

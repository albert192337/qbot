import { describe, expect, it } from 'vitest';
import {
  MeetingLogScanner,
  parseLine,
  seedFromTail,
} from '../src/main/meeting-log-parser';

// 真实日志行样本（2026-08-07 mac 飞书客户端 131.x，uid 已脱敏为随机数字）
const JOIN_LINE =
  '11:01:35.041 - 73349118 - I - [BYTEVIEW-BYTERTC]: join-work-flow: onRoomStateChanged: onJoinChannelSuccess room_id: 7671119202266713047, uid: 7605431980175396018, elapsed: 0';
const LEAVE_LINE = '12:03:42.692 - 73348995 - I - [BYTEVIEW-BYTERTC]: join-work-flow:leaveRoom';
const LEAVE_BACKUP_LINE =
  '12:03:40.658 - 73348995 - I - [BYTEVIEW-BYTERTC]: entry auto RTCStreamManager::LeaveRoom()::(anonymous class)::operator()() const';
// 会中高频噪声：别人进出房间，不是本机入会/离会
const NOISE_LINES = [
  '11:01:35.041 - 73349118 - I - [BYTEVIEW-BYTERTC]: onUserJoined uid: 7593211584130845641',
  '11:01:35.044 - 73348998 - I - [byteview-vcp2p]: P2PManager::OnUserJoined uid:7390695731181617180, size:2',
  '12:03:40.658 - 73348998 - I - [byteview-vcp2p]: P2PConnection::LeaveRoom m_randomSyn:, m_bOffer:false, peerClientType:0, joinRoom:false',
  '11:01:35.041 - 73349118 - I - [BYTEVIEW-BYTERTC]: EventHandler::onRoomStateChange room_id: 7671119202266713047, uid: 7605431980175396018, state: 0, extra_info: {"elapsed":287,"join_type":0}',
];

describe('parseLine', () => {
  it('识别入会行并提取 room_id', () => {
    expect(parseLine(JOIN_LINE)).toEqual({ kind: 'join', roomId: '7671119202266713047' });
  });

  it('识别离会主标记与备用标记', () => {
    expect(parseLine(LEAVE_LINE)).toEqual({ kind: 'leave' });
    expect(parseLine(LEAVE_BACKUP_LINE)).toEqual({ kind: 'leave' });
  });

  it('会中噪声行（他人进出/P2P/房间状态回调）不误报', () => {
    for (const line of NOISE_LINES) {
      expect(parseLine(line)).toBeNull();
    }
  });
});

describe('MeetingLogScanner 增量扫描', () => {
  it('整块喂入吐出事件序列', () => {
    const s = new MeetingLogScanner();
    const events = s.push([NOISE_LINES[0], JOIN_LINE, NOISE_LINES[1], LEAVE_LINE, ''].join('\n'));
    expect(events).toEqual([
      { kind: 'join', roomId: '7671119202266713047' },
      { kind: 'leave' },
    ]);
  });

  it('半行跨块拼接（标记行被从中间切开）', () => {
    const s = new MeetingLogScanner();
    const cut = JOIN_LINE.indexOf('onJoinChannel'); // 从标记中间切
    expect(s.push(JOIN_LINE.slice(0, cut))).toEqual([]);
    expect(s.push(JOIN_LINE.slice(cut) + '\n')).toEqual([
      { kind: 'join', roomId: '7671119202266713047' },
    ]);
  });

  it('末尾无换行的行不提前判定，补换行后吐出', () => {
    const s = new MeetingLogScanner();
    expect(s.push(LEAVE_LINE)).toEqual([]); // 可能还有后半截
    expect(s.push('\n')).toEqual([{ kind: 'leave' }]);
  });

  it('CRLF（Windows 日志）同样切行', () => {
    const s = new MeetingLogScanner();
    expect(s.push(JOIN_LINE + '\r\n' + LEAVE_LINE + '\r\n')).toEqual([
      { kind: 'join', roomId: '7671119202266713047' },
      { kind: 'leave' },
    ]);
  });
});

describe('seedFromTail 启动播种', () => {
  it('尾部最后一个标记是 join → 会中', () => {
    const tail = [NOISE_LINES[3], LEAVE_LINE, NOISE_LINES[0], JOIN_LINE, NOISE_LINES[1]].join('\n');
    expect(seedFromTail(tail)).toEqual({ inMeeting: true, roomId: '7671119202266713047' });
  });

  it('尾部最后一个标记是 leave → 不在会中', () => {
    const tail = [JOIN_LINE, NOISE_LINES[0], LEAVE_LINE, NOISE_LINES[2]].join('\n');
    expect(seedFromTail(tail)).toEqual({ inMeeting: false });
  });

  it('无任何标记（含空文本）→ 不在会中', () => {
    expect(seedFromTail(NOISE_LINES.join('\n'))).toEqual({ inMeeting: false });
    expect(seedFromTail('')).toEqual({ inMeeting: false });
  });

  it('片段开头截断半行不影响后续标记识别', () => {
    const tail = JOIN_LINE.slice(40) + '\n' + LEAVE_LINE + '\n' + JOIN_LINE;
    expect(seedFromTail(tail).inMeeting).toBe(true);
  });
});

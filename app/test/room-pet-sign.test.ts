import { describe, expect, it } from 'vitest';
import { resolveRoomPetSign } from '../src/renderer/pet/room-pet-sign';

describe('resolveRoomPetSign', () => {
  const base = {
    nickname: '小明',
    gone: false,
    transferText: null,
    chatText: null,
    presenceSign: null,
  };

  it('昵称由独立名牌展示，没有临时文字时收牌', () => {
    expect(resolveRoomPetSign(base)).toBe('');
  });

  it('同步牌面高于昵称', () => {
    expect(resolveRoomPetSign({ ...base, presenceSign: '正在开会' })).toBe('正在开会');
  });

  it('聊天使用独立气泡，暂时收起同步牌面', () => {
    expect(resolveRoomPetSign({ ...base, presenceSign: '工作中…', chatText: '大家好' })).toBe('');
  });

  it('传输和离线提示保持最高优先级', () => {
    expect(resolveRoomPetSign({ ...base, presenceSign: '工作中…', transferText: '走来中…' })).toBe('走来中…');
    expect(resolveRoomPetSign({ ...base, gone: true, presenceSign: '工作中…' })).toBe('小明 离开了…');
  });
});

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

  it('默认显示昵称', () => {
    expect(resolveRoomPetSign(base)).toBe('小明');
  });

  it('同步牌面高于昵称', () => {
    expect(resolveRoomPetSign({ ...base, presenceSign: '正在开会' })).toBe('正在开会');
  });

  it('聊天临时覆盖同步牌面', () => {
    expect(resolveRoomPetSign({ ...base, presenceSign: '工作中…', chatText: '大家好' })).toBe('大家好');
  });

  it('传输和离线提示保持最高优先级', () => {
    expect(resolveRoomPetSign({ ...base, presenceSign: '工作中…', transferText: '走来中…' })).toBe('走来中…');
    expect(resolveRoomPetSign({ ...base, gone: true, presenceSign: '工作中…' })).toBe('小明 离开了…');
  });
});

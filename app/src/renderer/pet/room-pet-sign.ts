export interface RoomPetSignState {
  nickname: string;
  gone: boolean;
  transferText: string | null;
  chatText: string | null;
  presenceSign: string | null;
}

export function resolveRoomPetSign(state: RoomPetSignState): string {
  if (state.gone) return `${state.nickname} 离开了…`;
  return state.transferText ?? state.chatText ?? state.presenceSign ?? state.nickname;
}

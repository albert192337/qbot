export interface RoomPetSignState {
  nickname: string;
  gone: boolean;
  transferText: string | null;
  chatText: string | null;
  presenceSign: string | null;
}

export function resolveRoomPetSign(state: RoomPetSignState): string {
  if (state.gone) return `${state.nickname} 离开了…`;
  // Chat is rendered as speech, and temporarily owns the same area as a sign.
  return state.transferText ?? (state.chatText ? '' : state.presenceSign ?? '');
}

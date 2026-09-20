/** Only serializable, non-secret SDK results cross IPC. SteamID must never be a JS number. */
export interface SteamPerson {
  steamId: string;
  name: string;
  avatar?: string;
}
export interface SteamFriend extends SteamPerson {
  state: number;
}
export interface SteamJoinRequest {
  id: string;
  roomId: string;
  fromSteamId?: string;
  expiresAt: number;
}
export interface SteamSnapshot {
  phase: 'disabled' | 'unavailable' | 'ready';
  appId?: number;
  demo: boolean;
  label: string;
  reason: string;
  self?: SteamPerson;
  friends: SteamFriend[];
  pendingJoin?: SteamJoinRequest;
  canInvite: boolean;
}
export interface SteamApi {
  get(): Promise<SteamSnapshot>;
  refresh(): Promise<SteamSnapshot>;
  invite(steamId: string): Promise<void>;
  accept(id: string): Promise<void>;
  dismiss(id: string): Promise<void>;
  onChanged(cb: (state: SteamSnapshot) => void): () => void;
}

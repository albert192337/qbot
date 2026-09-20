import type { CharacterMeta, CreateRoomInput, RoomChatMsg } from './ipc-types';

export interface SocialProfile {
  platform: { available: boolean; label: string; reason: string };
  nickname: string;
  character: CharacterMeta | null;
  actions: { id: string; label: string }[];
  pose: string;
  lastRoom?: CreateRoomInput;
  favorites: string[];
  extended: boolean;
}
export interface TestGuest {
  id: string;
  name: string;
  source: '角色库' | '房友缓存';
  owner?: string;
  character: CharacterMeta;
}
export interface SocialApi {
  prepareJoin(): Promise<boolean>;
  profile(): Promise<SocialProfile>;
  pose(action: string): Promise<void>;
  openChat(): void;
  copyCode(): Promise<string>;
  pin(pinned: boolean): Promise<void>;
  close(): void;
  send(text: string, world?: boolean): Promise<void>;
  world(subscribe: boolean): Promise<RoomChatMsg[]>;
  onWorld(cb: (messages: RoomChatMsg[]) => void): () => void;
  moderate(id: string, action: 'delete' | 'report', world?: boolean): Promise<void>;
  guests(): Promise<TestGuest[]>;
  startTest(): Promise<void>;
  inviteTest(id: string): Promise<void>;
  removeTest(id: string): Promise<void>;
  replyTest(id: string, text: string): Promise<void>;
  interactTest(id: string, kind: 'heart' | 'tea' | 'chat' | 'wave'): Promise<void>;
}

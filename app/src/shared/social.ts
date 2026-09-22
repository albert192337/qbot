import type { SteamApi } from './steam';
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
  ownerId?: string;
  ownerRealm?: string;
  character: CharacterMeta;
}
export interface SocialApi {
  rehearseContact(id: string): Promise<void>;
  contacts(refresh?: boolean): Promise<ContactSnapshot>;
  contactAction(id: string, action: ContactAction): Promise<void>;
  contactInvitation(id: string, accept: boolean): Promise<void>;
  onContacts(cb: (snapshot: ContactSnapshot) => void): () => void;
  steam: SteamApi;
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

export type ContactAction = 'request' | 'accept' | 'reject' | 'cancel' | 'remove' | 'invite';
export interface ContactPerson {
  id: string;
  nickname: string;
  character: string;
  title: string;
  online: boolean;
  seenAt?: number;
  interactedAt?: number;
  relation: 'friend' | 'incoming' | 'outgoing' | 'none';
}
export interface ContactSnapshot {
  available: boolean;
  reason: string;
  people: ContactPerson[];
  invitations: {id: string; nickname: string; expiresAt: number}[];
}

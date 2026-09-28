import type { PairKind } from './pair-interaction';

export interface RelationshipPerson {
  id: string;
  name: string;
  dirId: string;
  source: 'local' | 'peer';
  owner?: string;
  ownerId?: string;
}
export interface RelationshipSettings { label: string; nickname: string; note: string; favorite: boolean }
export interface Relationship {
  people: [string, string];
  points: number;
  count: number;
  firstAt: number;
  lastAt: number;
  settings: Record<string, RelationshipSettings>;
  memories: { id: string; kind: PairKind; at: number }[];
  receipts: string[];
}
export interface RelationshipSnapshot {
  people: RelationshipPerson[];
  relationships: Relationship[];
  activeId?: string;
}
export interface RelationshipsApi {
  get(): Promise<RelationshipSnapshot>;
  save(from: string, to: string, settings: RelationshipSettings): Promise<void>;
  recordLocal(host: string, guest: string, kind: PairKind, session: string): Promise<void>;
}
export const EMPTY_RELATIONSHIP_SETTINGS: RelationshipSettings = { label: '', nickname: '', note: '', favorite: false };
export function relationshipKey(a: string, b: string): string { return JSON.stringify([a, b].sort()); }
export function relationshipStage(points: number): { label: string; start: number; next?: number } {
  const stages = [{label:'初次相识',start:0},{label:'渐渐熟悉',start:25},{label:'相处投契',start:100},
    {label:'亲密伙伴',start:300},{label:'默契知己',start:750},{label:'长久相伴',start:1500}];
  const index = stages.findLastIndex(s => points >= s.start);
  return {...stages[Math.max(0,index)], next:stages[index+1]?.start};
}

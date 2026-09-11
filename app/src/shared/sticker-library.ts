/** Local sticker creation contract; paths are never supplied by renderer after scan. */
export interface StickerItem {
  id: string;
  name: string;
  tags: string[];
  enabled: boolean;
  raw: string;
  error?: string;
  suggestion?: { tags: string[]; note: string; loop: 'yes'|'no'|'uncertain'; subjects: 'single'|'multiple'|'uncertain' };
}
export interface StickerLibrary {
  semanticVersion?: number;
  idleCandidates?: string[];
  sceneNotes?: Record<string,string>;
  version: 1;
  items: StickerItem[];
  scenes: Record<string, string>;
  referenceId: string;
  variants?: Record<string, { description: string; enabled: boolean; sourceId?: string }>;
}
export interface StickerDraft {
  token: string;
  names: Array<{ id: string; name: string }>;
}
export interface StickerCreateRequest {
  token: string;
  name: string;
  referenceId: string;
  items: Array<Pick<StickerItem, 'id' | 'tags' | 'enabled'>>;
  scenes: Record<string, string>;
}
export interface StickerProgress { completed: number; total: number; current: string; failed: number }
export const STICKER_SCENES = [
  ['idle', '待机'], ['drag', '拖拽'], ['sleep', '睡觉'], ['tea', '放松'],
  ['talk_happy', '开心'], ['talk_annoyed', '不高兴'], ['wave', '打招呼'],
  ['garden_sow', '播种'], ['garden_harvest', '收获'],
] as const;

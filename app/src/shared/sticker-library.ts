/** Local sticker creation contract; paths are never supplied by renderer after scan. */
export interface StickerItem {
  meaning?: string;
  id: string;
  name: string;
  tags: string[];
  enabled: boolean;
  raw: string;
  error?: string;
  suggestion?: { tags: string[]; note: string; loop: 'yes'|'no'|'uncertain'; subjects: 'single'|'multiple'|'uncertain' };
}
export interface StickerLibrary {
  sceneCandidates?: Record<string, string[]>;
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
  sceneCandidates?: Record<string, string[]>;
  token: string;
  name: string;
  referenceId: string;
  items: Array<Pick<StickerItem, 'id' | 'tags' | 'enabled'> & Partial<Pick<StickerItem, 'name' | 'meaning'>>>;
  scenes: Record<string, string>;
}
export interface StickerProgress { completed: number; total: number; current: string; failed: number }
export const STICKER_SCENES = [
  ['idle', '待机'], ['drag', '拖拽'], ['sleep', '睡觉'], ['tea', '放松'],
  ['talk_happy', '开心'], ['talk_annoyed', '不高兴'], ['wave', '打招呼'],
  ['garden_sow', '播种'], ['garden_harvest', '收获'],
  ['perch', '窗沿停靠'],
  ['writing', '写手账'],
] as const;

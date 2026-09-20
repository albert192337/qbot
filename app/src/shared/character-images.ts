/** Explicit image purposes; cover choices never alter generation references. */
export type ImageSelection = { kind: 'source' | 'turnaround-front' } | { kind: 'action'; actionId: string; seconds: number };
export interface ImageChoice { selection: ImageSelection; label: string; durationSec?: number }

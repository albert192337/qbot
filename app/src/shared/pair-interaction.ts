import type { Manifest } from '@qbot/pipeline';
import type { StickerManifest } from './sticker-behavior';

export const PAIR_INTERACTIONS = [
  { id: 'heart', label: '送小心心' }, { id: 'tea', label: '请喝茶' },
  { id: 'chat', label: '一起聊天' }, { id: 'wave', label: '打招呼' },
  {id:'flower',label:'送一朵花'}, {id:'photo',label:'并排合影'}, {id:'relay',label:'表情接力'}, {id:'celebrate',label:'共同庆祝'},
] as const;
export type PairKind = typeof PAIR_INTERACTIONS[number]['id'];
export type PairIntent = 'heart' | 'happy' | 'tea' | 'talk' | 'listen' | 'wave';
type Clip = { webm: string; status?: string; durationSec?: number; facing?: 'left' | 'right'; sourceName?: string };
export interface PairAction { id: string; label: string; facing?: 'left' | 'right'; durationMs: number }

/** Match Player's completed-source merge order; disabled sticker items are never selected. */
export function pairActions(manifest: Manifest): Map<string, Clip> {
  const m = manifest as StickerManifest;
  const all = [...Object.entries(m.actions), ...Object.entries(m.importedActions ?? {}),
    ...Object.entries(m.expressionActions ?? {}), ...Object.entries(m.customActions ?? {})] as [string, Clip][];
  return new Map(all.filter(([id, clip]) => {
    const source = m.stickerLibrary?.scenes[id] ?? id;
    const item = m.stickerLibrary?.items.find(i => i.id === source);
    const variant = m.stickerLibrary?.variants?.[source];
    return !!(clip?.webm || m.spine?.actions[id]) && (!clip.status || clip.status === 'done') &&
      (!item || (item.enabled && !item.error)) && (!variant || variant.enabled);
  }));
}
const MEANINGS: Record<PairIntent, RegExp> = {
  heart: /爱心|比心|送心|喜欢你|heart|love/i,
  happy: /开心|高兴|快乐|庆祝|谢谢|happy|smile/i,
  tea: /喝茶|饮茶|喝水|喝咖啡|tea|drink/i,
  talk: /聊天|说话|讲话|talk|chat/i,
  listen: /倾听|聆听|听你|点头|listen|nod/i,
  wave: /挥手|打招呼|你好|招手|wave|hello/i,
};
const DEFAULTS: Record<PairIntent, string[]> = {
  heart: ['heart', 'love', 'talk_happy', 'wave'], happy: ['talk_happy', 'wave'],
  tea: ['tea', 'talk_happy'], talk: ['talk_happy'], listen: ['idle'], wave: ['wave', 'talk_happy'],
};
export function choosePairAction(m: Manifest, intent: PairIntent): PairAction | null {
  const clips = pairActions(m);
  const lib = (m as StickerManifest).stickerLibrary;
  const label = (id: string) => {
    const source = lib?.scenes[id] ?? id;
    const item = lib?.items.find(i => i.id === source);
    return item ? `${item.name} ${item.tags.join(' ')}` : lib?.variants?.[source]?.description ?? clips.get(id)?.sourceName ?? id;
  };
  const id = [...clips.keys()].find(id => MEANINGS[intent].test(label(id)) &&
    !/不开心|不高兴|生气|伤心|讨厌|拒绝|annoyed|angry|sad/i.test(label(id))) ??
    DEFAULTS[intent].find(id => clips.has(id)) ?? (clips.has('idle') ? 'idle' : clips.keys().next().value);
  if (!id) return null;
  const clip = clips.get(id)!;
  const seconds = clip.durationSec;
  return { id, label: label(id), facing: clip.facing,
    durationMs: Number.isFinite(seconds) && seconds! > 0 ? Math.min(60000, Math.max(1000, seconds! * 1000)) : 5000 };
}
export interface PairBeat { host: PairIntent; guest: PairIntent; effect: 'heart' | 'tea' | 'host-talk' | 'guest-talk' | 'wave'|'flower'|'photo'|'celebrate'; caption: string; speaker: 'host' | 'guest' }
export function pairBeats(kind: PairKind): PairBeat[] {
  switch (kind) {
    case 'flower':return [{host:'wave',guest:'listen',effect:'flower',speaker:'host',caption:'这朵花送给你'}, {host:'happy',guest:'happy',effect:'flower',speaker:'guest',caption:'喜欢！谢谢你呀'}];
    case 'photo':return [{host:'wave',guest:'happy',effect:'photo',speaker:'host',caption:'一起留个纪念吧'}, {host:'happy',guest:'happy',effect:'photo',speaker:'guest',caption:'三、二、一，茄子！'}];
    case 'relay':return [{host:'talk',guest:'listen',effect:'host-talk',speaker:'host',caption:'猜猜我在想什么？'}, {host:'listen',guest:'talk',effect:'guest-talk',speaker:'guest',caption:'轮到我啦！'}, {host:'happy',guest:'happy',effect:'heart',speaker:'host',caption:'接住了！'}];
    case 'celebrate':return [{host:'wave',guest:'happy',effect:'celebrate',speaker:'host',caption:'我们一起做到啦！'}, {host:'happy',guest:'happy',effect:'celebrate',speaker:'guest',caption:'值得好好庆祝一下'}];
    case 'heart': return [{ host: 'heart', guest: 'listen', effect: 'heart', speaker: 'host', caption: '送你一颗小心心' },
      { host: 'happy', guest: 'happy', effect: 'guest-talk', speaker: 'guest', caption: '小心心收到了！' }];
    case 'tea': return [{ host: 'wave', guest: 'happy', effect: 'tea', speaker: 'host', caption: '一起喝杯茶吧' },
      { host: 'tea', guest: 'tea', effect: 'tea', speaker: 'guest', caption: '好呀，陪你坐一会儿' }];
    case 'chat': return [{ host: 'talk', guest: 'listen', effect: 'host-talk', speaker: 'host', caption: '我跟你说呀……' },
      { host: 'listen', guest: 'talk', effect: 'guest-talk', speaker: 'guest', caption: '嗯嗯，然后呢？' },
      { host: 'happy', guest: 'happy', effect: 'host-talk', speaker: 'host', caption: '聊得真开心' }];
    case 'wave': return [{ host: 'wave', guest: 'listen', effect: 'wave', speaker: 'host', caption: '嗨，来啦！' },
      { host: 'happy', guest: 'wave', effect: 'guest-talk', speaker: 'guest', caption: '嗨！见到你真好' }];
  }
}
/** Unknown/front-facing artwork is left untouched until the user calibrates it. */
export function pairFlip(facing: PairAction['facing'], side: 'left' | 'right'): boolean {
  return facing !== undefined && facing !== (side === 'left' ? 'right' : 'left');
}

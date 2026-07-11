/**
 * 叽歪语音引擎（voice spec §4）：
 *   plan()  —— 纯函数：文本 + 情绪 + 声线 → 音节调度计划（确定性，可单测）
 *   play()  —— WebAudio 调度器：按计划发声，可打断（逻辑极薄，不进单测）
 *
 * 逐字映射层：每个汉字按字符码确定性映射元音共振峰 + 音高偏移（同字永远同音）。
 * 韵律层：语音包参数 + 通用规则（疑问句尾上扬、感叹句尾花腔、mood 变节拍、起音上滑）。
 */
import type { ManifestVoice } from '@qbot/pipeline';
import type { Mood } from './utterance-picker';
import { VOICE_PACKS, type VoicePack } from './packs';
import { resolveVoice } from '../../../shared/voice-assign';

export type Vowel = 'a' | 'i' | 'u' | 'e' | 'o';

export interface Blip {
  /** 相对句子开头的秒 */
  t: number;
  /** 基频 Hz */
  f0: number;
  vowel: Vowel;
  /** 发声时长（秒） */
  dur: number;
  vibrato: boolean;
}

/** 元音共振峰 F1/F2（Hz） */
const FORMANTS: Record<Vowel, [number, number]> = {
  a: [850, 1250],
  i: [350, 2200],
  u: [380, 850],
  e: [550, 1750],
  o: [520, 1050],
};
const VOWEL_KEYS = Object.keys(FORMANTS) as Vowel[];

/** 五声音阶（半音），melodic 包的蹦跳基础 */
const PENTATONIC = [0, 2, 4, 7, 9, 12];
/** melodic 包的旋律游走序列 */
const MELODY_DRIFT = [0, 1, 3, 2, 4, 3, 5, 2];

/** mood → 节拍缩放（happy 加速蹦跳、sleepy 放慢变软） */
const MOOD_TEMPO: Record<Mood, number> = {
  happy: 0.85,
  sleepy: 1.25,
  neutral: 1,
  curious: 1,
  annoyed: 1.1,
};
/** mood → 音高缩放（annoyed 压低一点） */
const MOOD_PITCH: Record<Mood, number> = {
  happy: 1,
  sleepy: 0.95,
  neutral: 1,
  curious: 1.05,
  annoyed: 0.85,
};

const PUNCT_RE = /[，。！？、～…\s,!?~.:;：；'"“”]/g;

export function planVoiceParams(characterId: string, voice: ManifestVoice | undefined): {
  pack: VoicePack;
  pitchScale: number;
  rateScale: number;
} {
  const resolved = resolveVoice(characterId, voice);
  return {
    pack: VOICE_PACKS[resolved.pack as keyof typeof VOICE_PACKS] ?? VOICE_PACKS.soft,
    pitchScale: resolved.pitchScale,
    rateScale: resolved.rateScale,
  };
}

export function plan(
  text: string,
  mood: Mood,
  params: { pack: VoicePack; pitchScale: number; rateScale: number },
): Blip[] {
  const { pack, pitchScale, rateScale } = params;
  const trimmed = text.trim();
  const chars = trimmed.replace(PUNCT_RE, '').split('').filter(Boolean);
  if (chars.length === 0) return [];

  const question = /[？?]$/.test(trimmed);
  const exclaim = /[！!～~]$/.test(trimmed);
  const base = pack.basePitch * pitchScale * MOOD_PITCH[mood];
  const step = (pack.stepSec / rateScale) * MOOD_TEMPO[mood];

  const blips: Blip[] = [];
  let t = 0;
  chars.forEach((ch, i) => {
    const code = ch.charCodeAt(0);
    const vowel = VOWEL_KEYS[code % VOWEL_KEYS.length];
    let semi: number;
    if (pack.melodic) {
      const drift = MELODY_DRIFT[i % MELODY_DRIFT.length];
      semi =
        PENTATONIC[(code + drift) % PENTATONIC.length] +
        (mood === 'happy' ? [0, 4, 7][i % 3] * 0.5 : 0);
    } else {
      semi = ((code >> 3) % 5) * 1.2;
    }
    let f0 = base * Math.pow(2, semi / 12);
    // 疑问句（或 curious 语气）末两字上扬
    if ((question || mood === 'curious') && i >= chars.length - 2) {
      f0 *= i === chars.length - 1 ? 1.26 : 1.12;
    }
    const dur = step * (pack.melodic ? (i % 2 ? 0.62 : 0.8) : 0.72);
    blips.push({ t, f0, vowel, dur, vibrato: pack.vibrato });
    t += step * (pack.melodic && i % 3 === 2 ? 1.25 : 1);
  });

  if (exclaim) {
    // 句尾上挑小花腔（两声）
    blips.push({ t: t + 0.02, f0: base * 1.5, vowel: 'i', dur: 0.07, vibrato: pack.vibrato });
    blips.push({ t: t + 0.11, f0: base * 1.9, vowel: 'a', dur: 0.09, vibrato: pack.vibrato });
  }
  return blips;
}

/** 计划总时长（秒）——气泡显示时长的依据，静音时也用它 */
export function planDurationSec(blips: Blip[]): number {
  if (blips.length === 0) return 0;
  const last = blips[blips.length - 1];
  return last.t + last.dur;
}

export interface PlaybackHandle {
  /** 播放结束（自然结束或被 stop）时 resolve */
  finished: Promise<void>;
  stop(): void;
}

let sharedCtx: AudioContext | null = null;

function audioContext(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

/** 按计划发声。volume ∈ [0,1]。 */
export function play(blips: Blip[], volume: number): PlaybackHandle {
  const ctx = audioContext();
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);

  const t0 = ctx.currentTime + 0.05;
  for (const b of blips) scheduleBlip(ctx, master, t0 + b.t, b);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((resolve) => (resolveFinished = resolve));
  const totalMs = (planDurationSec(blips) + 0.15) * 1000;
  timer = setTimeout(() => {
    master.disconnect();
    resolveFinished();
  }, totalMs);

  return {
    finished,
    stop() {
      if (timer) clearTimeout(timer);
      master.disconnect(); // 摘掉总线，所有已排程节点即刻无声
      resolveFinished();
    },
  };
}

/** 单音节：三角波+高八度泛音 → 双 bandpass 共振峰 → lowpass → gain 包络 */
function scheduleBlip(ctx: AudioContext, out: GainNode, t0: number, b: Blip): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  // 起音上滑（×0.85 快速滑到目标）——"鸟啼感"
  osc.frequency.setValueAtTime(b.f0 * 0.85, t0);
  osc.frequency.exponentialRampToValueAtTime(b.f0, t0 + 0.035);
  osc2.frequency.setValueAtTime(b.f0 * 1.7, t0);
  osc2.frequency.exponentialRampToValueAtTime(b.f0 * 2, t0 + 0.035);
  if (b.vibrato) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = b.f0 * 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfoGain.connect(osc2.frequency);
    lfo.start(t0);
    lfo.stop(t0 + b.dur + 0.05);
  }
  const [f1, f2] = FORMANTS[b.vowel];
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass';
  bp1.frequency.value = f1;
  bp1.Q.value = 2.5;
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass';
  bp2.frequency.value = f2;
  bp2.Q.value = 5;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.45, t0 + 0.018);
  g.gain.setTargetAtTime(0, t0 + b.dur - 0.03, 0.015);
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  osc.connect(bp1);
  osc.connect(bp2);
  bp1.connect(lp);
  bp2.connect(lp);
  lp.connect(g);
  osc2.connect(g2);
  g2.connect(g);
  g.connect(out);
  osc.start(t0);
  osc.stop(t0 + b.dur + 0.06);
  osc2.start(t0);
  osc2.stop(t0 + b.dur + 0.06);
}

/**
 * 说话编排（voice spec §3）：到点 → 挑文案 → 气泡 + 叽歪声 → 可选动作联动；拖拽打断。
 * 当前客户端同一时刻只有一个桌宠窗口，发言互斥用本地标志即可
 * （spec §7 的主进程发言锁留待真正出现多 pet 窗口时再升级）。
 */
import type { ActionId, ManifestVoice } from '@qbot/pipeline';
import utterancesData from '../../../shared/utterances.json';
import { pickUtterance, type Mood, type Utterance } from './utterance-picker';
import { plan, planDurationSec, planVoiceParams, play, type PlaybackHandle } from './synth';

/** 说话频率三档 → 随机间隔区间（ms） */
export const TALK_INTERVALS = {
  quiet: [300_000, 720_000],
  normal: [120_000, 360_000],
  chatty: [45_000, 180_000],
} as const;
export type TalkFrequency = keyof typeof TALK_INTERVALS;

/** mood → 联动的 talk 动作（无匹配 = 原动作上冒泡） */
const MOOD_ACTION: Partial<Record<Mood, ActionId>> = {
  happy: 'talk_happy',
  annoyed: 'talk_annoyed',
};

export interface VoiceSettings {
  voiceEnabled: boolean;
  /** 0~100 */
  voiceVolume: number;
  talkFrequency: TalkFrequency;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceEnabled: true,
  voiceVolume: 70,
  talkFrequency: 'normal',
};

export interface SpeakerHooks {
  /** 气泡 DOM（pet/index.html 的 #bubble） */
  bubble: HTMLElement;
  /** 仅 idle 时允许自言自语 */
  canSpeak(): boolean;
  /** mood 联动：请求状态机播放 talk 动作 */
  playAction(action: ActionId): void;
  /** 动作是否可用（done 且已加载） */
  hasAction(action: ActionId): boolean;
}

const BUBBLE_EXTRA_MS = 1000;
const BUBBLE_FADE_MS = 200;

export class Speaker {
  private voice: ReturnType<typeof planVoiceParams> | null = null;
  private settings: VoiceSettings = DEFAULT_VOICE_SETTINGS;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private bubbleTimers: ReturnType<typeof setTimeout>[] = [];
  private playback: PlaybackHandle | null = null;
  private speaking = false;
  private lastUtteranceId: string | undefined;
  private utterances: Utterance[] = (utterancesData as { utterances: Utterance[] }).utterances;

  constructor(
    private hooks: SpeakerHooks,
    private rng: { random(): number } = { random: () => Math.random() },
  ) {}

  setCharacter(characterId: string, voice: ManifestVoice | undefined): void {
    this.interrupt();
    this.voice = planVoiceParams(characterId, voice);
    this.scheduleNext();
  }

  setSettings(patch: Partial<VoiceSettings>): void {
    const prevFreq = this.settings.talkFrequency;
    this.settings = { ...this.settings, ...patch };
    // 频率档位变了 → 用新区间重排（说话中不打断）
    if (patch.talkFrequency && patch.talkFrequency !== prevFreq && this.timer) {
      this.scheduleNext();
    }
  }

  /** 拖拽等打断：气泡立即消失、语音停止、定时器重排 */
  interrupt(): void {
    this.playback?.stop();
    this.playback = null;
    this.speaking = false;
    this.hideBubbleNow();
    if (this.timer) this.scheduleNext();
  }

  stop(): void {
    this.playback?.stop();
    this.playback = null;
    this.speaking = false;
    this.hideBubbleNow();
    this.clearTimer();
  }

  private scheduleNext(): void {
    this.clearTimer();
    const [min, max] = TALK_INTERVALS[this.settings.talkFrequency];
    const delay = min + Math.floor(this.rng.random() * (max - min));
    this.timer = setTimeout(() => void this.speakNow(), delay);
  }

  private async speakNow(): Promise<void> {
    this.timer = null;
    // 非 idle / 已在说 → 本轮跳过，直接排下一轮
    if (this.speaking || !this.voice || !this.hooks.canSpeak()) {
      this.scheduleNext();
      return;
    }
    const utterance = pickUtterance(this.utterances, 'idle', this.rng, this.lastUtteranceId);
    if (!utterance) {
      this.scheduleNext();
      return;
    }
    this.lastUtteranceId = utterance.id;
    this.speaking = true;

    const blips = plan(utterance.text, utterance.mood, this.voice);
    const durationMs = planDurationSec(blips) * 1000;
    this.showBubble(utterance.text, durationMs + BUBBLE_EXTRA_MS);

    // mood 联动：匹配的 talk 动作可用就切过去（播完状态机自己回 idle）
    const action = MOOD_ACTION[utterance.mood];
    if (action && this.hooks.hasAction(action)) this.hooks.playAction(action);

    if (this.settings.voiceEnabled) {
      this.playback = play(blips, this.settings.voiceVolume / 100);
      await this.playback.finished;
      this.playback = null;
    }
    this.speaking = false;
    this.scheduleNext();
  }

  private showBubble(text: string, visibleMs: number): void {
    this.clearBubbleTimers();
    const el = this.hooks.bubble;
    el.textContent = text;
    el.classList.remove('fade-out');
    el.classList.add('show');
    this.bubbleTimers.push(
      setTimeout(() => {
        el.classList.add('fade-out');
        this.bubbleTimers.push(
          setTimeout(() => el.classList.remove('show', 'fade-out'), BUBBLE_FADE_MS),
        );
      }, visibleMs),
    );
  }

  private hideBubbleNow(): void {
    this.clearBubbleTimers();
    this.hooks.bubble.classList.remove('show', 'fade-out');
  }

  private clearBubbleTimers(): void {
    for (const t of this.bubbleTimers) clearTimeout(t);
    this.bubbleTimers = [];
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

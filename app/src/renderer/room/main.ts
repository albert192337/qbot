/** room 渲染进程入口：内置房间背景 + 角色漫游驱动 + 点角色互动 + 语音 */
import type { ActionId } from '@qbot/pipeline';
import { Player } from '../pet/player';
import { DEFAULT_VOICE_SETTINGS, Speaker, type VoiceSettings } from '../pet/voice/speak';
import {
  polygonCentroid,
  scaleForY,
  step,
  type Point,
  type RoamState,
} from './roam';
import { DEFAULT_ROOM } from './rooms/default';

const spec = DEFAULT_ROOM;
const stage = document.getElementById('stage')!;
const bg = document.getElementById('bg') as HTMLImageElement;
const char = document.getElementById('char')!;
const charScale = document.getElementById('charScale')!;
const charStage = document.getElementById('charStage')!;
const rng = { random: () => Math.random() };

// ── 房间画布布局 ─────────────────────────────────────────
bg.src = spec.background;
stage.style.width = `${spec.width}px`;
stage.style.height = `${spec.height}px`;
char.style.width = `${spec.petHeight}px`;
char.style.height = `${spec.petHeight}px`;

function fitStage(): void {
  const fit = Math.min(window.innerWidth / spec.width, window.innerHeight / spec.height);
  stage.style.setProperty('--fit', String(fit));
}
fitStage();
window.addEventListener('resize', fitStage);

// ── 状态机驱动 ───────────────────────────────────────────
let state: RoamState = { kind: 'resting', pos: polygonCentroid(spec.floor) };
let available: ActionId[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const player = new Player(charStage, () => dispatch({ type: 'VIDEO_ENDED' }));

const speaker = new Speaker({
  bubble: document.getElementById('bubble')!,
  canSpeak: () => state.kind === 'resting',
  playAction: (action) => dispatch({ type: 'SPEAK_ACTION', action }),
  hasAction: (action) => available.includes(action),
});

/** 脚底锚点定位 + 远近缩放；durationMs>0 = 走动的缓动平移 */
function render(pos: Point, durationMs: number): void {
  const ease = durationMs > 0 ? `transform ${durationMs}ms ease-in-out` : 'none';
  char.style.transition = ease;
  charScale.style.transition = ease;
  char.style.transform = `translate(${pos.x - spec.petHeight / 2}px, ${pos.y - spec.petHeight}px)`;
  charScale.style.transform = `scale(${scaleForY(pos.y, spec)})`;
}

/** 当前实际位置（走动中 = CSS 过渡的插值位置），脚底锚点坐标 */
function currentPos(): Point {
  const m = new DOMMatrixReadOnly(getComputedStyle(char).transform);
  return { x: m.m41 + spec.petHeight / 2, y: m.m42 + spec.petHeight };
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function dispatch(event: Parameters<typeof step>[1]): void {
  const result = step(state, event, { available, rng, geom: spec });
  if (result.state === state && !result.play && !result.restMs) return; // 事件被忽略
  state = result.state;
  clearTimer();
  if (result.play) player.play(result.play);
  if (state.kind === 'walking') {
    render(state.to, state.durationMs);
    timer = setTimeout(() => dispatch({ type: 'WALK_ARRIVED' }), state.durationMs);
  } else {
    render(state.pos, 0);
  }
  if (result.restMs) timer = setTimeout(() => dispatch({ type: 'REST_OVER' }), result.restMs);
}

// ── 角色加载（启动主动拉取 + 切角色广播） ─────────────────
function loadCharacter(meta: Awaited<ReturnType<typeof window.qbot.characters.getActive>>): void {
  if (!meta?.manifest) return; // 无激活角色：空房间照常展示
  available = player.load(meta.dirId, meta.manifest);
  clearTimer();
  state = { kind: 'resting', pos: polygonCentroid(spec.floor) };
  player.play('idle');
  render(state.pos, 0);
  timer = setTimeout(() => dispatch({ type: 'REST_OVER' }), 2_000); // 进门先站一会
  speaker.setCharacter(meta.manifest.id, meta.manifest.voice);
}

void window.qbot.characters.getActive().then(loadCharacter);
window.qbot.characters.onActivated(loadCharacter);

// ── 语音设置 ─────────────────────────────────────────────
function voiceSettings(s: {
  voiceEnabled?: boolean;
  voiceVolume?: number;
  talkFrequency?: VoiceSettings['talkFrequency'];
}): VoiceSettings {
  return {
    voiceEnabled: s.voiceEnabled ?? DEFAULT_VOICE_SETTINGS.voiceEnabled,
    voiceVolume: s.voiceVolume ?? DEFAULT_VOICE_SETTINGS.voiceVolume,
    talkFrequency: s.talkFrequency ?? DEFAULT_VOICE_SETTINGS.talkFrequency,
  };
}
void window.qbot.settings.get().then((s) => speaker.setSettings(voiceSettings(s)));
window.qbot.settings.onChanged((s) => speaker.setSettings(voiceSettings(s)));

// ── 点角色互动：打断漫游，talk_happy + 说一句 ─────────────
char.addEventListener('click', () => {
  if (available.length === 0) return;
  dispatch({ type: 'CHAR_CLICK', pos: currentPos() });
  speaker.forceSpeak();
});

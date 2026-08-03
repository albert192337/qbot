/** pet 渲染进程入口：角色加载 + 状态机驱动 + 拖拽 + 自言自语 + 串门 + 调试面板 */
import type { ActionId, PlayableId } from '@qbot/pipeline';
import type { AgentActivity, CharacterMeta, MusicStatus } from '../../shared/ipc-types';
import { DebugPanel } from './debug-panel';
import { Player } from './player';
import { randomDelay, step, type PetState, type StepContext } from './state-machine';
import { Signboard } from './signboard';
import { DEFAULT_VOICE_SETTINGS, Speaker, type VoiceSettings } from './voice/speak';
import { VisitOrchestrator, type VisitAction } from './visit';

const stage = document.getElementById('stage')!;
const visitorStage = document.getElementById('visitor-stage')!;
const rng = { random: () => Math.random() };

let state: PetState = { kind: 'idle' };
let available: PlayableId[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let currentCharacter: CharacterMeta | null = null;
let visitorCharacter: CharacterMeta | null = null;
/** 最新 agent 活动（done 是一次性事件，派发后立即视为 idle） */
let agentActivity: AgentActivity = 'idle';
/** 最新音乐播放状态（曲名用于举牌，playing 用于状态机恢复） */
let musicStatus: MusicStatus = { playing: false };

/** step() 上下文：可用动作 + 可选的 agent/music 覆盖配置 */
let stepCtx: StepContext = { available: [], rng };

const player = new Player(stage, () => dispatch({ type: 'VIDEO_ENDED' }));
const visitorPlayer = new Player(visitorStage, () => {});

// ── 举牌 ──────────────────────────────────────────────
const hostSignboard = new Signboard('stage');
const visitorSignboard = new Signboard('visitor-stage');

const speaker = new Speaker({
  bubble: document.getElementById('bubble')!,
  canSpeak: () => state.kind === 'idle',
  playAction: (action) => dispatch({ type: 'PLAY_ACTION', action }),
  hasAction: (action) => available.includes(action),
  onSpeak: (text, mood) => {
    debug.onSpeak(text, mood);
    updateDebugState();
  },
});

// ── 调试面板 ──────────────────────────────────────────────
const debug = new DebugPanel();

function updateDebugState(): void {
  const v = visitOrchestrator;
  debug.setState({
    petState: state.kind,
    visitActive: v.isActive(),
    visitorName: visitorCharacter?.manifest?.name,
    exchangeRound: v.getExchangeRound(),
    turn: v.getTurnLabel(),
    lastUtterance: debug.lastUtterance,
    lastMood: debug.lastMood,
  });
}

// ── 朝向计算 ──────────────────────────────────────────
/** 根据角色的 talk_happy 动作朝向设置 CSS flip 类。
 *  Host 在左，Visitor 在右，两人应对视：
 *  - Host 应朝右（面朝 visitor）→ facing='left' 时需要翻转
 *  - Visitor 应朝左（面朝 host）→ facing='right' 时需要翻转 */
function applyVisitFacing(): void {
  const hostFacing = currentCharacter?.manifest.actions.talk_happy?.facing ?? 'right';
  const visitorFacing = visitorCharacter?.manifest.actions.talk_happy?.facing ?? 'right';
  document.body.classList.toggle('flip-host', hostFacing === 'left');
  document.body.classList.toggle('flip-visitor', visitorFacing === 'right');
}

/** 清理串门状态：移除 visit-mode + flip 类 + visitor 的 video + 恢复 host idle。
 *  注意：不隐藏 hostSignboard——牌子与串门无关，独立控制。
 *  只删 video/poof，不用 replaceChildren——那会把 visitorSignboard 的 DOM 一起删掉，
 *  Signboard 对象持有失效引用，之后访客再来就永远举不出牌了。 */
function endVisit(): void {
  document.body.classList.remove('visit-mode', 'flip-host', 'flip-visitor');
  for (const el of Array.from(visitorStage.querySelectorAll('video,.stage-poof'))) {
    el.remove();
  }
  window.qbot.pet.setVisitMode(false);
  visitorCharacter = null;
  visitorSignboard.hide();
}

// ── 串门编排器 ──────────────────────────────────────────
const visitOrchestrator = new VisitOrchestrator({
  onVisitStart(visitor: CharacterMeta) {
    visitorCharacter = visitor;
    visitorPlayer.load(visitor.dirId, visitor.manifest);
    document.body.classList.add('visit-mode');
    applyVisitFacing();
    window.qbot.pet.setVisitMode(true);
    debug.log(`串门开始 — ${visitor.manifest?.name ?? visitor.dirId} 来访`);
    updateDebugState();
  },
  onVisitorPlay(action: VisitAction) {
    visitorPlayer.playLooping(action);
    debug.log(`访客 → ${action}`);
    updateDebugState();
  },
  onHostPlay(action: VisitAction) {
    player.playLooping(action);
    state = { kind: 'visit', action, loopsLeft: 99 };
    dispatch({ type: 'VISIT_START', action, loops: 99 });
    debug.log(`宿主 → ${action}`);
    updateDebugState();
  },
  onVisitEnd() {
    debug.log(`串门结束 — ${visitorCharacter?.manifest?.name ?? '?'} 离开`);
    endVisit();
    player.play('idle');
    state = { kind: 'idle' };
    dispatch({ type: 'VISIT_END' });
    scheduleTimer();
    scheduleVisit();
    updateDebugState();
  },
});

// 调试面板按钮回调
debug.onTriggerVisit = () => tryTriggerVisit();
debug.onEndVisit = () => {
  if (visitOrchestrator.isActive()) {
    visitOrchestrator.cancelVisit();
    endVisit();
    player.play('idle');
    state = { kind: 'idle' };
    scheduleTimer();
    scheduleVisit();
    debug.log('手动结束串门');
    updateDebugState();
  }
};
debug.onDeleteCharacter = async (dirId) => {
  await window.qbot.characters.delete(dirId);
  debug.log(`删除角色: ${dirId}`);
  refreshCharacterList();
};
debug.onActivateCharacter = async (dirId) => {
  await window.qbot.characters.activate(dirId);
  debug.log(`切换角色: ${dirId}`);
};

// ── 举牌回调 ──────────────────────────────────────────
debug.onShowSignboard = (text) => {
  hostSignboard.setText(text);
  hostSignboard.show();
  debug.log(`举牌: "${text}"`);
};
debug.onHideSignboard = () => {
  hostSignboard.hide();
  debug.log('收牌');
};

async function refreshCharacterList(): Promise<void> {
  const all = await window.qbot.characters.list();
  const active = await window.qbot.characters.getActive();
  debug.updateCharacterList(
    all.map(c => ({
      dirId: c.dirId,
      name: c.manifest?.name ?? c.dirId,
      isActive: c.dirId === active?.dirId,
    }))
  );
}

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

// ── 举牌文字：单一来源，优先级 agent > music > 无 ─────────
/** 一次性文字（如「工作完成！」），显示后由下一次 refresh 清掉 */
let signboardOneShot: string | null = null;

function refreshSignboard(): void {
  if (signboardOneShot) {
    hostSignboard.setText(signboardOneShot);
    hostSignboard.show();
    signboardOneShot = null;
    return;
  }
  if (agentActivity !== 'idle') {
    hostSignboard.setText('工作中…');
    hostSignboard.show();
  } else if (musicStatus.playing) {
    hostSignboard.setText(
      musicStatus.title
        ? `听歌中: ${musicStatus.title}${musicStatus.artist ? ` - ${musicStatus.artist}` : ''}`
        : '听歌中…',
    );
    hostSignboard.show();
  } else {
    hostSignboard.hide();
  }
}

// ── agent 联动 ───────────────────────────────────────────
function onAgentStatus(activity: AgentActivity): void {
  // done 一次性庆祝：记忆位立即归 idle，庆祝播完自然回 idle 不再重触发
  agentActivity = activity === 'done' ? 'idle' : activity;
  if (available.length === 0) return; // 角色未加载完不驱动

  if (activity === 'done') signboardOneShot = '工作完成！';
  refreshSignboard();

  dispatch({ type: 'AGENT_STATUS', activity });
}

window.qbot.agent.onStatus((s) => onAgentStatus(s.activity));
void window.qbot.agent.getStatus().then((s) => onAgentStatus(s.activity));

// ── music 联动 ────────────────────────────────────────────
function onMusicStatus(status: MusicStatus): void {
  musicStatus = status;
  if (available.length === 0) return;
  refreshSignboard();
  dispatch({ type: 'MUSIC_STATUS', playing: status.playing });
}

window.qbot.music.onStatus(onMusicStatus);
void window.qbot.music.getStatus().then(onMusicStatus);

// ── 桌面行走 ──────────────────────────────────────────────
/** 行走动画的动作名（自定义动作，manifest.customActions 的 key） */
const WALK_ACTION = 'walk';
/** 单次行走的最大位移（屏幕 px） */
const WALK_DISTANCE = 280;
/**
 * 行走方向固定，**不做镜像翻转**。
 * 原来按 talk_happy 的 facing 决定翻不翻，但那是**另一个动作**的朝向，
 * 自定义动作的 manifest 里没有 facing 字段，拿它当代理会翻错 —— 实测往左走反而
 * 被翻成朝右，看着像倒着走。固定方向和动画本身对齐最省事也最稳。
 * 若发现方向与动画相反，把这里改成 1 即可（唯一需要改的地方）。
 */
const WALK_DIR = -1;
let walkRaf: number | null = null;

function stopDesktopWalk(): void {
  if (walkRaf !== null) {
    cancelAnimationFrame(walkRaf);
    walkRaf = null;
    hostSignboard.onDragEnd(); // 停下后延时把牌子弹回来（同松手逻辑）
  }
}

/**
 * 播行走动画时真的把窗口挪过去（动画本身是原地踏步，位移由这里负责）。
 * 方向固定为 WALK_DIR，夹在工作区内；贴边时只播动画不挪。
 */
function startDesktopWalk(): void {
  if (walkRaf !== null) {
    cancelAnimationFrame(walkRaf);
    walkRaf = null;
  }
  const durationMs =
    (currentCharacter?.manifest.customActions?.[WALK_ACTION]?.durationSec ?? 5) * 1000;
  const startX = window.screenX;
  const y = window.screenY;
  // availLeft 是 Chromium 的非标准属性（多屏时非 0），TS 的 Screen 类型里没有
  const availL = (window.screen as Screen & { availLeft?: number }).availLeft ?? 0;
  const w = window.outerWidth;
  const room =
    WALK_DIR > 0 ? availL + window.screen.availWidth - (startX + w) : startX - availL;
  const dist = Math.min(WALK_DISTANCE, Math.max(0, room));
  // 走路时收牌，停下再弹（同被拎起的处理）
  hostSignboard.onDragStart();
  if (dist < 8) {
    // 已贴边：只播动画不挪，但牌子仍按走路处理，播完由 stopDesktopWalk 弹回
    walkRaf = requestAnimationFrame(() => {
      walkRaf = null;
      hostSignboard.onDragEnd();
    });
    return;
  }
  const t0 = performance.now();
  const tick = (t: number): void => {
    const k = Math.min(1, (t - t0) / durationMs);
    window.qbot.pet.move(Math.round(startX + WALK_DIR * dist * k), y);
    if (k < 1) {
      walkRaf = requestAnimationFrame(tick);
    } else {
      walkRaf = null;
      hostSignboard.onDragEnd();
    }
  };
  walkRaf = requestAnimationFrame(tick);
}

function scheduleTimer(): void {
  clearTimer();
  timer = setTimeout(() => dispatch({ type: 'TIMER_FIRE' }), randomDelay(rng));
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

// ── 串门定时器 ──────────────────────────────────────────
let visitTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleVisit(): void {
  clearVisitTimer();
  // 串门频率：约 10 分钟一次
  const minMs = 10 * 60_000;
  const maxMs = 14 * 60_000;
  const delay = minMs + Math.floor(rng.random() * (maxMs - minMs));
  debug.log(`下次串门: ${Math.round(delay / 1000)}s 后`);
  visitTimer = setTimeout(() => tryTriggerVisit(), delay);
}

function clearVisitTimer(): void {
  if (visitTimer) {
    clearTimeout(visitTimer);
    visitTimer = null;
  }
}

async function tryTriggerVisit(): Promise<void> {
  visitTimer = null;
  debug.log('尝试触发串门...');
  if (visitOrchestrator.isActive()) {
    debug.log('串门跳过 — 已在活跃中');
    scheduleVisit();
    return;
  }
  if (state.kind !== 'idle') {
    debug.log(`串门跳过 — 状态非idle: ${state.kind}`);
    scheduleVisit();
    return;
  }
  if (!currentCharacter) {
    debug.log('串门跳过 — 无当前角色');
    scheduleVisit();
    return;
  }
  const all = await window.qbot.characters.list();
  const candidates = all.filter(
    (c) => c.manifest && c.dirId !== currentCharacter!.dirId && c.manifest.actions.talk_happy.status === 'done',
  );
  debug.log(`可用角色: ${all.filter(c => c.manifest).length}个, 候选访客: ${candidates.length}个`);
  if (candidates.length === 0) {
    debug.log('串门触发失败 — 无可用来访角色');
    scheduleVisit();
    return;
  }
  const visitor = candidates[Math.floor(rng.random() * candidates.length)];
  visitOrchestrator.startVisit(visitor);
}

function dispatch(event: Parameters<typeof step>[1]): void {
  stepCtx.available = available;
  const result = step(state, event, stepCtx);
  state = result.state;

  // ── 调试日志 ──
  if (event.type === 'TIMER_FIRE') debug.log('定时器触发 → 随机动作');
  if (event.type === 'POINTER_DOWN') debug.log('拖拽开始');
  if (event.type === 'POINTER_UP' && state.kind === 'idle') debug.log('拖拽结束');

  // ── 串门信号处理 ──
  if (result.visiterEnd) {
    visitOrchestrator.cancelVisit();
    endVisit();
    player.play('idle');
    scheduleTimer();
    scheduleVisit();
    updateDebugState();
  }

  if (result.play) {
    player.play(result.play);
    // 行走动画要配合窗口位移才看得出在走；切到别的动作立刻停下
    if (result.play === WALK_ACTION) startDesktopWalk();
    else stopDesktopWalk();
  }
  if (result.clearTimer) clearTimer();
  if (result.rescheduleTimer) scheduleTimer();
  // agent 活动进行中却落回 idle（拖拽松手/庆祝播完/用户动作播完）→ 恢复 agent 视觉。
  // AGENT_STATUS(非 idle) 必不落回 idle，递归至多一层。
  if (state.kind === 'idle' && agentActivity !== 'idle' && event.type !== 'AGENT_STATUS') {
    dispatch({ type: 'AGENT_STATUS', activity: agentActivity });
  }
  // 音乐在播但落回 idle（agent 干完活/拖拽松手/串门结束）→ 恢复摇摆 + 举牌
  if (state.kind === 'idle' && agentActivity === 'idle' && musicStatus.playing && event.type !== 'MUSIC_STATUS') {
    refreshSignboard();
    dispatch({ type: 'MUSIC_STATUS', playing: true });
  }
}

// ── 角色加载 ─────────────────────────────────────────────
window.qbot.characters.onActivated((meta) => {
  if (!meta?.manifest) return;
  currentCharacter = meta;
  available = player.load(meta.dirId, meta.manifest);
  stepCtx = {
    available,
    rng,
    agentActionMap: meta.manifest?.agentActions?.thinking !== undefined ||
      meta.manifest?.agentActions?.working !== undefined ||
      meta.manifest?.agentActions?.waiting !== undefined
      ? {
          thinking: meta.manifest.agentActions.thinking,
          working: meta.manifest.agentActions.working,
          waiting: meta.manifest.agentActions.waiting,
          error: meta.manifest.agentActions.error,
        }
      : undefined,
    doneAction: meta.manifest?.agentActions?.doneAction,
    doneLoops: meta.manifest?.agentActions?.doneLoops,
    musicAction: meta.manifest?.agentActions?.musicAction,
  };
  state = { kind: 'idle' };
  player.play('idle');
  scheduleTimer();
  speaker.setCharacter(meta.manifest.id, meta.manifest.voice);
  debug.log(`角色激活: ${meta.manifest.name} (${meta.dirId})`);
  updateDebugState();
  refreshCharacterList();
  // 切角色时清掉进行中的串门，重新排
  visitOrchestrator.cancelVisit();
  endVisit();
  scheduleVisit();
  if (agentActivity !== 'idle') dispatch({ type: 'AGENT_STATUS', activity: agentActivity });
  if (musicStatus.playing && agentActivity === 'idle') dispatch({ type: 'MUSIC_STATUS', playing: true });
});

// 窗口隐藏期间（角色进小房间）Chromium 会自动暂停 <video> 且不派发 ended，
// 状态机会卡死在半路 → 恢复可见时整体重置回 idle 循环。
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || available.length === 0) return;
  speaker.interrupt();
  state = { kind: 'idle' };
  player.play('idle');
  scheduleTimer();
  visitOrchestrator.cancelVisit();
  endVisit();
  scheduleVisit();
  if (agentActivity !== 'idle') dispatch({ type: 'AGENT_STATUS', activity: agentActivity });
  if (musicStatus.playing && agentActivity === 'idle') dispatch({ type: 'MUSIC_STATUS', playing: true });
});

// ── 指针交互 ─────────────────────────────────────────────
const DRAG_THRESHOLD = 4;
const DBLCLICK_MS = 250;

let pointerDown = false;
let dragStarted = false;
let downClientX = 0;
let downClientY = 0;
let offsetX = 0;
let offsetY = 0;
let rafPending = false;
let lastScreenX = 0;
let lastScreenY = 0;
let clickTimer: ReturnType<typeof setTimeout> | null = null;

stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  pointerDown = true;
  dragStarted = false;
  downClientX = e.clientX;
  downClientY = e.clientY;
  offsetX = e.clientX;
  offsetY = e.clientY;
  stage.setPointerCapture(e.pointerId);
  hideMenu();
});

stage.addEventListener('pointermove', (e) => {
  if (!pointerDown) return;
  if (!dragStarted) {
    const dx = e.clientX - downClientX;
    const dy = e.clientY - downClientY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
    dragStarted = true;
    speaker.interrupt();
    // 拖拽开始就结束串门
    visitOrchestrator.cancelVisit();
    endVisit();
    stopDesktopWalk(); // 拖拽期间别再自动挪窗口
    hostSignboard.onDragStart();
    dispatch({ type: 'POINTER_DOWN' });
  }
  lastScreenX = e.screenX;
  lastScreenY = e.screenY;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (dragStarted) {
        window.qbot.pet.move(lastScreenX - offsetX, lastScreenY - offsetY);
      }
    });
  }
});

stage.addEventListener('pointerup', (e) => {
  if (e.button !== 0 || !pointerDown) return;
  pointerDown = false;
  stage.releasePointerCapture(e.pointerId);
  if (dragStarted) {
    dragStarted = false;
    dispatch({ type: 'POINTER_UP' });
    hostSignboard.onDragEnd();
    scheduleVisit();
    return;
  }
  // 双击 = 立即说一句；单击不做任何事（房间入口在右键菜单）
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
    speaker.forceSpeak();
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = null;
    }, DBLCLICK_MS);
  }
});

// ── 右键菜单 ───────────────────────────
const ACTION_LABELS: Record<string, string | undefined> = {
  sleep: '睡觉',
  tea: '喝茶',
  talk_happy: '聊天·开心',
  talk_annoyed: '聊天·嫌弃',
  walk: '行走',
};
const menu = document.getElementById('menu')!;

function hideMenu(): void {
  menu.style.display = 'none';
}

stage.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  menu.replaceChildren();
  const speakItem = document.createElement('div');
  speakItem.className = 'menu-item';
  speakItem.textContent = '说句话';
  speakItem.addEventListener('click', () => {
    hideMenu();
    speaker.forceSpeak();
  });
  menu.appendChild(speakItem);
  for (const id of available) {
    // 标准动作用中文标签；自定义动作直接用动作名（不再被静默跳过）
    const label = ACTION_LABELS[id] ?? (id === 'idle' || id === 'drag' ? '' : id);
    if (!label) continue;
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.textContent = label;
    item.addEventListener('click', () => {
      hideMenu();
      dispatch({ type: 'PLAY_ACTION', action: id });
    });
    menu.appendChild(item);
  }
  // 分隔 + 打开房间
  const sep = document.createElement('div');
  sep.style.cssText = 'margin:2px 10px;border-top:1px solid rgba(0,0,0,0.1)';
  menu.appendChild(sep);
  const roomItem = document.createElement('div');
  roomItem.className = 'menu-item';
  roomItem.textContent = '打开房间';
  roomItem.addEventListener('click', () => {
    hideMenu();
    window.qbot.room.open();
  });
  menu.appendChild(roomItem);
  const studioItem = document.createElement('div');
  studioItem.className = 'menu-item';
  studioItem.textContent = '生成配置';
  studioItem.addEventListener('click', () => {
    hideMenu();
    window.qbot.studio.open();
  });
  menu.appendChild(studioItem);
  if (!menu.children.length) return;
  menu.style.display = 'block';
  const mw = 120;
  menu.style.left = `${Math.min(e.clientX, window.innerWidth - mw - 4)}px`;
  menu.style.top = `${Math.min(e.clientY, window.innerHeight - menu.children.length * 34 - 8)}px`;
});

document.addEventListener('click', (e) => {
  if (!menu.contains(e.target as Node)) hideMenu();
});

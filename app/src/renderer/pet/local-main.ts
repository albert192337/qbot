/** pet 渲染进程入口：角色加载 + 状态机驱动 + 拖拽 + 自言自语 + 串门 + 调试面板 */
import '../error-handler';
import type { ActionId, PlayableId } from '@qbot/pipeline';
import type { AgentActivity, CharacterMeta, MeetingStatus, MusicStatus } from '../../shared/ipc-types';
import { Player } from './player';
import { randomDelay, step, type PetState, type StepContext } from './state-machine';
import { Signboard } from './signboard';
import { ProgressHud } from './hud';
import { isStaleProgress } from './hud-format';
import { POINTS_PER_BOX } from '../../shared/furniture';
import { DECOR_BY_ID } from '../room/decor-pack';
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
/** 最新飞书会议状态（举牌「正在开会」+ meeting 态恢复） */
let meetingStatus: MeetingStatus = { inMeeting: false };

/** step() 上下文：可用动作 + 可选的 agent/meeting/music 覆盖配置 */
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
});

// ── HUD（点数 + 宝箱）──────────────────────────────────
const hud = new ProgressHud();
let hudBusy = false;
let lastProgress: import('../../shared/ipc-types').Progress | null = null;

hud.onChestClick = () => void doOpenBox();

async function doOpenBox(): Promise<void> {
  if (hudBusy) return;
  hudBusy = true;
  hud.chestBtn.disabled = true;
  hud.floatSpend(POINTS_PER_BOX);
  try {
    const r = await window.qbot.progress.openBox();
    if (r.ok) {
      lastProgress = r.progress;
      hud.setProgress(r.progress);
      const decor = DECOR_BY_ID.get(r.stickerId);
      const name = decor?.name ?? r.stickerId;
      hostSignboard.setText(`开出了「${name}」`);
      hostSignboard.show();
      setTimeout(() => hostSignboard.hide(), 5000);
    } else {
      hud.toast(r.error);
    }
  } finally {
    hudBusy = false;
  }
}

window.qbot.progress.onChanged((p) => {
  if (!isStaleProgress(lastProgress, p)) {
    lastProgress = p;
    hud.setProgress(p);
  }
});
void window.qbot.progress.get().then((p) => {
  lastProgress = p;
  hud.setProgress(p);
});

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

/** 清理串门状态：移除 visit-mode + flip 类 + visitor stage + 恢复 host idle。
 *  注意：不隐藏 hostSignboard——牌子与串门无关，独立控制。 */
function endVisit(): void {
  document.body.classList.remove('visit-mode', 'flip-host', 'flip-visitor');
  visitorStage.replaceChildren();
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
  },
  onVisitorPlay(action: VisitAction) {
    visitorPlayer.playLooping(action);
  },
  onHostPlay(action: VisitAction) {
    player.playLooping(action);
    state = { kind: 'visit', action, loopsLeft: 99 };
    dispatch({ type: 'VISIT_START', action, loops: 99 });
  },
  onVisitEnd() {
    endVisit();
    player.play('idle');
    state = { kind: 'idle' };
    dispatch({ type: 'VISIT_END' });
    scheduleTimer();
  },
});

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

// ── 举牌文字：单一来源，优先级 手动举牌 > 一次性 > agent > meeting > music ─
/** 一次性文字（如「工作完成！」），显示后由下一次 refresh 清掉 */
let signboardOneShot: string | null = null;
/** 手动举牌（右键菜单输入；纯本地显示，收牌前一直举着） */
let userSign: string | null = null;

function refreshSignboard(): void {
  if (userSign) {
    hostSignboard.setText(userSign);
    hostSignboard.show();
    return;
  }
  if (signboardOneShot) {
    hostSignboard.setText(signboardOneShot);
    hostSignboard.show();
    signboardOneShot = null;
    return;
  }
  if (agentActivity !== 'idle') {
    hostSignboard.setText('工作中…');
    hostSignboard.show();
  } else if (meetingStatus.inMeeting) {
    hostSignboard.setText('正在开会');
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

// ── meeting 联动 ──────────────────────────────────────────
function onMeetingStatus(status: MeetingStatus): void {
  meetingStatus = status;
  if (available.length === 0) return;
  refreshSignboard();
  dispatch({ type: 'MEETING_STATUS', inMeeting: status.inMeeting });
}

window.qbot.meeting.onStatus(onMeetingStatus);
void window.qbot.meeting.getStatus().then(onMeetingStatus);

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

function dispatch(event: Parameters<typeof step>[1]): void {
  stepCtx.available = available;
  const result = step(state, event, stepCtx);
  state = result.state;

  // ── 串门信号处理 ──
  if (result.visiterEnd) {
    visitOrchestrator.cancelVisit();
    endVisit();
    player.play('idle');
    scheduleTimer();
  }

  if (result.play) {
    player.play(result.play);
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
  // 开会中却落回 idle（agent 干完活/拖拽松手/串门结束）→ 恢复会中动画 + 举牌
  if (state.kind === 'idle' && agentActivity === 'idle' && meetingStatus.inMeeting && event.type !== 'MEETING_STATUS') {
    refreshSignboard();
    dispatch({ type: 'MEETING_STATUS', inMeeting: true });
  }
  // 音乐在播但落回 idle（agent 干完活/散会/拖拽松手/串门结束）→ 恢复摇摆 + 举牌
  if (state.kind === 'idle' && agentActivity === 'idle' && !meetingStatus.inMeeting && musicStatus.playing && event.type !== 'MUSIC_STATUS') {
    refreshSignboard();
    dispatch({ type: 'MUSIC_STATUS', playing: true });
  }
}

// ── 角色加载 ─────────────────────────────────────────────
function activateCharacter(meta: CharacterMeta): void {
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
    meetingAction: meta.manifest?.agentActions?.meetingAction,
  };
  state = { kind: 'idle' };
  player.play('idle');
  scheduleTimer();
  speaker.setCharacter(meta.manifest.id, meta.manifest.voice);
  // 切角色时清掉进行中的串门
  visitOrchestrator.cancelVisit();
  endVisit();
  if (agentActivity !== 'idle') dispatch({ type: 'AGENT_STATUS', activity: agentActivity });
  if (meetingStatus.inMeeting && agentActivity === 'idle') dispatch({ type: 'MEETING_STATUS', inMeeting: true });
  if (musicStatus.playing && agentActivity === 'idle' && !meetingStatus.inMeeting) dispatch({ type: 'MUSIC_STATUS', playing: true });
}

window.qbot.characters.onActivated(activateCharacter);
// 兜底：pet/main.ts 动态 import 本模块，不阻塞页面 load → 主进程 did-finish-load
// 推送的 characters:activated 可能早于上面监听注册而丢失，注册完主动拉一次
void window.qbot.characters.getActive().then((meta) => {
  if (meta && !currentCharacter) activateCharacter(meta);
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
  if (agentActivity !== 'idle') dispatch({ type: 'AGENT_STATUS', activity: agentActivity });
  if (meetingStatus.inMeeting && agentActivity === 'idle') dispatch({ type: 'MEETING_STATUS', inMeeting: true });
  if (musicStatus.playing && agentActivity === 'idle' && !meetingStatus.inMeeting) dispatch({ type: 'MUSIC_STATUS', playing: true });
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
  hideSignPrompt(); // 点宠身上：收起举牌输入框
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
    hostSignboard.onDragStart();
    hud.onDragStart();
    stopDesktopWalk();
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
    hud.onDragEnd();
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
};
// 右键菜单走主进程原生 Menu.popup（不受桌宠小窗边界约束，DOM 菜单会被截断）；
// 动作列表现算现传（自定义动作/角色切换后自动跟上），说话/播动作回本端执行
stage.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.qbot.pet.popupMenu(
    available
      .map((id) => ({ id, label: ACTION_LABELS[id] ?? (id === 'idle' || id === 'drag' ? '' : id) }))
      .filter((a) => a.label),
  );
});

window.qbot.pet.onMenuCommand((cmd) => {
  if (cmd.type === 'speak') speaker.forceSpeak();
  else if (cmd.type === 'play') dispatch({ type: 'PLAY_ACTION', action: cmd.action as PlayableId });
  else if (cmd.type === 'signPrompt') showSignPrompt();
  else if (cmd.type === 'signClear') applyUserSign(null);
});

// ── 手动举牌输入框（纯本地的牌子，无网络出口） ─────
let signEntry: HTMLInputElement | null = null;

function applyUserSign(text: string | null): void {
  userSign = text?.trim() ? text.trim().slice(0, 60) : null;
  refreshSignboard();
  window.qbot.sign.set(userSign); // 联机退役后纯本地记账，无网络出口
}

function hideSignPrompt(): void {
  if (signEntry) signEntry.style.display = 'none';
}

function showSignPrompt(): void {
  if (!signEntry) {
    signEntry = document.createElement('input');
    signEntry.placeholder = '举牌内容，回车确认';
    signEntry.maxLength = 60;
    signEntry.style.cssText = [
      'display:none',
      'position:absolute',
      'z-index:12',
      'top:10px',
      'left:50%',
      'transform:translateX(-50%)',
      'width:75%',
      'padding:6px 10px',
      'border-radius:8px',
      'border:1px solid rgba(0,0,0,0.15)',
      'background:rgba(255,255,255,0.96)',
      'box-shadow:0 4px 18px rgba(0,0,0,0.18)',
      'font-size:12px',
      'outline:none',
      "font-family:-apple-system,'PingFang SC',sans-serif",
    ].join(';');
    signEntry.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') {
        applyUserSign(signEntry!.value);
        hideSignPrompt();
      } else if (ev.key === 'Escape') {
        hideSignPrompt();
      }
    });
    document.body.appendChild(signEntry);
  }
  signEntry.value = userSign ?? '';
  signEntry.style.display = 'block';
  signEntry.focus();
}

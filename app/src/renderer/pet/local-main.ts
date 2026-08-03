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

// ── 举牌文字：单一来源，优先级 手动举牌 > 一次性 > agent > music ─
/** 一次性文字（如「工作完成！」），显示后由下一次 refresh 清掉 */
let signboardOneShot: string | null = null;
/** 手动举牌（右键菜单输入；联机时同步对端替身，收牌前一直举着） */
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

  if (result.play) player.play(result.play);
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

// ── 手动举牌输入框（联机举牌：本端显示 + 同步对端替身） ─────
let signEntry: HTMLInputElement | null = null;

function applyUserSign(text: string | null): void {
  userSign = text?.trim() ? text.trim().slice(0, 60) : null;
  refreshSignboard();
  window.qbot.link.setSign(userSign); // 未配对时主进程只记账，不发帧
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

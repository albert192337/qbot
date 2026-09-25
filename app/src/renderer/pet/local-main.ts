import { mountPetting } from './petting';
import { choosePairAction } from '../../shared/pair-interaction';
import { scenePool } from '../../shared/action-resources';
import { resolvePetDrop } from './drop-target';
import { mountDesktopVisibility, isDesktopQuiet } from './desktop-visibility';
import {CHARACTER_UNLOCKS,currentGrowth,characterLevel} from '../../shared/garden-life';
import { mountLocalNameplate } from './nameplate';
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
import { PairInteraction } from './pair-interaction';
import { PAIR_INTERACTIONS, pairActions, type PairKind } from '../../shared/pair-interaction';
import { ActionHold } from './action-hold';
import { IdleDirector } from '../../shared/idle-plan';
import { actionDisplayName, type StickerManifest } from '../../shared/sticker-behavior';

const stage = document.getElementById('stage')!;
mountLocalNameplate(stage);
const visitorStage = document.getElementById('visitor-stage')!;
const rng = { random: () => Math.random() };

let state: PetState = { kind: 'idle' };
let pettingAction=false;
let available: PlayableId[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let currentCharacter: CharacterMeta | null = null;
let perched: import('../../shared/window-perch').PerchState | null = null;
let perchButtonsVisible = false;
let visitorCharacter: CharacterMeta | null = null;
/** 最新 agent 活动（done 是一次性事件，派发后立即视为 idle） */
let agentActivity: AgentActivity = 'idle';
/** 最新音乐播放状态（曲名用于举牌，playing 用于状态机恢复） */
let musicStatus: MusicStatus = { playing: false };
/** 最新飞书会议状态（举牌「正在开会」+ meeting 态恢复） */
let meetingStatus: MeetingStatus = { inMeeting: false };

/** step() 上下文：可用动作 + 可选的 agent/meeting/music 覆盖配置 */
let stepCtx: StepContext = { available: [], rng };
const actionHold=new ActionHold();
let holdTimeout:ReturnType<typeof setTimeout>|null=null;
const idleDirector=new IdleDirector();
function cancelHold():void{actionHold.cancel();if(holdTimeout)clearTimeout(holdTimeout);holdTimeout=null;}
function idlePool():string[]{return currentCharacter?.manifest && (currentCharacter.manifest.scenePools?.idle || (currentCharacter.manifest as StickerManifest).stickerLibrary?.idleCandidates) ? scenePool(currentCharacter.manifest,'idle').filter(id=>available.includes(id)) : [];}
function playIdle():void{
  const pool=idlePool();
  if(!pool.length){player.play('idle');return;}
  const fallback=(currentCharacter?.manifest as StickerManifest|undefined)?.stickerLibrary?.scenes.idle??'idle';
  player.playOnce(idleDirector.next(pool,fallback,llmSpeech,Date.now(),Math.random));
}

const player = new Player(stage, () => {
  if (pairInteraction.isActive()) pairInteraction.ended('host');
  else dispatch({ type: 'VIDEO_ENDED' });
});
const visitorPlayer = new Player(visitorStage, () => pairInteraction.ended('guest'));
window.qbot.behaviorAction.onIdlePlan(plan=>{
  if(plan.characterId===currentCharacter?.dirId)idleDirector.accept(plan);
});

// ── 举牌 ──────────────────────────────────────────────
const hostSignboard = new Signboard('stage', text => window.qbot.sign.display(text));
const visitorSignboard = new Signboard('visitor-stage');

let llmSpeech = true; // 设置加载完成前不抢发规则台词。
const speaker = new Speaker({
  generateSpeech: force => {
    if (!llmSpeech) return false;
    void window.qbot.behavior.requestThink(force).catch(() => {});
    return true;
  },
  bubble: document.getElementById('bubble')!,
  showBubble: (text, durationMs) => window.qbot.bubble.say(text, durationMs),
  canSpeak: () => !isDesktopQuiet() && state.kind === 'idle',
  playAction: (action) => dispatch({ type: 'PLAY_ACTION', action }),
  hasAction: (action) => available.includes(action),
});

// ── HUD（点数 + 宝箱）──────────────────────────────────
const hud = new ProgressHud();
function applyPerch(value: import('../../shared/window-perch').PerchState | null): void {
  const changed=perched?.action!==value?.action;
  perched=value;
  if(changed)perchButtonsVisible=false;
  hud.root.style.visibility=perched&&!perchButtonsVisible?'hidden':'';
  if(!changed||!available.length)return;
  cancelHold(); stopDesktopWalk(); clearTimer();
  state={kind:'idle'};
  if(value)player.play(value.action);
  else { playIdle(); scheduleTimer();
    if(agentActivity!=='idle')dispatch({type:'AGENT_STATUS',activity:agentActivity});
    else if(meetingStatus.inMeeting)dispatch({type:'MEETING_STATUS',inMeeting:true});
    else if(musicStatus.playing)dispatch({type:'MUSIC_STATUS',playing:true});
  }
}
window.qbot.pet.onPerch(applyPerch);
void window.qbot.pet.getPerch().then(applyPerch);
let hudBusy = false;
let lastProgress: import('../../shared/ipc-types').Progress | null = null;

hud.onChestClick = () => void doOpenBox();

async function doOpenBox(): Promise<void> {
  if (hudBusy) return;
  hudBusy = true;
  hud.chestBtn.disabled = true;
  try {
    const r = await window.qbot.progress.openBox();
    if (r.ok) {
      hud.playOpen();
      hud.floatSpend(POINTS_PER_BOX);
      lastProgress = r.progress;
      hud.setProgress(r.progress);
      const decor = DECOR_BY_ID.get(r.stickerId);
      const name = r.gardenReward ?? decor?.name ?? r.stickerId;
      if (!r.gardenItems?.length) window.qbot.bubble.say(`开出了「${name}」`, 20000);
    } else {
      hud.toast(r.error);
    }
  } catch (e) {
    hud.toast(e instanceof Error ? e.message : String(e));
  } finally {
    hudBusy = false;
    if (lastProgress) hud.setProgress(lastProgress);
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

/** 清理串门状态：移除 visit-mode + flip 类 + visitor stage + 恢复 host idle。
 *  注意：不隐藏 hostSignboard——牌子与串门无关，独立控制。 */
function endVisit(): Promise<void> {
  if (!document.body.classList.contains('visit-mode')) return Promise.resolve();
  document.body.classList.remove('visit-mode', 'flip-host', 'flip-visitor');
  visitorPlayer.dispose();
  visitorStage.replaceChildren();
  const resized = window.qbot.pet.setVisitMode(false).catch(() => {});
  visitorCharacter = null;
  visitorSignboard.hide();
  return resized;
}

// ── 串门编排器 ──────────────────────────────────────────
let networkPartner:string|undefined;
let pairMediaVersion=0;
const pairInteraction = new PairInteraction({
  async start(visitor: CharacterMeta,partner?:string) {
    const version=++pairMediaVersion;
    await window.qbot.pet.setVisitMode(true,partner);
    if(version!==pairMediaVersion)return;
    visitorCharacter = visitor;
    visitorPlayer.load(visitor.dirId, visitor.manifest);
    document.body.classList.add('visit-mode');
  },
  play(action, guestAction) {
    visitorPlayer.playOnce(guestAction);
    player.playOnce(action);
    state = { kind: 'visit', action, loopsLeft: 99 };
    clearTimer();
  },
  replay(who, action) {
    (who === 'host' ? player : visitorPlayer).playOnce(action);
  },
  rest(who, action) {
    (who === 'host' ? player : visitorPlayer).playLooping(action);
  },
  end() {
    pairMediaVersion++;
    networkPartner=undefined;
    const resized = endVisit();
    dispatch({ type: 'VISIT_END' });
    return resized;
  },
});
window.qbot.rooms.onStatus(s=>{if(networkPartner&&s.phase!=='in-room')pairInteraction.cancel();});
window.qbot.rooms.onMemberOut(id=>{if(networkPartner===id)pairInteraction.cancel();});
let pairRequest = 0;
// All previous visit cancellation sites share this adapter, including drag and character replacement.
const visitOrchestrator = { cancelVisit() { pairRequest++; pairInteraction.cancel(); } };
async function startPair(kind: PairKind, guestId: string): Promise<void> {
  const request = ++pairRequest;
  const host = currentCharacter;
  if (!host || !PAIR_INTERACTIONS.some(i => i.id === kind)) return;
  try {
    const unlock=CHARACTER_UNLOCKS.find(u=>u.kind===kind);
    if(unlock){const garden=await window.qbot.garden.get();if(characterLevel(currentGrowth(garden)?.xp??0)<unlock.level){hud.toast(`角色 Lv.${unlock.level} 解锁，可以先完成食物心愿`);return;}}
    const characters = await window.qbot.characters.list();
    if (request !== pairRequest || host !== currentCharacter || document.hidden) return;
    const guest = characters.find(c => c.dirId === guestId && c.dirId !== host.dirId && c.manifest);
    if (!guest || !pairActions(host.manifest).size || !pairActions(guest.manifest).size) {
      hud.toast('请选择另一个有可用动作的本地角色'); return;
    }
    if (gardenPerforming) { hud.toast('请等花园动作完成再互动'); return; }
    if (state.kind === 'drag' || pointerDown) return;
    window.qbot.pet.detachPerch(); applyPerch(null);
    speaker.interrupt(); cancelHold(); stopDesktopWalk(); clearTimer();
    pairInteraction.start(host, guest, kind);
  } catch { if (request === pairRequest) hud.toast('读取角色失败，请重试'); }
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

function applySpeechSettings(s: import('../../shared/ipc-types').Settings): void {
  llmSpeech = !!s.freeMode;
  if (llmSpeech) speaker.interrupt();
  speaker.setSettings(voiceSettings(s));
}
void window.qbot.settings.get().then(applySpeechSettings);
window.qbot.settings.onChanged(applySpeechSettings);

// ── 举牌文字：单一来源，优先级 手动举牌 > 一次性 > agent > meeting > music；最终牌面同步到房间 ─
/** 一次性文字（如「工作完成！」），显示后由下一次 refresh 清掉 */
let signboardOneShot: string | null = null;
/** 手动举牌（右键菜单输入；收牌前一直举着） */
let userSign: string | null = null;
let signDismissed = false;
let petMessage: import('../../shared/pet-message').PetMessage | null = null;
let messageRevision = 0;
window.qbot.sign.onMessage(message => {
  if (message) signDismissed = false;
  messageRevision++;
  petMessage = message;
  refreshSignboard();
});
const initialMessageRevision = messageRevision;
void window.qbot.sign.getMessage().then(message => {
  if (messageRevision !== initialMessageRevision) return;
  petMessage = message;
  refreshSignboard();
}).catch(() => {});
let syncedSignText: string | null = null;
const SIGN_TEXT_MAX = 60;

function showAndSyncSign(text: string): void {
  const visibleText = text.replace(/\s+/g, ' ').trim().slice(0, SIGN_TEXT_MAX);
  hostSignboard.setText(visibleText);
  hostSignboard.show();
  if (visibleText !== syncedSignText) {
    syncedSignText = visibleText;
    window.qbot.sign.sync(visibleText);
  }
}

function hideAndSyncSign(): void {
  hostSignboard.hide();
  if (syncedSignText !== null) {
    syncedSignText = null;
    window.qbot.sign.sync(null);
  }
}

function refreshSignboard(): void {
  if (isDesktopQuiet()) { hostSignboard.hide(); return; }
  if (signDismissed) { hideAndSyncSign(); return; }
  if (userSign) {
    showAndSyncSign(userSign);
    return;
  }
  if (petMessage && petMessage.expiresAt > Date.now() &&
      (!petMessage.characterId || petMessage.characterId === currentCharacter?.dirId || petMessage.characterId === currentCharacter?.manifest.id)) {
    showAndSyncSign(petMessage.text);
    return;
  }
  if (signboardOneShot) {
    showAndSyncSign(signboardOneShot);
    signboardOneShot = null;
    return;
  }
  if (agentActivity !== 'idle') {
    showAndSyncSign('工作中…');
  } else if (meetingStatus.inMeeting) {
    showAndSyncSign('正在开会');
  } else if (musicStatus.playing) {
    showAndSyncSign(
      musicStatus.title
        ? `听歌中: ${musicStatus.title}${musicStatus.artist ? ` - ${musicStatus.artist}` : ''}`
        : '听歌中…',
    );
  } else {
    hideAndSyncSign();
  }
}

// ── agent 联动 ───────────────────────────────────────────
function onAgentStatus(activity: AgentActivity): void {
  if (activity !== agentActivity) signDismissed = false;
  // done 一次性庆祝：记忆位立即归 idle，庆祝播完自然回 idle 不再重触发
  agentActivity = activity === 'done' ? 'idle' : activity;
  document.body.dataset.agentActivity=agentActivity;
  if (available.length === 0) return; // 角色未加载完不驱动

  if (activity === 'done') signboardOneShot = '工作完成！';
  refreshSignboard();

  dispatch({ type: 'AGENT_STATUS', activity });
}

window.qbot.agent.onStatus((s) => onAgentStatus(s.activity));
void window.qbot.agent.getStatus().then((s) => onAgentStatus(s.activity));

// ── meeting 联动 ──────────────────────────────────────────
function onMeetingStatus(status: MeetingStatus): void {
  if (status.inMeeting !== meetingStatus.inMeeting) signDismissed = false;
  meetingStatus = status;
  if (available.length === 0) return;
  refreshSignboard();
  dispatch({ type: 'MEETING_STATUS', inMeeting: status.inMeeting });
}

window.qbot.meeting.onStatus(onMeetingStatus);
void window.qbot.meeting.getStatus().then(onMeetingStatus);

// ── music 联动 ────────────────────────────────────────────
function onMusicStatus(status: MusicStatus): void {
  if (status.playing !== musicStatus.playing || status.title !== musicStatus.title || status.artist !== musicStatus.artist) signDismissed = false;
  musicStatus = status;
  if (available.length === 0) return;
  refreshSignboard();
  dispatch({ type: 'MUSIC_STATUS', playing: status.playing });
}

window.qbot.music.onStatus(onMusicStatus);
void window.qbot.music.getStatus().then(onMusicStatus);

// ── 行为引擎 → 播指定动作（规则命中的行为脚本走这里；同 PLAY_ACTION 语义：播 N 遍回原状态）──
// 高优先级粘性态（agent 干活/开会/听歌）下行为动作让位：PLAY_ACTION 会把状态机
// 切到 auto，播完回 idle 就再也回不到原粘性态（表现为 Claude 干着活桌宠突然不演了）。
// 这些态下台词气泡照常（气泡不走状态机），只跳过动作。
function behaviorCanPlay(): boolean {
  return state.kind !== 'agent' && state.kind !== 'meeting' && state.kind !== 'music';
}
let behaviorReplayTimers: ReturnType<typeof setTimeout>[] = [];
window.qbot.behaviorAction.onPlay(({ action, loops, preview, traceId }) => {
  if(isDesktopQuiet())return;
  if(perched)return;
  const trace = (stage: string) => { if (traceId) window.qbot.behavior.reportTrace(traceId, stage); };
  behaviorReplayTimers.forEach(clearTimeout);
  behaviorReplayTimers = [];
  // 动作不可用（角色没这个动作）时静默忽略——执行器的语义解析已尽量给可用的，
  // 这里是最后一道闸
  if (available.length === 0 || !available.includes(action as PlayableId)) { trace(`动作跳过：不可用 ${action}`); return; }
  if ((!preview && !behaviorCanPlay()) || state.kind === 'drag' || state.kind === 'visit') { trace(`动作让位：当前 ${state.kind}`); return; }
  trace(`请求播放动作：${action}`);
  cancelHold();
  dispatch({ type: 'PLAY_ACTION', action: action as PlayableId });
  actionHold.begin(action,loops,Date.now());
  const m=currentCharacter?.manifest;
  const clip={...m?.actions,...m?.importedActions,...m?.expressionActions,...m?.customActions}[action];
  holdTimeout=setTimeout(()=>{cancelHold();dispatch({type:'VIDEO_ENDED'});},Math.max(6000,(clip?.durationSec??5)*1000*Math.max(1,loops))+15000);
});

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
  if(isDesktopQuiet())return;
  if(perched)return;
  timer = setTimeout(() => dispatch({ type: 'TIMER_FIRE' }), randomDelay(rng));
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

let gardenPerforming = false;
let gardenActionPlaying: string | null = null;
window.qbot.garden.onPerformance(action => {
  visitOrchestrator.cancelVisit();
  if(perched){window.qbot.pet.detachPerch();applyPerch(null);}
  cancelHold();
  stopDesktopWalk();
  gardenPerforming = !!action;
  gardenActionPlaying = action;
  document.body.classList.toggle('garden-performing', gardenPerforming);
  if (action && available.includes(action as PlayableId)) player.play(action as PlayableId);
  else dispatch({ type: 'PLAY_ACTION', action: 'idle' });
});
function dispatch(event: Parameters<typeof step>[1]): void {
  if(pettingAction){
    if(event.type==='VIDEO_ENDED'||event.type==='TIMER_FIRE')return;
    petting.stop();
  }
  if(isDesktopQuiet())return;
  if(gardenPerforming&&gardenActionPlaying&&event.type==='VIDEO_ENDED'){player.play(gardenActionPlaying as PlayableId);return;}
  if(perched){
    if(event.type==='POINTER_DOWN'){window.qbot.pet.detachPerch();applyPerch(null);}
    else { if(event.type==='VIDEO_ENDED')player.play(perched.action); return; }
  }
  if(actionHold.action){
    if(event.type==='POINTER_DOWN'||event.type==='VISIT_START')cancelHold();
    else if(event.type==='VIDEO_ENDED'){
      const replay=actionHold.ended(Date.now());
      if(replay){player.play(replay);return;}
      cancelHold();
    }else return; // Status handlers retain latest states; restore after the full expression ends.
  }
  if(state.kind==='idle'&&!gardenPerforming&&idlePool().length&&(event.type==='VIDEO_ENDED'||event.type==='TIMER_FIRE')){
    if(event.type==='VIDEO_ENDED')playIdle();else scheduleTimer();return;
  }
  stepCtx.available = available;
  const result = step(state, event, stepCtx);
  state = result.state;

  // ── 串门信号处理 ──
  if (result.visiterEnd) {
    if (pairInteraction.isActive()) visitOrchestrator.cancelVisit();
    void endVisit();
  }

  const restoreSticky = result.visiterEnd && (agentActivity !== 'idle' || meetingStatus.inMeeting || musicStatus.playing);
  if (result.play && !gardenPerforming && !restoreSticky) {
    if(result.play==='idle')playIdle();else player.play(result.play);
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
  if(currentCharacter?.dirId!==meta.dirId){window.qbot.pet.detachPerch();applyPerch(null);}
  if (gardenPerforming) window.qbot.garden.cancelPerformance();
  currentCharacter = meta;
  refreshSignboard();
  cancelHold();idleDirector.reset();
  void window.qbot.behaviorAction.getIdlePlan(meta.dirId).then(plan=>{
    if(plan&&currentCharacter?.dirId===meta.dirId&&(!idleDirector.plan||plan.chosenAt>=idleDirector.plan.chosenAt))idleDirector.accept(plan);
  }).catch(()=>{});
  available = player.load(meta.dirId, meta.manifest);
  stepCtx = {
    available,
    rng,
    agentActionMap: meta.manifest?.agentActions?.thinking !== undefined ||
      meta.manifest?.agentActions?.working !== undefined ||
      meta.manifest?.agentActions?.waiting !== undefined || meta.manifest?.agentActions?.error !== undefined
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
    if(perched)player.play(perched.action);else playIdle();
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
  if (document.hidden) { visitOrchestrator.cancelVisit(); return; }
  if (document.visibilityState !== 'visible' || available.length === 0) return;
  if(perched){player.play(perched.action);return;}
  speaker.interrupt();
  cancelHold();
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
let dropRevision = 0;
let dragStarted = false;
let downScreenX = 0;
let downScreenY = 0;
let activePointer: number | null = null;
let offsetX = 0;
let offsetY = 0;
let rafPending = false;
let lastScreenX = 0;
let lastScreenY = 0;
let clickTimer: ReturnType<typeof setTimeout> | null = null;

stage.addEventListener('pointerdown', (e) => {
  if(document.body.classList.contains('desktop-hidden'))return;
  if (e.button !== 0 || !e.isPrimary || pointerDown) return;
  dropRevision++;
  if (gardenPerforming) window.qbot.garden.cancelPerformance(false);
  activePointer = e.pointerId;
  pointerDown = true;
  dragStarted = false;
  downScreenX = e.screenX;
  downScreenY = e.screenY;
  offsetX = e.clientX;
  offsetY = e.clientY;
  stage.setPointerCapture(e.pointerId);
  hideSignPrompt(); // 点宠身上：收起举牌输入框
});
stage.addEventListener('pointermove', (e) => {
  if (!pointerDown || e.pointerId !== activePointer) return;
  if (!dragStarted) {
    const dx = e.screenX - downScreenX;
    const dy = e.screenY - downScreenY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
    dragStarted = true;
    window.qbot.desktop.unpeek();document.body.dataset.peek='';
    window.qbot.pet.detachPerch();
    applyPerch(null);
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    speaker.interrupt();
    // 拖拽开始就结束串门
    visitOrchestrator.cancelVisit();
    endVisit();
    hostSignboard.onDragStart();
    hud.onDragStart();
    stopDesktopWalk();
    dispatch({ type: 'POINTER_DOWN' });
    window.qbot.perception.report('drag_start');
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
  if (e.button !== 0 || !pointerDown || e.pointerId !== activePointer) return;
  pointerDown = false;
  activePointer = null;
  if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
  if (dragStarted) {
    dragStarted = false;
    window.qbot.pet.move(e.screenX-offsetX,e.screenY-offsetY);
    dispatch({ type: 'POINTER_UP' });
    hostSignboard.onDragEnd();
    hud.onDragEnd();
    window.qbot.perception.report('drag_end');
    const revision = dropRevision;
    void resolvePetDrop({perch:()=>window.qbot.pet.perch(),peek:()=>window.qbot.desktop.drop(),toast:message=>hud.toast(message)},()=>revision===dropRevision&&!isDesktopQuiet());
    return;
  }
  if(document.body.dataset.peek){window.qbot.desktop.unpeek();return;}
  // 双击 = 立即说一句；单击不做任何事（房间入口在右键菜单）
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
    speaker.forceSpeak();
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = null;
      if(perched){perchButtonsVisible=!perchButtonsVisible;hud.root.style.visibility=perchButtonsVisible?'':'hidden';}
      // 单击只选中/准备拖拽，不自动接一句；双击和右键才主动说话。
    }, DBLCLICK_MS);
  }
});

function cancelPointer(): void {
  if (!pointerDown) return;
  pointerDown = false;
  activePointer = null;
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
  if (dragStarted) {
    dragStarted = false;
    dispatch({ type: 'POINTER_UP' });
    hostSignboard.onDragEnd();
    hud.onDragEnd();
    window.qbot.perception.report('drag_end');
  }
}
stage.addEventListener('pointercancel', cancelPointer);
stage.addEventListener('lostpointercapture', cancelPointer);
window.addEventListener('blur', cancelPointer);

// ── 右键菜单 ───────────────────────────
const ACTION_LABELS: Record<string, string | undefined> = {
  perch_sit: '坐窗沿',
  perch_lie: '趴窗沿',
  writing: '写手账',
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
      .map((id) => ({ id, label: ACTION_LABELS[id] ?? (currentCharacter ? actionDisplayName(currentCharacter.manifest,id) : id) }))
      .filter((a) => a.label),
  );
});

window.qbot.pet.onMenuCommand((cmd) => {
  if(cmd.type==='networkPhoto'||cmd.type==='networkPair'){const host=currentCharacter,guest=cmd.guest;if(!host||document.hidden||isDesktopQuiet()||pointerDown||gardenPerforming||!pairActions(host.manifest).size||!pairActions(guest.manifest).size)return;window.qbot.pet.detachPerch();applyPerch(null);speaker.interrupt();cancelHold();stopDesktopWalk();clearTimer();pairInteraction.start(host,guest,cmd.type==='networkPair'?cmd.kind:'photo',true,cmd.type==='networkPair'&&cmd.recipient,cmd.type==='networkPair'?cmd.partner:undefined);networkPartner=cmd.type==='networkPair'?cmd.partner:undefined;return;}
  if (cmd.type === 'pair') { void startPair(cmd.kind, cmd.guestId); return; }
  if (cmd.type === 'pairEnd') { pairRequest++; pairInteraction.finish(); return; }
  if (cmd.type === 'speak' || cmd.type === 'play') visitOrchestrator.cancelVisit();
  if (cmd.type === 'speak') speaker.forceSpeak();
  else if (cmd.type === 'play') dispatch({ type: 'PLAY_ACTION', action: cmd.action as PlayableId });
  else if (cmd.type === 'signPrompt') showSignPrompt();
  else if (cmd.type === 'signClear') applyUserSign(null);
  else if (cmd.type === 'signDismiss') {
    signDismissed = true;
    signboardOneShot = null;
    applyUserSign(null);
  }
});
visitorStage.addEventListener('contextmenu', e => {
  e.preventDefault(); window.qbot.pet.popupMenu([]);
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') visitOrchestrator.cancelVisit(); });
window.addEventListener('beforeunload', () => visitOrchestrator.cancelVisit());

// ── 手动举牌输入框（当前牌面会通过 refreshSignboard 透明同步到公共房间） ─────
let signEntry: HTMLInputElement | null = null;

function applyUserSign(text: string | null): void {
  if (text) signDismissed = false;
  if (!text) petMessage = null;
  userSign = text?.trim() ? text.trim().slice(0, 60) : null;
  refreshSignboard();
  window.qbot.sign.set(userSign);
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
      'border-radius:16px',
      'border:2px solid #594235',
      'background:#fff9ef',
      'color:#594235',
      'box-shadow:0 4px 18px rgba(0,0,0,0.18)',
      'font-size:12px',
      'outline:none',
      "font-family:-apple-system,'PingFang SC',sans-serif",
    ].join(';');
    signEntry.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter' && !ev.isComposing) {
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

// Subscribe after initialization: a snapshot can arrive immediately from preload.
mountDesktopVisibility(s => {
  player.setSuspended(s.hidden);visitorPlayer.setSuspended(s.hidden);
  speaker.interrupt(); cancelHold(); stopDesktopWalk(); clearTimer();
  behaviorReplayTimers.forEach(clearTimeout); behaviorReplayTimers=[];
  visitOrchestrator.cancelVisit(); endVisit(); hideSignPrompt();
  if(s.hidden || s.peek) {
    dropRevision++;
    window.qbot.pet.detachPerch(); applyPerch(null);
    hostSignboard.hide(); visitorSignboard.hide();
    hud.root.classList.remove('lifted'); hud.root.style.visibility='';
    state={kind:'idle'};
    if(s.peek && !s.hidden)player.playLooping('idle');
    else document.querySelectorAll('video').forEach(v=>v.pause());
  } else if(available.length) {
    state={kind:'idle'}; playIdle(); scheduleTimer();
  }
});

const petting=mountPetting(stage,()=>!!currentCharacter&&available.length>0&&state.kind==='idle'&&!pointerDown&&!gardenPerforming&&!perched&&!actionHold.action&&!pairInteraction.isActive(),()=>{
  const action=currentCharacter&&choosePairAction(currentCharacter.manifest,'happy');
  pettingAction=true;clearTimer();stopDesktopWalk();
  if(action)player.playLooping(action.id);
  return ()=>{pettingAction=false;if(!isDesktopQuiet()&&!document.hidden&&state.kind==='idle'&&!gardenPerforming&&!perched&&!pairInteraction.isActive()){playIdle();scheduleTimer();}};
});

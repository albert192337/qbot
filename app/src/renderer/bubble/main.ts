/**
 * 气泡窗渲染层：订阅 agent 消息 → 维护气泡栈 DOM → 到点淡出 → 空栈通知主进程隐藏。
 * 栈的增删逻辑全在 stack.ts（纯函数），这里只管 DOM 与定时器。
 */
import type { AgentMessage } from '../../shared/ipc-types';
import { advanceReading } from './reading';
import {
  displayLabels,
  FADE_MS,
  upsert,
  type BubbleItem,
} from './stack';

const stackEl = document.getElementById('stack') as HTMLDivElement;
let anchorHeight = 500;
function syncHeight(): void {
  const nodes = [...stackEl.children] as HTMLElement[];
  const needed = nodes.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) + Math.max(0, nodes.length - 1) * 8;
  stackEl.style.height = `${Math.min(500, Math.max(anchorHeight, needed))}px`;
}

let items: BubbleItem[] = [];
/** sessionKey → 气泡节点 */
const nodes = new Map<string, HTMLElement>();
/** 正在播淡出动画、尚未从 DOM 摘掉的 key */
const fading = new Set<string>();
let tick: ReturnType<typeof setInterval> | null = null;
let lastPoll: number | null = null;
let away = false;
let polling = false;

function buildNode(msg: AgentMessage): HTMLElement {
  const el = document.createElement('div');
  el.className = `bubble ${msg.kind}`;
  el.classList.toggle('pet-speech', msg.source === '桌宠');
  const src = document.createElement('div');
  src.className = 'src';
  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = msg.text; // textContent 而非 innerHTML：agent 正文不可信
  el.append(src, text);
  return el;
}

/** 重排 DOM 顺序并刷新来源标签（同名来源要补 #xxxx 后缀） */
function syncDom(): void {
  const labels = displayLabels(items);
  items.forEach((it, i) => {
    const el = nodes.get(it.sessionKey);
    if (!el) return;
    const src = el.querySelector('.src');
    if (src) src.textContent = `${it.kind === 'attention' ? '⚠' : '✓'} ${labels[i]}`;
    stackEl.appendChild(el); // append 已有节点 = 移到末尾，正好是「最新在最下」
  });
  syncHeight();
}

function dropNode(key: string, immediate = false): void {
  const el = nodes.get(key);
  if (!el) return;
  nodes.delete(key);
  if (immediate) { el.remove(); return; }
  fading.add(key);
  el.classList.add('fade-out');
  setTimeout(() => {
    el.remove();
    syncHeight();
    fading.delete(key);
    reportIfEmpty();
  }, FADE_MS);
}

function reportIfEmpty(): void {
  if (items.length === 0 && fading.size === 0) {
    stopTick();
    window.qbot.bubble.reportEmpty();
  }
}

function startTick(): void {
  if (tick) return;
  tick = setInterval(async () => {
    if (polling) return;
    polling = true;
    const generation = tick;
    try {
      const idle = await window.qbot.bubble.getIdleSeconds();
      if (tick !== generation) return;
      const now = Date.now();
      const r = advanceReading(items, now, idle, lastPoll, away);
      lastPoll = now;
      away = r.away;
      items = r.items;
      if (!r.removed.length) return;
      r.removed.forEach(key => dropNode(key));
      syncDom();
      reportIfEmpty();
    } catch { /* 活动状态暂不可用时保留消息，下一轮重试。 */ }
    finally { polling = false; }
  }, 1000);
}

function stopTick(): void {
  if (tick) clearInterval(tick);
  tick = null;
  lastPoll = null;
  away = false;
}

function onMessage(msg: BubbleItem): void {
  const r = upsert(items, { ...msg, at: Date.now() });
  if (r.items === items && !r.removed.length) return; // 重复的闲置提醒：不续命
  items = r.items;
  r.removed.forEach(key => dropNode(key, true));
  if (!items.some(item => item.sessionKey === msg.sessionKey)) return;
  stackEl.querySelectorAll('.fade-out').forEach(el => el.remove());

  let el = nodes.get(msg.sessionKey);
  if (el) {
    // 同会话就地更新
    el.className = `bubble ${msg.kind} show`;
    el.classList.toggle('pet-speech', msg.source === '桌宠');
    const text = el.querySelector('.text');
    if (text) text.textContent = msg.text;
  } else {
    el = buildNode(msg);
    nodes.set(msg.sessionKey, el);
    stackEl.appendChild(el);
    requestAnimationFrame(() => el?.classList.add('show')); // 触发入场过渡
  }
  syncDom();
  startTick();
}

function clearAll(): void {
  stopTick();
  items = [];
  nodes.clear();
  fading.clear();
  stackEl.replaceChildren();
  // 不发 reportEmpty：主进程正在隐藏本窗，回环没意义
}

window.qbot.agent.onMessage(onMessage);
window.qbot.bubble.onClear(clearAll);
window.qbot.bubble.onAnchor((_side, contentHeight = 500) => {
  document.body.classList.remove('below');
  anchorHeight = contentHeight;
  syncHeight();
});

// ── 行为引擎说话气泡（规则命中的 say 步骤走这里）──
// 共用奶白描边气泡栈。主动聊天每句独立，普通自言自语不挤掉对话。
window.qbot.behaviorSay.onSay(({ text, durationMs, source, traceId }) => {
  onMessage({
    sessionKey: source === 'chat' ? `chat:${crypto.randomUUID()}` : source === 'llm' ? 'llm' : 'behavior',
    source: '桌宠',
    sessionShort: '',
    kind: 'done',
    text,
    at: Date.now(),
    durationMs,
  });
  if (traceId) requestAnimationFrame(() => window.qbot.behavior.reportTrace(traceId, '气泡已渲染'));
});

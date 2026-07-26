/**
 * 气泡窗渲染层：订阅 agent 消息 → 维护气泡栈 DOM → 到点淡出 → 空栈通知主进程隐藏。
 * 栈的增删逻辑全在 stack.ts（纯函数），这里只管 DOM 与定时器。
 */
import type { AgentMessage } from '../../shared/ipc-types';
import {
  displayLabels,
  expire,
  FADE_MS,
  TICK_MS,
  upsert,
  type BubbleItem,
} from './stack';

const stackEl = document.getElementById('stack') as HTMLDivElement;

let items: BubbleItem[] = [];
/** sessionKey → 气泡节点 */
const nodes = new Map<string, HTMLElement>();
/** 正在播淡出动画、尚未从 DOM 摘掉的 key */
const fading = new Set<string>();
let tick: ReturnType<typeof setInterval> | null = null;

function buildNode(msg: AgentMessage): HTMLElement {
  const el = document.createElement('div');
  el.className = `bubble ${msg.kind}`;
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
}

function dropNode(key: string): void {
  const el = nodes.get(key);
  if (!el) return;
  nodes.delete(key);
  fading.add(key);
  el.classList.add('fade-out');
  setTimeout(() => {
    el.remove();
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
  tick = setInterval(() => {
    const r = expire(items, Date.now());
    if (!r.removed.length) return;
    items = r.items;
    r.removed.forEach(dropNode);
    syncDom();
    reportIfEmpty();
  }, TICK_MS);
}

function stopTick(): void {
  if (tick) clearInterval(tick);
  tick = null;
}

function onMessage(msg: AgentMessage): void {
  const r = upsert(items, msg);
  if (r.items === items && !r.removed.length) return; // 重复的闲置提醒：不续命
  items = r.items;
  r.removed.forEach(dropNode);

  let el = nodes.get(msg.sessionKey);
  if (el) {
    // 同会话就地更新
    el.className = `bubble ${msg.kind} show`;
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
window.qbot.bubble.onAnchor((side) => {
  document.body.classList.toggle('below', side === 'below');
});

/**
 * agent 消息的纯逻辑：hook 事件 → 气泡文案。
 * 与 agent-merge.ts 同样的存在理由——agent-server / transcript 依赖 fs 与
 * electron，vitest 里跑不起来，所以可测的部分全部下沉到这里。
 * 本文件不得 import 任何 Electron API、fs 或 DOM。
 */

/** 气泡类型：done = 回合完成（Stop）；attention = 需要你处理（Notification） */
export type AgentMessageKind = 'done' | 'attention';

/** hook_event_name → 气泡类型；不在表内的事件不冒泡 */
export const MESSAGE_KIND: Record<string, AgentMessageKind> = {
  Stop: 'done',
  Notification: 'attention',
};

/** 正文取不到时的兜底文案（宁可说一句空话，也不要冒一个空气泡） */
export const FALLBACK_TEXT: Record<AgentMessageKind, string> = {
  done: '这一轮忙完了',
  attention: '有事要你处理',
};

/** 正文上限（字符数，按码点计） */
export const MESSAGE_MAX_CHARS = 140;
/** 来源标签上限 */
export const SOURCE_MAX_CHARS = 24;
export const ELLIPSIS = '…';
export const CODE_PLACEHOLDER = '［代码］';
/** 截断回退窗口：末尾这么多字内有断点就退到断点处，避免切在词中间 */
export const TRUNCATE_BACKOFF = 16;

/** 会话键：必须与 agent-server 的会话表同键，否则气泡与状态会错配 */
export function sessionKeyOf(agentId: string, sessionId: string): string {
  return `${agentId}:${sessionId || 'default'}`;
}

/**
 * markdown → 单行纯文本。
 * 铁律：下划线一概不动——`snake_case` / `__init__` / `__main__` 在 agent 回复里
 * 远比 `__粗体__` 常见（人基本都写 `**粗体**`），剥掉会毁掉标识符。
 * 代价是真用了 `__粗体__` 的会连下划线一起显示，认了（有回归测试守着）。
 */
export function flattenMarkdown(md: string): string {
  return md
    .replace(/\x1b\[[0-9;]*m/g, '') // ANSI 转义
    .replace(/```[\s\S]*?```/g, CODE_PLACEHOLDER) // 闭合围栏
    .replace(/```[\s\S]*$/, CODE_PLACEHOLDER) // 未闭合围栏（transcript 被截断时）
    .replace(/~~~[\s\S]*?~~~/g, CODE_PLACEHOLDER)
    .replace(/`([^`]*)`/g, '$1') // inline code 保内容去反引号
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 → alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 文字
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // 标题
    .replace(/^\s{0,3}>\s?/gm, '') // 引用
    .replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, '') // 水平线（要在列表之前）
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '· ') // 列表 → 中点
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, '') // 表格分隔行
    .replace(/\|/g, ' ') // 表格竖线
    .replace(/\*\*(.*?)\*\*/g, '$1') // 粗体（只处理 ** 版，见下）
    .replace(/(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])/g, '$1') // 斜体（只处理 * 版）
    .replace(/\s+/g, ' ') // 换行/缩进全压成单空格
    .trim();
}

/** 截断到 max 个码点。用 [...text] 而不是 slice——slice 会劈开 emoji 代理对 */
export function truncate(text: string, max = MESSAGE_MAX_CHARS): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  let cut = max;
  const window = chars.slice(max - TRUNCATE_BACKOFF, max).join('');
  const m = window.match(/[\s，。；、！？,.;!?)）」』]([^\s]*)$/);
  if (m && m.index !== undefined) cut = max - TRUNCATE_BACKOFF + m.index + 1;
  return chars.slice(0, cut).join('').trimEnd() + ELLIPSIS;
}

export function toBubbleText(raw: string): string {
  return truncate(flattenMarkdown(raw));
}

/** 兼容 / 与 \ 的 basename（不引 node:path，保持本模块零依赖可测） */
export function baseName(p: string): string {
  const parts = p.replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1] ?? '';
}

/**
 * 气泡的来源标签 = 项目目录名。
 * 用 cwd 而不是 transcript 里的 gitBranch：cwd 在 Stop 和 Notification 两个
 * payload 里都有，gitBranch 只有 Stop 路径拿得到，两条路径标签不一致更糟。
 */
export function sessionLabel(cwd: unknown, agentId: string): string {
  const base = typeof cwd === 'string' ? baseName(cwd) : '';
  const label = base || agentId || 'agent';
  const chars = [...label];
  return chars.length > SOURCE_MAX_CHARS
    ? chars.slice(0, SOURCE_MAX_CHARS - 1).join('') + ELLIPSIS
    : label;
}

/** session_id 前 4 位：同项目开多个会话时用于区分（worktree 场景很常见） */
export function shortSession(sessionId: string): string {
  return (sessionId || '').replace(/-/g, '').slice(0, 4).toLowerCase();
}

/**
 * 在飞的消息是否已被同会话的更新事件取代。
 * 关键：条目**不存在**不算取代——headless 模式下 SessionEnd 紧跟 Stop 到达并清掉
 * 代际表，若把 undefined 当成「被取代」，刚结束那一轮的气泡会被自己杀掉。
 */
export function isSuperseded(current: number | undefined, mine: number): boolean {
  return current !== undefined && current !== mine;
}

export interface AssistantEntry {
  text: string;
  /** 该行的 timestamp（ms）；缺失或不可解析为 0 */
  at: number;
}

/**
 * 从 JSONL 尾块里反向找最后一条**本会话**的 assistant 文本。
 * 必须反向扫：实测文件尾部三行是 system/system/last-prompt，最后一行不是 assistant。
 * 三种必须跳过的行（都是实测形状）：
 *   - type !== 'assistant'
 *   - isSidechain === true（子 agent 的回复，不是本轮结果）
 *   - content 里没有非空 text block（纯 tool_use 行）
 * @param atFileStart 尾块是否从文件头开始；否则首行大概率被字节截断，丢弃
 */
export function lastAssistantEntry(tail: string, atFileStart: boolean): AssistantEntry | null {
  const lines = tail.split('\n');
  if (!atFileStart) lines.shift();
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim(); // 顺带处理 CRLF
    if (!line.startsWith('{')) continue;
    let d: Record<string, unknown>;
    try {
      d = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue; // 写入中被截断的行
    }
    if (d.type !== 'assistant') continue;
    if (d.isSidechain === true) continue;
    const msg = d.message as { content?: unknown } | undefined;
    const content = msg?.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter(
        (b): b is { type: string; text: string } =>
          !!b && typeof b === 'object' && (b as { type?: unknown }).type === 'text' &&
          typeof (b as { text?: unknown }).text === 'string',
      )
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) continue;
    const ts = typeof d.timestamp === 'string' ? Date.parse(d.timestamp) : NaN;
    return { text, at: Number.isNaN(ts) ? 0 : ts };
  }
  return null;
}

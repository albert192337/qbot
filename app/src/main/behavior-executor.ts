/**
 * 行为脚本执行器（DSL 解释器）。
 *
 * 职责：
 *  - 接收 BehaviorScript，按顺序执行每一步
 *  - 动作播放 → 发 IPC 给 pet 窗口（state-machine 的 PLAY_ACTION）
 *  - 气泡 → 走 bubble 窗口的 behavior:say 通道
 *  - 举牌 → 调 local-sign
 *  - 等待 → setTimeout
 *  - 高优先级打断：新脚本进来时，如果优先级比当前高，立即中断当前的
 *  - 低/同优先级排队：等当前执行完再上（或者直接丢弃，看策略）
 *  - 执行完后记录行为史
 *
 * 设计原则（spec §4.4）：
 *  - 原子可中断：每步之间检查一次是否被打断
 *  - 单行为并发：同一时刻只执行一个行为脚本（避免动作/气泡互相打架）
 *  - 拖拽中全停：drag 状态下什么行为都不做（由入口层判断）
 */
import { sendToWindows } from './windows';
import { getSettings } from './config';
import { setLocalSign } from './local-sign';
import { recordBehavior } from './perception';
import { showBubbleWindow } from './windows';
import { validateScript, type BehaviorScript, type BehaviorStep } from '../shared/behavior-dsl';
import { setBehaviorExecutor } from './behavior-rules';
import { updateBrainCall } from './brain-log';
import { rememberConversation, shouldPauseAutomatic, lastUserAt } from './conversation-memory';

/** 当前正在执行的行为（null = 空闲） */
let current: {
  script: BehaviorScript;
  stepIndex: number;
  timer: ReturnType<typeof setTimeout> | null;
  interrupted: boolean;
  finishStep: (() => void) | null;
} | null = null;

/** 等待队列（同优先级按到达顺序排） */
const queue: BehaviorScript[] = [];
/** 队列最大长度（防止堆积） */
const MAX_QUEUE = 3;

/** 启动执行器（注册到 behavior-rules）。
 *  静态 import 安全：behavior-rules 不反向依赖本模块（execute 回调靠 setter 注入） */
export function startBehaviorExecutor(): void {
  setBehaviorExecutor(execute);
}

/**
 * 提交一个行为脚本执行。
 * 优先级策略：
 *  - 高于当前 → 打断当前，立即执行
 *  - 等于当前 → 进队列（如果队列没满）
 *  - 低于当前 → 丢弃（低优先级的等不到高优先级结束也没关系）
 */
export function execute(script: BehaviorScript): void {
  // 先校验（LLM 输出可能不合法；规则输出一般合法，但也验一下保险）
  const v = validateScript(script);
  if (!v.ok) {
    console.warn('[behavior-executor] 脚本校验失败，丢弃:', v.errors);
    return;
  }

  // 手动预览每次立即重播，不排队，也不受自动行为优先级影响。
  if (script.meta.source === 'debug' || script.meta.id === 'llm-chat') {
    stopAllBehaviors();
    void runScript(script);
    return;
  }

  // 空闲 → 直接执行
  // 点击回应只回应当下，不进入长队列，避免用户离开后才突然“嗯？”。
  if (script.meta.id === 'click-response' && current) return;
  if (!current) {
    void runScript(script);
    return;
  }

  // 高优先级 → 打断
  if (script.meta.priority > current.script.meta.priority) {
    interruptCurrent();
    queue.unshift(script); // 插到队首
    return;
  }

  // 同/低优先级 → 进队列（低的也进，但只有当前结束后同优先级以上的才会被取）
  if (queue.length < MAX_QUEUE) {
    queue.push(script);
    void updateBrainCall(script.meta.traceId, '排队等待');
  } else {
    void updateBrainCall(script.meta.traceId, '队列已满，未执行');
  }
}

/** 中断当前执行的行为 */
function interruptCurrent(): void {
  if (!current) return;
  current.interrupted = true;
  void updateBrainCall(current.script.meta.traceId, '执行被中断');
  if (current.timer) {
    clearTimeout(current.timer);
    current.timer = null;
  }
  current.finishStep?.(); // 清定时器也必须结束 await，否则执行队列永久卡住。
  // 停动作（让 pet 回到 idle）
  sendToWindows('behavior:action', { action: 'idle', loops: 0 });
  // 清空举牌（如果有）
  setLocalSign(null);
}

/** 运行整个脚本 */
async function runScript(script: BehaviorScript): Promise<void> {
  if (script.meta.id === 'llm-brain' && script.meta.characterId && (shouldPauseAutomatic(script.meta.characterId) || lastUserAt(script.meta.characterId) !== script.meta.conversationAt)) {
    void updateBrainCall(script.meta.traceId, '取消排队的主动回应：用户正在聊天');
    runNextFromQueue();
    return;
  }
  current = {
    script,
    stepIndex: 0,
    timer: null,
    interrupted: false,
    finishStep: null,
  };
  const run = current;
  void updateBrainCall(script.meta.traceId, '开始执行');

  // 记录行为史（开始时记一条，防重复自己的依据）
  void recordBehavior({
    at: Date.now(),
    kind: 'decision',
    detail: `${script.meta.id} (${script.meta.source})`,
  });

  for (let i = 0; i < script.steps.length; i++) {
    if (current !== run || run.interrupted) break;
    run.stepIndex = i;
    await executeStep(script.steps[i]);
  }

  // 结束
  if (current !== run) return; // 被停止的旧执行不能清掉新预览或启动其队列。
  current = null;

  // 从队列里取下一个
  runNextFromQueue();
}

/** 从队列里取下一个可执行的（优先级 >= 当前所有的） */
function runNextFromQueue(): void {
  if (queue.length === 0) return;
  // 简单策略：按优先级从高到低排序，取最高的那个
  queue.sort((a, b) => b.meta.priority - a.meta.priority);
  const next = queue.shift();
  if (next) void runScript(next);
}

/** 执行单步（原子操作，可在步间中断） */
async function executeStep(step: BehaviorStep): Promise<void> {
  const origin = current;
  if (step.op === 'say' && origin?.script.meta.source !== 'llm') {
    if ((await getSettings()).freeMode) return;
    if (current !== origin || origin?.interrupted) return;
  }
  return new Promise((done) => {
    const run = current;
    const resolve = () => {
      if (run) run.finishStep = null;
      done();
    };
    if (!current || current.interrupted) {
      resolve();
      return;
    }
    current.finishStep = resolve;
    const wait = (ms: number) => {
      if (run!.timer) clearTimeout(run!.timer);
      run!.timer = setTimeout(() => {
        run!.timer = null;
        resolve();
      }, ms);
    };

    switch (step.op) {
      case 'play': {
        // 发 IPC 给 pet 窗口播放动作
        sendToWindows('behavior:action', {
          action: step.action,
          loops: step.loops ?? 1,
          preview: current.script.meta.source === 'debug' || current.script.meta.id === 'llm-chat',
          traceId: current.script.meta.traceId,
        });
        // 动作时长估算：按每遍 3 秒算（不知道真实时长，用估算 + 下一条自动继续）
        // 更好的做法：pet 窗口播完后回一个 behavior:actionEnd，这里等它
        // 先按 3s/loop 估算，后面可以优化成真正等待 video end
        const estimatedMs = (step.loops ?? 1) * 3000;
        wait(estimatedMs);
        break;
      }

      case 'say': {
        // 记行为史（LLM 脑据此避免重复台词；防重复自己的依据）
        // 走气泡窗口
        const win = showBubbleWindow();
        const msg = {
          text: step.text,
          source: current.script.meta.id === 'llm-chat' ? 'chat' : current.script.meta.source === 'llm' ? 'llm' : 'behavior',
          traceId: current.script.meta.traceId,
          durationMs: step.durationMs || calculateSayDuration(step.text),
        };
        const deliver = () => {
          if (current !== run || run!.interrupted || run!.finishStep !== resolve || win.isDestroyed()) return;
          const meta = run!.script.meta;
          if (meta.id === 'llm-brain' && meta.characterId && (shouldPauseAutomatic(meta.characterId) || lastUserAt(meta.characterId) !== meta.conversationAt)) {
            void updateBrainCall(meta.traceId, '取消过时台词：用户已开始新的对话');
            resolve(); return;
          }
          win.webContents.send('behavior:say', msg);
          if (run!.script.meta.source === 'llm' && run!.script.meta.characterId) {
            rememberConversation(run!.script.meta.characterId, { at: Date.now(), role: 'assistant', source: run!.script.meta.id === 'llm-chat' ? 'chat' : 'auto', text: step.text });
          }
          void updateBrainCall(run!.script.meta.traceId, '气泡已发送', {}, step.text);
          void recordBehavior({ at: Date.now(), kind: 'say', detail: step.text });
          wait(run!.script.meta.id === 'llm-chat' ? 0 : msg.durationMs);
        };
        if (win.webContents.isLoading()) {
          win.webContents.once('did-finish-load', deliver);
          wait(15_000); // 页面加载失败时也不能堵住执行队列。
        } else deliver();
        // 按显示时长等
        break;
      }

      case 'sign': {
        // 举牌/收牌
        setLocalSign(step.text);
        // 举牌是状态，不占时间——立即继续
        resolve();
        break;
      }

      case 'wait': {
        wait(step.ms);
        break;
      }

      default:
        // 未知 / 未实现的 op（move / note / award / journal）→ 跳过
        console.debug('[behavior-executor] 跳过未实现的 op:', step.op);
        resolve();
    }
  });
}

/** 默认至少 20 秒，长句最多 30 秒，留出切回桌面阅读的时间。 */
function calculateSayDuration(text: string): number {
  const chars = [...text].length;
  const ms = chars * 200 + 1000; // +1s 缓冲
  return Math.min(30_000, Math.max(20_000, ms));
}

/** 获取当前执行状态（调试面板用） */
export function getExecutorState(): {
  current: { id: string; step: number; priority: number } | null;
  queue: Array<{ id: string; priority: number }>;
} {
  return {
    current: current
      ? {
          id: current.script.meta.id,
          step: current.stepIndex,
          priority: current.script.meta.priority,
        }
      : null,
    queue: queue.map((s) => ({ id: s.meta.id, priority: s.meta.priority })),
  };
}

/** 手动停止所有行为（调试用） */
export function stopAllBehaviors(): void {
  interruptCurrent();
  queue.length = 0;
  if (current) {
    current = null;
  }
}

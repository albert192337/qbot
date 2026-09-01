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
import { setLocalSign } from './local-sign';
import { recordBehavior } from './perception';
import { showBubbleWindow } from './windows';
import { validateScript, type BehaviorScript, type BehaviorStep } from '../shared/behavior-dsl';

/** 当前正在执行的行为（null = 空闲） */
let current: {
  script: BehaviorScript;
  stepIndex: number;
  timer: ReturnType<typeof setTimeout> | null;
  interrupted: boolean;
} | null = null;

/** 等待队列（同优先级按到达顺序排） */
const queue: BehaviorScript[] = [];
/** 队列最大长度（防止堆积） */
const MAX_QUEUE = 3;

/** 启动执行器（注册到 behavior-rules） */
export function startBehaviorExecutor(): void {
  // 注册回调给规则引擎
  // 这里做动态 import 避免循环依赖：behavior-rules → behavior-executor → behavior-rules
  // 用 setBehaviorExecutor 做 setter 注入
  import('./behavior-rules').then(({ setBehaviorExecutor: setExecutor }) => {
    setExecutor(execute);
  });
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

  // 空闲 → 直接执行
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
  }
}

/** 中断当前执行的行为 */
function interruptCurrent(): void {
  if (!current) return;
  current.interrupted = true;
  if (current.timer) {
    clearTimeout(current.timer);
    current.timer = null;
  }
  // 停动作（让 pet 回到 idle）
  sendToWindows('behavior:action', { action: 'idle', loops: 0 });
  // 清空举牌（如果有）
  setLocalSign(null);
}

/** 运行整个脚本 */
async function runScript(script: BehaviorScript): Promise<void> {
  current = {
    script,
    stepIndex: 0,
    timer: null,
    interrupted: false,
  };

  // 记录行为史（开始时记一条，防重复自己的依据）
  void recordBehavior({
    at: Date.now(),
    kind: 'decision',
    detail: `${script.meta.id} (${script.meta.source})`,
  });

  for (let i = 0; i < script.steps.length; i++) {
    if (!current || current.interrupted) break;
    current.stepIndex = i;
    await executeStep(script.steps[i]);
  }

  // 结束
  if (current) {
    current = null;
  }

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
function executeStep(step: BehaviorStep): Promise<void> {
  return new Promise((resolve) => {
    if (!current || current.interrupted) {
      resolve();
      return;
    }

    switch (step.op) {
      case 'play': {
        // 发 IPC 给 pet 窗口播放动作
        sendToWindows('behavior:action', {
          action: step.action,
          loops: step.loops ?? 1,
        });
        // 动作时长估算：按每遍 3 秒算（不知道真实时长，用估算 + 下一条自动继续）
        // 更好的做法：pet 窗口播完后回一个 behavior:actionEnd，这里等它
        // 先按 3s/loop 估算，后面可以优化成真正等待 video end
        const estimatedMs = (step.loops ?? 1) * 3000;
        current.timer = setTimeout(() => {
          current!.timer = null;
          resolve();
        }, estimatedMs);
        break;
      }

      case 'say': {
        // 走气泡窗口
        const win = showBubbleWindow();
        const msg = {
          text: step.text,
          source: 'behavior',
          durationMs: step.durationMs || calculateSayDuration(step.text),
        };
        if (win.webContents.isLoading()) {
          win.webContents.once('did-finish-load', () => {
            win.webContents.send('behavior:say', msg);
          });
        } else {
          win.webContents.send('behavior:say', msg);
        }
        // 按显示时长等
        const duration = step.durationMs || calculateSayDuration(step.text);
        current.timer = setTimeout(() => {
          current!.timer = null;
          resolve();
        }, duration);
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
        current.timer = setTimeout(() => {
          current!.timer = null;
          resolve();
        }, step.ms);
        break;
      }

      default:
        // 未知 / 未实现的 op（move / note / award / journal）→ 跳过
        console.debug('[behavior-executor] 跳过未实现的 op:', step.op);
        resolve();
    }
  });
}

/** 根据字数估算气泡显示时长（约 200ms/字，最少 2 秒，最多 10 秒） */
function calculateSayDuration(text: string): number {
  const chars = [...text].length;
  const ms = chars * 200 + 1000; // +1s 缓冲
  return Math.min(10_000, Math.max(2_000, ms));
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

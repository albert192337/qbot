# 孵化进度交互（Hatch Progress UX）设计

日期：2026-07-12
状态：已批准
前置讨论：孵化全程 15–30 分钟，现有进度屏只有 6 个不动的 🥚，等待焦虑严重。管线侧事件粒度其实已足够（`generating_frame` / `frame_qc` / `generating_video` / `keying` 每次状态转移都 emit），问题几乎全在 UI 消费端把状态压扁成了单一 "working"。本设计把已有粒度透出给用户，并补齐三视图阶段的等待反馈。

## 一、产品决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 动作卡片信息密度 | **首帧缩略图 + 子阶段文字**：缩略图区 🥚 → 首帧 PNG 到达换图 → done 加 🐣 徽标；下方子阶段文字 + 当前阶段已等时长 |
| 总体进度 | **加权总进度条 + 完成计数**（页面顶部），旁注 "x/6 个动作完成 · 已用时 mm:ss" |
| 时间信息 | **已耗时 + 经验参考值**（"视频生成通常每个动作 3–6 分钟"）；不做剩余时间预估（生成时长方差大，估不准反而失信） |
| 三视图等待 | **独立等待画面**：蛋摇晃动画 + "正在绘制角色设定图（3 张候选）…" + 已耗时；文案按生图后端区分（Seedream 约 1 分钟 / gpt-image-2 约 5–10 分钟） |
| 实现路线 | **方案 B：事件补字段 + 快照查询**。否决 A（renderer 靠命名约定拼 URL，隐式跨模块耦合，中途开窗全空）与 C（state.json 持久化各阶段时间戳，跨重启精确计时收益太小，YAGNI） |

## 二、现状链路（背景）

```
drop 屏拖图 → hatch.start → pipeline-bridge.startHatch → Job.create → runPipeline
  Stage 1 turnaround   并发 3 张三视图 → awaiting_pick → 用户挑选（唯一人工交互点）
  Stage 2–4 actions    6 动作并发，每动作独立状态机：
                       generating_frame → frame_qc（不过重试 1 次）
                       → generating_video（Seedance 提交 + 5s 轮询 ≤15min + 下载）
                       → keying（漂移检测/抠像/归一化/webm+gif）→ done|failed
  Stage 5 package      门槛 ≥4 done 且含 idle+drag → manifest.json → done
进度事件：Job.emitProgress → bridge broadcast('hatch:progress') → hatch renderer
```

现状缺陷：① UI `updateCell` 只认 done/failed，其余全画 🥚；② 三视图阶段直接显示 6 个空动作格，误导且无反馈；③ 首帧 PNG 已落盘（`.job/<action>_frame.png`）却不展示；④ 视频轮询期（最长一步）零心跳；⑤ 无总体进度。

## 三、pipeline 侧改动（`types.ts` + `job.ts`，纯增量）

- `ProgressEvent` 增加可选字段 `framePath?: string`（相对 `.job/`）。
- `Job.transition` emit 时带上该动作当前的 `a.framePath`。
- 事件时序、状态机、state.json 结构均不变；现有测试不受影响，补一条 framePath 断言。

## 四、bridge 侧改动（`pipeline-bridge.ts` + `ipc.ts` + preload + `ipc-types.ts`）

- `broadcast` 把 `framePath` 转成 `frameUrl`：`qbot-asset://<dirId>/.job/<action>_frame.png`（协议已服务 `.job/` 下文件，三视图候选图即此走法）。`HatchProgress` 增加 `frameUrl?: string`。
- 新 IPC `hatch.getStatus(dirId)`，返回快照：

```ts
interface HatchStatus {
  stage: Stage;
  /** 三视图等待态文案需要区分后端（Seedream/gpt-image-2 时长差 10 倍） */
  imageProvider?: ImageProvider;
  actions: Record<ActionId, { status: ActionStatus; frameUrl?: string; error?: string }>;
}
```

active 中的 job 直接读内存 `job.state`；非 active 的读 `state.json`（复用 `Job.load` 前的裸读即可，不触发 reconcile 落盘）。

## 五、hatch UI 改动（改动主体，`hatch/main.ts` + `index.html`）

### 5.1 设定图等待态（新增一屏 `screen-brewing`）

拖图、点"重新生成"、续跑且 stage 仍在 turnaround 时显示：

- 蛋轻微摇晃 CSS 动画 + 标题"正在绘制角色设定图（3 张候选）…"
- 已耗时计时（本地 1s 定时器）
- 文案按后端：Seedream "通常 1 分钟左右"；gpt-image-2 "通常 5–10 分钟，去喝杯茶吧"（后端从 drop 屏选项/快照的 imageProvider 得知）
- `awaiting_pick` 事件到达 → 切 pick 屏（原逻辑不变）

### 5.2 动作卡片（6 宫格）

```
┌─────────────┐
│ ┌─────────┐ │
│ │ 首帧缩略图 │ │   ← 生成前 🥚；首帧到达换 <img frameUrl>；done 叠 🐣 徽标
│ └─────────┘ │
│   喝茶        │
│ ● 视频生成中   │   ← 子阶段文字
│   已等 2:41   │   ← 当前子阶段已等时长，状态转移时清零
└─────────────┘
```

- 子阶段文案映射：`pending` 排队中 / `generating_frame` 首帧生成中 / `frame_qc` 首帧质检 / `generating_video` 视频生成中 / `keying` 抠像转码中 / `done` 完成 / `failed` 失败
- **有意不用 `<video>` 做 done 预览**：出生证明画廊 `<video>` 空白 bug 未解决（CLAUDE.md 已知问题），进度卡片不趟坑，用首帧图 + 徽标
- failed 卡片 `title` tooltip 显示 `error` 内容
- 缩略图 `<img>` onerror 回退 🥚

### 5.3 总进度条 + 计时（页面顶部）

- 每动作按状态映射固定进度点：pending 0% / generating_frame 5% / frame_qc 25% / generating_video 30% / keying 85% / done·failed 100%
- 总进度 = 6 动作均值 × 0.95 + package 完成 5%；平滑过渡用 CSS transition
- 旁注："3/6 个动作完成 · 已用时 12:41"（总计时从进入 actions 阶段起算，本地计时）
- 页面 hint 补经验值："视频生成是最久的一步，每个动作通常 3–6 分钟"

### 5.4 快照恢复

进入进度屏的所有路径（新孵化、续跑、修复、中途重开窗口）先 `getStatus(dirId)` 铺底渲染，再消费增量事件。快照与事件均为幂等渲染，后到覆盖先到。

## 六、边界处理

- 视频轮询超 10 分钟：子阶段文字追加"（比平时久，仍在等待）"，不误报失败（管线 15 分钟才超时）。
- 计时均为本地会话内计时，重启/重开窗口后从零起算（决策：不持久化时间戳，见 §一 否决方案 C）。
- `getStatus` 目标目录无 `state.json`（已完成清理或非法 dirId）→ 返回 null，UI 回 drop 屏。

## 七、验证

- `npm test -w pipeline`：现有 26+ 测试 + framePath 事件断言（全 mock 不花钱）。
- `npx tsc --noEmit -p app` 类型检查。
- UI 走查：mock 事件序列驱动各状态渲染；`/verify` skill 起隔离实例端到端过一遍屏幕流转。真实 API 烟测花钱，执行前单独征询。

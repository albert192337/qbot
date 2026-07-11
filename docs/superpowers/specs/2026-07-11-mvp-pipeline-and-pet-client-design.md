# QBot 第一步设计：角色生成管线 + 桌宠客户端最小组合

> 版本：v1.0（2026-07-11）
> 上游文档：`DESIGN.md`（产品全案，Single Source of Truth）
> 本 spec 范围：MVP1' 的第一个可交付切片——「用户丢一张图 → 自动生成 6 态角色 → 在 macOS 桌面上活起来」的端到端体验。

---

## 0. 已确认的决策

| 决策点 | 结论 |
|---|---|
| 范围 | 生成管线 + 桌宠客户端最小组合，端到端打通 |
| 客户端技术栈 | Electron + TypeScript |
| 管线形态 | 直接产品化：客户端内用户丢图自动生成；管线同时提供 CLI |
| 生成执行位置 | 客户端内置（主进程直调），API key 本地配置，公开发布前换后端 |
| 架构 | 方案 A：单仓库，pipeline/ 为零 Electron 依赖的独立 Node 模块 |
| 动作集 | S 档 6 态（待机呼吸、被拖拽悬空、睡觉、喝茶、对话-开心、对话-不耐烦） |
| 质检交互 | 只在三视图一处让用户挑候选（2~3 张），后续全自动 |
| 动画格式 | WebM（VP9 + alpha）主力；每动作顺手转一份 320px GIF 供导出分享 |
| 预置角色 | 1 只官方原创角色，与用户创角同格式同加载路径 |
| 客户端行为 | 最小状态机：6 态切换 + 拖拽 + 托盘菜单 |
| ffmpeg | ffmpeg-static 打包内置 |
| 首发平台 | macOS 优先，Windows 后置 |

---

## 1. 整体架构与目录结构

```
QBot/
├── pipeline/                  # 纯 Node 库，零 Electron 依赖
│   ├── src/
│   │   ├── ark.ts             # Ark API 薄封装
│   │   ├── prompts.ts         # 三套 prompt 模板
│   │   ├── chroma.ts          # 动态 key 色采样 + ffmpeg 抠像转码
│   │   ├── qc.ts              # 自动质检
│   │   ├── stages.ts          # 五阶段编排
│   │   ├── job.ts             # 任务状态持久化、断点续跑、重试
│   │   └── cli.ts             # CLI 入口（官方角色生产用）
│   └── package.json
├── app/                       # Electron 客户端
│   ├── src/main/              # 主进程：窗口、托盘、调 pipeline、IPC
│   ├── src/renderer/
│   │   ├── pet/               # 桌宠窗口：透明置顶、状态机播放器、拖拽
│   │   └── hatch/             # 孵化窗口：丢图、挑三视图、进度、出生证明卡
│   └── package.json
└── docs/superpowers/specs/    # 本文档
```

**模块契约**：pipeline 的输入是 `(参考图路径, 配置)`，输出是**角色资产包**目录。app 只认资产包格式，不关心生成过程细节；pipeline 不 import 任何 Electron API。未来上云 = 把 pipeline 部署到服务器 + app 改为上传/轮询，两侧内部逻辑不动。

**角色资产包**（两模块间唯一接口）：

```
~/Library/Application Support/QBot/characters/<id>/
├── manifest.json      # schema 见 §4
├── source.png         # 用户原图（出生证明卡用）
├── turnaround.png     # 选定的三视图
├── actions/
│   ├── idle.webm  drag.webm  sleep.webm  tea.webm
│   ├── talk_happy.webm  talk_annoyed.webm
│   └── <action>.gif   # 每动作 320px GIF，导出分享用
└── .job/              # 生成中间产物 + state.json，完成后保留（单动作重生成时复用）
```

- 预置官方角色 = 打包进 app 资源的同格式资产包，首次启动复制到 characters 目录。加载路径无特例。
- API key 存 `app.getPath('userData')/config.json`，设置页可输入。不硬编码、不进 git。

---

## 2. 生成管线：五阶段设计

### 阶段总览

```
Stage 1  turnaround   参考图 → 三视图候选 ×3          Seedream 图生图
   ⏸ 用户挑选（唯一人工交互点）
Stage 2  frames       三视图 → 6 张绿幕首帧            Seedream 图生图，6 并发
Stage 3  videos       首帧 → 6 段绿幕循环视频          Seedance i2v，first=last frame，6 并发提交+轮询
Stage 4  keying       视频 → 透明 WebM + GIF          ffmpeg colorkey，本地，逐个
Stage 5  package      写 manifest.json，资产包就绪
```

每阶段的产物与状态写入 `.job/state.json`，任何一步失败或进程退出后可从最后完成点续跑。

### Stage 1：三视图（人工质检点）

- 调 Seedream（`doubao-seedream-5-0-260128`，`POST /api/v3/images/generations`），prompt 用 DESIGN.md §3.3 三视图模板，尺寸 `3072x1536`（实测可用；`1440x1440` 会 400）。
- **并发出 3 张候选**，UI 展示给用户挑 1 张；提供「都不满意，重新生成」（消耗额度逻辑后置，MVP 阶段不限）。
- 角色外观描述：MVP 用固定的通用描述槽位（从图片自动提取描述后置为 P2 增强，可用视觉模型生成【角色描述】填充 prompt——先手写一版通用模板验证，见 §8 风险）。

### Stage 2：绿幕首帧 ×6

- 以选定三视图为参考图，逐动作生成绿幕首帧，prompt 用 §3.3 绿幕首帧模板 + 每动作一段姿势描述（6 段姿势文案作为 pipeline 内置常量，含防翻车显式排除：无手、无家具、无床）。
- 6 个请求并发。
- **自动质检**（qc.ts）：对每张首帧采样四角色块，验证是纯绿（HSV 色相在绿区间、饱和度足够）；不通过自动重试 1 次，仍不通过则该动作标记 `failed`，不阻塞其他动作。

### Stage 3：循环视频 ×6

- Seedance（`doubao-seedance-1-0-pro-250528`，异步任务 API），content 数组传同一张首帧作 `first_frame` 和 `last_frame`，prompt 用 §3.3 循环视频模板 + 动作描述，尾部 ` --resolution 480p --duration 5 --camerafixed true`（微动循环 idle/sleep 用 `--duration 3`，省 40%）。
- 6 个任务并发提交，统一轮询（间隔 5s），单任务超时 15 分钟。
- 生产参数锁定 **pro @ 480p**（¥0.73/5s 段，A/B 已判定，mini 出局）。

### Stage 4：抠像转码

- **动态采样 key 色**（每次生成的背景绿不同）：`crop=8:8:8:8` 取角落 8×8 平均色，DESIGN.md §3.4 命令。
- **自动质检**：采样视频首/中/尾多帧角落色，漂移 >10/255 → 追加第二轮 colorkey（双 key），仍超标则标记该动作 `failed` 待重生成。
- 转码两路输出：
  - **WebM**：`libvpx-vp9 + yuva420p`，colorkey 相似度 0.24、混合 0.06，640px 源尺寸保留。
  - **GIF**：320px、20fps、`palettegen reserve_transparent + paletteuse alpha_threshold=128:dither=none`。
- 三条铁律写死在代码里：不用 despill；必须 `dither=none`；循环靠生成层首尾帧一致，不做后期交叉淡化。

### Stage 5：打包

- 全部成功（或用户接受部分失败）后写 manifest.json，资产包移出 `.job` 临时区，通知 app 加载。
- **部分失败策略**：≥4 个动作成功且 idle+drag 必须在内 → 允许「先上桌，失败动作后台重试」；否则整体标记失败，提示用户重试（不额外扣额度的逻辑后置）。

### 错误处理与重试（job.ts）

- API 层：网络错误/5xx 指数退避重试 3 次；4xx（如内容审核拒绝）不重试，直接标记并附原因。
- 每动作独立状态机：`pending → generating_frame → frame_qc → generating_video → keying → done | failed`。
- `state.json` 每次转移即落盘；`resume(jobDir)` 从磁盘重建进度。
- CLI 与 app 共用同一 job 引擎：`qbot-pipeline create --ref photo.png --out ./chars/mascot --tier S`，加 `--tier B` 生产官方角色。

### 成本核对

单角色 S 档：三视图 3 候选 ~¥0.9 + 6×(首帧 ¥0.3 + 视频 ¥0.73/¥0.44) ≈ **¥7~8**，与 DESIGN.md §5 一致。上线前在方舟控制台核对实扣。

---

## 3. 桌宠客户端设计

### 窗口结构

| 窗口 | 特性 |
|---|---|
| 桌宠窗口（每角色一个） | 无边框、透明背景、置顶、不出现在 Dock/任务切换；尺寸约 360×360 |
| 孵化窗口 | 常规窗口，按需打开 |
| 托盘 | 常驻：孵化新角色 / 切换角色 / 设置（API key）/ 退出 |

macOS 关键参数：`transparent: true, frame: false, alwaysOnTop: 'floating', hasShadow: false`，`setIgnoreMouseEvents` 不启用（MVP 整窗接收鼠标，穿透优化后置）。

### 状态机（pet/ 渲染进程）

```
            ┌─────────── mousedown+move ───────────┐
            ▼                                       │
  ┌──────┐ 定时器/随机 ┌──────────────────────┐      │
  │ drag │◄──────────│ idle ↔ sleep/tea/     │──────┘
  └──┬───┘            │ talk_happy/talk_annoyed│
     │ mouseup        └──────────▲─────────────┘
     └────────── 回 idle ────────┘
```

- **播放器**：`<video loop muted autoplay>` 播 WebM；切状态 = 换 `src` 硬切（预加载全部 6 个视频元素，切换零延迟——玩家操作触发的硬切读作「响应快」）。
- **自主行为调度**：idle 期间随机间隔（30s~3min）切入 sleep/tea/talk 之一，播完整段循环 1~3 遍回 idle。仅此而已——不做时间反应、不做戳击，留给下一切片。
- **拖拽**：mousedown 进 drag 态，窗口跟随鼠标（主进程 `setPosition`）；mouseup 回 idle。速度倾斜等跟手感增强后置。

### 孵化流程（hatch/ 渲染进程）

```
拖图进窗口 → [生成中…] → 三视图 3 选 1 → [孵化中：逐动作点亮进度]
→ 出生证明卡（左原图 右动起来的 idle）→ [上桌] 按钮 → 桌宠窗口出现
```

- 进度页把 6 个动作显示为蛋上的图标逐个点亮（对应 job 状态机事件，主进程经 IPC 推送）。
- 生成全程可关窗口，重开从 state.json 恢复展示（断点续跑在管线层，UI 只是重连）。
- 出生证明卡 MVP 版：静态排版 + 可保存 PNG（`html2canvas` 或截图 API），分享水印后置。

### IPC 接口（主进程 ↔ 渲染）

```
hatch:start(refImagePath) → jobId
hatch:pickTurnaround(jobId, index)
hatch:progress(jobId) 事件流：{action, stage, status}
characters:list() / characters:activate(id)
settings:get/set(apiKey)
```

---

## 4. manifest.json schema

```json
{
  "id": "uuid",
  "name": "未命名",
  "createdAt": "2026-07-11T12:00:00Z",
  "tier": "S",
  "sourceImage": "source.png",
  "turnaround": "turnaround.png",
  "actions": {
    "idle":         {"webm": "actions/idle.webm",         "gif": "actions/idle.gif",         "durationSec": 3, "status": "done"},
    "drag":         {"webm": "actions/drag.webm",         "gif": "actions/drag.gif",         "durationSec": 5, "status": "done"},
    "sleep":        {"webm": "actions/sleep.webm",        "gif": "actions/sleep.gif",        "durationSec": 3, "status": "done"},
    "tea":          {"webm": "actions/tea.webm",          "gif": "actions/tea.gif",          "durationSec": 5, "status": "done"},
    "talk_happy":   {"webm": "actions/talk_happy.webm",   "gif": "actions/talk_happy.gif",   "durationSec": 5, "status": "done"},
    "talk_annoyed": {"webm": "actions/talk_annoyed.webm", "gif": "actions/talk_annoyed.gif", "durationSec": 5, "status": "failed"}
  },
  "pipelineVersion": "1"
}
```

- `status: failed` 的动作：状态机调度时跳过；后台重试成功后热更新。
- `pipelineVersion` 供未来资产格式迁移。

---

## 5. 测试策略

| 层 | 方法 |
|---|---|
| pipeline 单元 | prompts 模板填充、key 色计算（纯函数）、state.json 读写与 resume 逻辑——mock API |
| pipeline 集成 | CLI 对一张固定参考图跑真实 API 全流程（手动触发、花真钱，作为发版前 checklist 而非 CI） |
| chroma/qc | 用已有的绿幕 mp4 样本作 fixture 回归测试抠像参数（防止改参数悄悄劣化） |
| app | 状态机纯逻辑（切换规则、调度器）单测；窗口/拖拽人工验收 |
| 端到端验收 | 首周脚本第一行：预置角色上桌首动 <60s；丢图→上桌全流程一次跑通 |

---

## 6. 交付切片顺序（供 writing-plans 参考）

1. **pipeline CLI 跑通**：ark.ts + prompts + stages + chroma，CLI 从参考图产出完整资产包（自动质检和断点续跑在这一步一并做，因为官方角色生产马上要用）
2. **官方预置角色生产**：用 CLI 生产 1 只原创角色 B 档（先 S 档 6 态，其余后补）
3. **桌宠客户端**：透明窗 + WebM 状态机 + 拖拽 + 托盘，加载预置角色——此步完成即有可玩 demo
4. **孵化 UI**：丢图 → 挑三视图 → 进度 → 出生证明卡 → 上桌，接通 pipeline
5. **打磨**：部分失败重试 UX、设置页、打包分发（electron-builder + ffmpeg-static）

切片 1-2 与 3 可并行（接口是资产包格式，已定义）。

---

## 7. 明确不做（本切片）

- 云端/后端服务（key 本地，公开发布前必须换，见风险）
- GIF 表情包导入、Steam 工坊、导出视频水印
- 行为池扩展（戳、摸头、时间反应、听歌反应）、双角色互动
- 熟悉度/养成数值、Windows 适配、自动更新

---

## 8. 风险与开放问题

| 项 | 说明 | 对策 |
|---|---|---|
| 角色描述自动提取 | 三视图 prompt 需要【角色描述】槽位，MVP 用通用模板可能降低还原度 | 先验证通用模板效果；不行则接视觉模型自动描述（Ark 同平台有 VLM，增量小） |
| API key 在客户端 | 内测可接受，公开分发 = key 泄露 | 发布前 gate：换最小后端代理。本切片不做但接口按资产包/job 模式已预留 |
| WebM alpha 转码参数未实测 | GIF 管线已验证，WebM 路径是推导的 | 切片 1 首个任务：拿现有绿幕 mp4 样本验证 yuva420p 输出在 `<video>` 里的透明效果 |
| 内容审核拒绝 | 用户上传图可能触发平台审核 | 4xx 明确报错文案；不重试 |
| 首图质量差导致连锁翻车 | 参考图模糊/多人/非角色图 | 孵化入口做最小校验提示（单角色、清晰、全身/半身佳）；三视图 3 候选是主要兜底 |

---

## 9. 验收标准

1. `qbot-pipeline create --ref x.png --out y --tier S` 无人值守产出资产包（除三视图挑选，CLI 模式下 `--auto-pick 0` 跳过）
2. 客户端首启：预置角色上桌并在 6 态间自然切换，拖拽跟手，托盘可退出
3. 客户端丢图 → 挑三视图 → ≤40 分钟后角色上桌，全程无需命令行
4. 生成中途杀进程重启后，孵化从断点继续而非重头
5. 单角色 S 档实际 API 花费 ≤ ¥10

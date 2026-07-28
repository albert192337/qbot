# QBot — AI 桌宠

丢一张角色图 → 自动生成 6 动作动画角色（三视图 → 绿幕首帧 → 循环视频 → 抠像转码）→ macOS 桌面常驻透明窗桌宠。可联动 AI coding agent（Claude Code）：agent 干活时桌宠实时切状态。

## 仓库结构（npm workspaces monorepo）

| 路径 | 职责 |
|---|---|
| `pipeline/` | 生成管线，**纯 Node 零 Electron 依赖**，可独立 CLI 使用（`npx tsx pipeline/src/cli.ts`） |
| `app/` | Electron 客户端（electron-vite；main / preload / 四 renderer：pet + hatch + room 小房间 + bubble 气泡） |
| `app/src/main/pipeline-bridge.ts` | **唯一** import `@qbot/pipeline` 的地方 |
| `app/src/main/agent-server.ts` | agent 联动：127.0.0.1 HTTP 收 hook 事件 → 会话合成 → 广播 pet 窗 |
| `app/src/main/agent-message.ts` | agent 消息纯逻辑：markdown 展平、截断、来源标签、transcript 解析（可单测） |
| `app/src/main/hooks/claude.ts` | Claude Code hooks 安装器（托盘显式同意，写 ~/.claude/settings.json） |
| `assets/mascot/` | 官方预置角色源（同步于 `app/resources/presets/mascot/`） |
| `docs/superpowers/specs/` | 已批准的设计 spec（权威）；`DESIGN.md` 是最初的产品/技术调研 |
| `config.local.json` | **gitignored**，存 API keys（arkApiKey / gptImageApiKey） |

两模块唯一接口 = 落盘的角色资产包：`manifest.json` + `source.png` + `turnaround.png` + `actions/*.{webm,gif}` + 断点状态 `.job/state.json`。

## Agent 联动（M1：Claude Code）

- 端口 24242~24246 首个可用，写 `~/.qbot/port`（纯数字）+ `~/.qbot/runtime.json`；hook = 一行 curl 把 stdin 的事件 JSON 原样 POST `/state?agent=claude`
- 事件映射：UserPromptSubmit→thinking(tea) PreToolUse/PostToolUse→working(talk_happy) Notification→waiting(drag 蹦跳) Stop→done(庆祝 2 遍) SessionEnd→删会话；合成优先级 error > waiting > working > thinking > done > idle
- done 45s 衰减 idle；会话 10min 无事件视为死会话清理
- 状态机新增 agent 态（粘性循环，drag > agent > auto/idle）；drag 中忽略 agent 事件，松手由 pet/main.ts 重发恢复
- hooks 安装**只走托盘菜单显式确认**，标记子串 `.qbot/port` 识别自家条目，幂等可卸载，首次写前备份
- **三平台同一条 POSIX 命令串**：Claude Code 在 Windows 上也用 bash 执行 hook（实测 `$0` = `/usr/bin/bash`，随 Git for Windows 提供，`$HOME` = `/c/Users/<user>`），所以不需要 cmd/PowerShell 分支；安装前只探测 `sh`/`curl` 是否可用，缺了就弹框拒装（有测试守着命令串不含 `%VAR%`/反斜杠等 Windows 写法）

## Agent 气泡（M2：任务结果冒泡）

- `Stop` → 绿气泡（`✓`）报这一轮结论；`Notification` → 琥珀气泡（`⚠`）报要你处理什么
- **正文首选 Stop payload 的 `last_assistant_message`**（新版 Claude Code 直接给字符串，免读文件、无落盘竞态、无路径信任问题）；`transcript_path` 尾块读取只作老版本/别家 agent 的兜底
- 正文 140 字截断（markdown 展平成单行）、停留 10s 淡出、最多同时 3 枚、同会话就地替换不叠加
- 来源标签 = `cwd` 的目录名（`cwd` 在 Stop 和 Notification 里都有；`gitBranch` 只有 transcript 里有故不用）；**同名来源并存时补 `#<session前4位>`**（worktree 场景必需）
- 气泡窗是第 4 个 renderer：固定 340×500 透明置顶穿透窗，`focusable:false`，创建后**只 setPosition 永不改尺寸**；跟随桌宠靠 `petWindow.on('move'|'resize')`

## 常用命令

```bash
npm install                  # 装依赖；国内下载 electron 二进制必须:
                             #   ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
npm run dev -w app           # 启动桌宠（开发模式）
pkill -f "electron-vite"; pkill -f "QBot/node_modules/electron"   # 关闭（必须连 dev server 一起杀，见血泪坑 12）
npm test -w pipeline         # 管线单测（全 mock，不花钱）
npm run build -w pipeline    # tsc 编译 dist/（app 引用的是 dist，改 pipeline 后必须 build）
npx tsc --noEmit -p app      # app 类型检查
npm run dist -w app          # 打包当前平台（mac→dmg / win→nsis+zip；mac 从未验证成功过）
                             # Windows 包必须在 Windows 上构建（ffmpeg-static 装机时按平台下载）
                             # → 完整流程/镜像/验证清单见 docs/windows-build-and-release.md
                             # → GitHub Actions build-windows.yml（手动触发或打 v* tag）

# 多开第二只桌宠（数据目录隔离，单实例锁按目录生效）
QBOT_USER_DATA="$HOME/Library/Application Support/@qbot/app-2" npm run dev -w app

# 离线生成房间背景/装饰贴纸（gpt-image-2，花钱，key 在 config.local.json）
npx tsx scripts/gen-room.mts room --ref assets/rooms/ref.png --n 3   # 房间候选
npx tsx scripts/gen-room.mts decor                                    # 贴纸包
npx tsx scripts/gen-room.mts rekey --out assets/rooms/decor --trim    # 从 raw 重抠（免费）
```

运行时数据：`~/Library/Application Support/@qbot/app/`（`characters/*/` 角色包、`config.json` 设置）。

## API（2026-07-12 现状）

- **端点**：`https://ark.cn-beijing.volces.com/api/plan/v3`（火山方舟 plan 端点，key 在 config.local.json）
- **生图**：`doubao-seedream-5.0-lite`（尺寸白名单：三视图 3072x1536、首帧 2048x2048；1440x1440 会 400）
- **视频**：`doubao-seedance-1.5-pro`——**duration 最短 5**（3 会 400）；参数走 prompt 尾缀 `--resolution 480p --duration 5 --camerafixed true`；首帧同时作 first_frame+last_frame（循环的关键）；输出 640×640 24fps h264
- **可选生图后端 gpt-image-2**（aiartmirror，OpenAI images 兼容，`pipeline/src/gpt-image.ts`）：单张 5-10 分钟；服务端同账号疑似串行 → 客户端限并发 2、超时 900s；有参考图走 multipart `/images/edits`；4xx 与 503 `model_not_found` 永不重试
- 返回的图片/视频 URL **24 小时过期**，管线一律立即下载落盘
- 孵化选项（生图后端、角色形态 humanoid/abstract）写进 `.job/state.json`，resume/redo 自动沿用

## 血泪坑（改代码前必读）

1. **WebM alpha 双参数**：`-auto-alt-ref 0` + `-metadata:s:v:0 alpha_mode=1` 缺一即黑底；解码验证需 `-vcodec libvpx-vp9`
2. **GIF 三铁律**：不做 despill；`dither=none`；循环靠生成层（首尾帧相同），不靠 ffmpeg
3. **抠像默认 colorkey 0.15:0.04**（`chroma.ts`）——DESIGN.md 里的 0.24 会把偏绿的角色身体抠出镂空
4. **尺寸归一化**：抠像后按 alpha bbox 缩放到统一高度、底边对齐（`computeAlphaBBox`/`normalizeFilter`）；原始绿幕 mp4 永久留在 `.job/`，改抠像参数零成本重抠（参考 `pipeline/test/tmp/rekey-normalize.mts`）
5. **`qbot-asset://` 协议**：`registerSchemesAsPrivileged` 必须在 app.ready 前且带 `stream: true`，否则 `<video>` 静默不播
6. **拖拽取路径**：Electron ≥32 没有 `File.path`，必须 preload 里 `webUtils.getPathForFile`
7. **拖拽移动用 screenX/Y**（clientX 会正反馈抖动）
8. **videoTaskId 提交成功立刻落盘**——防重启后重复提交扣钱；resume 会校验产物存在性并回退状态
9. **ffmpeg-static 打包**：asar 里不可执行 → asarUnpack + 路径 `replace('app.asar','app.asar.unpacked')`（pipeline-bridge 已处理）
10. **abstract 形态的 prompt 铁律**：绝不出现部位词（双臂/坐姿/耳尾…），模型会顺着描述凭空长出部位；有测试守着
11. **electron-builder** 需要 `electronVersion` 钉死精确版本（monorepo 提升导致 range 推断失败）
12. **只 `pkill` electron 杀不干净**：electron-vite 的 dev server（node 进程）还活着，会立刻用**旧 bundle** 重启一个 electron。此时再 `npm run dev` 会因 5173 被占而另起 dev server，新 electron 被单实例锁挡掉直接退出（后台任务显示 exit 0，极易忽略）→ 你以为在测新代码，其实一直在打旧进程。关闭必须 `pkill -f "electron-vite"` 一起来，改完代码验证前先确认 `ps -o lstart` 的进程启动时间晚于改动时间
13. **agent 活动态必须有 TTL**（`agent-merge.ts` 的 `ACTIVITY_TTL_MS`）：会话表只靠 `SessionEnd` 和 10min `STALE_MS` 清理，任何异常退出的会话会按优先级把合成状态钉死；又因 agent 态是**粘性循环**（播完重播），表现为桌宠无限循环同一动作。同理 agent 活动**不许映射到 `drag`**——和「被指针按住」撞同一个动画，看着像卡死（两条都有测试守着）
14. **headless（`claude -p`）下 `SessionEnd` 紧跟 `Stop` 到达**（几十毫秒）。任何「在飞的异步工作」用会话代际表做失效判断时，**条目不存在不能当成被取代**（`isSuperseded`），否则 SessionEnd 一清表就把刚结束那轮的气泡杀了。交互式会话 SessionEnd 很晚才来，掩盖这个 bug
15. **透明窗只 `setPosition` 不 `setBounds`**：气泡窗固定尺寸就是为此（坑 4 的 resize 渲染 bug）。隐藏气泡窗前必须先发 `bubble:clear`——Chromium 对隐藏窗做定时器节流，留着 pending 的淡出定时器会在回到桌面时一次性冒出一堆过期气泡
16. **Claude Code 的 hook 在 Windows 上跑在 bash 里，不是 cmd**（实测 `$0` = `/usr/bin/bash`，Git for Windows 提供）。所以 hook 命令串**必须保持 POSIX**：写成 `.cmd`/`%VAR%`/反斜杠路径反而会 `command not found`（bash 把 `D:\dev\...` 的反斜杠当转义符吃掉，报 `D:devqbot...`）。查这类问题用 `claude -p ... --debug hooks`，hook 失败信息只在那里出现，正常输出里完全静默

## 已知未解决

- 出生证明画廊 `<video>` 全空白（文件本身验证正常，桌宠窗口同 URL 能播；重复渲染已修）
- Windows 打包已跑通并实测联动（见 `docs/windows-build-and-release.md`）；**mac 打包仍未验证成功**
- 包未做代码签名 → Windows 首次运行撞 SmartScreen「未知发布者」
- `DEFAULTS.concurrency` 定义了但没接限流（S 档就 6 个动作，恰好全开）

## 约定

- pipeline 模块禁止 import Electron API
- prompt 模板文字实测有效，不要随意改写措辞（`prompts.ts`）
- 改动作/管线参数后跑 `npm test -w pipeline`（26+ 测试，全 mock 不花钱）
- 真实 API 烟测要花钱（生图分/张、视频约 ¥1/条），先问用户

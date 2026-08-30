# QBot — AI 桌宠

丢一张角色图 → 自动生成 6 动作动画角色（三视图 → 绿幕首帧 → 循环视频 → 抠像转码）→ macOS 桌面常驻透明窗桌宠。可联动 AI coding agent（Claude Code）：agent 干活时桌宠实时切状态。

## 仓库结构（npm workspaces monorepo）

| 路径 | 职责 |
|---|---|
| `pipeline/` | 生成管线，**纯 Node 零 Electron 依赖**，可独立 CLI 使用（`npx tsx pipeline/src/cli.ts`） |
| `app/` | Electron 客户端（electron-vite；main / preload / 五 renderer：pet + room 小房间 + bubble 气泡 + console 控制台 + lounge 公共房间） |
| `app/src/main/pipeline-bridge.ts` | import `@qbot/pipeline` 的主入口（另一处是 sticker-importer，共用其 `buildConfig`） |
| `app/src/main/agent-server.ts` | agent 联动：127.0.0.1 HTTP 收 hook 事件 → 会话合成 → 广播 pet 窗 |
| `app/src/main/agent-message.ts` | agent 消息纯逻辑：markdown 展平、截断、来源标签、transcript 解析（可单测） |
| `app/src/main/hooks/claude.ts` | Claude Code hooks 安装器（托盘显式同意，写 ~/.claude/settings.json） |
| `app/src/main/music-monitor.ts` | 网易云音乐监控（Windows SMTC，常驻 PowerShell 进程） |
| `app/src/main/rooms/` | 公共房间链路：`rooms.ts` 网络、`rooms-rules.ts` 纯逻辑、`room-pets.ts` 角色包分发状态机、`room-pet-display.ts` 宠上屏窗口编排。2026-08-24 起是唯一联机链路（原 1v1 已退役） |
| `market/` `rooms/` | 两个独立服务端 workspace（单文件 + 最小依赖，可整目录 scp；禁止 import 仓库其他模块） |
| `app/src/main/sticker-importer.ts` | 表情包导入：打标→复核→转码落盘→热重载（纯逻辑在 `sticker-rules.ts`） |
| `app/src/renderer/console/` | **统一控制台**：左侧栏二级目录（角色/配置/社区/连接/系统），`panes/*.ts` 一 pane 一文件，懒挂载 |
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
- 气泡窗是独立 renderer：固定 340×500 透明置顶穿透窗，`focusable:false`，创建后**只 setPosition 永不改尺寸**；跟随桌宠靠 `petWindow.on('move'|'resize')`

## 统一控制台（原 Studio / 市场 / 孵化 / 设置 / 调试面板五合一）

- **桌宠右键「控制台…」或托盘**打开单窗（880×640，renderer `console`），左侧栏五组十一项：
  - 角色：我的角色（切换/改名/删除）、孵化新角色（drop→brewing→pick→progress→certificate 五屏）
  - 配置：人设与动作、场景动作（Claude/听歌/开会 三类映射）、表情包导入、生成 Prompt
  - 社区：装扮市场　连接：Claude Code、联机　系统：设置、开发者工具
- **pane 懒挂载常驻**：首次激活才 `mount()`，切走只隐藏 → 未保存输入不丢；再次可见调 `onVisible()`
  （孵化据此主动 `seedFromStatus`，兜底懒挂载错过的 `awaiting_pick` 事件）
- **深链** `createConsoleWindow(pane)`：已开窗→直接发 `ui:showScreen`；新窗→`did-finish-load` once 后发
- **样式作用域** `[data-pane="..."]` 前缀 + 控制台自己一套 `.btn`/`.btn.primary`/`.btn.danger` 语义类
  （三套页面原本各自定义裸 `button`，`button.danger` 一个红底白字一个白底红字，合并必炸）
- **`alert`/`confirm` 全部替换**为 pane 内非阻塞 toast / confirmBox：原生对话框会冻住整个 renderer，
  单窗下意味着所有 pane 一起卡死；后台事件触发的那个还会凭空弹出
- **`location.reload()` 全部替换**为局部 `refresh()`：单窗下 reload 会清空所有 pane 的未保存输入。
  连带把 `ASSET_NONCE` 从常量改成可变（原先靠 reload 才刷新，否则重生动作后吃缓存显示旧动画）、
  `onCustomAction` 订阅移出重渲染路径（原挂在 `bindEvents` 里，每次重渲染注册一次、从不退订）
- **状态推送收口**在 `windows.ts:sendToWindows()`：agent/music/meeting/progress/settings 五路
  原先只发 pet 窗，控制台要显示实时状态就得都加上，收成一个 helper 避免每处手写

## 飞书会议联动

- 监控本地飞书客户端会议模块（byteview）的明文日志检测本机入会/离会：`<LarkShell>/sdk_storage/log/native-pc-sdk/byteview-PCSDK-FALCON_<日期>.log`，标记 `onJoinChannelSuccess` / `join-work-flow:leaveRoom`（RTC 引擎入口函数名，跨版本稳定；1v1 通话也算会中）
- **为什么不走 OpenAPI**：飞书没有「查询/订阅某用户当前是否在会中」的能力（join/leave 事件只对 OpenAPI 预约的会议触发），详见 `docs/feishu-meeting-monitor-design.md`
- 会中桌宠举牌「正在开会」+ 切 meeting 态动作（默认 `tea`，控制台「场景动作 → 飞书开会时」可配）；优先级 `drag > agent > meeting > music > visit > auto/idle`
- 失效保护三连（防钉死在会中态）：飞书进程消失（30s pgrep）、会中日志停滞 5min、IO 连续失败 10 次降级禁用；启动读日志尾 256KB 播种（会中重启 QBot 也能识别）
- 零权限、零网络、零 npm 依赖；日志目录不存在（未装飞书/非 mac|win）静默禁用；Windows 日志路径按同构推断**未实测**
- 核心文件：`app/src/main/meeting-monitor.ts`（轮询/失效保护）+ `meeting-log-parser.ts`（纯逻辑，可单测）

## 网易云音乐联动（Windows 专属）

- 通过 **SMTC (SystemMediaTransportControls)** API 监控云音乐播放状态
- 检测到播放时桌宠**举牌显示「曲名 - 歌手」**并切换到摇摆动作（默认 `talk_happy`，控制台「场景动作」可配）
- 常驻一个 PowerShell 进程内部每 3 秒轮询，进程意外退出会退避重启
- 状态机新增 **music 态**，优先级 `drag > agent > meeting > music > visit > auto/idle`（Claude 干活/开会时音乐不打断）
- 非 Windows 平台静默禁用，零新增 npm 依赖
- 核心文件：`app/src/main/music-monitor.ts` (175 行)

## 游戏化积累（挂机箱子 / 点数 / 开箱 / 合成）

- **点数**：敲键盘 1 点/次（`app/src/main/input-monitor.ts`），Claude Code 每跑完一轮（`Stop`）10 点（`agent-server.ts` 接线）
- **箱子**：挂机满 15 分钟得 1 个（`progress.ts` 30s tick + `progress-rules.ts` 的 `settleIdle`）；新档初始送 2 个
- **开箱**：500 点 + 1 箱 → 随机一件家具（档位权重 common .70 / rare .25 / epic .05，`furniture.ts:rollFurniture` 消耗两次 rand：先档位后具体件）
- **合成**：同档 10 件 → 上一档 1 件（common→rare→epic）；选料策略「烧最大的堆、尽量给每种留一件」（`pickCraftSacrifice`），入口在房间右键菜单「我的家具」（`renderer/room/inventory-panel.ts`）
- **数值单一来源**：`app/src/shared/furniture.ts` 的「玩法数值」段（`POINTS_PER_KEY`/`POINTS_PER_AGENT_RUN`/`POINTS_PER_BOX`/`IDLE_MS_PER_BOX`/`CRAFT_COST`）。这个文件**故意零依赖**，主进程和 renderer 都能 value import（血泪坑 12 的绕法）；`progress-rules.ts` 再导出一遍供主进程侧单点引入
- **落盘**：`progress.json`（userData，与 `config.json` 并列），`sanitizeProgress` 逐字段容错——坏字段退默认，不整档丢弃
- **IPC 划分**：一次性**结果**（开箱得了啥 / 合成失败原因）走 `invoke` 返回值；幂等**状态**走节流的 `progress:changed` 广播，pet 调试面板 / room 托盘 / 背包面板各自订阅
- **装饰托盘按库存门控**：可拖数量 = `owned − placed`（派生量），摆放/删除零 IPC 往返；未拥有件置灰 `.locked`
- **隐私边界**：键盘监控只累计次数，**哪个键**从不离开 C# 的 for 循环，不联网、不落盘（只有聚合点数进 progress.json）；VK 8~255 扫描天然排除鼠标键
- 调试面板有三个注水按钮（加挂机时间 / 给箱子 / 给家具）
- 纯逻辑单测 `app/test/progress-rules.test.ts`（33 例）

## 表情包导入（GIF → 动作槽位）

- 丢一套 GIF 表情包 → 模型粗标语义 → 映射到动作槽位，**绕开三视图/逐动作生成管线**（秒级、几乎免费，对比生成一个动作 5-8min + API 费）
- **模型输出语义类别不是动作 ID**（idle/sleep/tea/happy/annoyed/celebrate/focus/wave/other 共 9 类），再经 `CATEGORY_TO_SLOT` 映射到槽位。理由：贴纸是任意素材，用户关心「它表达什么」；类别比动作 ID 稳定，动作体系重构后只改映射表
- celebrate/focus/wave 已能被模型标出但 v1 不落槽（进备选库），等 S+ 场景动作落地补映射即自动启用
- 打标走 `doubao-seed-2-0-mini`（Ark `chat/completions`，输入 ¥0.2/M、`detail: 'low'`、`temperature: 0`），一批 50 张约 ¥0.009
- **请求体是交错的文本/图片块**（`VisionPart[]`）：每组帧前插「贴纸 #N」标记，否则模型无法把扁平图片列表对回具体贴纸，错位就整批标错；分块 12 张/次（150 张图挤一次请求对位准确率会掉）
- **两阶段**：`analyze` 只打标不落盘（取消复核 = 什么都没发生）；`apply` 才转码写盘 + 热重载。打标结果由渲染层持有，主进程无状态（复核可能几分钟，存一份就要处理窗口关闭/角色删除/多窗并发）
- 转码 `gifToWebm`：**不抠像**（GIF 自带 alpha，chromakey 会吃掉角色里的绿色）、**不归一化**（贴纸是成品），640×640 方形画布等比缩放居中 + 透明 padding——桌宠窗宽=高且 `video{width:100%}`，横版贴纸直接播会变形
- `manifest.importedActions`（key = 槽位）与 `actions` 分开存：删字段一步回退，原 webm 从未被覆盖；`spareStickers` 是备选库；原始 GIF 永久留在 `imported/_raw/`（同血泪坑 4 思路）
- 播放层合并顺序：标准动作 → 导入贴纸 → 自定义动作（后者覆盖同名）；**状态机零改动**（只认 PlayableId）
- 容错三层：单块请求失败 → 该块降级 other；坏 GIF → 标红不阻断整批；类别非法/条目缺失 → other + confidence 0 强制人工指定
- 核心文件：`pipeline/src/sticker-import.ts`（打标纯逻辑）+ `chroma.ts:gifToWebm` + `app/src/main/sticker-importer.ts`（IO/IPC）+ `sticker-rules.ts`（纯逻辑可单测）+ Studio「表情包导入」tab
- spec：`docs/superpowers/specs/2026-08-21-sticker-pack-import-design.md`

## 公共房间（联机唯一链路）

- **概念是「游戏联机房」**：开房（起名+选类型）→ 上公共列表 → 别人浏览筛选后加入 → 房内文字聊天 + **房友的宠上屏**。不是等距场景，是虚拟社交单元
- 常驻房间（固定 8 位 roomId，关了再开还是同一间）、四类型（摸鱼/自习/夜猫/联机）、4~12 人、可收藏置顶、私密房不上架凭 roomId 进
- **2026-08-24 起是唯一联机链路**：原 1v1 好友配对（`link/` + `relay/`）已退役，私密房顶替好友配对场景。原「替身窗只给 1v1」的限制已推翻——全员上屏
- **宠上屏**：在线房友每人一只 200px 透明置顶窗，屏幕底部居中排开、超一行往上叠（`layoutRoomPets` 纯函数算位置，只 `setPosition` 永不 `setBounds`/resize，血泪坑 4/18）。成员进出整体重排，掉线 30s 宽限再关窗
- **角色包走服务端缓存分发**（`room-pets.ts` 状态机 + `rooms/server.mjs` 的 `packs/` 磁盘 LRU 2GB）：进房后 `pack:have` 探测→未缓存则分块 `pack:put` 上传→`pack:announce` 播报指纹→房友按需 `pack:get` 下载→本地 `.peer-<hash>/` 缓存。不做 P2P 盲转（12 人房发送方要为每个接收方重传 N-1 次）
- 包格式复用 `app/src/main/asset-pack.ts`（sanitize manifest 剥离 persona + 动作 webm，sha256 前 16 位为 hash）；同角色 hash 撞车只传一次
- **聊天最近 50 条**环形缓冲随房落盘，进房 `joined` 帧一次带回；服务端权威限流（3s 冷却、10 条/分钟、连发同内容拒、200 字截断），客户端 `rooms-rules.ts` 有份同规则预挡只为即时反馈
- **隐私边界写成可执行断言**：出帧统一走 `buildPresenceFrame`/`buildChatFrame` 白名单函数，测试塞满曲名/气泡正文/cwd/persona/transcript 断言一个都出不去。聊天输入框是**唯一**文字出口，禁止加「分享 agent 结论到房间」这类便利入口。角色包只含美术资产（persona 打包前剥离）
- **公共房间不发曲名**（对象是陌生人，无分享开关——是有意的边界）
- 生产地址按序尝试 `wss://albertbeta.cn/rooms`（主路，借道既有域名 nginx 反代）→ `ws://14.103.59.73:24252`（兜底，明文）。`isSecureTransport()` 按**实际连上的地址**判断，降级后入房弹窗自动补「当前未加密」
- 举报只记计数 + 消息快照，**不自动删帖封人**（自部署服务无审核能力，误伤代价高于漏判）
- **不给房间专属游戏化奖励**：会立刻制造「挂房刷箱子」最优策略，与社交在场的目标相反。房内在线照常计入现有挂机，合作产出留后续模块（绑互动不绑时长）
- spec：`docs/superpowers/specs/2026-08-21-public-rooms-design.md` + `docs/superpowers/specs/2026-08-24-rooms-pets-on-screen-design.md`；部署：`docs/rooms-deploy.md`

## 举牌功能

- **长柄木牌**：牌子在上、杆在下，跟随角色显示在右侧
- 拖拽时自动隐藏，松手后延时 1.5s 弹出（带 poof-in 特效）
- 纯本地功能（2026-08-24 前曾同步 1v1 对端替身，联机退役后无网络出口）
- 用途：听歌时显示曲目、agent 工作状态、会议提示、用户手动输入
- 核心文件：`app/src/renderer/pet/signboard.ts` + `app/src/main/local-sign.ts`（本地记账）

## 串门功能（呈现机制保留，本机自动触发已下线）

- 两只桌宠并排互访聊天的**呈现层完整保留**：`visit.ts` 编排、状态机 `visit` 态、
  `VISIT_START/END` 事件、`setPetVisitMode` 的窗口加宽、双角色对视的 flip 计算
- **本机自动触发已删除**（原每 10~14 分钟随机挑一只本地角色来访）：那是自娱式随机演出，
  不是联机能力。触发器 `visitTimer`/`scheduleVisit`/`tryTriggerVisit` 全部移除
- 现在没有任何入口能进 visit 态 —— 这套机制是留给**联机串门**（对端桌宠走过来）复用的，
  故意不删。`visit.ts` 的 `getExchangeRound()`/`getTurnLabel()` 原只喂调试面板，现为死代码但无害
- 状态机优先级链未变：`drag > agent > meeting > music > visit > auto/idle`

## 开发者工具（原桌宠内嵌调试面板）

- 桌宠窗内的调试面板已**删除**（`debug-panel.ts` + 106 行 CSS + `body.has-debug-panel`
  挤压 `#stage` 到 65% 高度的布局）。`#stage` 恢复常驻 100% 高度
- 保留的能力搬进控制台：**角色切换/改名/删除**（「我的角色」——删除此前只有面板一个入口，
  IPC 早就有，UI 没了就够不着）、**四个注水按钮**（「开发者工具」）
- **丢弃**：事件日志、桌宠实时状态读出（活在 pet renderer 模块作用域里，
  搬过去要新建 pet↔main↔console 双向 relay，成本最高价值最低）
- **本机自动串门触发器一并删除**（`visitTimer`/`scheduleVisit`/`tryTriggerVisit`）。
  但 `visit.ts`、状态机 `visit` 态、`VISIT_START/END`、`setPetVisitMode` 窗口加宽**都保留**——
  那是可复用的双角色并排呈现机制，联机串门要用（所以 `state-machine.ts` 和测试一行未改）

## 常用命令

```bash
npm install                  # 装依赖；国内下载 electron 二进制必须:
                             #   ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
npm run dev -w app           # 启动桌宠（开发模式）
pkill -f "electron-vite"; pkill -f "QBot/node_modules/electron"   # 关闭（必须连 dev server 一起杀，见血泪坑 12）
npm test -w pipeline         # 管线单测（全 mock，不花钱）
npm run build -w pipeline    # tsc 编译 dist/（app 引用的是 dist，改 pipeline 后必须 build）
npx tsc --noEmit -p app      # app 类型检查

# 存量角色重抠像（不重新生成视频 = 零 API 花费，绿幕 mp4 一直留在 .job/）
npx tsx pipeline/src/cli.ts rekey --job ~/Library/Application\ Support/@qbot/app/characters/<id>
                             # --despill <mix> 调去绿边强度（0 = 关闭回退旧的 alpha 收边）
                             # --erode <px>    仅 --despill 0 时生效（两者互斥，见血泪坑 22）
                             # --action <id>   只重抠单个动作

npm run dist -w app          # 打包当前平台（mac→dmg / win→nsis+zip；mac 从未验证成功过）
                             # Windows 包必须在 Windows 上构建（ffmpeg-static 装机时按平台下载）
                             # → 完整流程/镜像/验证清单见 docs/windows-build-and-release.md
                             # → GitHub Actions build-windows.yml（手动触发或打 v* tag）

# 本地起房间服务（公共房间联调；客户端用 QBOT_ROOMS_URL 指过来）
node rooms/server.mjs                                  # 默认 0.0.0.0:24252，DATA_DIR 可覆盖
node rooms/smoke.mjs                                   # 服务端全流程自测 37 项
ROOMS_URL=wss://albertbeta.cn/rooms node rooms/smoke.mjs   # 打线上

# 多开第二只桌宠（数据目录隔离，单实例锁按目录生效）
QBOT_USER_DATA="$HOME/Library/Application Support/@qbot/app-2" npm run dev -w app

# 离线生成房间背景/装饰贴纸（gpt-image-2，花钱，key 在 config.local.json）
npx tsx scripts/gen-room.mts room --ref assets/rooms/ref.png --n 3   # 房间候选
npx tsx scripts/gen-room.mts decor                                    # 贴纸包
npx tsx scripts/gen-room.mts rekey --out assets/rooms/decor --trim    # 从 raw 重抠（免费）
```

运行时数据：`~/Library/Application Support/@qbot/app/`（`characters/*/` 角色包、`config.json` 设置、`progress.json` 游戏化积累）。

## API（2026-07-12 现状）

- **端点**：`https://ark.cn-beijing.volces.com/api/plan/v3`（火山方舟 plan 端点，key 在 config.local.json）
- **生图**：`doubao-seedream-5.0-lite`（尺寸白名单：三视图 3072x1536、首帧 2048x2048；1440x1440 会 400）
- **打标**：`doubao-seed-2-0-mini`（视觉理解，走 `chat/completions`；表情包导入用，输入 ¥0.2/M）
- **视频**：`doubao-seedance-1.5-pro`——**duration 最短 5**（3 会 400）；参数走 prompt 尾缀 `--resolution 480p --duration 5 --camerafixed true`；首帧同时作 first_frame+last_frame（循环的关键）；输出 640×640 24fps h264
- **可选生图后端 gpt-image-2**（aiartmirror，OpenAI images 兼容，`pipeline/src/gpt-image.ts`）：单张 5-10 分钟；服务端同账号疑似串行 → 客户端限并发 2、超时 900s；有参考图走 multipart `/images/edits`；4xx 与 503 `model_not_found` 永不重试
- 返回的图片/视频 URL **24 小时过期**，管线一律立即下载落盘
- 孵化选项（生图后端、角色形态 humanoid/abstract）写进 `.job/state.json`，resume/redo 自动沿用

## 血泪坑（改代码前必读）

1. **WebM alpha 双参数**：`-auto-alt-ref 0` + `-metadata:s:v:0 alpha_mode=1` 缺一即黑底；解码验证需 `-vcodec libvpx-vp9`
2. **GIF 铁律**：`dither=none`；循环靠生成层（首尾帧相同），不靠 ffmpeg；不做**全帧** despill（见坑 22）
3. **抠像默认 colorkey 0.15:0.04**（`chroma.ts`）——DESIGN.md 里的 0.24 会把偏绿的角色身体抠出镂空
4. **尺寸归一化**：抠像后按 alpha bbox 缩放到统一高度、底边对齐（`computeAlphaBBox`/`normalizeFilter`）；原始绿幕 mp4 永久留在 `.job/`，改抠像参数零成本重抠（参考 `pipeline/test/tmp/rekey-normalize.mts`）
5. **`qbot-asset://` 协议**：`registerSchemesAsPrivileged` 必须在 app.ready 前且带 `stream: true`，否则 `<video>` 静默不播
6. **拖拽取路径**：Electron ≥32 没有 `File.path`，必须 preload 里 `webUtils.getPathForFile`
7. **拖拽移动用 screenX/Y**（clientX 会正反馈抖动）
8. **videoTaskId 提交成功立刻落盘**——防重启后重复提交扣钱；resume 会校验产物存在性并回退状态
9. **ffmpeg-static 打包**：asar 里不可执行 → asarUnpack + 路径 `replace('app.asar','app.asar.unpacked')`（pipeline-bridge 已处理）
10. **abstract 形态的 prompt 铁律**：绝不出现部位词（双臂/坐姿/耳尾…），模型会顺着描述凭空长出部位；有测试守着
11. **electron-builder** 需要 `electronVersion` 钉死精确版本（monorepo 提升导致 range 推断失败）
12. **renderer 只能 `import type` pipeline**：value import（哪怕只为拿一个 `ACTION_IDS` 常量）会把 `@qbot/pipeline` 整个 index 拖进浏览器包，`node:events`/`node:fs` externalize 后构建直接失败（`"EventEmitter" is not exported by "__vite-browser-external"`）。需要常量就在 renderer 侧本地重声明
13. **Windows 上从 Node 调 PowerShell 必须 `spawn` + 显式 args**：`exec(script, { shell: 'powershell.exe' })` 会让 Node 塞 cmd.exe 的 `/d /s /c` 开关给 powershell.exe，脚本**静默不执行**（stdout 空、看着像功能没生效）。正确写法 `spawn('powershell.exe', ['-NoProfile','-NonInteractive','-Command', script])`；脚本内输出中文要先设 `[Console]::OutputEncoding = [Text.Encoding]::UTF8`，否则拿到乱码
14. **WinRT 异步 API（SMTC 等）在 PowerShell 5.1 里要用 `AsTask` 包装**：直接摸 `$op.IsCompleted`/`GetResults()` 不可靠；程序集名是 `Windows.Media.Control` 而非 `Windows`（`music-monitor.ts` 有可用范例）
15. **只 `pkill` electron 杀不干净**：electron-vite 的 dev server（node 进程）还活着，会立刻用**旧 bundle** 重启一个 electron。此时再 `npm run dev` 会因 5173 被占而另起 dev server，新 electron 被单实例锁挡掉直接退出（后台任务显示 exit 0，极易忽略）→ 你以为在测新代码，其实一直在打旧进程。关闭必须 `pkill -f "electron-vite"` 一起来，改完代码验证前先确认 `ps -o lstart` 的进程启动时间晚于改动时间
16. **agent 活动态必须有 TTL**（`agent-merge.ts` 的 `ACTIVITY_TTL_MS`）：会话表只靠 `SessionEnd` 和 10min `STALE_MS` 清理，任何异常退出的会话会按优先级把合成状态钉死；又因 agent 态是**粘性循环**（播完重播），表现为桌宠无限循环同一动作。同理 agent 活动**不许映射到 `drag`**——和「被指针按住」撞同一个动画，看着像卡死（两条都有测试守着）
17. **headless（`claude -p`）下 `SessionEnd` 紧跟 `Stop` 到达**（几十毫秒）。任何「在飞的异步工作」用会话代际表做失效判断时，**条目不存在不能当成被取代**（`isSuperseded`），否则 SessionEnd 一清表就把刚结束那轮的气泡杀了。交互式会话 SessionEnd 很晚才来，掩盖这个 bug
18. **透明窗只 `setPosition` 不 `setBounds`**：气泡窗固定尺寸就是为此（坑 4 的 resize 渲染 bug）。隐藏气泡窗前必须先发 `bubble:clear`——Chromium 对隐藏窗做定时器节流，留着 pending 的淡出定时器会在回到桌面时一次性冒出一堆过期气泡
19. **Claude Code 的 hook 在 Windows 上跑在 bash 里，不是 cmd**（实测 `$0` = `/usr/bin/bash`，Git for Windows 提供）。所以 hook 命令串**必须保持 POSIX**：写成 `.cmd`/`%VAR%`/反斜杠路径反而会 `command not found`（bash 把 `D:\dev\...` 的反斜杠当转义符吃掉，报 `D:devqbot...`）。查这类问题用 `claude -p ... --debug hooks`，hook 失败信息只在那里出现，正常输出里完全静默
20. **`GetAsyncKeyState` 首次轮询必然脏**：它的返回值里带「自上次调用以来是否被按过」位，进程启动后第一次扫 256 个 vk，会把 QBot 启动**之前**用户敲的键一次性算进来（实测能白送几十点）。所以 `input-monitor.ts` 有个 `seeded` 标志：第一轮只用来建立基线、一律返回 0。同理任何「按下沿」计数都必须先播种再计数，不能一上来就 diff
21. **等距房间的可走区必须比地板小一圈**：`RoomSpec.floor` 是脚底锚点的多边形，但角色有高度（`petHeight` 185px），脚底贴到地板真实边界时上半身早就压进墙里，表现为「走到墙边还在走」（碰墙不停）。靠墙的边要沿法向内收 ≈45px；2:1 等距下「沿边内收 d」换算成顶点位移不是简单加减 d，得把两条相邻边各自偏移后求交点。开口方向（前面两条边）不要收，收了白丢可走面积。改这个数据前先确认：`scaleForY` 取的是 floor 的 y 极值（跟着变、自洽），`depthZ` 取 `spec.height`（不受影响），`sanitizePlacements` 不做多边形包含判定（已存盘的家具摆放不会被判无效）
22. **去绿边只能用 rim-only despill，且和 alpha 腐蚀互斥**（`chroma.ts:rimDespillFilter`，2026-08-21 实测）：
    - **绿边像素 alpha=255（不透明）**，所以「只修半透明 rim」的直觉方案抓不到它；环带必须用 `dilate(alpha) − erode(alpha)` 向外扩才能覆盖
    - **alpha 腐蚀从不改颜色**，只把绿边挪成半透明（实测 `bdffb5` G+70 在 erode1 后颜色原样、alpha ff→7a）；erode2 才抠掉但同时啃角色本体 → 旧方案「没绿边」和「抠得完整」不可兼得
    - **全帧 despill 的真正危险不是白色而是绿色系角色**：实测纯白 G+0 不变（旧注释说的「白发染粉紫」未复现），但薄荷绿身体 G+86→G-1、橄榄绿衣服 G+73→G-1（= 坑 3 的小青）。所以必须空间门控
    - **三处像素格式必须显式钉死**：`alphaextract` 前要 `format=yuva444p`（否则整图协商失败报 `could not choose their formats`）；mask 要 `format=gbrp,format=rgba` 复制到 RGB 三通道（gray mask 会被转 yuv、chroma 补 128，`maskedmerge` 退化成 50% 混合，despill 只生效一半）；base/overlay 同走 rgba
    - **despill 开着就不许再 erode**：两段独立 split/alphaextract 子图叠加会触发格式重协商，实测把角色内部也改坏（薄荷绿 G+86→G+42）。`keyActionVideo` 已强制互斥
    - 效果：同素材绿偏像素 6048(1.13%)→**0**、不透明像素 +2 万（角色更完整）。对照组测试在 `pipeline/test/despill.test.ts`，**别把这两条「优化」回去**

22. **多页合一个窗时，三样东西必炸**：(a) 裸标签选择器 —— 原 hatch/studio/market 各自定义
    裸 `button`，`button.danger` 一个红底白字一个白底红字，合并后按加载顺序互相覆盖，
    所以控制台改用 `.btn` 语义类 + `[data-pane]` 作用域；(b) `location.reload()` ——
    单窗下它清空**所有** pane 的未保存输入，而 studio 有 7 处，其中两处由后台生成事件触发，
    会在用户正在别的 pane 打字时炸掉输入；(c) `alert`/`confirm` —— 模态阻塞整个 renderer，
    单窗下所有 pane 一起冻住，后台事件触发的那个还会凭空弹出。全部换成 pane 内非阻塞 UI。
    附带两个隐性依赖：`ASSET_NONCE` 这类「靠 reload 才更新」的模块级常量必须改可变，
    挂在重渲染路径上、从不退订的订阅（靠 reload 销毁上下文兜底）必须显式退订
23. **懒挂载的 pane 会错过它挂载前的事件**：孵化 pane 首次打开前，管线可能已经发过
    `awaiting_pick` —— 事件发给空气，候选图不出现，管线永久挂在 `pickResolver` 上等人挑。
    所以 pane 每次变可见都要主动拉一次快照（`getHatchStatus` 能从 `.job/state.json` 重建，
    含候选图 URL），不能只依赖事件流。同理 `studio:regenerateTurnaround` 必须显式切到孵化 pane
    并把窗口提前（这也修掉了原先「孵化窗没开就静默挂死」的既存 bug）
24. **macOS 的 `tar` 会把 `._*` AppleDouble 文件打进包**：scp 部署服务端时那些文件会跟着上服务器（`npm install` 不受影响但目录很脏，`._package.json` 之类还可能被误读）。打包一律 `COPYFILE_DISABLE=1 tar czf ...`，或落地后 `rm -f ._*`
25. **云安全组和 ufw 是两道**：VPS 上 `ufw allow <port>` 只是第一道，火山引擎控制台的安全组入方向没放行的话表现为**连接超时**（不是拒绝，容易误判成服务没起）。relay 当初栽过，公共房间的 IP 兜底路又栽了一次
26. **Node 内置全局 WebSocket（undici 的 WHATWG 实现）没有 `.ping()` 方法、也不派发 `pong` 事件**：协议层 ping/pong 在内部自动处理（服务端 `ws.ping()` 它会自动回 pong，所以**服务端**的活性检测没问题），但对 JS 完全不可见。`rooms.ts` 曾靠「发 ping 等 pong 回调续命」做客户端心跳，结果 lastPongTime 永远停在连接建立那一刻，进房 30s 后必误判超时把自己掐了（828bf2a/71fe362 两个 fix 都在修一个不存在的 API，直到 2026-08-30 实测复现才定位）。正确做法是**应用层心跳**：发 `{t:'ping'}` JSON 帧（`rooms/server.mjs` 回 `{t:'pong'}`，旧服务端回 bad_frame 错误帧也算入帧）、把「收到任何入帧」一律当续命。附带一个躺了很久的死代码：被动断线的重连条件拿 `status.phase !== 'off'` 判断，而它前面一行 setStatus 刚把 phase 设成 'off'，条件永假——断线后从不会自动重连；现在重连成功还会自动回房

## 已知未解决

- 出生证明画廊 `<video>` 全空白（文件本身验证正常，桌宠窗口同 URL 能播；重复渲染已修）。
  搬进控制台孵化 pane 后渲染上下文变了，**未复验**是否仍存在
- 控制台的孵化 pane 只验到「续跑入口出现 + 五屏骨架正常」，**完整孵化一只新角色未实机跑**
  （要真实 API，生图分/张 + 视频约 ¥1/条）；`saveCard` 截图在滚动容器里的取景也未验
- Windows 打包已跑通并实测联动（见 `docs/windows-build-and-release.md`）；**mac 打包仍未验证成功**
- 包未做代码签名 → Windows 首次运行撞 SmartScreen「未知发布者」
- `DEFAULTS.concurrency` 定义了但没接限流（S 档就 6 个动作，恰好全开）

## 约定

- pipeline 模块禁止 import Electron API
- prompt 模板文字实测有效，不要随意改写措辞（`prompts.ts`）
- 改动作/管线参数后跑 `npm test -w pipeline`（80 测试，全 mock 不花钱）；抠像参数另有 `test/despill.test.ts` 的对照组守着（血泪坑 22）
- 真实 API 烟测要花钱（生图分/张、视频约 ¥1/条），先问用户

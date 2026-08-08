# 飞书会议监听 — 技术方案（草案）

> 目标：桌宠感知「我现在是否在飞书开会」，会中切换专属动作 + 举牌显示会议信息；
> 复用 agent 联动 / 音乐联动的既有状态机与 IPC 模式。
> 调研日期 2026-08-08，实测环境：macOS + Lark.app（Feishu 主进程，框架版本 131.0.6778.268）。

## 1. 信号定义

「在开会」= 本机飞书客户端加入了一个 RTC 房间（视频会议 / 1v1 语音通话 / 电话面试同源，
均视为会中——语义上都是"正在通话，别打扰"）。摄像头/麦克风开关不影响判定。

## 2. 路线调研结论

### 2.1 OpenAPI 路线 —— 无法作为主信号（已逐条查证）

| 候选 | 结论 | 原因 |
|---|---|---|
| 事件 `vc.meeting.join_meeting_v1` / `leave_meeting_v1` | ❌ | 官方文档明示**仅对通过 OpenAPI 预约的会议**触发；日常的日程会议/即时会议全部不触发 |
| 事件 `vc.meeting.all_meeting_started_v1` / `all_meeting_ended_v1` | ❌ | 覆盖企业全部会议，但（a）只有会议开始/结束，没有"某用户加入"；（b）租户级敏感权限，企业自建应用需管理员审批，个人桌宠产品拿不到 |
| 「获取活跃会议」`GET /vc/v1/reserves/:id/get_active_meeting` | ❌ | 只查**自己通过 API 预约**的会议 |
| 「查询会议明细/参会人明细」（meeting-room-data 导出接口） | ❌ | 管理后台数据接口，需管理员权限且数据有延迟，非实时 |
| 个人状态（personal_settings system_status） | ❌ | 只能管理租户自定义状态；飞书内建的"在会议中" presence **没有查询 API** |
| lark-cli `vc +search` / `+notes` | ❌ | 只覆盖**已结束**会议的记录/纪要 |
| 日历忙闲 `POST /calendar/v4/freebusy/list` | ⚠️ 仅辅助 | 反映"日程上应该在开会"，不等于真的入会；但可拿到**会议主题**用于举牌文案 |

结论：飞书开放平台没有任何「查询/订阅某用户当前是否在会中」的能力，OpenAPI 只能做增强，不能做检测。

### 2.2 本地日志路线 —— 主方案（本机实测通过）

飞书 mac 客户端的会议模块（byteview / 字节 RTC）在
`~/Library/Application Support/LarkShell/sdk_storage/log/native-pc-sdk/byteview-PCSDK-FALCON_<YYYY-MM-DD>.log`
写**明文按天日志**，入会/离会有明确单行标记（2026-08-07 实测，两场会完整对上）：

```
# 入会（11:01:35 / 14:01:00 各一场）
join-work-flow: onRoomStateChanged: onJoinChannelSuccess room_id: 7671119202266713047, uid: ...
# 离会（12:03:42 / 15:15:14）
join-work-flow:leaveRoom
```

旁证：该日志两场会之间（13 点整段）**零写入**，会中每小时 ~3 万行——日志活跃度本身也是次级信号。
无需任何系统权限（读自己 HOME 下的文件）、无需网络、无需管理员，延迟 = 轮询间隔（秒级）。

## 3. 总体架构

完全对齐 `music-monitor.ts` 先例：主进程常驻监控 → IPC 广播 → pet 状态机新增态 + 举牌。

```
meeting-monitor.ts (main)                    pet renderer
┌─────────────────────────────┐   meeting:status   ┌──────────────────────────┐
│ 2s 轮询 FALCON 日志增量字节  │ ────────────────▶ │ state-machine: meeting 态 │
│ 扫描 join/leave 标记         │  {inMeeting,      │ 优先级 drag > agent >     │
│ 失效保护(进程/超时/跨天)      │   topic?, since}  │   meeting > music > visit │
│ (可选) 主题增强              │                    │ 举牌: 开会中: <主题>       │
└─────────────────────────────┘                    └──────────────────────────┘
```

## 4. 详细设计

### 4.1 新文件 `app/src/main/meeting-monitor.ts`（~150 行）

- **文件定位**：`sdk_storage/log/native-pc-sdk/byteview-PCSDK-FALCON_<今天>.log`，
  目录不存在（未装飞书）→ 静默禁用。日期用本地时区，每次 tick 重算文件名（跨天自动切换）。
- **增量 tail**：记录上次读到的 offset，`fs.stat` 发现增长才 `createReadStream({start})` 读新增字节；
  文件变小（轮转/清理）→ offset 归零。会中日志量 ~10行/秒，2s 轮询增量极小。
- **标记扫描**（半行残留同 music-monitor 的 buf 处理）：
  - 入会：包含 `onRoomStateChanged: onJoinChannelSuccess room_id:` → 提取 room_id
  - 离会：包含 `join-work-flow:leaveRoom`（备用：`ByteRtcEngineController::leaveRoom()`）
- **启动播种**：monitor 启动时可能已在会中——读当天文件**最后 256KB**，找最后一个 join/leave 标记定初态。
- **失效保护**（血泪坑 13 同款思路，缺一不可）：
  1. 飞书进程消失（`pgrep -x Feishu` 每 30s 一次）→ 强制 not-in-meeting（崩溃不写 leaveRoom）
  2. 会中状态 **硬 TTL 4h**：超时且日志 mtime 已停滞 > 5min → 强制归零（防标记漏检把桌宠钉死在会中态）
  3. 任何 IO 异常 → 静默保持上一状态，连续失败 10 次降级禁用并 console.error 一次
- **广播**：状态变化才发 `getPetWindow()?.webContents.send('meeting:status', st)`，
  暴露 `getMeetingStatus()` 供 renderer 启动时拉取（同 music 模式）。

### 4.2 纯逻辑拆分 `app/src/main/meeting-log-parser.ts`（可单测）

`scanChunk(text) → {kind:'join',roomId}|{kind:'leave'}|null 序列` + `seedFromTail(text)`。
仿 `agent-message.ts` 的拆分方式，测试不依赖 Electron。

### 4.3 状态机（`pet/state-machine.ts`）

- 新态 `{ kind: 'meeting'; action: PlayableId }`，**粘性循环**（同 agent/music）
- 新事件 `{ type: 'MEETING_STATUS'; inMeeting: boolean }`
- 优先级：`drag > agent > meeting > music > visit > auto/idle`
  （理由：会中比听歌更值得表达；Claude 干活动画仍最高——与"音乐不打断 agent"同一条产品逻辑，
  且 agent 事件有 TTL 兜底不会钉死）
- `ctx` 增加 `meetingAction?: PlayableId`，缺省 `DEFAULT_MEETING_ACTION = 'tea'`（喝茶旁听既视感，Studio 可改）

### 4.4 举牌 / IPC / Studio

- `shared/ipc-types.ts`：`MeetingStatus { inMeeting: boolean; topic?: string; since?: number }`；
  `LinkMode` 增 `'meeting'`；preload 增 `qbot.meeting.{onStatus,getStatus}`
- `local-main.ts` 举牌文案优先级：手动 > 一次性 > agent > **meeting** > music，
  文案 `开会中: <topic>`，无主题则 `开会中…`
- manifest `agentActions` 增 `meetingAction`；Studio 联动配置表加一行「开会 (meeting)」——
  与现有 music 行同构，改动是复制粘贴级

### 4.5 会议主题增强（M2，可选开关，默认关）

主题不在 RTC 日志里，两条增强渠道按可用性降级：

1. **lark-cli（本机已装则用）**：入会瞬间查日历当前时段事件拿 summary
   （`lark-cli calendar ...` 或 freebusy）。子进程调用、3s 超时、失败静默。
   开发者人群基本都装了 lark-cli 且已认证，零额外配置。
2. **AppleScript 窗口标题**：会议窗标题≈会议主题，但需要「辅助功能」权限 → 只作实验项。

拿不到主题不影响会中检测本身。

## 5. Windows 路线（M2）

- 待验证假设：同款日志在 `%APPDATA%\LarkShell\sdk_storage\log\native-pc-sdk\`（客户端同源，大概率成立），
  monitor 只需换路径前缀。
- 独立备用信号：注册表 `HKCU\...\CapabilityAccessManager\ConsentStore\microphone\NonPackaged` 下
  Feishu 条目 `LastUsedTimeStop == 0` ⇒ 麦克风占用中（可复用 music-monitor 的常驻 PowerShell 模式）。
  缺点：静音旁听不占麦时漏检，故只作日志路线的兜底。

## 6. 风险与边界

| 风险 | 应对 |
|---|---|
| 日志格式是飞书私有实现，升级可能变 | 标记选的是 RTC 引擎入口函数名（跨版本稳定度高）；双标记互备；失效保护兜底；解析器有单测，坏了能快速定位改标记 |
| 多账号：`sdk_storage/<hash>/` 有多套 byteview.db | 日志目录是全局单份（`log/native-pc-sdk/`），不受多账号影响（已确认） |
| 1v1 语音通话也会命中 | 按信号定义视为"会中"，产品上合理 |
| 隐私 | 日志含内部 uid，仅本机读取解析，IPC 只广播 boolean + 主题；联机（link）**不外发**会议状态 |
| 桌宠钉死在会中态 | 见 4.1 失效保护三连；且 meeting 态优先级低于 agent，不会挡 agent 联动 |

## 7. 落地分期

- **M1（本方案主体，mac）**：meeting-monitor + parser + 状态机 meeting 态 + 举牌"开会中…" + Studio 配置行 + 单测
  （新增 ~350 行，零 npm 依赖，零权限）
- **M2**：lark-cli 主题增强；Windows 日志路径验证 + 麦克风注册表兜底
- **验收**：真开一场会 → 入会 ≤3s 切会中动作并举牌；挂断 ≤3s 恢复；会中强杀飞书 ≤30s 恢复；
  会中重启 QBot 能播种出会中态；Claude 干活时入会不打断 agent 动画

## 8. 测试计划

- `meeting-log-parser` 单测：真实日志行样本（join/leave/半行拼接/噪声行/播种 tail 三种末态）
- 状态机单测：MEETING_STATUS 进出、与 agent/music/drag 的优先级矩阵、粘性循环重播
- 手动烟测：见 M1 验收清单

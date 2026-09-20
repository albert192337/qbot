# Steam 开发与验证

2026-09-20。银行、税务入驻尚未完成时，开发继续使用 Valve 官方 SpaceWar 示例 AppID **480**。这已经是真实 Steam 客户端 SDK 接入，不是伪造 Steam 好友；房间仍使用现有 QBot WebSocket 服务。

## 启动

先启动并登录**桌面 Steam 客户端**，关闭其他 QBot 开发实例，然后在仓库根目录运行：

```sh
npm ci
npm run dev:steam
```

右键桌宠 →「一起玩」→ Steam 好友。这里的账号是桌面客户端当前账号，可能与浏览器登录的 Steamworks 合作伙伴账号不同。打开真实房间后可点击好友旁的「邀请」；本地试演不能发送 Steam 邀请。

普通 `npm run dev` 默认不启用 Steam。没有 Steam、客户端离线或 SDK 失败时，其余功能仍可使用；启动 Steam 后点「重新连接」。AppID 480 必须显式启用测试标志，且发行包拒绝使用 480。运行中 Steam 会显示 SpaceWar 测试活动，不会显示 QBot 正式产品名。

## 当前接入

- 独立 Electron utility process 初始化/关闭 Valve SDK；主进程通过受限消息桥访问。按字符串保留完整 SteamID；读取昵称、在线状态、好友与头像。
- `InviteUserToGame` 发送当前房间加入信息；进入/退出/断线同步 `connect` rich presence。
- 接收 `GameRichPresenceJoinRequested_t`、SDK launch command、初次启动参数和 `second-instance` 参数。收到后展示加入提示，由用户确认并通过现有房间同意流程；切换房间额外确认。
- 邀请只含版本、AppID、房间服务标识和房间码；不接受任意服务器地址、文件路径或命令。两分钟过期、回调去重、每好友十秒发送冷却；注销/切换账号清除旧邀请。
- Steam IPC 仅允许本应用社交页面的主 frame；renderer 不加载原生 SDK。远端昵称按纯文本显示，头像为本地 PNG data URL。实机遇到 Steam 原生管道断开时的 fatal assert，因此 SDK 与桌宠主进程隔离；子进程退出/超时会清空身份并提示重连，不退出桌宠。

这是 **Steam 好友与现有房间的桥接**，不是把房间传输迁移到 Steam Lobby/P2P。SteamID 也没有写入或替代旧房间凭据，服务端没有宣称完成 Steam 身份认证。

## SDK 来源

依赖固定为 `steamworks.js@0.4.0` 和 `koffi@3.1.5`。当前仅使用前者随包分发的 Valve 原生 redistributable，通过 Koffi 调用窄范围 flat C API；**没有初始化 steamworks.js 的 JS 包装器**，避免两套回调循环争用。

已在登录的合作伙伴浏览器中确认可访问 [官方 SDK 下载列表](https://partner.steamgames.com/downloads/list)。本次浏览器下载完整 1.65 ZIP 超时，未将登录页当作 SDK；完整 SDK 压缩包不是已经下载成功的交付物。已有 npm 原生库足以运行本次功能。

下载完整 SDK 后可显式指定其 `sdk` 目录：

```sh
QBOT_STEAM_SDK=/absolute/path/steamworks/sdk npm run dev:steam
```

原生库路径：macOS `redistributable_bin/osx/libsteam_api.dylib`、Windows x64 `win64/steam_api64.dll`、Linux x64 `linux64/libsteam_api.so`。Linux arm64 需要自行提供包含 `linuxarm64/libsteam_api.so` 的 SDK。库和 Koffi 在打包时解包到 `app.asar.unpacked`。只在本机 macOS arm64 做了实际运行验证；Windows/Linux 尚需对应机器验证。

## 可重复验证

```sh
# 纯逻辑、生命周期与不可信邀请边界
npm test -w app -- test/steam.test.ts test/social-client.test.ts
# 仓库规定检查
npm run check
npm run build -w app
# 真实 Steam 只读探测，输出匿名计数与状态，不发送邀请
npm run test:steam
# 原生进程故障隔离（允许 Steam 不在线，强制结束测试子进程并重建）
node scripts/steam-smoke.cjs --isolation-only
# 隔离存档、回环房间服务、模拟好友与邀请回调
node scripts/preview-steam.cjs
# 640px 窄窗检查
QBOT_QA_WIDTH=640 node scripts/preview-steam.cjs
# 相同隔离 UI，连接真实 Steam；只查看，不向真实好友点邀请
node scripts/preview-steam.cjs --live
```

UI fixture 需要先完成 App 构建；关闭所有 fixture 窗口或 Ctrl-C 后清理临时存档与回环服务器。真实 SDK smoke 已初始化 AppID 480，读到在线状态和 **4 位好友**，运行回调并成功关闭。隔离 UI 验证了创建房间、模拟邀请、收到提示、确认加入和离房后禁用邀请；未给任何真实好友发送测试消息。

2026-09-20 验证：管线 135、App 803、generation 2 项测试通过（另有 7 项原有跳过），类型检查与 App 构建通过。故障隔离 smoke 验证子进程被强制结束后主进程仍存活，重建后的子进程能正常响应；当时 Steam 客户端已退出，返回离线状态，因此不将其描述为重新登录成功。640px 窄窗检查了单列卡片与离线提示。双账号真实邀请投递和各平台发布包运行仍待验证。

## 后续联调与正式 AppID

1. **双账号/双机邀请**：两端都运行同版本 QBot、登录彼此为好友的 Steam 账号，并配置完全相同且双方可达的 `QBOT_ROOMS_URL`。发送者开房并邀请，接收者确认；验证昵称/成员、聊天和桌宠同步、满房失败、退出和重连。不要用各自独立的 `127.0.0.1` fixture 做双机测试。
2. **冷启动分发**：当前已实现加入参数处理，但 Steam 的 AppID 480 默认启动的是官方 SpaceWar。不能声称关闭 QBot 后 Steam 会自动启动本地 QBot。正式端到端冷启动需自己的 AppID、安装包和正确的 Steam launch options；当前双机优先让两端 QBot 都已运行。
3. **正式身份认证**：取得自有 AppID 和服务端凭据后接 `GetAuthTicketForWebApi` / 服务端 `AuthenticateUserTicket`，再把现有游客身份与账号绑定。凭据只放服务器，不能随客户端打包。
4. **尚未接入**：Steam 文本过滤、Lobby/P2P/SDR、云存档、成就、创意工坊与正式商店分发。好友邀请完成不代表这些功能已经实现。

取得正式 AppID 后可用 `QBOT_STEAM_APP_ID=真实数字 npm run dev:steam` 验证，不设置示例测试标志；发行环境的 AppID 注入和 Steam 安装配置另行准备。银行/税务完成是后续合作伙伴与发布流程，现阶段不需要为写代码或运行本地 480 测试等待。

参考：[Steamworks SDK](https://partner.steamgames.com/doc/sdk)、[官方示例](https://partner.steamgames.com/doc/sdk/api/example)、[好友 API](https://partner.steamgames.com/doc/api/ISteamFriends)、[身份认证](https://partner.steamgames.com/doc/features/auth)。

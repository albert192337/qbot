# 社交系统与 Steam 接入调研

日期：2026-09-20。状态：事实核查与待确认提案，不是已批准的开发规格。尚未修改业务代码、部署服务或向真实玩家发送消息。

## 后续用户定案：明确以 Steam 体系为基础

用户确认目前没有 QBot AppID，但明确要求采用 Steam 体系。接下来按 Steam 身份、Steam 好友和 Steam 邀请设计；原文“先做独立游戏内账号与好友、Steam 后接”的建议不再作为实施路线。QBot 后端按经过验证的 Steam 身份保存家园、权限、留言与合作结果，玩家无需另注册一套账号。Steam Lobby 与现有房间传输如何衔接仍需模块规格确认，不能把本次方向选择解释成已批准全部底层迁移。

当前任务是补齐 Steamworks 入驻、AppID、开发许可、SDK、服务端票据验证和内测分发条件。用户自行完成真实身份、协议、付款、银行和税务信息；项目内的接入与构建工作由开发流程完成。

补充官方核查：Steam Direct 每个产品 100 美元或等值金额；个人可入驻，主体与收款账户名称须匹配。税务信息验证通常为 2–7 个工作日，可能要求补件。首次发行开发者在创建 AppID 三周后才可申请 Steam keys；正式发售另受付款后 30 天和 Coming Soon 至少两周等要求约束。这些不是同一个等待期，不应合并为“拿到 AppID 后必须等到发售才能开发”。

来源：[入驻](https://partner.steamgames.com/doc/gettingstarted/onboarding)、[应用费用](https://partner.steamgames.com/doc/gettingstarted/appfee)、[测试密钥](https://partner.steamgames.com/doc/features/keys)、[开发与测试](https://partner.steamgames.com/doc/store/testing)、[发布者 Web API key](https://partner.steamgames.com/doc/webapi_overview/auth)。

## 依据与现状

- 产品方向以 `superpowers/specs/2026-09-18-qbot-product-master-spec.md` 为当前总纲；社交细节参考 `social-garden-discussion-2026-09-16.md`。两者都区分方向、待确认规则与已实现能力。
- `CLAUDE.md` 与代码显示：现有 rooms 是唯一联机链路，已有常驻公共/私密房间、成员、聊天、角色包分发、同屏桌宠、单向打招呼及房主管理。
- `rooms/server.mjs` 的 hello 接受客户端提交的合法格式 memberId，没有验证该身份的秘密凭据。这个编号可以识别显示对象，但不能直接作为好友权限、私人消息和资产所有权的认证依据。
- `app/src/main/rooms/rooms.ts` 负责现有连接、重连和回房；新社交功能应复用连接与展示能力。服务端仍需遵守独立 workspace、不能导入仓库其他模块的约定。
- `app/src/shared/pair-interaction.ts` 和本地双人编排已经验证动作选择、朝向、分段和结束恢复；真实玩家的邀请、回应、占用与取消协议尚未接入。
- 持久个人家园、游戏内好友、离线消息、跨用户互助与资产交易尚未实现。现有本地花园和旅行卡不能当成联网资产与公开动态。
- 总纲已经调整旧稿的优先级：真实多人前置，共同挂机成长也在总范围；旧文档中“不做房间收益”的历史规则不能直接取代新模块设计。具体收益仍需单独确认和预算。

## 本机核查

Steam 安装路径为 `D:/Steam`；Steam 进程运行中，当前用户的 Steam ActiveProcess 注册表存在非零活动用户。此结果与用户所述已登录一致，但不能证明 QBot 拥有可用的 Steamworks 应用身份或开发者权限。

仓库文件和依赖检索未发现 Steamworks 接入库、Steam API 初始化或 AppID 配置。尚未初始化 SDK、查询真实好友或验证登录票据。

## Steam 官方能力

| 需求 | 官方接口 | 对本项目的含义 |
| --- | --- | --- |
| 识别当前玩家 | `ISteamUser::GetAuthTicketForWebApi` → 服务端 `ISteamUserAuth/AuthenticateUserTicket` | 等待票据回调，再发至安全服务端验证；使用验证返回的 SteamID 关联 QBot 账号，不接受客户端自报 SteamID 作为认证 |
| 好友枚举 | `ISteamFriends::GetFriendCount`、`GetFriendByIndex` | 在 Steamworks 初始化成功后读取当前用户可见的关系 |
| 昵称、头像、状态 | `GetFriendPersonaName`、头像 API、`GetFriendPersonaState` | 用于好友入口；QBot 的隐身和拜访权限仍需独立处理 |
| 正在玩什么 | `GetFriendGamePlayed` | 说明当前游戏，不能直接证明曾经玩过 QBot |
| 邀请加入 | `InviteUserToGame`、`GameRichPresenceJoinRequested_t` | 邀请字符串可承载受验证的加入信息；游戏未启动时通过启动参数进入，已启动时处理回调 |
| Steam 大厅 | `ISteamMatchmaking` | 提供大厅发现与成员能力；不等于 QBot 的持久家园、离线留言和资产事务 |
| 网页登录 | Steam OpenID 2.0 | 可验证 Steam 身份；不因此自动获得客户端好友枚举和游戏邀请能力 |
| Web 好友列表 | `ISteamUser/GetFriendList` | 需要 Web API key，好友列表为私密时返回 401，不能作为私密关系的绕过方案 |

初始化需要 Steam 客户端运行、可识别的 AppID、匹配的操作系统用户上下文，以及当前 Steam 账号对该 AppID 的许可等条件。开发时可使用 `steam_appid.txt` 指定应用，发行包不应携带该文件。官方 SpaceWar 示例可用于 SDK 学习与隔离技术验证，不能把示例 AppID 当作 QBot 正式身份或正式好友筛选依据。

票据验证所需 key 放在服务端；Electron 接入库及其与当前 Electron 37 的兼容性，需要在确定接入路径后做独立验证。持久身份认证不沿用现有明文 WebSocket 兜底路径。

官方来源：

- [Steamworks API 初始化与运行条件](https://partner.steamgames.com/doc/sdk/api)
- [身份认证、票据与 OpenID](https://partner.steamgames.com/doc/features/auth)
- [ISteamFriends：好友、状态、邀请](https://partner.steamgames.com/doc/api/ISteamFriends)
- [ISteamUser Web API：好友列表的权限限制](https://partner.steamgames.com/doc/webapi/ISteamUser)
- [ISteamMatchmaking：大厅能力](https://partner.steamgames.com/doc/api/ISteamMatchmaking)
- [SpaceWar 官方示例](https://partner.steamgames.com/doc/sdk/api/example)

## 初次调研的路线比较（选择以文首用户定案为准）

| 路线 | 收益 | 代价与条件 |
| --- | --- | --- |
| QBot 账号与社交服务 + Steam 身份/好友适配（推荐） | 持久关系、家园和消息有统一归属；可复用已有房间链路；Steam 与非 Steam 测试用户能进入同一社交体系 | 需要补可靠认证、账号绑定和服务端权限；Steam 实接取决于 AppID 与验证条件 |
| 首轮完全依赖 Steam 登录、好友和大厅 | 平台内关系入口自然 | 依赖 Steamworks 条件；离线家园与经济仍要后端；替换现有房间链路增加工作 |
| 首轮只做 QBot 游戏内好友，Steam 后接 | 最快验证两名真实玩家来往 | 首轮没有 Steam 好友导入与邀请体验，但需预留平台身份关联 |

初次调研曾推荐第一条并提出无 AppID 时先做独立游戏内路径；用户已明确以 Steam 为基础，现应先补 Steamworks 条件。Steam 功能应显示真实的未连接原因，不以模拟好友充当已接通。

## 初次调研的分批建议（账号与好友入口需按 Steam 定案修订）

### 第一批：关系与真实回应

可靠玩家身份、统一名片、好友码/申请/接受/删除/屏蔽、好友列表、访问邀请、离线留言与待处理消息。复用现有房间，让两名玩家能相互拜访，先把打招呼接成发起—对方回应—双方动作—结束记录。

邀请可撤回、拒绝、过期；重试不能生成重复关系和消息；对方离线、正在互动或离房时明确结束或保留待办。默认不自动替真人接受或回应。旧 memberId 不自动认领新账号，旧房间的归属迁移必须验证现有管理凭据或另设可验证流程。

本批先验证在线拜访与离线留言；持久家园和离线参观由下一批落实。即使是第一批，好友关系与消息也要在服务重启后恢复。

### 第二批：持久家园与来访价值

每人一份家园，区分永久布置与实时会客。仅邀请、好友可进、公开会客，以及独立离线参观权限；复用统一名片进入。先接植物展示、摸花欣赏、合并来访记录与一键回应，再按确认的经济方案补松土收益。

旧公共房间保留为公共空间，不自动变成私人家园。展示本地植物必须标明其来源与用途，不能因此成为可转移的可信资产。

### 第三批：合作资产与关系成长

服务端权威库存、原子扣款与幂等记录就绪后，再接赠礼、双人繁育、共同项目和商店。需要先确认旧花园存档迁移、繁育资格、双方成本、子代分配和收益预算。世界招募与更丰富的共同互动随后扩展。

## 验收重点

- 两个独立身份实际完成申请、接受、拜访和回应；本机双开只作为协议测试，不代替两台设备体验。
- 验证冒用 memberId/SteamID 失败，私密权限与屏蔽生效；取消、过期和重连不重复执行。
- 服务重启后好友与离线消息保留；换账号不会继承另一账号的私人内容。
- 双人动画缺素材、加载失败或中断时业务结果可靠，且不会伪造对方回应。
- Steam 接入分别验证未登录、初始化失败、真实好友读取、票据验证、正在运行/冷启动加入；真实邀请测试使用指定测试对象。

当前已确认：QBot 尚无 AppID，用户明确采用 Steam 体系。下一步先完成 Steamworks 入驻与应用创建，同时围绕 Steam 身份和好友细化社交模块规格。

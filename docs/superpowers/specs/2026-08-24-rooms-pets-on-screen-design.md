# 公共房间 × 1v1 联机合并：聊天 + 全员宠上屏

> 2026-08-24 · 用户定案：**全员上屏**（在线房友的宠尽量全部显示）+ **顺带下线 1v1**（私密房顶替好友配对）

## 一、目标

加入公共房间 = 聊天室 + 房友的宠**通屏显示**在你桌面底部。1v1 联机（托盘房间码配对）整体下线，其场景由私密房（凭码进、不上架）顶替。

### 推翻的设计定案（原 spec 2026-08-21 §3.4）

原否决「房友宠上屏」有两个理由，各自有对策：

1. **12 人 × 12MB 角色包传输** → 改**服务端缓存分发**：每人上传一次，房友从服务器取（P2P 盲转模式下发送方要为每个接收方重传 N-1 次，更糟）
2. **12 个替身窗** → **键控多窗 + 固定小尺寸 + 纯 setPosition 布局**（透明窗 resize 有渲染 bug，坑 4/18；只挪位置永不改尺寸）

## 二、协议（PROTO_VER 2）

服务端 `rooms/server.mjs` 新增角色包帧（`MAX_PAYLOAD` 32KB → 128KB 装得下 87KB 分块）：

| 帧 | 方向 | 说明 |
|---|---|---|
| `pack:announce {hash}` | C→S→广播 | 把当前角色包指纹挂到连接，房内广播 `member:pack` |
| `pack:have {hash}` | C→S | 探测服务端是否已缓存，回 `pack:have:ack {hash, cached}` |
| `pack:put {hash, seq, total, data}` | C→S | 顺序分块上传；收齐 sha256 校验→原子就位→`pack:put:ok` |
| `pack:get {hash}` | C→S | 下载：回 `pack:begin {hash, total, size}` + `pack:chunk`×N（5ms 限速） |

错误码：`pack:bad`（hash 不符）、`pack:not_found`、`pack:busy`（单连接一次一下载）、`pack:too_big`、`pack:rate_limited`（上传流量窗口 5min/192MB）。

`member:in`/`joined` 快照新增 `packHash` 字段（在线成员才有）；新增 `member:pack` 广播（成员换角色/迟到 announce）。

## 三、客户端架构

| 文件 | 职责 |
|---|---|
| `rooms/room-pets.ts` | 包分发状态机（上传/下载/缓存修剪）+ 成员状态，纯状态无窗口 |
| `rooms/room-pet-display.ts` | 订阅 room-pets 事件 → 驱动 `windows.ts` 键控多窗 + 按窗推送 |
| `windows.ts` | `roomPetWindows: Map<memberId, BrowserWindow>`，固定 200px，`layoutRoomPets` 算位置 |
| `renderer/pet/room-pet-main.ts` | `?roomPet=1` 入口，复用 Player + NetworkDriver + Signboard |
| `asset-pack.ts` | 打包/分块/重组（从 `link/asset-pack.ts` 迁到 main 顶层，market 也用） |

### 布局

`layoutRoomPets(memberIds, workAreaWidth, petSize=200, gap=20)` 纯函数：每行 `floor((宽+gap)/220)` 只，行从屏幕底往上叠、每行水平居中。只算 x/y，**绝不 setBounds**。成员按进房顺序稳定排序，进出整体重排。掉线 30s 宽限（宽限内 member:in 复活同一窗，避免闪断重连时窗口一开一关）。

### 启动竞态（踩过的坑）

`QBOT_ROOMS_AUTOCREATE/AUTOJOIN` 是 fire-and-forget，进房可能早于角色激活（`setSettings({activeCharacter})`）。修复：
- `announceLocalPack` 开头 `if (!myMemberId) return`（不在房先等）
- `notifyRoomCharacterChanged` 不再 gate 在 `myMemberId` 上
- 进房一律 announce（空房也播——服务端按 hash 缓存，重复进房只重发一个 announce 帧不重传 12MB）

无论「进房」和「角色激活」谁先谁后，后到的事件都会把播报补上。

## 四、1v1 退役（M3）

删除：`app/src/main/link/`（link.ts/relay-ws.ts/transport.ts）、`relay/` workspace、`renderer/pet/remote-main.ts`、控制台联机 pane、托盘联机菜单、`linkShareSong` 设置、`LinkStatus`/`LinkPeerHello` 类型、`QBOT_LINK_CREATE/JOIN` 环境变量。

保留：`visit.ts`（串门呈现机制，CLAUDE.md 既定结论——本机自动触发已下线但呈现层留作未来联机串门）；`LinkMode`/`LinkPeerCharacter`/`LinkPeerState`/`LinkAssetProgress` 类型（rooms presence 复用）；手动举牌（抽成 `local-sign.ts`，纯本地无网络出口）。

音乐态接入房间 presence：`music-monitor` 改调 `rooms.pushLocalMusic`，presence 合成 agent 活动 > music > idle（只发 `mode='music'` 枚举，不带曲名）。

## 五、隐私

- 包内容 = sanitize manifest（persona 剥离，有 `asset-pack.test.ts` 守）+ 动作 webm；**纯美术资产，无文本隐私面**
- `roomsShowMyPet` 设置（默认 true）：关 = 不上传不播报，房友只见缩略图
- presence 仍只发状态枚举+动作名（`buildPresenceFrame` 白名单+测试）；曲名不出房间
- 服务端日志只记数量（pack 上传/下载计数），包内容绝不进日志
- 首次入房弹窗需补一句角色包缓存说明（M4 收尾）

## 六、验证

- 服务端 smoke 49 项（原 37 + pack 全流程 12），含重启持久化
- 客户端单测 321 项（含 `layoutRoomPets` 6 项、`selectPruneTargets` 4 项、pack hash 格式）
- 双实例 E2E：不同角色互入，各自下载对方包（`.peer-<hash>/` 就位）、服务端缓存两份、`pack ready` 双向日志

## 七、部署

PROTO_VER 2 无兼容层，旧客户端直接被拒。VPS 上 `rooms/server.mjs` 替换重启即可（nginx 对已升级 WS 帧无尺寸限制）。VPS 上若还跑着 relay 服务需手动停。

```bash
COPYFILE_DISABLE=1 tar czf rooms.tgz rooms/
scp rooms.tgz root@14.103.59.73:/opt/ && ssh … systemctl restart qbot-rooms
ROOMS_URL=wss://albertbeta.cn/rooms node rooms/smoke.mjs
```

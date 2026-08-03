# 联机 Presence（Bongo Cat 模式）设计

日期：2026-08-02
状态：已批准
前置讨论：2026-07-12 联机模块定稿的修订版。原定稿 Steam-only P2P + M0~M3 排期；本次按「Bongo Cat 式最简联机」重切范围：1v1 纯在场感，relay 中继先行，Steam 降级为未来的 transport 替换项。

## 一、产品决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 传输通道 | **小中继服务器 + 6 位房间码**（单文件 Node WS relay，纯转发不解析不落盘）；Steam P2P 后置，只换 transport 层 |
| 同步粒度 | 只同步**高层状态枚举 + 动作名**；曲名走 Studio 开关（默认关）；气泡正文 / cwd / 会话内容**永不出本机** |
| 互动程度 | **纯 presence 零互动**：好友宠常驻桌面各玩各的；串门互动、坐标同步移出首版 |
| 人数规模 | **1v1 双人**（一个房间码 = 一对好友） |
| 掉线表现 | peer 断开 → 远端宠打瞌睡（idle），**30s 未重连淡出关窗**；relay 侧房间保留 10min 等重连 |
| 房间码语义 | 首版**会话级一次性配对**（关软件即散）；持久好友关系（记住 peer 自动重连）后置 |
| relay 部署 | 用户 VPS `14.103.59.73`，端口 `24250`，systemd 常驻 |

## 二、总体架构

```
好友机                                                你的机器
状态机/agent-merge/music ─┐
                          ├→ link.ts(main) ──WS──→ relay ──WS──→ link.ts(main)
                          │   状态钩子+资产服务      (纯转发)        │
                          └───────────────────────────────────────→ 远端宠窗
                                              (pet renderer ?remote=1 + NetworkDriver)
```

三层，全部在 main process + 复用 pet renderer：

1. **Transport 抽象**（`app/src/main/link/transport.ts`）

   ```ts
   interface Transport {
     create(): Promise<string>;            // 返回房间码
     join(code: string): Promise<void>;    // 抛 room_not_found / room_full
     send(frame: LinkFrame): void;
     onFrame(cb: (f: LinkFrame) => void): void;
     onPeerLeave(cb: () => void): void;    // 对端断开（可能重连）
     close(): void;
   }
   ```

   首实现 `relay-ws.ts`；未来 `steam-p2p.ts` 实现同一接口即可替换。

2. **链路管理**（`app/src/main/link/link.ts`）：托盘「联机」入口（生成房间码 / 输码加入）；状态钩子挂在本地状态合成出口（同 agent-merge 广播处），on-change + 15s 心跳发 `state` 帧；收对端帧 → 驱动远端宠窗；资产收发与缓存。

3. **远端宠窗**：**不新增 renderer**。pet renderer 带 `?remote=1` 启动 → 禁用本地 AI 状态机 / agent / music / 串门 / 调试面板，改挂 **NetworkDriver**（收到什么 action 播什么，粘性循环）；窗口可拖动摆放；右键菜单精简为「静音 / 断开联机」。这就是原定稿 PetEntity 驱动器抽象的落地：本地 AI driver 与网络 replica driver 二选一。

## 三、协议

### 3.1 relay 控制帧（客户端 ↔ relay）

JSON 文本帧，`t` 区分类型：

| 帧 | 方向 | 内容 |
|---|---|---|
| `create` | c→s | 建房 |
| `room` | s→c | `{code}` 6 位房间码（去易混字符集，无 0O1I） |
| `join` | c→s | `{code}` |
| `paired` | s→c | 双方入座，之后 relay 对一切帧只转发 |
| `peer-left` | s→c | 对端断开（房间保留 10min 可重 join） |
| `error` | s→c | `{code: 'room_not_found' \| 'room_full' \| 'bad_frame'}` |

relay 铁律：**paired 之后不解析任何帧内容**，逐帧原样转发；不落盘、不打日志正文；`maxPayload 256KB`；房间上限 500；空房立删、单人房 10min TTL；30s ping 心跳踢死连接。

### 3.2 业务帧（peer ↔ peer，经 relay 盲转）

| 帧 | 内容 | 时机 |
|---|---|---|
| `hello` | `{name, charName, manifestHash, protoVer}` | paired 后互报 |
| `state` | `{mode, action?, song?}` mode ∈ idle/thinking/working/waiting/error/done/music | 状态机切动作时 + 15s 心跳 |
| `asset:request` | `{hash}` | 对端 `~/…/@qbot/app/peers/<hash>/` 缓存未命中 |
| `asset:chunk` | `{hash, seq, total, data(base64 ≤64KB)}` | 逐块传角色包（manifest + turnaround + actions/*.webm，约 12MB），传输期远端窗显示蛋壳占位 |
| `bye` | — | 主动退出（区别于掉线） |

版本策略：`hello.protoVer` 不一致 → 提示升级并断开，不做兼容层。

**实现注记（L0 落地，2026-08-02）**：`action` 为可选提示——缺省时由**接收端**按替身角色自己的 `manifest.agentActions` 映射 `mode`（复用 state-machine 的 `AGENT_ACTION` 缺省表）。这样 L1 资产分发后替身=对端真身，映射配置随 manifest 一起到达，解析路径不变。L0 已实现帧：`hello {charName}`、`state {mode, song?}`、`bye`；房间码 UX 走剪贴板（托盘「创建房间」写码进剪贴板 /「从剪贴板加入」读码），正经输入 UI 留 L2 Studio。dev 双实例验证：`QBOT_LINK_CREATE=1` 建房打码到 stdout、`QBOT_LINK_JOIN=<码>` 自动加入、`QBOT_RELAY_URL` 指向本地 relay。

## 四、隐私边界（硬规则，有测试守着）

出本机的**只有**：角色资产包、状态枚举、动作名、开关放行的曲名。
**永不出本机**：气泡正文、`last_assistant_message`、transcript、cwd/来源标签、会话 id 明文、persona 文本。
relay 属不可信节点：即使自部署也按「会被抓包」设计——不发就是最好的加密。首版明文 WS，后置 wss（Caddy 反代）。

## 五、里程碑

- **L0 地基**：transport 抽象 + relay 上线 + pet renderer `?remote=1` + NetworkDriver；本机双实例（`QBOT_USER_DATA` 多开）经 relay 互看**假 state 帧**跑通
- **L1 资产分发**：manifestHash 缓存判断、分块传输、蛋壳占位、断点续传（按 seq）
- **L2 接真实状态**：状态钩子接 agent/music/idle 合成出口；Studio 曲名开关；托盘「联机」入口 UI
- **L3 打磨**：断线重连（指数退避）、掉线打瞌睡→30s 关窗、房间码复制交互、wss

## 六、relay 实现与部署

- 代码：`relay/` 独立 workspace（`@qbot/relay`），单文件 `server.mjs`，唯一依赖 `ws`；**禁止 import 仓库其他模块**（保持可单独 scp 部署）
- 自测：`relay/smoke.mjs` 起两个客户端走 create/join/转发/peer-left 全流程，可指向 localhost 或线上
- 部署：VPS systemd 服务 `qbot-relay`（`/opt/qbot-relay/`，`DynamicUser` 非特权运行，`Restart=always`），`PORT=24250`，日志只记连接数/房间数，不记帧内容
- 已部署实况（2026-08-02）：Ubuntu 22.04 / node v24；ufw 已放行 24250/tcp；**云安全组需在火山控制台入方向放行 TCP 24250**（该机 nginx 占 80/443 跑着别的站点，relay 不借道）

## 七、否决项与后置项

- ❌ Steam-only 首发（打包+上架是硬前置，周期太长）→ 后置为 transport 替换
- ❌ 坐标同步 / 双人互动握手 / 多人 full-mesh / 表情匹配 → 全部后置
- ❌ 气泡正文同步（隐私）
- 后置：持久好友关系、wss、串门动画联机版（复用 VisitOrchestrator）

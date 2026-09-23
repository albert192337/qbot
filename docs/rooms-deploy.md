# 公共房间服务部署（rooms）

## 2026-09-23：花园 v3 与好友服务已上线

本次更新 `14.103.59.73` 的 `qbot-rooms.service`，生产地址仍为 `wss://albertbeta.cn/rooms`。发布文件为 `server.mjs`、`contacts.mjs`、`garden.mjs`、`generated/garden-core.cjs` 和 `package.json`，复用服务器已有 `ws` 依赖。未更改 nginx、服务权限、客户端默认地址或其他服务。

- 上线前：本地和服务器 Node 24.13.0 隔离环境的三组联机回归全部通过；用现有 `rooms.json` 副本验证新版读取，保留 2 个房间。
- 切换：先停止旧服务使其落盘，备份完整数据，再切换代码目录并启动。新进程加载 2 个房间、21 份角色包；`NRestarts=0`。现有客户端经历一次短暂断线，可自动重连。
- 公网验证：TLS WebSocket 握手成功，`social:1`、`contacts:1`、`garden:1` 能力均返回；独立验证账号取得 `state.v3.version=3`、6 地块。未发聊天、邀请、交易或修改玩家资产。该验证账号留作部署记录。
- 其他服务：`qbot-market`、`qbot-generation` 均保持 active。本次未发布新安装包，需使用已构建的新版客户端体验新增功能。

备份：

- 完整数据：`/root/qbot-rooms-backup-20260923-0103/data.tgz`，100511782 字节，权限 0600，压缩包完整性检查通过。
- 原服务配置：同备份目录下 `qbot-rooms.service`。
- 完整旧代码及依赖：`/opt/qbot-rooms-pre-garden-v3-20260923-0103/`。
- 新代码：`/opt/qbot-rooms/`；原数据仍在 `/var/lib/qbot-rooms/`。

发布校验 SHA256：

```text
部署包：bcce1a659401cd6b7ff7be1608ccbcebfb7dd5a89d85a09df186ce6533a6f71f
server.mjs：e5e9839dca41dac448ce4e66e7cc7722fff8e70eb4d80b164b8c82591a637910
generated/garden-core.cjs：ae3fb0443bd9a088d10d34369722760d19dad2ad0a6e279281029af5e2143faa
```

回退时先停止 `qbot-rooms`，将当前代码目录另存，再把上述旧代码目录恢复为 `/opt/qbot-rooms` 并启动。保留当前 `/var/lib/qbot-rooms`，不要直接用上线前备份覆盖新增账号或资产；旧服务不支持新增好友/花园接口。只有确认需要恢复数据且已另存当前数据时，才单独进行数据恢复。SSH 密码及玩家凭据不写入仓库。

以下为历史部署记录，其状态仅代表当时，不能代替当前检查。

> 对应 spec：`docs/superpowers/specs/2026-08-21-public-rooms-design.md` §8
> 目标机：`14.103.59.73`（Ubuntu 22.04，已跑着 `qbot-relay:24250` 和 `qbot-market:24251`）

## 已上线（2026-08-22）

**生产地址（按顺序尝试）**：
1. `wss://albertbeta.cn/rooms` —— 主路，加密
2. `ws://14.103.59.73:24252` —— 兜底，**明文**

域名 + 证书是单点（证书有到期日、DNS 也可能出问题），一挂房间功能就整体不可用，
所以留了明文兜底路。客户端主路连不上才降级，且降级后 `isSecureTransport()`
返回 false，入房弹窗自动补上「当前未加密」——提示永远跟实际链路一致。

> ⏳ **兜底路待放行**：ufw 已放行 24252，但**火山引擎控制台的安全组入方向还没放**，
> 所以目前 IP 直连仍不可达（实测超时）。放行后兜底立即生效，无需改代码。
> 只想用主路的话：服务端设 `HOST=127.0.0.1` 并从客户端候选表里摘掉 IP 那条。

- 服务：`qbot-rooms.service`，`/opt/qbot-rooms/`，数据 `/var/lib/qbot-rooms/rooms.json`
- 监听 `0.0.0.0:24252`：主路走 nginx 反代（wss），同时为兜底路开放公网直连
- wss 借道既有 `albertbeta.cn`（DigiCert 证书，有效期至 2026-10-14），
  在 `/etc/nginx/sites-available/albertbeta.cn` 里加了一段 `location /rooms`
- 改 nginx 前已备份到 `/root/albertbeta.cn.bak.<时间戳>`；改后既有站点
  （首页 / merchants）实测 200 正常

验证记录：VPS 本机 smoke 37 项通过 → 开发机经公网 wss smoke 37 项通过 →
真实客户端（默认地址、无环境变量覆盖）开房+发言往返通过 → 直连 24252 端口确认超时。

下面是原始部署步骤，留作重装/迁移时参考。

---

## 零、为什么 wss 不是可选项

1v1 联机传的是状态枚举，抓包也看不出什么；公共房间传的是**用户手打的聊天正文**，
暴露面不是一个量级。所以 spec §8.5 把 wss 列为上线必要项而非后置项，本次一步到位。

客户端保留了诚实兜底：万一连的是 `ws://`，首次入房弹窗会多一句
「⚠ 当前与房间服务器的连接未加密」。现在走 wss，这句不出现。

---

## 一、安装服务

```bash
# 本地：打包上传（rooms/ 自包含，禁止 import 仓库其他模块就是为了这一步）
# COPYFILE_DISABLE=1 是给 macOS 的：否则 tar 会塞进一堆 ._* AppleDouble 文件
cd /path/to/qbot
COPYFILE_DISABLE=1 tar czf /tmp/rooms.tgz -C rooms server.mjs package.json qbot-rooms.service smoke.mjs
scp /tmp/rooms.tgz root@14.103.59.73:/tmp/

# VPS：安装
mkdir -p /opt/qbot-rooms && tar xzf /tmp/rooms.tgz -C /opt/qbot-rooms
cd /opt/qbot-rooms && npm install --omit=dev    # 唯一依赖 ws

cp /opt/qbot-rooms/qbot-rooms.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now qbot-rooms
journalctl -u qbot-rooms -n 10 --no-pager       # 应看到 listening on 127.0.0.1:24252
```

放行 24252（兜底路要用）：

```bash
ufw allow 24252/tcp
# ⚠ 还要在火山引擎控制台 → 安全组 → 入方向 → 放行 TCP 24252
#   （relay 当初就栽在这一步：ufw 放了但安全组没放，表现为连接超时）
```

验证：

```bash
cd /opt/qbot-rooms && node smoke.mjs             # VPS 本机，37 项应全通过
```

---

## 二、wss 反代（实际采用的方案）

该机 nginx 已占 80/443 跑别的站点，且**已有真域名 `albertbeta.cn`**
（DigiCert 证书在 `/etc/nginx/ssl/`，非 certbot 管理）。所以直接借道它，
不新建 server 块、不签新证书。

在 `/etc/nginx/sites-available/albertbeta.cn` 的 `location / {` **之前**插入：

```nginx
    # ── QBot 公共房间（WebSocket）──
    location /rooms {
        proxy_pass http://127.0.0.1:24252;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # 房间是长连接（服务端 30s ping 心跳），超时给足否则会被周期性切断
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
```

位置很重要：该文件末尾有个 catch-all `location / { root /opt/wanwu/client/dist; }`，
`/rooms` 必须在它之前（nginx 前缀匹配取最长，但放前面更不容易看错）。

```bash
cp /etc/nginx/sites-available/albertbeta.cn /root/albertbeta.cn.bak.$(date +%Y%m%d-%H%M%S)
nginx -t && systemctl reload nginx
# 确认既有站点没被影响
curl -sk -o /dev/null -w '%{http_code}\n' https://albertbeta.cn/
```

> `nginx -t` 会报一句 `conflicting server name "14.103.59.73" on 0.0.0.0:443, ignored`
> —— 那是既有配置的重复 server_name，与本次改动无关。

---

## 三、客户端地址

`app/src/main/rooms/rooms.ts`：

```ts
const DEFAULT_ROOMS_URL = 'wss://albertbeta.cn/rooms';
```

`isSecureTransport()` 据此自动返回 true，入房弹窗那句「传输未加密」随之消失。
这个联动有意做成自动的：万一哪天退回 ws://，提示会自己回来，不会出现
「地址改了但文案还说加密」的情况。

开发调试仍可 `QBOT_ROOMS_URL=ws://127.0.0.1:24252` 指向本地。

---

## 四、运维

```bash
systemctl restart qbot-rooms                     # 重启（退出前会 flush 落盘，不丢聊天）
journalctl -u qbot-rooms -f                      # 实时日志（只有数量统计，无正文）
ls -la /var/lib/qbot-rooms/rooms.json            # 数据文件（房间 + 成员 + 最近 50 条聊天）
```

**升级**：重复第一节的 scp + `systemctl restart`。`rooms.json` 在 StateDirectory 里，
不随代码目录覆盖；`sanitizeRoom` 对坏字段逐个退默认，旧档能被新版读。

**数据体量**：200 房 × (12 成员 + 50 聊天) ≈ 3.3MB，全内存 + 30s 脏写。

**回收**：7 天无人进的房自动删（`ROOM_TTL_MS`），每小时扫一次。

**监控**：`journalctl -u qbot-rooms | grep rooms=` 每分钟一行
`rooms=N conns=M msgs=K`，异常增长（比如 rooms 逼近 200 上限）即需关注。

---

## 五、已知缺口

| 项 | 状态 |
|---|---|
| wss | ✅ 已上线（`wss://albertbeta.cn/rooms`） |
| 内容审核 | 无。这是自部署服务，没有 7×24 审核能力 —— 所以 spec §5.3 把公共房间定位为「熟人小圈子入口」，房间数上限 200、不做推荐排行 |
| 举报处置 | 客户端可举报（记计数），但**无人工处置流程**。若走向陌生人规模，必须先立项补齐 |
| 备份 | 无自动备份。需要的话给 `rooms.json` 加个 cron 拷贝即可 |

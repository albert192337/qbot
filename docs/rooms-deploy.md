# 公共房间服务部署（rooms）

> 对应 spec：`docs/superpowers/specs/2026-08-21-public-rooms-design.md` §8
> 目标机：`14.103.59.73`（Ubuntu 22.04，已跑着 `qbot-relay:24250` 和 `qbot-market:24251`）

## 零、这份文档的边界

**wss 是上线必要项，不是后置项**（spec §8.5）。理由：1v1 联机传的是状态枚举，
抓包也看不出什么；公共房间传的是用户手打的聊天正文，暴露面不是一个量级。

客户端已经做了诚实兜底：连的是 `ws://` 时，首次入房弹窗会多一句
「⚠ 当前与房间服务器的连接未加密」。**这是给 wss 就绪前的过渡期用的，不是长期状态。**

---

## 一、最小上线（明文 ws，仅供内测）

```bash
# 本地：打包上传（rooms/ 是自包含的，禁止 import 仓库其他模块就是为了这一步）
cd /path/to/qbot
tar czf /tmp/rooms.tgz -C rooms server.mjs package.json qbot-rooms.service
scp /tmp/rooms.tgz root@14.103.59.73:/tmp/

# VPS：安装
ssh root@14.103.59.73
mkdir -p /opt/qbot-rooms && tar xzf /tmp/rooms.tgz -C /opt/qbot-rooms
cd /opt/qbot-rooms && npm install --omit=dev    # 唯一依赖 ws

# systemd
cp /opt/qbot-rooms/qbot-rooms.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now qbot-rooms
systemctl status qbot-rooms --no-pager

# 放行端口（两道：主机防火墙 + 云安全组）
ufw allow 24252/tcp
# ⚠ 火山引擎控制台 → 安全组 → 入方向 → 放行 TCP 24252
#   （relay 当初就栽在这一步：ufw 放了但安全组没放，表现为连接超时）
```

验证：

```bash
# VPS 本机
journalctl -u qbot-rooms -n 20 --no-pager        # 应看到 listening on :24252

# 开发机（打线上）
ROOMS_URL=ws://14.103.59.73:24252 node rooms/smoke.mjs   # 35 项应全通过
```

---

## 二、wss（上线前必做）

该机 nginx 已占 80/443 跑别的站点，所以**不能**再起一个 Caddy 抢 443。两条路选一：

### 方案 A：借道现有 nginx（推荐，改动最小）

前提：有一个能解析到这台机的域名（例如 `qbot.example.com`）。

```nginx
# /etc/nginx/sites-available/qbot-rooms.conf
server {
    listen 443 ssl;
    server_name qbot.example.com;

    ssl_certificate     /etc/letsencrypt/live/qbot.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qbot.example.com/privkey.pem;

    # 房间服务：WebSocket 升级
    location /rooms {
        proxy_pass http://127.0.0.1:24252;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        # 房间连接是长连接（心跳 30s），超时要给足，否则每 60s 被切一次
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

```bash
certbot --nginx -d qbot.example.com      # 首次签证书
ln -s /etc/nginx/sites-available/qbot-rooms.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

反代就位后，**关掉 24252 的公网暴露**（只留本机回环）：

```bash
ufw delete allow 24252/tcp
# 安全组同样收回 24252；服务本身可加 Environment=HOST=127.0.0.1 进一步限制
```

### 方案 B：Caddy 走非标端口

没有域名或不想动 nginx 时的退路。Caddy 需要 443 做 ACME，若被占则只能用
`tls internal`（自签），而自签证书客户端默认不认——**不要在生产用这条**。

---

## 三、客户端切到 wss

`app/src/main/rooms/rooms.ts` 的 `DEFAULT_ROOMS_URL` 改成：

```ts
const DEFAULT_ROOMS_URL = 'wss://qbot.example.com/rooms';
```

改完客户端 `isSecureTransport()` 自动返回 true，入房弹窗那句「传输未加密」随之消失
（这个联动有意做成自动的，避免改了地址忘了改文案）。

开发调试仍可用 `QBOT_ROOMS_URL=ws://127.0.0.1:24252` 指向本地。

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
| wss | **上线前必做**，见第二节；未做时客户端会明示未加密 |
| 内容审核 | 无。这是自部署服务，没有 7×24 审核能力 —— 所以 spec §5.3 把公共房间定位为「熟人小圈子入口」，房间数上限 200、不做推荐排行 |
| 举报处置 | 客户端可举报（记计数），但**无人工处置流程**。若走向陌生人规模，必须先立项补齐 |
| 备份 | 无自动备份。需要的话给 `rooms.json` 加个 cron 拷贝即可 |

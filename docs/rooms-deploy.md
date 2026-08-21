# 公共房间服务部署（rooms）

> 对应 spec：`docs/superpowers/specs/2026-08-21-public-rooms-design.md` §8
> 目标机：`14.103.59.73`（Ubuntu 22.04，已跑着 `qbot-relay:24250` 和 `qbot-market:24251`）

## 已上线（2026-08-22）

**生产地址：`wss://albertbeta.cn/rooms`**（客户端 `DEFAULT_ROOMS_URL` 默认值）

- 服务：`qbot-rooms.service`，`/opt/qbot-rooms/`，数据 `/var/lib/qbot-rooms/rooms.json`
- **只监听 `127.0.0.1:24252`**：公网访问一律走 nginx 反代，端口不对外开放这件事
  是结构事实（bind 地址），不只是防火墙约定。ufw 也未放行 24252
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

**不需要放行 24252**：服务只监听回环，公网一律走 443 反代（见第二节）。
这与 relay/market 不同——那两个是直接暴露端口的老做法。

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

# 装扮市场（Skin Market）设计

日期：2026-08-02
状态：已批准
前置讨论：L1 资产分发落地后，复用 `asset-pack.ts` 的角色包格式做「最简可闭环」的皮肤市场：上传自己的角色包、浏览/下载别人的。入口在桌宠右键菜单。

## 一、产品决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 署名 | **本地昵称**（`Settings.marketNickname`，默认「匿名」），卡片显示「角色名 by 昵称」；零账号体系 |
| 删除 | **管理码下架**：上传返回 token 存本地（`Settings.marketTokens`），自己传的卡片有「下架」按钮 |
| 下载后 | **自动激活**：解包入库即切换成新皮肤（原角色仍在列表可切回） |
| UI | **独立市场窗**（第 6 个 renderer `market`，常规边框窗，同 studio 模式）；入口 = 桌宠右键菜单「装扮市场」 |
| 审核 | 无（好友规模）；上限兜底：单包 50MB、封面 2MB、货架 500 款 |

## 二、服务端（复用 relay 那台 VPS）

`market/` workspace：**零依赖单文件** `server.mjs`，端口 `24251`，systemd `qbot-market`，存储 `/opt/qbot-market/data/<hash>/{pack.bin, preview.png, meta.json}`。hash = sha256(pack).slice(0,16)（与 asset-pack 的 manifestHash 同算法，服务端复算为准，兼做去重）。

| 端点 | 说明 |
|---|---|
| `GET /skins` | 货架列表（meta 剥离 token），按上传时间倒序 |
| `GET /skins/<hash>/pack` | 角色包二进制（asset-pack 格式原样） |
| `GET /skins/<hash>/preview` | 封面 PNG（`<img>` 直连） |
| `POST /skins?name=&uploader=` | body = pack 二进制 → `{hash, token}`；重复 hash → 409 |
| `POST /skins/<hash>/preview?token=` | body = PNG 封面（上传第二步） |
| `DELETE /skins/<hash>?token=` | 下架（token 校验） |

服务端从包头 JSON 数出动作数（不信客户端）；name/uploader 截断 64 字符；GET 带 CORS `*`。日志只记数量。

## 三、App 侧

- `app/src/main/market.ts`：HTTP 全走 main（免 CORS、服务器地址单点 `QBOT_MARKET_URL` 可覆盖）。
  - 上传：`packCharacterDir`（**已含 persona 脱敏**）→ POST → 存 token → 附传 `source.png` 封面
  - 下载：GET pack → **本地复算 hash 校验** → `unpackCharacter` 到临时目录 → rename 到 `characters/market-<hash>/`（原子）→ 激活 + rebuildTray；已装过 → 直接激活
- 市场窗 renderer：封面网格卡片（名字 / by 昵称 / 动作数 / 体积），按钮 = 下载·使用 / 下架（自己的）；顶部昵称输入 + 「上传角色」下拉（本地角色列表，默认当前激活）
- 右键菜单：`local-main.ts` 加「装扮市场」项（远端宠窗不加）
- 隐私沿用 spec §四：包体走 asset-pack 打包 = persona 已剥离；上传的封面是生成产物 source.png，无隐私

## 四、否决/后置

- ❌ 账号/登录/评分/搜索（好友规模用不上）
- 后置：下载计数、举报、市场内预览动画（`<video>` 播 idle 需要单独出 webm 端点）、HTTPS

# QBot 托管生成（P0 内测）

独立 Node 服务，复用 `pipeline/dist`。模型凭据仅通过服务端环境变量读取，客户端使用独立邀请码。邀请额度不是模型 Key，也不能用于直接访问模型服务。

## 接口

统一前缀 `https://albertbeta.cn/qbot-generation`，除 health 外使用 `Authorization: Bearer <invite>`。

- `GET /health`：服务状态、可选生图后端。
- `GET /account`：剩余创建次数；不返回邀请凭据或模型凭据。
- `GET /jobs`：当前邀请码拥有的任务，用于重新安装后恢复。
- `POST /jobs`：`id`（客户端 UUID）、`image`（PNG base64，≤8MB、≤4096px）、`name`、`imageProvider`、`characterForm`、`characterStyle`。同 UUID/素材/参数重复请求只保留一个任务、扣一次额度。
- `GET /jobs/:id`：阶段、排队位置、动作状态、可下载文件及 SHA256。
- `POST /jobs/:id/pick`：`index:0` 确认；`index:-1` 换方案。创建最多包含 3 次方案。
- `POST /jobs/:id/resume`：失败后继续；创建最多包含 2 次额外失败重试。已提交的视频 ID 和已成功动作会复用，终态失败/质检不合格的视频才重新生成。
- `GET /jobs/:id/files/:path`：仅当前邀请码拥有任务的白名单素材。不分发生成中间视频、账户或凭据文件。

## 运行与测试

```bash
npm run build -w pipeline
npm test -w generation
npm run check
```

生产环境变量：`ARK_API_KEY`、`GPT_IMAGE_API_KEY`（可选）、`DATA_DIR`、`INVITE_FILE`（JSON 数组 `{token,credits}`）、`FFMPEG_PATH`（可选）。邀请码必须至少 24 个字符，用密码学随机数生成。首次载入邀请码登记额度；后续重启不会重置已用额度。

部署结构保持 `generation/` 与 `pipeline/` 同级。部署目标需安装对应平台的 `ffmpeg-static`，不能把 Mac 二进制上传到 Linux。

## 运行边界

- 一个角色任务执行，动作并发 2；等待用户确认形象时不占执行槽。
- 本机回环监听；公网入口使用既有可信 TLS 的 nginx。无明文回退。
- 请求体限制、账户请求频率限制、总任务数上限 100、创建前磁盘余量检查。任务注册/额度变更串行原子落盘；注册文件损坏时停止启动，防止额度静默重置。
- 任务正在执行时关闭客户端不影响生成；服务重启会恢复排队/执行中的任务。服务重启时还未收到响应的同步图片请求无法保证供应商侧恰好执行一次，供应商计费以其账单为准。
- 本地删除角色会保存隐藏标记，避免自动恢复把它重新下载；云端成果仍保留。当前内测无自动到期清理和自助远端删除，管理员应按用户要求处理。
- 这不是计费平台：没有付费充值、退款或公开匿名领额度。达到重试上限时需要管理员处理；不要无限发放邀请码。

## 运维

参见 `docs/p0-release-and-deployment.md`。调整 `registry.json` 前停止服务，修改后原子替换再启动；运行中不要直接改文件，内存快照会覆盖手工修改。增加新邀请码可以追加到服务端邀请码文件后重启服务；已有邀请码的额度不会因此增加。

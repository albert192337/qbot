# 2026-09-26 旧云端角色补生成窗沿停靠

## 根因与修复

张起灵原云端任务已完成，但没有后来新增的 `perch`。动作库把缺素材入口伪装为 failed；客户端和线上服务只允许重试真正失败的动作，因而在读取参考图之前拒绝请求。客户端 finally 刷新又清除了错误 toast。

- 云端旧任务仅在显式选择 `perch` 时允许补生成；保留原动作和三视图，普通 resume 不扩充旧任务。已完成动作、未知动作和空列表不允许提交。
- 新动作加入任务 `baseActionIds`，同步状态和后续失败重试均可见；Job.load 自动补齐的 pending 记录也兼容。
- 动作库显示“未生成／补充生成”，保留请求错误及任务错误，监听云端进度，生成中禁用重复提交。异步刷新不会覆盖新弹窗或未保存输入。

## 验证

- App 24 项相关回归、管线 52 项提示词/任务/恢复回归、类型检查及构建通过。
- `scripts/test-perch-generation-ui.cjs` 使用临时存档、禁外网 fixture 和真实 renderer，验证缺失动作、错误转义、刷新/重开后错误保留、重试清除及云端进行中状态。
- 服务器隔离环境 4/4 服务回归通过。本地 Windows 服务全量 3/4，原重启用例超时；线上 Linux 全量通过。
- 真实旧角色任务副本配合实际 Job.load、实际 runPackage 和模拟 runActions 验证仅生成 perch，旧 idle 文件字节不变。未调用真实付费模型。

## 部署

2026-09-26 21:13（北京时间）更新 `/opt/qbot-generation/generation/service.mjs` 和 `pipeline/dist`，包含匹配的新动作定义与已有的人设提示支持。更新前 5 个任务全部 done，无排队/运行任务。

- 备份目录：`/root/qbot-perch-20260926/`，代码 `code-before.tgz`、注册记录 `registry-before.json`，均 0600。
- 代码备份 SHA256：`8d5b8c2140558bfca970b1773a202b7dfe972213214e39858a2bcf9e6214ab2f`。
- 已部署 service SHA256：`901eb660a94e47fcb9d24da36c094b39627391de318f6ddac43fe506fd7993cc`。
- 服务 active、NRestarts=0，公网 health 正常，rooms/market 保持 active。
- 当前正式客户端在 21:14 加载新构建，确认仍为张起灵、联机正常。旧进程已被其他工作重启，身份检查阻止了本次重复退出。

回退时停止生成服务，备份当前代码后将 `code-before.tgz` 还原到 `/opt/qbot-generation`，再启动服务。保留当前生产任务和注册记录，不用旧数据覆盖新结果。密码未写入部署文件或仓库。

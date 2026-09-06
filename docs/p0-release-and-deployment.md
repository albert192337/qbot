# QBot 0.3.0 P0 内测交付

## 已交付范围

- 默认云端创建：邀请码鉴权、创建额度、排队、形象确认、限次重试、结果校验下载。模型 Key 仅存服务器；用户自备 Key 的本地高级生成保留。
- 任务跨客户端关闭恢复，连接原邀请码可重新发现云端任务。未领取的完成任务继续显示；重复同步保留角色名字、人设和扩展动作。删除本地角色后不会被自动下载复活。
- 首次见面礼可立即开箱。每 15 分钟陪伴获得 1 箱和 500 点，满仓暂停，跨平台不依赖键盘监控或 Claude Code。
- 独立本地小屋入口与可收起的首次引导。进度存档原子写入、保留上一份有效备份，欢迎奖励迁移幂等。
- Windows CI 增加 app/服务测试；增加 Mac CI；Mac Apple Silicon DMG 在本机构建并验证。

## 安装包

- Mac Apple Silicon：`https://albertbeta.cn/qbot-downloads/QBot-0.3.0-arm64.dmg`
- SHA256：`2dcc0cbcc70b1a2b2c253c0ed80645a1ad28cc0b7bde9297eb1b0fe486e77c46`
- 校验文件：`https://albertbeta.cn/qbot-downloads/QBot-0.3.0-arm64.dmg.sha256`
- nginx 下载目录：`/var/www/qbot-downloads/`，关闭目录列表。

## 服务器

- 主机：`14.103.59.73`，SSH 账户 `root`。
- API：`https://albertbeta.cn/qbot-generation/health`。
- 代码：`/opt/qbot-generation/{generation,pipeline,node_modules}`。
- 数据：`/var/lib/qbot-generation/registry.json` 和 `jobs/<uuid>/`。
- 凭据：`/etc/qbot-generation.env`，权限 0600；邀请码：`/etc/qbot-generation-invites.json`，权限 0600。本文和仓库不记录任何凭据值。
- 服务：`qbot-generation.service`，监听 `127.0.0.1:24253`。限制内存 3GB、CPU 180%，只写数据目录和私有临时目录。
- nginx：`/etc/nginx/sites-available/albertbeta.cn` 新增 `/qbot-generation/` 反代，沿用既有有效 TLS，未更改房间和现有站点路由。
- 部署前 nginx 备份：同目录 `albertbeta.cn.qbot-p0-*.bak`；上一份生成服务代码：`/opt/qbot-generation-backup-0.2/`。

```bash
systemctl status qbot-generation --no-pager
journalctl -u qbot-generation -n 50 --no-pager
curl -f https://albertbeta.cn/qbot-generation/health
```

回退服务代码：停止服务，将当前目录另存，再从备份还原代码目录后启动。**不要覆盖 `/var/lib/qbot-generation` 或凭据文件**，以免丢任务或重置额度。回退 nginx 只移除本次新增 location，先 `nginx -t` 再 reload。

## 邀请与使用

已经生成 30 个独立内测邀请码，每个可创建一只角色。邀请码明文保存在操作者本机 `/Users/bytedance/.qbot-private/p0-invites.txt`（0600），不包含模型 Key，也不在仓库内。

用户打开客户端后：总览开箱 → 进入小屋 → 创建角色 → 输入邀请码 → 选图/名字 → 提交 → 确认形象 → 等待动作完成 → 放到桌面。每次创建包括最多 3 次形象方案，以及 2 次额外失败重试。退出客户端期间继续生成，重新进入查看即可。

内测创建额度不收费；重试上限和服务端供应商成本由运营方承担。量产前要结合实际账单再定义付费额度、补偿与退款规则。

## 验证证据

- Ark 短文本请求 HTTP 200；真实三视图生成成功；使用官方预置小龙素材完成一只角色，8/8 动作全部成功。
- GPT-Image-2 鉴权及模型列表 HTTP 200；独立真实生图返回有效 PNG。
- Mac 打包版使用干净隔离目录，无 Ark/GPT Key；邀请码连接成功，恢复真实云端任务并校验下载；8 个画廊视频均为 readyState=4 且播放中，激活后桌宠视频正常播放。
- 首次见面礼开箱成功，家具进入背包；本地小屋背景、桌宠动画、右键家具菜单正常。
- DMG 与解包后的 ffmpeg 可用。最后完整测试：管线 123 项、App 536 项、服务 2 组集成测试及类型检查全部通过。第二个全新数据目录使用原邀请码自动发现、下载同一只 8 动作角色，无需重新生成。

## 尚未具备的正式发布条件

- **未提供签名证书**：Mac 包未签名/未公证；Windows 无发布者签名。当前产物适合知情内测，不能承诺陌生用户无系统拦截地安装。
- **Windows 本次未实机验收**：已有历史 Windows 发包记录，本次已补 CI 门禁，但当前运行环境是 Mac；0.3.0 Windows 安装、权限和运行需在 Windows runner/机器完成验证。
- 本次 Mac 产物是 Apple Silicon（arm64），不宣称支持 Intel Mac。
- 没有公开付费账户体系、自助退款、自动更新、跨设备存档合并或公开社区运营后台；这些不包含在本次有限邀请码内测实现中。
- 长时挂机、多屏、真实休眠唤醒仍需扩大内测样本。单次功能烟测不能代替这些验证。

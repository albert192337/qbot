# 联机开箱

桌面和小屋共用 `progress.openBox → gardenAction`。本地仍走原存档事务；联机改走 `network-box.ts`，成功时沿用既有补给揭晓界面。试演仍禁止消耗真实积分和箱子。

每箱费用保持 **500 点 + 1 个箱子**。积分/箱子的权威仍是本机 `progress.json`，联机库存的权威仍是服务器 `gardens.json`。

## 事务

1. `get` 返回 `boxProtocol:1` 后才继续，旧服务不会扣费。
2. 客户端先落盘 `garden-box-pending.json`，绑定交易编号、账号和服务器。
3. `box:prepare` 创建账号专属凭据，不发奖；重复请求返回同一凭据。
4. `applyGardenTransaction(online-box:<编号>, -500, -1)` 持久化扣费回执。余额不足转 `box:cancel`，不发奖。
5. 扣费成功后 `box:commit` 在服务器同一落盘事务中随机生成补给并保存完成回执。重复提交返回同一奖励，不再生成。
6. 确认发奖后清除本机待处理记录。响应丢失或写盘失败保留原编号；再次开箱或读取联机花园时恢复。账号/服务器切换不把原交易送到其他账号。

已完成服务端回执不使用普通花园操作的七天清理，保证长时间离线后仍可恢复。未知提交结果不退款，避免服务器已发奖但响应丢失时重复领取。

信任边界：本次保持现有本机进度权威，服务器无法独立验证修改过的客户端是否真实扣除了本机资产。凭据提供账号绑定和去重，不是支付凭证或防作弊认证；真实付费资产仍需服务端钱包与支付核验。原始 `act/box` 继续拒绝，客户端不能上传指定奖励或库存。

## 验证

- `app/test/garden-network-box.test.ts`：真实 Gardens 落盘、费用、旧服务、不足、响应丢失、客户端/服务器写盘失败、重启、超过七天重试、账号切换、并发点击、无效/取消凭据。
- `app/test/garden-network-box-wallet.test.ts`：真实桌面 `openBox` 入口与 `progress.json`，确认扣费落盘、重启读取花园补发、不写本地花园库存、补给揭晓数据返回。
- `scripts/test-garden-box-server.cjs`：独立临时账号和数据库、回环 WebSocket 实际 handler，不访问公网账号。
- 原 `garden-service`、`garden-network-recovery` 与 `test-garden-v3-server.cjs` 回归通过。

## 发布状态

2026-09-26：客户端构建完成，服务端修改在 `rooms/garden.mjs`，线上尚未更新。服务端新增协议无需修改 `server.mjs` 或生成规则。必须更新服务端并重启新版客户端才能使用。

发布前检查远端 `garden.mjs` 与当前版本的差异并保留远端新增变更。备份代码；停服落盘后备份 `/var/lib/qbot-rooms/gardens.json` 及其备份，替换文件、语法检查、启动并核对服务状态。出现问题恢复原代码并启动，保留当前玩家数据。已扣费但待发奖的客户端记录不可删除，应恢复新版服务继续处理。

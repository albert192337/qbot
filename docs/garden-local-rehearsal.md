# 本地试演花园与种植入口（2026-09-24）

- 本地试演中的自己与测试角色均可从房间成员「土地 / 商店」进入花园。自己的资产来自本地收藏的会话副本（不是联机服务器资产）；其他角色使用虚拟库存、成熟亲本与待培育作物。模拟花园不连接网络、不发真实邀请、不写正式花园、积分或回忆，退出试演后销毁副本。
- 复用实际 v3 播种、繁育、喷雾、售价规则。提供模拟角色每日商店、培育参与/暂停、邀请测试伙伴和幂等奖励；培育遵循 15 秒在线租约、个人贡献资格。模拟助育奖励固定为一包草莓种子，不用于验证正式随机奖励分布。
- 商店统一入口，分「今日小店」「种植补给」两个标签；旧 daily/shop 路由继续可达。土地旁小菜单、完整播种页和种子商品按当前物种等级展示每轮成熟分钟数（未施肥），与 v3 实际播种使用同一计算函数。
- 喷雾在成熟且已揭晓的田间作物详情中使用；收获篮不再提供喷雾目标。后端拒绝新的背包喷雾操作，已有待确认背包结果仍可处理。选择结果前继续阻止采摘/繁育，候选不会重抽。
- 服务端独立规则已重新生成到 `rooms/generated/garden-core.cjs`；本次未部署公网服务。客户端入口立即生效，公网后端对背包喷雾的额外限制需随服务更新。

## 验证

- `app/test/garden-local-rehearsal.test.ts`：本地副本、正式资产隔离、繁育播种、模拟商店、田间喷雾、合作租约/领取防重、退出清理、分钟数一致。
- `garden-life.test.ts`、`garden-service.test.ts`、`social-client.test.ts`：旧喷雾候选兼容、未成熟作物拒绝、在线设置开启时仍隔离试演、访客离场与退出。
- App 回归、类型检查、构建及 `scripts/test-garden-v3-server.cjs`；耗时概率统计测试需较长 timeout。
- 隐藏 Electron 窗口、临时 userData、禁网测试：`scripts/test-garden-life-ui.cjs` 与 `scripts/test-garden-rehearsal-ui.cjs`。后者先用 esbuild 将 `app/src/main/garden/local-rehearsal.ts` 打包为 `.superpowers/garden-rehearsal-core.cjs`，测试截图位于 `.superpowers/garden-rehearsal-ui/`，不留下可见预览窗。

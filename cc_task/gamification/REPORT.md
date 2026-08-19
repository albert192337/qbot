# 游戏化积累（挂机箱子 / 键盘点数 / 开箱 / 合成）实现与验证报告

日期：2026-08-19 · 分支工作区：`I:\nsh-code\qbot`（未提交，`git status` 全为工作区改动）

## 需求 → 实现映射

| 需求 | 落点 | 数值 |
|---|---|---|
| 类似 bongo cat 的键盘感知 | `app/src/main/input-monitor.ts` | 常驻 PowerShell + `GetAsyncKeyState` 只数**按下沿**，50ms 轮询、每 20 次上报 |
| 挂机 15 分钟 → 1 个箱子 | `progress.ts` 挂机计时 + `progress-rules.ts:settleIdle` | `IDLE_MS_PER_BOX = 15min`，30s tick |
| 敲键盘 1 点 / CC 跑完一次 10 点 | `input-monitor.ts` → `progress.ts`；`agent-server.ts` 的 `Stop` | `POINTS_PER_KEY = 1`、`POINTS_PER_AGENT_RUN = 10` |
| 500 点 + 1 箱 → 随机家具 | `progress-rules.ts:canOpenBox/applyOpenBox`、`furniture.ts:rollFurniture` | `POINTS_PER_BOX = 500`；档位权重 common .70 / rare .25 / epic .05 |
| 合成页：10 低级 → 1 高品质 | `app/src/renderer/room/inventory-panel.ts` + `pickCraftSacrifice/applyCraft` | `CRAFT_COST = 10`，common→rare→epic |
| 调试按钮（加时间 / 给箱子 / 给家具） | `app/src/renderer/pet/debug-panel.ts` + `debugAddIdleMs/debugGrant*` | — |

数值集中在 `app/src/shared/furniture.ts` 的「玩法数值」段（零依赖，主进程与 renderer 都能 value import，见血泪坑 12），`progress-rules.ts` 再导出一遍，主进程侧只从一处引。

## 架构要点

- 落盘：`progress.json`（userData），`sanitizeProgress` 逐字段容错，坏字段退默认而不整档丢弃
- IPC：一次性**结果**（开箱得了什么 / 合成失败原因）走 `invoke` 返回值；幂等**状态**走节流的 `progress:changed` 广播 → 多窗口（pet 调试面板 / room 托盘 / 背包面板）自动同步
- 装饰托盘余量 = `owned − placed`（派生），摆放/删除零 IPC 往返
- 隐私边界：`input-monitor.ts` 只累计次数，**哪个键**从不离开 C# 的 for 循环，不联网、不落盘（只有聚合点数进 progress.json）

## 验证

### 自动化

- 新增 `app/test/progress-rules.test.ts`：33 例，覆盖挂机结算/休眠跳变 clamp、开箱前置校验与不可变性、合成选料（最大堆优先、跨种凑、只数本档、确定性）、分档汇总、脏数据清洗、`rollFurniture` 权重（固定步长扫 1000 次断言 common>rare>epic 且 common≈0.70）
- 全量：`npm test -w app` → **247 passed / 11 files**；`npx tsc --noEmit -p app` → 干净

### 人工（CDP 驱动隔离实例 `QBOT_USER_DATA=/tmp/qbot-verify`）

| 项 | 结果 |
|---|---|
| 初始 `STARTER_BOXES = 2` | ✅ |
| 挂机累加 | `idleMs` 30014 → 90033 → 120041（30s tick） |
| 键盘监控静息稳定 | 15s 内 70 → 70，无漂移/误报 |
| `debugAddIdleMs(15min)` | 恰好 +1 箱（Infinity cap 绕过跳变 clamp，设计如此） |
| 开箱 | −1 箱 / −500 点 / +fan / `boxesOpened:1`；点数不足提示 `点数不够（70/500）` |
| 合成 | 烧 `{lantern:5, plant:3, clock:1, fan:1}` → +painting(rare)，teapot 被留下（多样性保留）；失败文案 `10 件才能合成，现在不够` / `已是最高品质，无法继续合成` |
| 持久化 | `progress.json` 写盘内容与内存一致 |
| 房间右键「我的家具」 | 面板开合、挂机进度条、三档行、开箱按钮禁用态均正确 |
| 面板开启时窗口穿透守卫 | `in-room` 在面板内保持 true |
| 托盘按库存门控 | 未拥有件 `未拥有` + `.locked` 不可拖 |
| 摆放→删除回环 | 摆茶壶案几 → 转为「未拥有(锁)」；删除后恢复 `×1` 解锁，零 IPC |
| 跨窗广播 | pet 窗注水 → room 托盘 2s 内解锁灯笼 |

证据截图：`inv-panel.png`、`decor-tray-gated.png`、`decor-tray-fixed.png`

## 顺带修的两处

1. **`#decorDone` 被挤成竖排「完/成」**（`room/index.html`）：托盘 `max-width: calc(100vw - 24px)` 时 flex 收缩了按钮。加 `flex: 0 0 auto; white-space: nowrap;`，HMR 后实测 58×35px 单行。截图 `decor-tray-fixed.png`。
2. **碰墙不停**（`room/rooms/default.ts` 的 `DEFAULT_ROOM.floor`）：可走区延伸到墙根，角色走到边界时上半身已压进墙里但逻辑仍在多边形内。把两条靠墙边（左上/右上）沿法向各内收 45px：
   ```
   [[513,477],[862,652],[515,843],[160,652]]  →  [[513,527],[815,678],[515,843],[210,679]]
   ```
   前面两条边（开口方向）不动。安全性：`scaleForY` 用 floor 的 y 极值（内收后一致自洽）、`depthZ` 用 `spec.height`（不受影响）、`sanitizePlacements` 不做多边形包含判定（已存盘的摆放不会被判无效）。
   实测三个顶点截图：`floor-inset-back.png`（后角，脚落在地板上、身体正常遮挡墙角柱）、`floor-inset-left.png`、`floor-inset-right.png` —— 三处脚底都在地板内，不再站上踢脚线。

## 仍可再看的点

内收 45px 后可走面积明显小了一圈。三个角的观感都可接受，但「45 是不是最优」只能靠日常使用感受再调；这是一处纯数据改动，回退/微调成本为零。

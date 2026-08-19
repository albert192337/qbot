# 桌宠内置 HUD（bongo cat 式）+ 独立开箱奖励窗 — 实施计划

> 状态：**待实施**。游戏化数据层（点数/箱子/开箱/合成）已完成并验证，见同目录上一级的 `cc_task/gamification/REPORT.md`。本文件是下一步 UI 层的计划。

## Context

游戏化数据层已完成并验证（点数 / 箱子 / 开箱 / 合成 / 33 个单测 / `progress.json`），但**唯一入口是房间窗右键菜单「我的家具」**——要看积累必须先把角色送进小房间、再开面板。用户看不到自己在攒东西，攒的过程也就没有反馈。

要的是 bongo cat 那种**环境式**呈现：桌宠窗最下面常驻一个小计数模块；够开箱时旁边浮出一个宝箱小图标；点开后有吸引人的动效 + 一张**较大的**「开出了什么」提示卡。

三个已拍板的决定（不再讨论替代方案）：

1. **提示卡 = 新开一个独立窗**（第 7 个 renderer，命名 `reward`，400×300，跟随桌宠，透明 + 全穿透，固定尺寸）
2. **HUD 内容 = 点数 + 宝箱钮**：计数器千位分隔（`12 480`）；宝箱只在够开时浮出并轻微呼吸；花点数时飘 `−500 ↑`。**不显示箱子数、不显示挂机进度条**（那两个留在房间的「我的家具」面板）
3. **顺序：先 HUD**；Studio 的 turnaround 缺失两处修复（UI 前置拦截 + `packCharacterDir` 带上 `turnaround.png`）随后单独做，不在本次范围

三条决定方案走向的既有事实（已核对 file:line）：

- `app/` **没有 vitest 配置文件**（`package.json` 的 `test = "vitest run"`）→ node 环境、**无 DOM、无 jsdom**（装 jsdom 违反「不引入新依赖」）→ 所有可测逻辑必须物理隔离进纯模块，`hud.ts` / `reward/main.ts` 本身不进单测（同 `test/progress-rules.test.ts:1-5` 立的规矩）
- `body.has-debug-panel` 由 DebugPanel 自己加/摘（`debug-panel.ts:263/:269`）→ HUD 与调试面板共存**纯 CSS 可解**，零 TS 接线
- `main/bubble.ts:13-26` 是「懒创建窗 + `isLoading()` 时暂存 + `did-finish-load` 补发」的现成范式，奖励窗照抄（否则首次开箱必丢卡）

## 1. 纯逻辑（先写，直接可单测）

**新建 `app/src/renderer/pet/hud-format.ts`**（零 DOM）

| 函数 | 契约 |
|---|---|
| `formatPoints(n)` | 每 3 位插 **U+00A0 不换行空格**：`12480 → "12 480"`。向下取整；负数 / `NaN` / `Infinity` → `"0"`（同 `sanitizeProgress` 的宽容策略，坏档不许崩 HUD）。**用 U+00A0 而非 ASCII 空格**：药丸是 flex 单行，窄窗 + 七位数会断行把它撑成两行 |
| `isStaleProgress(local, incoming)` | `incoming.boxesOpened < local.boxesOpened \|\| incoming.crafted < local.crafted`。`Progress` 里这两个是单调计数器（`ipc-types.ts:222-225`），拿来当版本号比时间戳可靠且零新状态。见 §6 的回弹竞态 |
| `shouldTweenPoints(prev, next)` | `\|next−prev\| >= 50` —— 键盘 +1 直接赋值，开箱 −500 走 400ms tween |
| `spendLabel(n)` | `"−500"`（U+2212 真减号，不是 hyphen） |

**`app/src/shared/furniture.ts` 增一个零依赖谓词**
- `canAffordBox(points, boxes)` = `boxes >= 1 && points >= POINTS_PER_BOX`
- 放这里而不是 `hud-format.ts`：`room/inventory-panel.ts:110` 现在内联同一行判断，顺手改成调它，从三份拷贝收敛成一份。命名刻意避开主进程 `progress-rules.ts:canOpenBox(p)`（那个返回 `{ok, reason}` 带文案，renderer 不许 import 主进程文件）

**新建 `app/src/renderer/reward/reward-card.ts`**（零 DOM，**刻意不 import `decor-pack.ts`**——`name` 由 `reward/main.ts` 查好传进来，纯模块零资产依赖，测试不碰 `import.meta.url`/PNG）

| 函数 | 契约 |
|---|---|
| `classifyOpenBox(progress, stickerId)` | `count = progress.inventory[id] ?? 0`；`isNew = count === 1`。**入参必须是 `openBox()` 返回的 progress**（开箱后权威快照，见 §6） |
| `rewardTimings(tier)` | 各相位 `{burst, pop, item, hold, fade, total}`，单一来源。common/rare 总 3520ms，epic 4360ms（5% 概率事件，值得多看一眼）。硬约束：`total <= 5000`——全穿透浮层不许久留 |
| `describeReward({name, tier, isNew, count})` | 三行文案；重复件第二行走「已有 N 件 · 可用于合成」，`count >= CRAFT_COST` 时切「可以合成了」；`name` 空则回落 `stickerId` |
| `sparkSeeds(tier)` | 火花 `{angleDeg, dist, delayMs}[]`，common/rare 10 颗、epic 14 颗。**确定性、无 `Math.random`**——随机会让动画不可测也不可复现 |

**新建 `app/test/pet-hud.test.ts` + `app/test/reward-card.test.ts`**：覆盖上面每条契约的边界。要点——`formatPoints` 的断言**必须显式写 ` `**（否则「看起来一样」的测试会误过）；`canAffordBox` 用 `POINTS_PER_BOX` 常量而非字面 500；`isStaleProgress` 相等要放行、`local` 为 null 返回 false；`rewardTimings` 断言相位单调递增且 `total === fade.at + fade.dur`。renderer 纯模块单测已有先例（`bubble-stack.test.ts`、`roam.test.ts`、`decor.test.ts`），import 路径照抄。

## 2. HUD（桌宠窗内）

**新建 `app/src/renderer/pet/hud.ts`** —— `class ProgressHud`，仿 `pet/signboard.ts`（构造即建 DOM、显隐靠 class、动画重放用 `classList.remove(x); void el.offsetWidth; classList.add(x)`）。

```
<div id="pet-hud">              pointer-events:none   ← 关键
  <div class="hud-pill">        pointer-events:auto
    <span class="hud-mark">✦</span><span class="hud-num">12 480</span>
  <button class="hud-chest" hidden>   pointer-events:auto   内联 SVG 宝箱
  <div class="hud-float">       −500 ↑ 飘字（绝对定位，不占流）
  <div class="hud-toast">       失败提示（绝对定位）
```

`document.body.appendChild(root)` —— **不能进 `#stage`**：`#stage` 挂着 `pointerdown/move/up` 拖窗（`local-main.ts:531-592`）和 `contextmenu`（`:603`），进去点按钮会变成拖窗 + 右键弹菜单（`inventory-panel.ts:71-72` 有同因的先例注释）。

**穿透分层是 HUD 与拖拽共存的全部机密**：`#pet-hud` 与 `#stage` 是兄弟且 z-index 更高，**容器自身 `pointer-events:none`，只有 `.hud-pill` / `.hud-chest` 两小块 `auto`**。底部条带的空白区域点击穿过 HUD 落到 `#stage`，拖窗/右键完全不受影响。桌宠窗**没有** `setIgnoreMouseEvents`（只有 bubble `:212`、room `:313-315` 有）→ 窗内 HUD 天然可点，主进程侧零穿透代码。漏掉这层的后果：`left:0;right:0` 的吸底条会吞掉整条窗底的拖拽。

**尺寸一律 % / vh + `clamp()`，禁止裸 px**。角色归一化让桌宠窗**底部恒 14% 透明**（`pipeline/src/chroma.ts:57 NORM_BASELINE=0.86`）：0.5 档 ≈25px、1 档 ≈50px、2 档 ≈101px。

CSS 全写进 `pet/index.html` 的内联 `<style>`（该文件持有全部桌宠 CSS/keyframes，别新开样式文件）：
- `#pet-hud`：`position:absolute; left:0; right:0; bottom:1.5%; z-index:6; display:flex; align-items:flex-end; justify-content:center; gap:5%; pointer-events:none; font-size:clamp(9px,3.4vh,15px)`
- `.hud-pill`：`rgba(20,20,30,.55)` 底 + `1px rgba(255,255,255,.14)` 描边 + 阴影（深色桌面上白字会糊），`border-radius:999px`，`font-variant-numeric:tabular-nums`（数字跳动不抖宽）
- `.hud-chest`：`clamp(18px,7vh,34px)` 方形，`filter:drop-shadow(0 0 .28em rgba(255,196,84,.75))`，`animation:hud-breathe 1.9s ease-in-out infinite`；`[hidden]{display:none}`（够开才浮出）；`.pop` 走一次弹入再接呼吸；`:disabled{animation:none;opacity:.45}`（乐观禁用）
- 新 keyframes（复用 `poof-burst:54-58` / `signboard-pop:121-125` 的语汇）：`hud-breathe`（`translateY(-9%) scale(1.07)`）、`hud-chest-pop`（`.4 → 1.14 → 1`）、`hud-float-up`（上移淡出）
- **z-index 取 6**。现有栈：牌子 0 < video 1 < `.stage-poof` 3 < `#bubble` 5 < `#menu` 10 < `#debug-panel` 99。6 = 压住角色与烟雾（HUD 必须始终可读）、让路给右键菜单和调试面板。`#bubble` 在 `top:8px`、HUD 在 `bottom:1.5%`，几何上不可能重叠，选 6 只是语义上更清楚（HUD 属「窗饰层」）
- **与调试面板共存**：`body.has-debug-panel #pet-hud { display: none }`。面板本身就在逐字打印点数/箱子/挂机（`debug-panel.ts:198`），HUD 纯冗余；面板高度是 `max-height:40%` 的内容自适应值，用 `bottom:41%` 之类的偏移必然在某些日志行数下错位
- **串门模式**：`body.visit-mode #pet-hud { right: 45% }`（`#stage` 是 `flex:0 0 50%; margin-right:-10%`，宿主中心约在 45%）
- **拖拽隐藏、走路不隐藏**：`onDragStart()` 加 `.lifted`（`opacity:0`），`onDragEnd()` 清旧定时器后 1500ms 恢复——套 signboard 的节奏，被拎起来时脚下挂个计数板很怪。但**不挂走路的 start/stop 钩子**：牌子藏是因为它物理攥在手里，HUD 是窗饰不跟着角色跑，走路频繁会让它一直闪

**宝箱图标：手写内联 SVG**（约 12 行 path：梯形箱体 + 弧形盖 + 金色锁扣 + 包边，配色借档位色语汇 `#8a5a32` / `#e0b354`）。仓库零宝箱素材（`app/resources/` 只有 `tray-win.png` 和 presets），现有 UI 用 emoji（`inventory-panel.ts:104` 的 🎁/✨），但 emoji 在 Win/mac 字形差异大、20px 下糊。SVG 跨平台像素级一致，光晕好挂。**不生成任何美术**（要花钱，得先问）。

API：`setProgress(p)`（幂等，走 `isStaleProgress` 门控）、`floatSpend(n)`、`toast(text)`、`onDragStart/onDragEnd`、`onChestClick = cb`。宝箱可见性 = `canAffordBox(p.points, p.boxes)`。

**接线 `app/src/renderer/pet/local-main.ts`**（全部是加行；`remote-main.ts` **不动**——`?remote=1` 的远端替身窗天然没 HUD，`pet/main.ts:6-11` 的分叉保证）
- import 区加 `import { ProgressHud } from './hud'`
- `:34` 举牌区之后：`const hud = new ProgressHud(); hud.onChestClick = () => void doOpenBox();` + `doOpenBox()` 本体（§6）
- `:177` `progress.onChanged` 与 `:178` `progress.get()` 各加一行 `hud.setProgress(p)`
- `:554` `hostSignboard.onDragStart()` / `:578` `onDragEnd()` 旁各加一行 `hud.onDragStart()` / `hud.onDragEnd()`

## 3. 奖励窗（第 7 个 renderer）

**新建 `app/src/renderer/reward/index.html` + `main.ts`**，结构照抄 `renderer/bubble/`（`html,body` 全透明 + `pointer-events:none`；CSS/keyframes 全内联；body 只有 `<div id="card-root">`）。

- 家具图/名字从 `../room/decor-pack` 的 `DECOR_BY_ID` 取（它唯一的 import 是 `import type { DecorAnchor }`，跨页安全；`img()` 的 `new URL('./decor/x.png', import.meta.url)` 在多 html 入口下由 Vite 去重，只 emit 一份 PNG）。档位文案/配色/合成数从 `../../shared/furniture` 取
- 卡面：
  ```
  [家具图 96×96]   开出了「山水挂画」
                   稀有 · 新收藏            ← border-left:3px solid var(--tier)
                   去房间「布置房间」摆上吧
  ```
  重复件第二行换成 `稀有 · 已有 3 件 · 可用于合成`（对齐 `inventory-panel` 的合成入口，把重复从"扫兴"变成"燃料"）。档位配色**必须**走既有惯例 `el.style.setProperty('--tier', TIER_COLOR[tier])`（`inventory-panel.ts:129/:230`、`room/index.html:380`）。文案一律 `textContent` 不用 `innerHTML`（同 `bubble/main.ts:31` 的纪律）
- 相位按 `rewardTimings(tier)` 编排：burst（中心白光爆闪 + `sparkSeeds` 火花沿 `--a` 飞散）→ pop（卡片 `.6 → 1.06 → 1` 过冲 + 档位色光环脉冲；epic 追加 45° 扫光）→ item（家具图从下沿升起 + `rotate(-4deg → 0)`）→ hold → fade（淡出 + 下沉 6px）→ `reportDone()`
- 收到 `reward:anchor` 的 `'left' | 'right'` 后镜像入场方向、把光晕渐变原点挪到贴宠那一侧
- 新卡到达时自身先做一次内部 clear 再重建（连开两箱不叠卡，省一次 IPC）
- `onClear`：`clearTimeout` **全部**相位定时器 + `replaceChildren()` 清 DOM + 置 `sealed` 让在飞回调空转，**不回发 done**（主进程正在隐藏本窗）——照 `bubble/main.ts:107-114`
- 文件顶部注释写死一条禁令：**奖励窗永远不订阅 `progress:changed`**，它只吃一次性 `reward:play` 载荷。后人为了「实时点数」去改 `progress.ts:127-129` 的广播白名单，等于把节流广播引进一次性浮层，直接踩回 §6 的坑

**`app/electron.vite.config.ts`**：`:26` 后加 `reward: resolve(__dirname, 'src/renderer/reward/index.html')`。**忘了这行 = dev 完全正常、打包版开箱弹白窗**，是本方案最容易漏的一处（`RendererPage` 联合类型漏了 TS 会抓，input 漏了不会，只能靠 review）。

## 4. 主进程窗口管理

**`app/src/main/windows.ts`**（改动按位置）

1. `:19` 后加 `REWARD_W = 400 / REWARD_H = 300 / REWARD_OVERLAP = 16`（卡片压进桌宠窗侧边 16px；那 16px 是 contain 留白，压不到角色）
2. `:29` 后加 `let rewardWindow: BrowserWindow | null = null; let rewardSide: 'left'|'right' = 'left';`
3. `:33-44` `setPetScale()` 末尾追加 `syncRewardBounds()`（与既有 `syncBubbleBounds()` 同理——**不能只靠 resize 事件**，`:43` 已经因投递时机手工调过一次）
4. `:46` `RendererPage` 联合类型加 `'reward'`
5. `:91` `bubbleAnchor()` 之后加 `rewardAnchor(pet)`：
   ```
   wa = screen.getDisplayMatching(pet).workArea       // 不是 getPrimaryDisplay，规矩见 bubbleAnchor:83
   y  = clamp(pet.y + pet.height - REWARD_H - 8, pet.y, wa.y + wa.height - REWARD_H); y = max(y, wa.y)
   left = pet.x - REWARD_W + REWARD_OVERLAP
   if (left >= wa.x) return { x: left, y, side: 'left' }
   right = min(pet.x + pet.width - REWARD_OVERLAP, wa.x + wa.width - REWARD_W)
   return { x: max(right, wa.x), y, side: 'right' }
   ```
   **为什么是左侧、底边对齐**（把这段结论写进注释，防后人「顺手优化」）：头顶被气泡窗 340×500 占死（`bubbleAnchor:87` 底边压进桌宠顶边 24px，内容 `justify-content:flex-end` 永远堆在头顶）；脚下没空间（桌宠默认离工作区底边只有 20px，`:122`，往下必被夹回来盖住角色）；窗内居中会挡住角色本体，而开箱动效的看点就是角色和奖励同框；桌宠默认在工作区右下角（`:121`），左边是最大空场，且**串门模式是向右拓宽**（`:301` `width: size*2`，角色留在左）→ 左锚点在串门时依然紧贴角色，这是选左不选右的决定性理由。触发点（HUD 宝箱）在窗底部，卡片底边对齐窗底边 → 点击点与结果出现点同一水平线，读起来是「从宝箱里横着炸出来」
6. `syncRewardBounds()`：`isVisible()` 短路 → `setPosition(x, y, false)` **只移不改尺寸** → side 变了才 `send('reward:anchor', side)`
7. `:138-139` 两个 handler 改成 `petWindow.on('move', () => { syncBubbleBounds(); syncRewardBounds(); })`，`'resize'` 同
8. `:141-144` `petWindow.on('closed')` 里 `closeBubbleWindow()` 旁加 `closeRewardWindow()`
9. `createRewardWindow()` / `showRewardWindow()` / `hideRewardWindow()` / `closeRewardWindow()` / `getRewardWindow()`，逐字段对齐 `createBubbleWindow()` `:193-218`：`transparent / frame:false / hasShadow:false / resizable:false / focusable:false / skipTaskbar:true / fullscreenable:false / show:false` + `setIgnoreMouseEvents(true)` + `setAlwaysOnTop(true,'floating')` + `setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true})`。懒创建（99% 时间不开箱，不预先吃一个 renderer 进程，同 `:192` 注释）；此后**只 hide 不 close**（再开箱瞬时可见，无第二次白窗）。`showRewardWindow()` 严格照 `:220-233`：**先 `setPosition` 再 `showInactive()`**，顺序颠倒会在旧坐标闪一帧（上次开箱后桌宠可能已被拖走）。`hideRewardWindow()` 严格照 `:240-245`：**先 `send('reward:clear')` 再 `hide()`**
10. `:294-306` `setPetVisitMode()` 末尾追加 `syncBubbleBounds(); syncRewardBounds();` —— 顺手修既存不一致（改窗宽却漏调 bubble，串门时气泡错位）
11. `:337` `openRoomWindow()` 里 `hideBubbleWindow()` 旁加 `hideRewardWindow()`

**新建编排器 `app/src/main/reward.ts`**，逐行对应 `main/bubble.ts`（26 行）：`pushRewardCard(payload)` → `isRoomOpen()` 直接 return → `showRewardWindow()` → `isLoading()` 则暂存（`PENDING_MAX = 1`，只留最新一张）+ `once('did-finish-load')` 补发 → 否则直接 send。依赖方向单向 `reward.ts → windows.ts`，理由同 `bubble.ts` 头注释。

## 5. IPC 契约（按 `ipc-types.ts → preload → main/ipc.ts` 顺序改）

| 通道 | 类型 | 方向 | 载荷 |
|---|---|---|---|
| `progress:openBox` / `progress:changed` | 已存在，**零改动** | — | — |
| `reward:show` | send | pet renderer → main | `RewardCardPayload` |
| `reward:play` | send | main → reward renderer | `RewardCardPayload` |
| `reward:anchor` | send | main → reward renderer | `'left' \| 'right'` |
| `reward:clear` | send | main → reward renderer | 无 |
| `reward:done` | send | reward renderer → main | 无 |

`ipc-types.ts`（`OpenBoxResult` `:230-232` 之后）：
```ts
/** 开箱奖励卡载荷。isNew/count 由 pet 侧从 openBox 返回的权威 progress 现算——
 *  绝不能让 reward 窗自己查 progress:changed（那条节流，会合并掉本次开箱） */
export interface RewardCardPayload {
  stickerId: string;
  tier: FurnitureTier;
  isNew: boolean;
  count: number;
}
```
`QBotApi` 的 `bubble` 块之后加 `reward: { show(p): void; onPlay(cb): () => void; onAnchor(cb): () => void; onClear(cb): () => void; reportDone(): void }`。
`preload/index.ts`：`:132-144` bubble 块之后照抄一个 `reward` 块（`show`/`reportDone` 走 `send`，三个 `on*` 走 `ipcRenderer.on` + 返回退订闭包）。
`main/ipc.ts`：`:245-246` bubble 段之后加 `ipcMain.on('reward:show', (_ev, p) => pushRewardCard(p))` 与 `ipcMain.on('reward:done', () => hideRewardWindow())`。**主进程不重新校验 payload**——它只是展示数据，扣费权威在 `progress.openBox()`。

## 6. 开箱时序（`local-main.ts` 的 `doOpenBox()`）

形态对齐 `inventory-panel.ts:185-202`，但去掉整块 `render()` 重绘：

```
点击 .hud-chest
 ├─ hudBusy 已 true → return                         （防连点第一道）
 ├─ hudBusy = true；chest.disabled = true（停呼吸、45% 透明）
 │    ↑ 乐观禁用：500 点是真金白银，绝不能等 await 回来才禁
 ├─ hud.floatSpend(POINTS_PER_BOX)                   // 「−500 ↑」立刻飘，点击有回声
 ├─ const r = await window.qbot.progress.openBox()   // 既有通道，主进程唯一权威
 ├─ r.ok:
 │   a. { isNew, count } = classifyOpenBox(r.progress, r.stickerId)
 │   b. hud.setProgress(r.progress)                  // 大额走 400ms tween
 │   c. window.qbot.reward.show({ stickerId, tier: r.tier, isNew, count })
 │   d. 可选彩蛋：举牌一次性文字「开出了「山水挂画」」（local-main.ts:209/:213-224 的既有机制，零新概念）
 └─ !r.ok: hud.toast(r.error)                        // 不弹卡、不弹原生 dialog
 finally: hudBusy = false；按最新 progress 重算宝箱可见性（不够开就自然收回去）
```

**失败提示绝不弹原生 dialog**：桌宠窗从无 `dialog` 惯例（全仓 `dialog.show*` 只在 `ipc.ts` 的 `hatch:saveCard` 与 hooks 安装，都是常规窗），透明置顶窗弹模态会抢焦点、打断用户手上的活。用 `.hud-toast`：贴在药丸上方、琥珀 `border-left`（沿用气泡 `attention` 的 `#e0a33e`）、2.5s 自动收、**收之前先 `clearTimeout` 旧定时器**（同 `inventory-panel.ts:231`）。因为宝箱只在够开时才出现，失败几乎只有两种来路——极限连点绕过乐观禁用（第二发被主进程挡下）、`progress.json` 写盘异常——都属「说清楚就行，不需要打断」。

**回弹竞态（最隐蔽的一条）**：`progress:changed` 是 1s 节流（`progress.ts:44`）。开箱前入队的那条广播携带**扣款前**的 points，可能在 `openBox()` 返回**之后**才送达，HUD 会把 500 点加回去、显示 1s 再掉下来。所以 `:177` 的 `onChanged` 回调必须走 `isStaleProgress(local, incoming)` 门控。**测法**：狂敲键盘（持续加分）的同时点开箱，看数字有无回弹。

同理，**新/重复判定绝不能靠广播**（多次开箱会被合并，`inventory` 只剩最终态）→ 一律用 `openBox()` 返回值里的 `progress.inventory[stickerId]`。这是 `ipc.ts:124-126` 那条「一次性结果走 invoke、幂等状态走广播」的直接应用。

## 7. 明确不做

- 不新增 npm 依赖（含 jsdom）；不动任何玩法数值；不碰 `pipeline/`
- 不生成任何美术（花钱，要先问）——宝箱走手写内联 SVG
- HUD 不显示箱子数、不显示挂机进度条（用户明确要求）。附带好处：不会诱使人去 import 主进程的 `idleProgressRatio()`（`progress-rules.ts:94-96`），坑 12 的诱惑自然消失
- 不改房间面板的开箱/合成流程
- **不做气泡窗与奖励窗的互斥**。几何：petScale ≥ 1 时卡片顶边 `pet.y+52`、气泡底边 `pet.y+24`，净空 28px 零重叠；petScale = 0.5 时 `clamp` 下界生效，仅在 ~64px 宽的窄条上交叠，而奖励窗是后 show 的（同层 `alwaysOnTop` 后显者在上），3.5s 后自行消失，气泡（10s TTL）随即完整露出。这是「小缩放 + 恰好有 agent 气泡 + 恰好在那 3.5s 内」的三重巧合，任何互斥方案都得动 `syncBubbleBounds` 或引入跨窗状态机，成本收益完全不成比例
- 奖励窗**不做**「60s 无新卡则 close」的省内存优化（多一个定时器 = 多一个坑 18 入口）。懒创建 + 只 hide 常驻约 40-60MB，气泡窗同策略已在跑
- **已知取舍**：桌宠窗可聚焦（无 `focusable:false`），点 HUD 会把焦点从用户编辑器抢过来。现状点桌宠拖拽也如此，属既有行为；不为 HUD 单独加 `focusable:false`（会连带破坏拖拽与举牌输入框 `:668` 的 `focus()`）。用户抱怨再单独处理

## 8. 实施顺序（每步独立可验，均不破坏现状）

1. `hud-format.ts` + `furniture.ts` 的 `canAffordBox` + `pet-hud.test.ts` → `npm test -w app`（247 → 约 260）
2. `hud.ts` + `pet/index.html` 的 CSS + `local-main.ts` 接线 → **此时点宝箱只扣数不弹卡，HUD 已可独立交付**
3. `reward-card.ts` + `reward-card.test.ts`
4. `reward/{index.html,main.ts}` + `main/reward.ts` + `windows.ts` 全套 + `ipc.ts` + `preload` + `ipc-types` + **`electron.vite.config.ts`**（同一次提交完成，input 与联合类型两处并列别漏）
5. `npx tsc --noEmit -p app` + `npm test -w app` + 报告 + 文档

## 9. 验证

```bash
npx tsc --noEmit -p app && npm test -w app
```

人工走 `.claude/skills/verify` 的隔离实例（不打扰正在跑的那个）：

```bash
mkdir -p /tmp/qbot-verify && cd app && QBOT_USER_DATA=/tmp/qbot-verify npx electron-vite dev -- --remote-debugging-port=9223
```

CDP 逐条（`node scripts/cdp.mjs "pet/index" "<js>"`、`node scripts/cdp-shot.mjs "pet/index" out.png`）：

1. HUD 在桌宠窗底部不压角色；注水到 12480 看是不是 `12 480`（U+00A0）
2. **底部条带空白处仍能拖窗、仍能右键弹菜单**（穿透分层回归，最容易做坏的一处）
3. 不够开时**没有**宝箱；`debugGrantPoints(500)` + `debugGrantBoxes(1)` 后浮出并呼吸
4. 点宝箱 → 飘 `−500` / 数字 tween / 奖励窗弹出（截图存证）→ 约 3.5s 自渐隐、窗口隐藏
5. `debugGrantFurniture(id)` 造重复件后再开同一件 → 卡面变「已有 N 件 · 可用于合成」；epic 件看时长变体
6. 狂敲键盘的同时点开箱 → 点数**不回弹**（§6 竞态回归）
7. 拖动桌宠 → 奖励窗跟随且始终在左侧；`settings.set({petScale:0.5})` 与 `2` 各看一次 HUD 可读性与卡片重定位；串门模式看 HUD 是否留在宿主半边
8. 打开调试面板 → HUD 隐藏；关掉 → 回来
9. 连点两次开箱（间隔 1s）+ 中途开小房间 → 第二张卡完整播完、桌面无残留（坑 18 回归）

收工把结果写进本目录的 `REPORT.md`，并更新 `CLAUDE.md`：「游戏化积累」段补两句（HUD 落点 + 奖励窗是第 7 个 renderer），仓库结构表里已过时的「五 renderer」改成「七 renderer：pet + hatch + room + bubble + studio + market + reward」。

## 10. 风险 / 坑对照

| 坑 | 处理 |
|---|---|
| 4 / 18 透明窗 resize 渲染 bug | 奖励窗固定 400×300、`resizable:false`、只 `setPosition`；卡片字号不吃桌宠窗的 vh |
| 18 隐藏窗定时器节流 | `hideRewardWindow()` 先发 `reward:clear`；renderer 清**全部** 5 个串联相位定时器 + `sealed` 标志。比气泡更危险：`reportDone` 会**反向**驱动主进程 hide，一个逃逸的 done 定时器就能瞬杀下一张卡 |
| 12 renderer 不许 value import pipeline | 只 value import `shared/furniture.ts`（零依赖）与 `room/decor-pack.ts`（唯一 import 是 type）；`Progress`/`RewardCardPayload` 一律 `import type` |
| renderer 不许 import 主进程 | 用 `shared/furniture.ts` 的 `canAffordBox`，不碰 `progress-rules.ts` |
| 节流广播合并 / 回弹 | 新旧判定只用 `openBox()` 返回值；`onChanged` 走 `isStaleProgress` 门控 |
| petScale / 串门改窗宽 | `setPetScale` 与 `setPetVisitMode` 都显式调 bubble + reward 同步（顺带修 visit 漏调 bubble 的既存 bug） |
| 多显示器 / 贴边 | `rewardAnchor` 用 `getDisplayMatching(pet).workArea`，x 左右各夹一次、y 上下各夹一次（副屏在主屏上方会让 `wa.y < 0`）。极小屏左右都放不下时与桌宠重叠，可接受降级 |
| 首张卡赶上窗口刚创建 | `main/reward.ts` 的 `isLoading()` 暂存 + `did-finish-load` 补发 |
| 连点扣两次点 | `hudBusy` + 乐观禁用（不等 await） |
| 拖拽被 HUD 吞掉 | 容器 `pointer-events:none`，只两小块 `auto` |
| 打包入口漏配 | `electron.vite.config.ts` 的 input 与 `RendererPage` 两处并列改；失败模式是「dev 正常、打包白窗」 |
| 远端替身窗误挂 HUD | 只在 `local-main.ts` 实例化 |

## 附：本次范围之外、已诊断待修的两处

Studio 给市场角色生成自定义动作会 ENOENT 失败。根因：`packCharacterDir` 只打包 `manifest.json` + 完成的 `.webm`，而 `manifest.turnaround` 仍指向 `turnaround.png`（悬挂引用），`generateCustomAction`（`pipeline-bridge.ts:398`）无条件读它。同一根因也影响市场角色的「重生三视图」/ redo。

- **修 A**：Studio 侧检测 `turnaround` 缺失 → 禁用自定义动作表单并给明确说明，取代裸 ENOENT
- **修 C**：`packCharacterDir` 带上 `turnaround.png`（每包 +~370KB；对已上传的皮肤无效；需要先定分发策略——注意 `sanitizeManifest` 的脱敏边界：persona 永不出本机）

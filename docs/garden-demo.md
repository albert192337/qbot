# 小小花园 demo

## 2026-09-15：变异概率收敛（覆盖下方历史数值）

所有词条基础概率统一降为原来的 1/10，保留独立叠加和原有相对稀有度。闪亮/薄荷/珊瑚/朋克/古典/萤火/花雨各 0.8%，紫色 1.3%，巨大化 0.9%，双生 1%，鎏金 0.6%，虹彩 0.35%，冰冻 0.45%，雷击 0.25%。

满级、无继承基因、无音乐的普通种子首轮理论分布：不施肥约 90.04% 原生 / 9.49% 单变异 / 0.47% 多变异；使用初级/中级/高级变异肥料后，至少一项变异的概率约 23.10% / 27.07% / 34.46%。音乐仍只提升两种音乐配饰，满级高级肥料+音乐时仍约 57.36% 原生。不是直接把各词条概率相加。

旧植物和已收获产物不重抽、不重算价格；继承种子仍保留已获得基因，果树后续批次仍保留本体基因。上述分布仅针对普通种子，不能套到有基因的繁育种子或后续批次。规则回归新增 48 万次固定种子抽样，覆盖两个等级、音乐开关和三档肥料。

## 2026-09-15：叠加变异特效

- `mutation-effects.ts` / `.css` 在统一 `art()` 接入：土地、背包、图鉴、亲本、种子与收获复用实际 PNG/SVG 的透明轮廓。双生的两张图分别遮罩；环境粒子跟随实际图片尺寸，不占据植物布局框的上方空白。
- 虹彩改为独立渐变层，保留底图细节；鎏金增加扫光；闪亮使用星芒粒子。冰冻为表面冰纹、浮动结晶、冷雾；雷击为分叉电弧、蓝光白芯、电荷火花和局部亮起。按模块叠加，不制作组合图片。
- 新增 `frost`（冰冻、本体、Lv.1、每次基础抽取 4.5%、售价 ×2）、`thunder`（雷击、配饰、Lv.1、每次基础抽取 2.5%、售价 ×2.5）。沿用独立抽取、变异肥料额外机会、遗传和图鉴；音乐不增加这两项概率。本体沿用多次采摘的保留规则，配饰随下一批抽取。已有存档的词条和售价不重算。
- 收获卡依次出现植物和词条，并展示变异数量及词条售价倍率；显示的售价仍取已结算产物。没有额外重抽、虚构中奖概率或修改原有词条概率。
- 四效果组合每件最多 18 个粒子，双生只复制表面层；共享可见性/尺寸观察器，离屏或页面隐藏暂停，DOM 移除时解除观察，减少动态效果时静态呈现。
- 验证：`npm test -w app -- garden`（39 项）、`npx tsc --noEmit -p app`、`npm run build -w app`；`node_modules/.bin/electron.cmd scripts/test-garden-mutations.cjs` 用独立临时存档与禁用网络的真实 Electron 渲染，覆盖九物种、PNG/SVG、单项/组合/双生、实际收获结果、480px 窗口和减少动态效果。截图 `.superpowers/garden-mutations/`。未做长时 CPU/GPU 或大库存性能验收，未重新打包发布。

## 桌宠联动与视觉迭代

播种/收获提交成功才触发表演，失败不移动。花园展开时，桌宠短暂出现在对应土块内侧；土地锚点保持在原位，演出结束回到原位置。优先播放自定义动作 `garden_sow`（播种）与 `garden_harvest`（收获庆祝）；未生成时分别回退已有 wave、talk_happy，再回退 idle，不冒充新动作已生成。拖动、收起、隐藏、切换角色取消演出。逻辑在 `main/garden/windows.ts`，定位计算独立于经济规则，动作播放使用 `garden:performance` 通道。

小芽有成熟作物时显示金色小星点、轻摆和暖光，减少动态效果时静态呈现。管理页采用奶油纸面、薄荷绿按钮、彩色肥料袋和植物贴纸图鉴；未发现因子淡化为剪影，发现后有收集标记。继续保留桌面的 280×350 小操作卡。

验证：22 项花园单测；真实 Electron 的花园完整流程、快捷操作、桌宠播放/星点/拖拽回归通过。新增青蛙专用视频尚未提交付费接口，待用户确认费用。

2026-09-10。经讨论确认：跟随桌宠；一次收获；离线生长、不枯萎；高品质临近成熟有光效；花园币独立；宝箱改发花园补给；跨物种繁育、子代随机随一方；图鉴按物种与单因子记录。

## 试玩

2026-09-10 桌面交互调整：土地现在弹出最多 280×350 的小菜单，直接选种子/施肥/繁育；点成熟花朵本身直接收获，收获与繁育结果均留在地块上方小卡，不再放大或遮罩。卡片保留图片、词条、产物重量和售价；繁育种子重量待成熟揭晓。关闭收获展示后可用刚收获的植物继续繁育。小菜单按 Escape、失焦或收起花园关闭。鼠标在菜单和滚动区域时接收输入，其余透明区域继续穿透。外部移除植物名称、倒计时等文字，成熟用小星芒表示，背包/商店/图鉴改为彩色手绘风图标（保留悬停说明）。修复成熟状态刷新在渲染期间递归创建重复菜单的问题，且菜单创建前统一清理旧实例。

种子按物种、继承基因和亲本组合分组显示数量，肥料列出剩余数和已施状态；管理页面顶栏也展示种子与三种肥料余量。桌宠幼苗图标在有成熟植物时只有微弱呼吸光，没有额外文字或数量徽标；收起花园期间也按本地成熟时间触发，全部收获后停止，减少动态效果时用静态微光。

桌宠宝箱右侧的幼苗按钮展开左右各三块地，右侧提供背包、商店、图鉴入口。点土地或植株打开该地块操作页；种植后可分别使用三类肥料。成熟植株可先繁育，也可收获到背包再繁育或出售。出售有二次确认。

初始赠送三物种各两粒种子、三类肥料各两份、180 花园币。操作页底部明确标注 `测试：立即成熟`，只推进已有植物的成熟时间，不重抽词条和重量；demo 中始终可见，正式发布前应隐藏。

## 当前可调整数值

| 项目 | 默认值 |
| --- | --- |
| 草莓 / 向日葵 / 莲花生长时间 | 3 / 5 / 8 分钟 |
| 商店 | 每 5 分钟随机抽两种种子及随机肥料，每件限量 |
| 收获 | 每株一次，腾空土地，重量与词条永久随产物保存 |
| 基础重量 | 物种标准重量 × 0.65～2.35；巨大化额外 ×4 |
| 价格 | 种子价格 ×2 ×相对标准重量 ×各词条倍率乘积 |
| 加速 / 变异 / 增重肥料 | 剩余时间减半 / 额外变异抽取 / 重量增加 50% |
| 施肥限制 | 生长期间每种肥料每株一次 |
| 繁育 | 两株不同成熟植物，可跨物种，物种各 50%，双方词条去重后各 50% 继承 |
| 繁育资格 | 每株终生一次，收获不重置，亲本不消耗；不继承“资格已用”状态 |
| 子代额外变异 | 种下时按子代物种的当前图鉴等级抽取；已继承基因不受等级限制 |
| 首次发现 | 收获时解锁原生及各词条；每项 20 现有积分 +20 物种经验 |
| 图鉴等级 | Lv.2 为 40 经验，Lv.3 为 80 经验；解锁鎏金、虹彩随机因子 |
| 宝箱 | 保持 1 箱 +500 积分的成本，改为随机种子 ×1 +随机肥料 ×1 |

已有家具库存与合成保留；当前宝箱不再产生家具。种子、肥料与产物不会混入家具库存。

## 模块边界

- `app/src/shared/garden.ts`：花园类型、目录、数值及可供渲染层调用的纯函数，零 Electron 依赖。
- `app/src/main/garden/rules.ts`：纯状态变更，时间与随机数注入，便于改玩法和测试。
- `app/src/main/garden/service.ts`：串行命令、独立 `userData/garden-demo.json` 存档、备份、原子替换、跨积分存档交易日志。
- `app/src/main/garden/windows.ts`：透明花园窗口与管理窗口、跟随/隐藏、花园 IPC。
- `app/src/renderer/garden/`：土地、背包、商店、图鉴、繁育抽屉、收获演出和素材；没有复用家具或孵化控制器。
- 原模块仅接入 HUD 按钮、窗口跟随生命周期、preload 契约、宝箱奖励展示与积分接口。

跨文件积分交易采用 pending 日志 + `progress.gardenTransactions` 幂等收据：先保存待结算记录，再写积分，再提交花园状态。中断后恢复不会再次扣费/领奖。写盘失败会向界面报错；有效备份可恢复，主档与备份都损坏时保留原文件并停止写入。

透明桌宠原有尺寸不改变。花园使用自己的固定尺寸窗口，只移动位置；透明空白处穿透鼠标，地块、植物与工具按钮可以点击。打开时给桌宠左右留出土地空间。关闭花园不会清除作物，进入房间时随桌宠隐藏。

## 美术

使用内置 imagegen 生成透明 PNG，保存到 `app/src/renderer/garden/assets/`：`lotus.png`、`strawberry.png`、`sunflower.png`、`sprout.png`。图像生成没有调用仓库配置中的收费生图接口。

三种植物采用同一提示词，替换 subject：

> Create a single 2D desktop garden game plant sprite: [subject]. Style like a very simple cute hand-drawn doodle: thick slightly wobbly black marker outlines, flat pastel color fills, very few interior details, no gradients, no realism. Entire upright plant isolated on genuinely transparent background, bottom stem anchored at bottom center, generous transparent margin, square canvas. No pot, no soil, no text, no face, no other objects. This is a project-ready transparent PNG game asset. Tiny thumbnail readability.

subject 分别为：

- lotus flower, pink petals on a green stem with two rounded leaves
- strawberry plant with three red strawberries and simple rounded green leaves
- sunflower with a large yellow flower, brown center and two green leaves

幼苗提示词：

> Single tiny seedling sprite for a cute desktop garden game. Just one short curved green stem and TWO simple rounded leaves, one on either side, no flower no fruit. Thick wobbly black hand drawn marker outline, flat muted green fill, deliberately simple like a child's doodle, no shading, no texture. Upright front view entire seedling centered with bottom stem near lower edge, square canvas, truly transparent background. No pot no soil no text no other objects.

前 55% 生长期显示幼苗；之后显示成熟形态，巨大化放大、双生复制、异色调色、闪亮粒子可叠加；80% 后紫色/金色/彩色品质增加光效。这是组合表现验证，后续可替换为专门绘制的生长阶段和杂交美术。成熟体积受当前显示器可用空间限制。

## 验证

- `app/test/garden-rules.test.ts`：种植、离线、施肥、重量、遗传、跨地块/背包繁育、库存、图鉴、出售、坏档。
- `app/test/garden-service.test.ts`：并发开箱、扣费后保存中断恢复、余额不足、重启库存与坏档保留。
- `scripts/test-garden-ui.cjs`：真实 Electron/preload/渲染层及花园服务，独立临时数据，HTTP 禁用；种植→成熟→收获→繁育→图鉴领奖→购买→开箱→重载，校验窄窗口与图片加载。
- Windows 无 npm 命令但已有依赖时：根目录 `node_modules/.bin/tsc.CMD --noEmit -p app`；app 目录 `node_modules/.bin/vitest.CMD run test/garden-rules.test.ts test/garden-service.test.ts test/progress-rules.test.ts test/p0-rewards.test.ts`；app 目录 `node_modules/.bin/electron-vite.CMD build`；根目录 `app/node_modules/.bin/electron.CMD scripts/test-garden-ui.cjs`。
- 原生截图：`.superpowers/garden-preview/`（隔离 fixture，不是用户真实植物）。
- `app/test/garden-quick.test.ts` 验证种子分组与收起状态的成熟提示；`scripts/test-garden-quick.cjs` 用真实 Electron 输入验证播种/施肥/点花收获/背包亲本繁育，断言不打开管理窗、菜单尺寸、Esc 与穿透状态。

待后续产品迭代：平衡售价与长期稀缺度、多阶段生长美术、更多物种、真实跨物种新形态、图鉴等级扩展、多人共享花园。当前不做网络同步。

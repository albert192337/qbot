# 小房间 v2：背景美化 + 透明贴纸窗 + 装饰系统 设计

日期：2026-07-12
状态：已批准
前置：`2026-07-12-room-window-design.md`（小房间 v1，已实现合入 main）。串门系统明确后置。

## 一、产品决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 背景美化 | **离线生图固化**：开发期用 gpt-image-2 生成 2~3 张候选，用户挑一张固化为内置默认房间；不做运行时生成 |
| 窗口形态 | **无边框透明贴纸窗**：只显示房间实体，外沿透明；悬停浮现关闭钮 + 空白处拖动移窗 + ESC/右键菜单关闭 |
| 装饰素材 | **内置贴纸包**（gpt-image-2 离线生成 8~12 个透明底贴纸，风格与房间统一）；用户本地图片、运行时 AI 生成均后置 |
| 装饰编辑 | **编辑态 + 墙面透视**：右键菜单「布置房间」进入；拖入摆放、选中后移动/缩放/删除；贴到左右墙自动仿射变形；退出保存；非编辑态装饰纯展示 |
| 持久化 | 摆放数据存 userData `room-decor.json`，按房间名键控，重启保留 |

## 二、背景生成（离线工具脚本）

`scripts/gen-room.mts`（仓库工具，不进 app 运行时；`npx tsx` 执行，key 读 config.local.json）：

1. **参考图**：隔离实例开房间窗（不激活角色）CDP 截图，作为 `/images/edits` 的参考图锁构图——等距两面墙 + 菱形地板的几何与现 SVG 一致，**地板/墙面/轮廓多边形坐标全部沿用**（按 1024/800 等比缩放），不用重标。
2. **prompt**：同构图重绘：等距小房间、两面墙 + 菱形木地板、温馨中式贴纸风、精细陈设、粗描边、无角色无文字。
3. **外沿透明**：先试 OpenAI 兼容参数 `background: transparent`；服务端不支持（报 4xx 或返回不带 alpha）则回退：prompt 要求纯绿底 `#00FF00`，ffmpeg colorkey 抠透明（与管线绿幕首帧同思路，容差沿用 chroma.ts 经验值起步，人眼校验后微调）。
4. 产出 2~3 张候选（1024×1024，每张 5~10 分钟）→ 贴给用户挑选 → 选定 PNG 固化为内置默认房间背景（进 repo），现有 SVG 保留作 fallback 与后续再生成的参考图模板。

贴纸包用同一脚本的 `--decor` 模式：按清单（挂画/灯笼/盆栽/圆窗/时钟/书架/屏风/茶壶等 8~12 项）逐个生成透明底贴纸，抠像后落 `decor` 目录 + `decor-pack.json`（`{ id, name, image, defaultW }`）。

## 三、透明贴纸窗

- `openRoomWindow`：`transparent: true, frame: false, hasShadow: false`，`resizable: false` 保持（透明窗 resize 渲染 bug）；尺寸仍 560×560；`useContentSize` 不再需要标题栏补偿但保留无害。
- **RoomSpec 新增 `outline`**（房间实体外轮廓多边形，背景图坐标系）。
- **四角透明区穿透**：renderer 监听 `mousemove`，`pointInPolygon(点, outline)` 判定；出实体 → `room:setIgnoreMouse(true)`（主进程 `setIgnoreMouseEvents(true, { forward: true })`），进实体恢复 false。防抖：状态变化时才发 IPC。
- **拖动移窗**：房间实体内空白处（非角色/非装饰/非编辑态）按住拖动，复用 pet 窗模式：`screenX/Y` 差值 + rAF 节流 + `room:move` IPC（`send` 高频不 invoke）。
- **关闭**：① hover 房间实体时右上角浮现 × 钮（淡入淡出）；② ESC；③ 右键菜单「关闭房间」。全部走 `window.close()`，主进程 `closed` 事件恢复 pet 窗的既有逻辑不变。
- 右键菜单：房间内自绘菜单（复用 pet 窗菜单样式）：「布置房间」「关闭房间」。

## 四、装饰系统

**数据**

```ts
// decor-pack.json（内置，随贴纸包固化）
interface DecorSticker { id: string; name: string; image: string; defaultW: number }

// userData/room-decor.json（按房间名键控）
type DecorFile = Record<string, DecorPlacement[]>;
interface DecorPlacement {
  id: string;        // uuid
  stickerId: string;
  x: number; y: number;   // 房间坐标系，贴纸中心点
  scale: number;
  zone: 'wallL' | 'wallR' | 'free';
}
```

- IPC：`decor:get(roomName): DecorPlacement[]`、`decor:set(roomName, placements)`（主进程读写 userData/room-decor.json；写失败仅 console.error，不阻塞 UI）。
- 未知 `stickerId`（贴纸包升级删除素材）加载时静默丢弃。

**RoomSpec 新增**：`wallL/wallR` 多边形（墙面区域，drop 判定）+ `outline`。左右墙透视用**常量 2D 仿射矩阵**（等距墙面 = skewY ±26.57° 一类的仿射变换，不需要 matrix3d）：`wallMatrixL/R` 一并放进 RoomSpec。

**渲染**：装饰层 `#decor` 位于背景图之上、角色之下；每个装饰一个 `<img>`，`transform: translate(中心定位) scale(s) [wall 矩阵]`。非编辑态 `pointer-events: none`。

**编辑态**（`room/decor-editor.ts`，状态与操作写成纯函数 reducer + DOM 驱动分离）：

- 进入：右键菜单「布置房间」→ 底部滑出装饰栏（贴纸横排缩略图）；**暂停漫游**（清定时器、角色定格 idle、点角色互动禁用）、暂停 Speaker 自主发言。
- 摆放：从装饰栏拖贴纸进房间 → drop 点做 zone 判定（`pointInPolygon` 对 wallL → 'wallL'，wallR → 'wallR'，否则 'free'）→ 新增 placement，wall 区自动套透视矩阵。
- 编辑：点选装饰出手柄框——拖动移动（移动中实时重判 zone 并切换变形）、右下角手柄缩放（0.3~3 夹取）、× 删除。
- 退出：「完成」按钮 → `decor:set` 保存 → 收起装饰栏 → 恢复漫游与发言。
- 编辑态下窗口拖动禁用（避免与装饰拖动冲突）；ESC 在编辑态先退出编辑态，非编辑态才关窗。

## 五、错误处理

- 生成背景 PNG 缺失/损坏 → fallback 到 v1 SVG 房间（RoomSpec 常量兜底）。
- room-decor.json 解析失败 → 视为空摆放，不覆盖写（用户手改坏文件时保留现场），进入编辑态保存时才重写。
- 穿透 IPC 失败静默（最坏情况 = 四角拦截点击，v1 现状）。

## 六、测试

- 纯函数单测：zone 判定（wallL/wallR/free 边界）、编辑 reducer（增/移/缩放夹取/删/序列化往返）、outline 穿透判定切换（进出实体只在状态变化时产生指令）。
- `pointInPolygon` 从 roam.ts 提到 `room/geometry.ts` 共用，roam 测试路径同步更新。
- `npx tsc --noEmit -p app` + `npm test -w app`。
- `/verify` 真机：透明窗视觉（截图）、四角穿透、拖窗、hover 关闭钮、ESC、编辑态摆装饰（墙面变形）、重启后装饰保留、fallback（临时改坏背景路径）。

## 七、实施顺序

① 透明贴纸窗（含 outline/穿透/拖窗/关闭钮，不依赖生图）→ ② `scripts/gen-room.mts` 生成背景候选 → 用户挑图 → 固化 → ③ 贴纸包生成 + 装饰系统。每步独立提交、独立验证。

## 八、非目标（本期不做）

- 运行时生成房间/装饰（接口不预留，需要时再改）。
- 用户本地图片作装饰。
- 装饰与角色的遮挡排序、地面装饰碰撞（角色可从装饰上走过）。
- 多房间、串门/联机。

# 小房间窗体（Room Window）设计

日期：2026-07-12
状态：已批准
前置讨论：单击桌宠弹出等距家居小房间，角色在里面活动。画风参考「玉缘斋」等距房间贴纸（两面墙 + 菱形地板 + 简单陈设）。属于 2026-07-11 头脑风暴排期的第 3 子系统，为后续「串门 / 联机」的房间场景打地基。

## 一、产品决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 房间背景来源 | **内置预置房间图**（不走 AI 生成）；v1 由代码手绘 SVG，配色对齐参考图；格式可扩展，将来可换 PNG / 增加多房间 |
| 角色形态 | **复用现有 6 段正面视角动作 webm**，不扩管线；走动 = idle 动画 + 平移 + 远近缩放（贴纸风不讲究行走朝向） |
| 交互范围（本期） | ① 角色自主活动（漫游/发呆/睡觉/喝茶/冒泡说话）② 点角色互动（talk_happy + 说一句） |
| 交互范围（后置） | 家具热点互动、装修/收集系统 |
| 触发与去留 | **单击桌宠 → 角色走进房间**：桌面 pet 窗隐藏、房间窗弹出；关房间窗 → pet 窗回来。同一时刻角色只在一处。原单击动作 talk_happy 保留在右键菜单（已有「聊天·开心」项）与房间内点角色；双击=说话不变 |
| 窗口形态 | 常规系统边框窗口（同孵化窗），约 560×560，不可缩放，非置顶 |

## 二、技术方案

**方案 A：独立 room 窗口 + 第三个 renderer**（已选定）。

- 新增 `app/src/renderer/room/`，与 pet / hatch 平级；electron-vite `renderer.build.rollupOptions.input` 加 `room` 入口。
- `windows.ts` 加 `createRoomWindow()` / `getRoomWindow()`；主进程负责 pet ↔ room 的显隐流转。
- 角色播放层复用现有 `Player`（webm 堆叠、visibility 硬切）；语音复用 `Speaker` + 语音包。

否决项：pet 透明窗原地变形（透明窗 resize 有已知渲染 bug，见 `windows.ts` 中 `resizable: false` 的注释）；塞进 hatch 窗口（孵化室是生产工具，语义与生命周期不符）。

## 三、房间资产格式（RoomSpec）

v1 房间打进 renderer bundle，不走 `qbot-asset://`：

```
app/src/renderer/room/rooms/
  types.ts       # RoomSpec 类型
  default.ts     # 默认房间：SVG 背景 + 地板多边形 + 缩放参数
  default.svg    # 手绘等距房间：两面暖色墙 + 菱形木地板 + 简单陈设（柜子/挂画）
```

```ts
interface RoomSpec {
  name: string;
  /** 背景图 URL（vite import 的 svg/png 均可） */
  background: string;
  /** 背景图设计尺寸（floor 坐标的参考系） */
  width: number;
  height: number;
  /** 地板可行走区多边形（背景图坐标系，顺时针） */
  floor: Array<[number, number]>;
  /** 角色在地板最下缘 / 最上缘的缩放（等距假透视） */
  scaleNear: number;   // 例 1.0
  scaleFar: number;    // 例 0.62
  /** 角色显示基准高度 px（缩放 1.0 时） */
  petHeight: number;
}
```

将来「串门 / 联机 / 多房间」需要动态房间时，把 RoomSpec 序列化为 `room.json` 挪到 resources + 协议加载即可，类型不变。

## 四、窗口与进出流转

- `createRoomWindow()`：560×560、`resizable: false`、常规边框、非置顶、title = 角色名的家（如「小玉的家」；无激活角色时用「小房间」）。dock 处理同 hatch 窗（打开时 `app.dock.show()`，关闭且无其他常规窗时 hide）。
- **打开**：pet 渲染进程单击判定（现有 250ms 双击判定逻辑不变）→ 单击分支从 `PLAY_ACTION talk_happy` 改为 `window.qbot.room.open()`（`ipcMain.on('room:open')`）→ 主进程 `petWindow.hide()` + `createRoomWindow()`。
- **关闭**：room 窗 `closed` 事件 → `petWindow.show()`。用 `closed` 兜底意味着渲染进程崩溃、Cmd+W、红点关闭全部走同一恢复路径。
- **角色数据**：preload 加 `characters.getActive(): Promise<CharacterMeta | null>`（`ipcMain.handle('characters:getActive')`，按 `settings.activeCharacter` 读 manifest）。room 渲染进程启动时主动拉取，不依赖广播时序。
- **切角色时房间同步**：把「向 pet 窗 send `characters:activated`」收敛为 `broadcastActivated(meta)` 辅助函数（ipc.ts 与 tray.ts 现在各写了一份），同时发给 pet 窗和 room 窗（存在时）。room 收到后原地换角色重载。

## 五、漫游控制器（roam.ts，room 核心逻辑）

仿照 `pet/state-machine.ts` 的纯函数 + 注入 rng 风格，新增 `room/roam.ts`：

- **状态**：`resting(pos)` →（定时器）→ `walking(from, to, duration)` → 到达 → 掷骰子进入 `resting` / `acting(action)` / 冒泡说话 → 回 `resting`，循环。
- **走动表现**：播 idle 动画，容器 CSS transform 平移（1~3s ease-in-out）；`scale = lerp(scaleFar, scaleNear, y 在地板纵向的归一化位置)`；y 越大 z-index 越高。气泡跟随角色容器。
- **随机目标点**：地板多边形内 rejection sampling（bbox 内随机 → 点在多边形内测试，多边形是凸的、几次就中）。
- **动作**：从 available 里随机挑非 idle/drag 动作播放，`ended` 后回 resting；sleep 允许停留更久。
- **说话**：复用 `Speaker`（canSpeak = 当前是 resting）；沿用 talkFrequency 设置。
- 时序参数集中成常量表（停留 4~12s、走动 1~3s 等），便于调手感。

## 六、点角色互动

角色容器（video 所在 div）监听 click → 打断漫游（清定时器/中断走动动画）→ 播 `talk_happy` + `speaker.forceSpeak()` → `ended` 后回 `resting`。与桌面上点桌宠的心智一致。房间背景区域点击无行为（后置的家具热点留在这里扩展）。

## 七、错误处理

- 无激活角色 / 角色动作全失败：房间照常显示，角色区留空（房间本身可观赏），不报错。
- RoomSpec 加载异常（将来外置 json 时）：回退内置 default 常量。
- pet 窗恢复完全依赖 room 窗 `closed` 事件，主进程单点兜底；room 打开期间若 pet 窗因异常重建，`createPetWindow()` 幂等不受影响。

## 八、测试

- `roam.ts` 单测（app workspace 首个 vitest，配置向 pipeline 看齐）：多边形采样恒在界内；状态流转 resting→walking→acting→resting；点角色打断后正确恢复；缩放插值端点正确。
- `npx tsc --noEmit -p app` 通过。
- 真机验证走 `/verify` skill：单击开房间（pet 窗隐藏）→ 角色在房间漫游/播动作/冒泡 → 点角色触发互动 → 关窗 pet 窗回归 → 托盘切角色时房间内角色同步切换。

## 九、非目标（本期不做）

- 家具热点、装修/收集、多房间选择、串门/联机联动（仅通过 RoomSpec 留接口）。
- 房间内音效/BGM。
- AI 生成房间背景。

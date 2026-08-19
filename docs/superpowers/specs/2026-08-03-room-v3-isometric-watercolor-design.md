# 小房间 v3：等轴地面家具 + 水彩宣纸风重做 设计

日期：2026-08-03
状态：已批准
前置：`2026-07-12-room-v2-beautify-decor-design.md`（v2，已实现合入）

## 零、为什么要推翻 v2 的两条已批准决策

用户实际使用后提出两点：布置家具界面「太丑、太小」，且希望改成参考图那种效果（心纸居 / 代号鸢 的等轴家园：家具**站在地面上**、有**远近遮挡**、**水彩**质感）。这与 v2 明确写下的两条决策直接冲突，故新开 spec 覆盖：

| v2 决策 | v3 改为 | 理由 |
|---|---|---|
| 视觉方向「温馨中式贴纸风、粗深棕描边、扁平上色」 | **中式水彩宣纸风**：淡雅晕染、细柔墨线、低饱和竹青月白 | 用户明确要参考图那种质感；粗描边扁平色与之不兼容 |
| 非目标：「装饰与角色的遮挡排序和地面碰撞」 | **纳入目标**：地面家具与角色按深度交错遮挡 | 「站在地面上」的观感成立与否，完全取决于遮挡是否正确 |

v2 其余决策（离线生图固化、透明贴纸窗、内置贴纸包、room-decor.json 持久化）继续有效。

## 一、窗口尺寸

v1/v2 固定 560×560。素材是 1024×1024 → `fit≈0.55`，房间只占屏幕一小块，这是「太小」的根源。

v3：偏好 960，按主显示器工作区的 90% 夹取，且不超过素材设计尺寸 1024（超过就是放大插值）。窗口**居中**（v1/v2 完全没设 x/y，Electron 默认摆放常偏左上）。仍保持 `resizable: false`（透明窗 resize 有渲染 bug，v1 已记录）。

实现：`app/src/main/windows.ts` 的 `roomSize()` + `openRoomWindow()`。

## 二、锚定模型：wall 与 floor

**关键设计判断：「是否站在地面」是贴纸自身的属性，不是摆放的属性。** 挂画永远挂墙，屏风永远落地。因此 `anchor` 加在 `DecorSticker`（贴纸包定义）上，而不是 `DecorPlacement`（用户摆放记录）上。

好处：存量 `room-decor.json` **零迁移**，`DecorPlacement` 的 schema 不变，`sanitizePlacements` 不用改。

| anchor | 变形 | zone | 深度 |
|---|---|---|---|
| `wall` | 吃 `wallMatrixL/R` 仿射切变 | 按落点判 wallL/wallR/free | 恒为 `Z_WALL`，在所有地面物件之后 |
| `floor` | 不变形 | **恒为 `free`** | 按脚点 y 算，与角色同刻度 |

floor 恒为 free 是必须的：v2 的 `zoneFor` 只看落点，一个屏风拖到墙区就会被切变成斜的。

## 三、深度遮挡

`depthZ(y, spec, anchor)`：脚点 y 越大＝越靠近观众＝层级越高。**地面家具与角色共用同一刻度**，所以角色走到屏风前面就盖住它、走到后面就被挡住。

一个隐藏前提：v2 的 `#decor` 是 `position:absolute` 的容器，自成层叠上下文 → 无论子项 z-index 多大，整个 `#decor` 都被压在后续兄弟 `#char` 之后，家具**永远**在角色背后（这也是 v2 把遮挡列为非目标的原因）。v3 把 `#decor` 改为 `display: contents`，让 `.decor-item` 直接参与 `#stage` 的层叠上下文，才能与 `#char` 比较。

## 四、家具托盘

v2 的 `#decorBar` 用 `flex-wrap: wrap`，10 个贴纸 + 完成钮在 560px 下换行，吃掉房间底部。v3 改为单行横向滚动 + 按 `category`（墙面 / 家具）分栏。

## 五、素材重生（花钱）

- 工具：`scripts/gen-room.mts`（gpt-image-2，2048²，每张 5~10 分钟，客户端并发 2）
- **构图参考图沿用现有 `default-bg.png`**：这样新素材保持同一几何，`rooms/default.ts` 里手量的 `outline`/`floor`/`wallL`/`wallR` **不需要重新测量**
- 流程：先生成 2~3 张房间候选 → 用户挑风格 → 风格确认后再批量生成家具，避免一次性花在错风格上
- floor 家具的 prompt 要求等距俯视立体（可见顶面侧面 + 贴地接触面）；wall 挂件要求正面平面（画了立体会被墙面切变弄歪）
- **水彩软边与绿幕硬抠天生冲突**：优先要求真 alpha（`background: 'transparent'`），绿幕仅作回退

### 前置修复（v2 遗留，Phase B 不修就跑不起来）

- `gen-room.mts` import 了早已改名的 `COLORKEY_BLEND/COLORKEY_SIMILARITY` → 模块加载即失败
- 硬编码 `/bin/mv` → Windows 必抛，改 `fs.rename`
- key 读取增加回落：`config.local.json` 缺失时读 app 运行时设置，避免把密钥抄两份

## 六、非目标

- 家具旋转 / 翻转 / 自由层级调整
- 地面碰撞（角色不会绕开家具走，只是遮挡关系正确）
- 多房间、运行时生图、用户自备图片当贴纸
- 墙面真透视（`wallMatrixL/R` 目前只有 Y 切变、无横向压缩，留待后续）

## 七、验证

- `app/test/decor.test.ts`：锚定与深度的纯函数单测（floor 恒 free、墙面恒在地面之后、深度单调、越界夹取、角色与家具同刻度）
- 人工：打开房间确认放大后观感；拖入 floor 家具后让角色走到它前后，确认遮挡正确切换
- 驱动注意：`DecorEditor.drag()` 用 window 级 pointer 事件而非 `setPointerCapture`（CDP 合成事件下后者不可靠）

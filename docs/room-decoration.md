# 横向 2D 房间与布置

2026-09-29 家具扩充：新增三套 18 件，常备家具共 24 件。支持四套试搭、主题/类别筛选、单件跨套装混搭；拆件与渲染标准见 [家具规范](furniture-art-standard.md)。

2026-09-29。正式房间统一为 `renderer/online-room`，本地小屋和联机背景共用。删除旧 `renderer/room` 等距场景、`cozy` 2.5D、`cozy3d` 试住和专属测试、构建入口。共享家具图片和目录迁到 `renderer/furniture`，已有库存、旧 room-decor 存档不删除。独立的近正面茶室、DIY 和比例研究页作为历史预览保留。

## 布置方式

古风茶室拆成空房底图、独立家具和角色。7 个固定位置：地毯、左家具、中央座椅、右家具、茶几、左右挂饰。各位置可替换、收起；支持清空、恢复套装、撤销和显式保存。先固定位置，便于小窗口保持比例和角色前方走道；后续需要自由布局时可在相同层级上扩展网格。

参考明日方舟把墙饰、地面家具、地毯分开管理的方式：[家具图鉴](https://moegirl.uk/明日方舟/家具图鉴)。没有引入氛围值或复用方舟家具美术。原有万圣节参考背景继续仅作测试主题。

入口：房间顶部「布置」，或控制台「布置房间」。6 件茶室基础家具可直接使用；原收藏家具按库存数量跨位置计数，禁止多放。挂饰只能放墙位，地毯只能放地毯位。家具绘制在角色后方。

保存使用已有 decor IPC / room-decor.json，新键 `panorama-tea-v1`。每个槽位有记录，显式空房不会被误认成首次进入。保存成功向本机窗口广播；失败保留草稿，按钮可重试。只影响本机观赏，不上传或同步到其他玩家。其他背景仍为整幅原画，当前只有古风茶室可拆分布置。

## 模块

- `online-room/layout.ts`：固定位置、基础套装、存档归一化、库存规则。
- `online-room/furniture.ts`：图集读取、原收藏素材、底图和家具绘制。
- `nursery/furnish.ts` / `furnish.css`：完整布置页和草稿生命周期。
- `online-room/main.ts`：成员动画、背景切换、已保存布局的实时显示。

## 素材与生成提示

使用内置 imagegen，未调用仓库的付费生成 API。素材保存为：

- `app/src/renderer/online-room/art/tea-shell.png`
- `app/src/renderer/online-room/art/tea-furniture.png`

两张均以现有 `greenhouse-v2.png` 为参考。图集保持生成的透明通道，运行时按实际格间留白裁显；地毯按固定地面投影显示。

### 空房底图的最终提示词

Edit target: the attached QBot tea-room game background. Create a CLEAN EMPTY ROOM SHELL for a modular decoration system. Preserve exactly the current wide front-facing dollhouse composition, hand-painted cartoon outlines, green lattice windows, rainy blue garden outside, timber ceiling beams, stone side walls and stone floor, warm dim mood. Remove ALL movable furniture and decorations: left tea counter and shelving, sofa, coffee table, rug, all plants and pots, lanterns, hanging scrolls and bamboo blinds, folding screen, stools. Reconstruct architecture behind removed items seamlessly. Keep the two grey doorframe-like edge structures. Output a single ultra-wide landscape illustration near original 2137x736 aspect; no text, no characters, no UI. This is an empty version of same room, not a redesigned room.

### 家具图集的最终提示词

Reference image: QBot hand-painted 2D tea-room. Produce a game furniture sprite atlas on a GENUINELY TRANSPARENT background, square canvas, strict 3 columns by 2 rows of equal cells. Six separate isolated objects centered within their own cell, with ample transparent margins, never touching cell boundaries, no labels or grid lines. Same front-facing slight view of tops, dark brown ink outlines, soft painted warm shading and muted green palette as reference. Top row left: wooden tea counter with kettle and tea cups (single combined furniture piece, no backdrop). Top row middle: sage-green wood-frame two-seat sofa with two cream cushions. Top row right: large leafy potted plant in terracotta pot. Bottom row left: low dark-wood tea table with green runner and tea set. Bottom row middle: glowing hanging brass and wood lantern with short hanging cord. Bottom row right: green rectangular floor rug viewed at the same very slight top-down perspective, with gold border. All objects complete uncut silhouettes with transparent background including through holes and under furniture. No floor plane, no room background, no people, no text. Each sprite must stay within its assigned one-sixth rectangular cell.

## 验证

- `app/test/room-layout.test.ts`：空房重读、无效数据、分区限制、收藏数量。
- 房间布局、移动、成员规则共 62 项通过。
- `scripts/test-room-decoration.cjs`：隔离 Electron，实际界面保存失败重试、重开空房、库存限制、撤销、恢复套装、600 宽排版。截图 `output/room-decoration`。
- App 构建通过。正式运行实例未重启；重新启动客户端使用新入口和预加载接口。

- `scripts/test-online-room.cjs`：真实本机 WebSocket 加入/离开、房友缓存显示、背景开关不换房、独立角色恢复、退房收窗通过。测试夹具补充新 decor 读取，首页元素改为等待挂载，工具栏等待过渡完成。
- 全量类型检查最终通过。额外运行 console-ui 时，既有角色生成文案断言（11 个常用动作）失败，房间入口相关断言通过；没有为此修改其他任务的角色页面。

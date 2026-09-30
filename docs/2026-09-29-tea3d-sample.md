# 听雨茶室：原创原画与 3D 家具样板

## 桌面试住与已有角色（2026-09-29 更新）

地板底座厚度从 0.22 米减至 0.065 米，收窄外沿。角色比例调整为 Spine 画布 2.12 米、普通动画画布 1.7 米；透明素材加入轻微暖色，脚底和坐垫使用独立柔边接触阴影。坐姿每帧对齐骨盆锚点，保留二维角色素材。接触阴影为美术近似，不是角色实时投影。

左墙增加柔和正面补光，提高环境反射光并略降主光强度，保留家具接触阴影。编辑页支持约 2°～84° 俯视，以及左右约 83° 环绕；拖动可接近正上方，不会翻到地板下面。桌面页禁用拖动旋转，沿用编辑页角度。

- 顶部「放到桌面」打开透明、置顶的独立茶室。拖顶部把手移动整间房，桌面沿用编辑界面当前视角并锁定拖动旋转，滚轮或底部按钮缩放；「关闭桌面」只关闭该悬浮窗口。
- 「正面视角」回到居中的正面略俯视；默认生活视角也改为正面。「隐藏侧墙／显示侧墙」同时控制两侧墙面、立柱、护墙和顶边，保留后墙、地板和家具，编辑页和桌面都可切换。侧墙独立批处理，隐藏后不投影也不参与鼠标命中。
- 打开时带入当前视角、侧墙状态及当前布置（包括未保存的修改）、两位客人和试坐状态。桌面版用于看效果；回到编辑窗口调整后再次点击按钮，会替换上一间桌面茶室。
- 「客人一／客人二」读取已有角色，可以各自替换或不放角色，选择保存在试住页面。支持 Spine 和现有透明视频动画，视频保留原素材颜色与动作，按可见区域对齐地面。
- 普通动画目前展示待机素材，没有适配家具坐姿；Spine 沿用原有独立坐姿与座位锚点。原素材包含的道具或背景会保留。
- 桌面窗口在房间外留出鼠标穿透区域；缩放交互期间保留输入。此窗口不是系统壁纸，不写正式桌宠角色设置，也不跨玩家同步。
- 独立 --preview 只读加载本机 @qbot/app/characters，加上内置角色；可用 QBOT_TEA_CHARACTERS 指向另一个角色库。测试仍使用固定内置素材和隔离存档。


日期：2026-09-29。

## 交付

延续原茶室的青绿软榻、深木茶柜、青瓷茶具、暖灯与雨夜园林。原画由内置 imagegen 生成；模型由本项目的几何建模代码制作并导出，没有调用 Tripo 或消耗其积分。

- `app/src/renderer/tea3d/art/tea-concept.png`：房间与家具原画。
- `app/src/renderer/tea3d/art/rain-garden.png`：窗外独立园林画作，实际用于窗景。
- `app/src/renderer/tea3d/models/`：8 个自包含 GLB，模型与材质贴图一起导出。
- `app/src/renderer/tea3d/models.js`：可修改的原始几何建模逻辑。
- `app/src/renderer/tea3d/layout.mjs`：家具尺寸、座位、摆放与存档约定。

家具清单：青竹软榻、月白长榻（同一结构的两套配色）、青瓷茶几、团圆茶几、煮茶柜、雨叶陶盆、听雨灯笼、青纹织毯。家具展示卡片由实际模型渲染。

这是一版可操作样板，模型细节和材质仍有美术精修空间。原画表示风格目标，不代表实时模型已达到原画的所有细节。

## 试用

完整构建后，房间工具栏新增「3D 试住」，打开独立窗口。主进程需要加载新版后此入口才生效。本轮可直接用独立预览，不必重启正式客户端：

```powershell
& ./app/node_modules/electron/dist/electron.exe scripts/test-tea3d.cjs --preview
```

独立预览使用离线预置 Spine 角色。布置保存于 `output/tea3d/profile/` 的独立浏览器存储，不写正式家具布局或库存。在正式客户端入口中，样板读取已有可用 Spine 坐姿角色，布局使用专属 `qbot.tea3d.layout.v1` 键。

操作：

- 拖动家具移动；拖动空处旋转镜头；滚轮或按钮缩放。
- 选中家具后旋转、收起、同类替换；下方卡片添加家具。
- 网格吸附可以关闭；方向键微调，R 旋转，Esc 取消拖放，Ctrl+Z 撤销。
- 越界或碰撞时返回原位；地毯允许在家具下方。
- 显式保存、撤销、恢复茶室；不自动覆盖正式房间。
- 选择软榻，点击「坐在这里」可让两位角色分别试坐；更换软榻保留占用，移动时座位跟随家具。
- 生活、布置、楼层三种镜头。楼层上层为固定陈设示例，不代表已连接另一个玩家。

## 角色实现与当前边界

复用现有 Spine 4.0 播放器，传入克隆的 manifest，去掉其中用于桌面坐板凳的 seat 贴图；不修改用户角色素材。新增只读 `getSceneAnchor()`，按固定 620 单位投影转换骨盆位置，让角色对齐沙发坐面。每次切换动作校准一次，避免动态透明边界导致尺寸变化。

试坐直接切换已有坐姿，尚未实现自动走近、绕路、坐下过渡或多人服务端占座。角色仍是二维平面，有限镜头内可查看遮挡；任意家具朝向下的侧背面和极端遮挡仍需单独校准。当前采用前移角色平面让腿部越过坐垫前缘的样板做法，不能视为完整的身体深度模型。

房间与家具是实际几何体。窗外远景为独立画作。静态几何按材质合并渲染，源模型和 GLB 保留命名部件。两位角色各自复用 Spine 或视频播放器，再通过透明画布作为纹理送入主场景；规模扩大前需要评估统一的原生 Spine 3D 渲染。

## 后续换成 Tripo 模型

每个摆放实例只保存 `key / asset / x / z / angle`，不绑定程序生成的网格。因此可以逐件替换 GLB，并保留摆放实例。

接入时遵循：米制、Y 向上、家具正面朝 +Z、原点在落地中心、应用缩放。模型替换为同名 GLB 后重新构建；若尺寸或坐面不同，在 `layout.mjs` 更新宽深和座位坐标。座位元数据与视觉资产分离。自带碰撞体、外部纹理、骨骼动画或压缩扩展的外部模型需另做加载与简化检查，当前并非任意模型上传工具。

保留 `models.js` 作为素材缺失时的回退。重新导出原创模型：

```powershell
& ./app/node_modules/electron/dist/electron.exe scripts/test-tea3d.cjs --export
```

该命令写入 8 个原创 GLB，随后需重新构建才能使用更新文件。运行时优先加载打包的 GLB；本轮实测未触发回退。

## 验证

- `node scripts/test-tea3d-layout.mjs`：默认布局、碰撞/旋转占地、座位变换、损坏数据恢复 4 项。
- `scripts/test-tea3d.cjs`：实际 Electron、Three.js、预置 Spine 资产，隔离存储并禁用外网。
- 检查 8 件家具、双角色与双座位、换家具保留座位、原生鼠标拖动、旋转撤销、保存重载、三种视角、两层展示、收起已占用座椅、原画和窄窗口。
- 新增普通视频推进、重复切换清理、真实透明窗口像素、未保存布置/角色/座位传递、点击区域和关闭验收。
- App 类型检查、完整构建。截图和运行统计在 `output/tea3d/`。
- 性能统计是样板截图对应场景的单次绘制数据，不代表长时或低配性能验收。

## 图像生成提示词

使用内置 imagegen；未使用 CLI 或外部付费图片 API。第一张的参考图为原茶室 `tea-shell.png` 与 `tea-furniture.png`，均已查看。

### 原画

Use case: stylized-concept. Create a polished original 3D game environment concept sheet for the SAME Chinese rainy-night tea room in the two reference images. Image 1 is architecture and mood reference; Image 2 is furniture design reference. Preserve warm dark walnut frames, sage green upholstered two-seat sofa with cream leaf-pattern cushions, squat tea table with celadon tea set, tea brewing cabinet, broadleaf terracotta potted plant, amber wooden lantern, jade green woven rug. Main upper 2/3 of sheet: a beautiful cutaway dollhouse 3D room, wide front opening, very slightly elevated three-quarter view, thick rounded beveled furniture, rich tactile walnut grain and fabric, moss green geometric lattice windows overlooking blue misty garden, stone floor, warm amber pools of light. Keep furniture clearly separate, believable physical volumes and contact shadows. Bottom 1/3: three isolated furniture studies on pale warm parchment, the sage sofa front 3/4, the tea table 3/4, the walnut tea cabinet 3/4, full objects with generous spacing. This is a production concept for later real geometry modeling, no characters, no UI, no text labels, no logos. Cozy sophisticated handcrafted stylized videogame art, restrained color palette, no plastic toy sheen. Landscape.

### 窗景

Use case: stylized-concept. Asset type: background painting seen ONLY through a Chinese tea room window in a 3D game. Paint a wide horizontal landscape of a tranquil Jiangnan garden at blue rainy twilight: a small distant arched stone bridge at left center across dark teal pond, one little glowing warm stone garden lantern right center, bamboo silhouettes, soft mist, mossy rocks, willow and broadleaf trees framing upper and outer edges. Cool muted indigo, blue grey, deep teal palette with a single tiny amber light. Rich hand-painted cozy stylized videogame background, soft atmospheric depth, brush texture, readable shapes, restrained contrast. View from eye height inside a room looking outward. Entire image is OUTDOOR garden landscape only, no interior, NO window frames or borders, no walls, no UI, no text, no people, no logos. Landscape 3:2 or wider.

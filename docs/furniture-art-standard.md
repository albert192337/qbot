# 家具拆件与替换规范

日期：2026-09-29。此文是 QBot 的实现规范，不是明日方舟的内部制作文档。

## 参考了什么

- [PRTS 家具一览](https://prts.wiki/w/家具)按主题组织家具。
- [PRTS 瓷色大床](https://prts.wiki/w/瓷色大床)公开了单件类型、8×5×3 大小、所属主题和套件。这说明主题与单件数据分开管理，家具不是一张整体背景。
- [明日方舟入门基建攻略](https://www.taptap.cn/moment/117252212798786998)记录了快速布置会使用重复家具、摆放考虑体积，以及地毯不阻止上面放家具。

没有查到官方内部的切图、原点或贴图尺寸规范。下面的坐标、素材尺寸与裁切方法是针对 QBot 当前横向房间设计的，不能称为方舟原实现。没有复制其家具美术。

## 我们采用的规则

| 项目 | 规则 | 实际用途 |
| --- | --- | --- |
| 单件身份 | 每件稳定 id，另记 theme、category、surface | 套装混搭时保存具体单件，不把套装拍平成背景 |
| 类别 | 柜架、座椅、植物、桌几、挂饰、地毯 | 布置页按类别和主题筛选 |
| 摆放面 | floor、wall、rug 三种 | 挂饰与地毯不会误放到地面家具位 |
| 坐标 | 共用 1000×295 房间坐标 | 窗口宽度变化时只整体缩放 |
| 原点 | 单件有效轮廓底部中心 | 切换家具后保持落地点稳定 |
| 尺寸 | 每件有独立 width/height 上限，再限制在槽位范围内 | 低桌换到大件位仍是低桌，不能被放大到柜子高度 |
| 图层 | 房壳 → 地毯 → 墙面挂饰 → 按落地点前后排序的地面家具 → 角色 | 地毯可以在家具下，角色走道保留在前方 |
| 素材 | 真实透明 PNG，完整脚、边缘和内部镂空 | 不含房间地板、墙或邻件，放到不同背景仍干净 |
| 图集 | 一件一个隔离区，source rectangle 独立登记 | 原图留白不会影响摆放尺寸，不能仅按理论等分切图 |
| 外观 | 同一近正面视角，少量可见顶面，统一轮廓线和光照方向 | 不混入等距视角或不同方向的家具 |
| 库存 | 新常备家具可以直接使用，收藏/地区库存沿用当前经济规则 | 增加可混搭选择，同时不改已有经济资产 |

地毯按该房间固定地面矩形投影绘制；其余家具保持素材宽高比。当前继续使用 7 个固定位置，地面四个位置之间可以互换单件；不提供任意拖拽或三维旋转。

## 怎么拆出来

1. **先确定可独立替换的物件。** 房壳保留墙、窗、梁、地板；沙发、柜架、盆栽、桌几、挂饰、地毯分开。书柜内部的书、桌上的小茶杯视作该件的固定细节，目前不能再单独操作。
2. **按同一个视角制作物件图。** 使用现有茶室家具作画风参考，生成三套各六件。每套约定 3×2 排列，四周透明留边。
3. **验证真实 alpha，而不是只看生成预览。** 透明像素可能保留彩色 RGB，预览中的颜色不一定会在合成时显示。以 alpha 和实际 Canvas 合成为准。
4. **检查实际分隔线。** AI 不保证严格等格。本次奶油套装第一排越过理论中线；藤编沙发略越过理论列线。最终裁切按实测留白登记，保留完整家具、不切腿、不串图。
5. **只裁掉透明留白，记录有效轮廓。** `FurnitureArt` 在各件区域内读取 alpha 包围盒。有效轮廓与摆放尺寸分开；不通过整张图片的留白决定家具大小。
6. **组成套装，再逐件替换。** 套装只是一组单件 id。先试摆、后保存；跨主题组合用同一存档格式，旧茶室 id 不改变。
7. **实际房间验收。** 检查每件缩略图、三套房间合成、混搭、保存后重读、收藏数量、600 宽界面。不能以“图片已生成”代替“可以替换”。

## 本次家具

| 类别 | 原茶室 | 梅影书斋 | 奶油书屋 | 藤编花房 |
| --- | --- | --- | --- | --- |
| 柜架 | 煮茶柜 | 藏卷书架 | 玻璃书柜 | 藤门边柜 |
| 座椅 | 青竹软榻 | 梅色长榻 | 奶油双人沙发 | 青垫藤沙发 |
| 植物 | 阔叶盆栽 | 白瓷梅枝 | 蓝陶橄榄树 | 白绣球花篮 |
| 桌几 | 木茶几 | 墨香书案 | 橡木圆角茶几 | 竹编圆茶几 |
| 挂饰 | 暖光灯笼 | 绢纱圆灯 | 乳白玻璃吊灯 | 叶影植物画 |
| 地毯 | 青纹地毯 | 梅红织毯 | 雾蓝织毯 | 椭圆黄麻毯 |

新增 18 件，常备家具从 6 件扩为 24 件，当前收藏家具额外显示。不是用改色重复计算数量。

## 文件与生成方式

内置 imagegen 制作，PNG 透明通道直接保留；没有调用仓库的付费图片 API。

- `app/src/renderer/online-room/library.ts`：24 件定义与套装分类。
- `app/src/renderer/online-room/furniture.ts`：图集来源、实测裁切区、alpha 包围盒和绘制。
- `app/src/renderer/online-room/art/furniture-scholar.png`
- `app/src/renderer/online-room/art/furniture-reading.png`
- `app/src/renderer/online-room/art/furniture-rattan.png`

### 最终整理提示词（三张各调用一次，输入为对应六件图集）

Edit target: attached six-piece furniture atlas. Preserve every furniture design, color, object, order, and front-facing perspective. Remove ALL colored halos, glow, vignette, ambient clouds, shadows and background outside the physical object silhouettes. Output real transparent PNG: EVERY pixel outside furniture silhouettes must have alpha=0, including between chair/table legs and around plant branches. The lantern light stays inside the lantern only. Repack the same six pieces onto a landscape 1536x1024 canvas in strict 3 columns x 2 rows equal 512x512 cells. Scale each complete object to fit a maximum 380x380 box centered within its own cell, giving at least 66 pixels transparent padding on each side. The output is a technical clean game sprite sheet, no background, no glow aura, no extra decorative elements, no text. This is an alpha cleanup and spacing correction only.

生成结果没有严格遵守所有尺寸/留边要求，因此使用实测裁切区；没有宣称得到了严格 512 格的美术成品。新增各主题的原始需求分别为深木梅色书斋、橡木奶油蓝色阅读室、浅木藤编绿色花房，顺序均为柜架/座椅/植物、桌几/挂饰/地毯。

## 验收结果

- 11 项家具布局、套装与窗口移动测试通过；类型检查及 App 构建通过。
- 隔离 Electron 逐件点选全部 24 件并检查缩略图非空；4 套预设、主题/类别筛选、跨主题保存、空房重读、库存数量、失败重试和 600 宽排版通过。
- 实际合成图：`output/room-decoration/set-梅影书斋.png`、`set-奶油书屋.png`、`set-藤编花房.png`、`mixed.png`。
- 没有改动正式用户布局或家具库存；正式客户端未重启。

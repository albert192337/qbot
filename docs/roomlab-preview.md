# 方舟横向房间试住与素材调研

2026-09-26。用户要求参考明日方舟房间的风格、比例，缩小放在桌面，并查找房间素材库放入已有角色。

## 已完成样板

- 双击根目录 `打开横向房间.cmd`，或运行 `node scripts/preview-roomlab.cjs`。独立 Electron 窗，使用已构建页面和本机已下载角色，运行中禁外网、不修改生产存档、不重启真实客户端。
- 以用户上传的 1000×391 万圣节展示图为背景参考，在 renderer 中显示 y=65 起的 1000×295 房间主体；原图完整保留于 `app/src/renderer/roomlab/art/halloween-reference.png`。画面页脚标注来源。
- 房间主体约 3.39:1。可选择 600、800、1000 DIP 宽度，600 宽时房间高 177 DIP（另有控制条、署名和系统标题栏）。可置顶、切换角色和已有动作、调比例/脚点、拖动角色、保存和拍照。
- 四角色复用 Player 和真实市场动画；高度约占房间 31–33%，按透明轮廓校准，脚下加接触阴影。当前背景是整张图，角色画在背景之前景；家具不能拆，不能自动处理走到家具后面或坐入家具的遮挡。本样板用于比较构图、比例与材质，不替代前版 DIY。
- 预览偏好独立保存于 `output/roomlab/profile`，不触碰正式用户档案。源码进入 renderer 构建，但无正式产品入口、未发布安装包。

## 联网调研结果

1. [ArknightsAssets 素材归档](https://github.com/ArknightsAssets/ArknightsAssets/tree/cn)。通过 GitHub API 实际读取目录；根递归索引被截断，因此不声称已穷尽全部资源。
   - `assets/torappu/dynamicassets/arts/ui/furnithemes/`：返回索引包含 108 个主题 PNG；实下载咖啡馆、披萨店各 226×169，仅为局部主题缩略图，不适合作为清晰全屋背景。
   - `assets/torappu/dynamicassets/arts/ui/furnitureicons/`：单件家具图标；图标不是可还原原场景的模型、材质或完整家具切片。
   - `assets/torappu/dynamicassets/arts/shop/furngroup/`：商店套组宣传图；实下载咖啡馆 477×297，含标题和局部构图，也不是干净全屋。
2. [Ark-Unpacker 资源指南](https://github.com/isHarryh/Ark-Unpacker/blob/v5.x/docs/zh/AssetsGuide.md)：明确记录 `building/diy/` 为装扮模式与家具素材；指南基于旧 Android v2.4.01，有过时提示。工具本身不是整理好的房间素材包，需要源资源与后续重建。
3. [ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource)：主要为头像、立绘、图标、数据，未在本次检查中找到可直接使用的整屋包。README 说明静态素材版权属于鹰角，仅供学习交流。
4. [PRTS 家具一览](https://prts.wiki/w/家具一览)：主题与家具检索参考，并非可直接导入的房间工程。

这次实际试住使用用户提供的展示图；没有把局部缩略图冒充下载到的完整房间。方舟原素材用于本地视觉对照，不作为自有或已获商用许可的素材。未来原创资产可参考浅纵深、统一相机、材质纹理与接触阴影，并继续保持家具独立。

## 验证

`node node_modules/typescript/bin/tsc --noEmit -p app`、`node scripts/build-tearoom.cjs`、`node scripts/test-roomlab.cjs`。实际四角色视频播放、600 DIP 原生窗口、无横向溢出、置顶开关、拖动缩放、保存重载、零生产写入通过。截图与结果位于 `output/roomlab/`。

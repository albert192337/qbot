# 实时 Spine 桌宠试用

## 2026-10-11：双臂校准修订

张起灵（hood）和吴邪同时降低双侧袖根，保留腕端高度，分别记录在 `hood-calibration.json` / `wuxie-calibration.json`。重新打包后运行 `node scripts/calibrate-spine-sleeves.cjs`，从原网格 UV 平面重建规则袖网格，按实际肘部位置混合上下臂权重，减少折角；该脚本只写两人的手臂附件。依赖 Electron、Playwright 和本地预览服务。贴图打包会覆盖骨骼，须先打包再校准。

修订已同步项目内 `app/resources/presets/spine-wuxie/spine` 和 `spine-zhangqiling/spine`，未覆盖用户已安装角色；现有 seedPresets 跳过已存在角色。两人各 178 动作有限值检查通过，七类动作四分位及放大截图见 `output/spine-lab/hood-sleeves-final` / `wuxie-sleeves-final`。原衣身的局部下摆尖角仍可见，本次范围为双臂。

正式 renderer 隔离回归运行到了最后的联机房间步骤：两人各 22 动作、双人注视/换边、睡觉、摸摸和视频切换已执行通过；房间步骤因现行页面与旧测试夹具不匹配，缺少 `decor:get` 等处理器并报 0/2 canvas，整个脚本未通过。没有把旧 `live/verification.json` 当作本轮通过证据，也未重启正式客户端。

2026-09-26。预置「Spine 吴邪」「Spine 张起灵」，右键 → 切换角色，沿用现有切角保存与角色通知。启动时由 seedPresets 安装缺少的预置包，不覆盖既有用户角色。

## 播放与互动

`Player` 根据 manifest.spine 选择 `SpinePlayer`，旧视频包继续使用视频后端。实时 WebGL 渲染 4.0.64 骨骼，使用配套官方 4.0.31 runtime。没有视频转码；中断前生成的草稿视频已移到 output/spine-desktop/abandoned-video，不进入角色包。

22 个语义动作映射见 scripts/spine-desktop-actions.json。待机、拖拽、睡觉、喝茶、开心/不高兴、挥手、放松、停靠、手账、走跑、亲近、聊天、倾听、思考、工作、庆祝、疑惑、跳舞和花园动作复用原状态机与行为触发。没有画笔、茶杯等独立道具的动作目前是简化姿势。原有双人桌子/爱心等效果继续叠加。

双人互动期间根据两个实际舞台的屏幕位置计算注视目标，优先于鼠标。原有朝向元数据负责人物镜像，骨骼叠加不超过数度的头部偏转和约 2 骨骼单位的眼位偏移；不伪造大角度转头。换边后重新计算，退出后恢复鼠标目标；睡觉、拖拽抑制注视。每帧先重置基础姿态，避免视线和膝盖修正累计。隐藏暂停，切角销毁计时器、GPU 纹理与画布。

联机资源包允许 spine 下的受限 JSON/atlas/PNG 文件；不传脚本或 runtime、不传 persona。房间合成器支持读取实时 canvas。对端需使用支持此播放器的客户端；本轮没有修改或部署远端服务。

## 构建与验证

运行 `node scripts/build-spine-presets.cjs` 从已确认图集重建两个预置包（不调用生成服务）。运行 pipeline 构建、App 类型检查与构建后，`node app/node_modules/electron/cli.js scripts/test-spine-desktop.cjs` 在隔离档案、禁止外网的实际桌宠 renderer 中检查两个角色 44 个动作、结束事件、双方互看、鼠标不抢焦点、换边、睡觉、摸摸与旧视频切换。截图及结果在 output/spine-desktop/live。

`app/test/spine-character.test.ts` 验证无 WebM 时的动作可用性、双人动作选择、私密字段剥离及实际骨骼资源打包/解包。

房间实际 renderer 的双角色 canvas 合成也已检查，截图为 output/spine-desktop/live/online-room.png。`node app/node_modules/electron/cli.js scripts/try-spine-desktop.cjs --verify` 验证生产主进程的原生右键菜单切角；去掉 `--verify` 可打开独立离线试用桌宠，档案放在 output/spine-desktop/trial-profile，不影响现有存档。试用实例禁用外网请求。

长发、裙子、袖子允许简化绑定的范围已记入 docs/spine-reskin-spec.md；本次两个短发裤装样例不代表已验证长发/裙子。没有开发生成入口。

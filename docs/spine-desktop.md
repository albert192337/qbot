# 实时 Spine 桌宠试用

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

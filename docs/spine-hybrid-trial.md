# 双角色实时与视频混合试验

## V2：只约束首帧的自由演出

用户指出 V1 动作过于接近骨骼摆动，2026-09-29 明确要求重新生成两条。V2 保留人物身份与画风，允许跳跃、转身、俯身和重心变化，取消首尾同帧约束。吴邪小跳转身挥手；张起灵俯身接鸡再托起。原版本保留，新输出放在 `D:/QBot-Spine-Hybrid/free-v2`。

`ArkClient.submitVideoTask` 增加可选 `loopFrame:false`，请求只包含 first_frame；默认行为不变，其他循环生成仍传同图尾帧。新增请求体测试验证，接口八项测试通过。`scripts/generate-spine-hybrid.mjs --free` 使用新目录持久保存任务 ID，重复运行不会重复付费。

`scripts/preview-spine-hybrid.cjs --free` 打开 V2 比较窗口，标明当前播放的是实时骨骼还是实际生成视频；打开两秒后演示一次切换，按钮可重播。仍保留直接返回 Spine 的接缝，不用淡化遮掩差异。

V2 两条实际已生成并完成抠像。抽帧确认吴邪有起跳/落地/转身，张起灵有侧步/蹲下/托鸡，明显超出源 Spine 动作。仍有生成偏差：两人均被添加嘴部，吴邪跳跃高点接近上沿，部分手部运动出现抠像/运动模糊边缘；结束姿态不与实时 idle 一致，直接切回会跳姿态。此轮用于评估自由动作切入观感，不视为成品无缝循环。

2026-09-29。用户要求沿用已校准 Spine 比例，吴邪与张起灵使用简洁胶囊眼表情，试坐板凳，并各生成一条视频验证往返衔接。产物按用户指定放在 `D:/QBot-Spine-Hybrid`。正式角色包与存档未替换。

运行 `node app/node_modules/electron/cli.js scripts/preview-spine-hybrid.cjs` 打开独立对比窗口。待机、走路、坐板凳、开心均为实时；六种表情独立切换；高光为实际 Seedance 5 秒视频，结束返回实时，按住人物打断进入拖拽。`--capture` 做实际渲染验证，结果在 D 盘 verification.json。

新增可选 manifest.spine.faceStyle=capsule，沿用每个角色各自的眼位校准，程序化生成眼部纹理，隐藏嘴部，不修改头身比例。seat 为受限 spine/*.png 纹理和骨骼世界空间矩形；坐姿下在人物后方绘制，固定不随呼吸漂移。本样例矩形 (-82,-12,164,120)，配合 town_post_player_sit。六表情和四个坐姿时间点已截图检查。

Player 同时装载 Spine 与实际 WebM，等待视频就绪才隐藏骨骼；新请求取消旧回调，失败恢复实时 idle，拖拽和动作切换可打断。29 项播放器测试（含三项混合专项）、两项 Spine 包回归通过；资源打包七项通过。旧 Spine 测试中 persona 删除断言已按既有用户身份规范改为保留，无修改该业务规则。

真实视频验收：两条均播放、自动返回实时、拖拽中断通过。视觉尚未达完全一致：吴邪视频自行加入笑嘴；张起灵眼睛变圆；视频有轻微色彩与线条差异及细绿边。脚底与整体画布未独立归一化，减少了跳位，但不声称无缝或批量自动验收通过。保留原片和抽帧供对比，未追加购买第三条视频。

板凳使用内置 imagegen 生成，最终文件 `D:/QBot-Spine-Hybrid/stool.png`，复制进入两角色试验包 spine/stool.png。最终编辑 prompt：

> Edit this stool sprite. Remove ALL glow, haze, shadow and dark halo outside the wooden stool. Completely transparent clear background. Stool itself opaque with crisp antialiased edges. Keep stool design and orientation. This is a game cutout sprite, no ambient effects. Transparent PNG alpha.

初始 prompt：

> Generate one isolated small wooden stool game sprite for a 2D chibi desktop pet. Transparent background with real alpha. No character, no text, no floor or shadow outside object. Low rectangular warm brown wooden stool with four short sturdy legs, simple flat cel shading and crisp dark brown outlines, matching anime chibi character sprites. View almost frontal with a VERY slight view of top and right side (shallow three quarter), no dramatic perspective. Horizontal seat, broad and stable, seat top near upper 15 percent of object, legs end on same baseline. Object centered, occupies most of image, ample transparent margin. Designed to sit behind a tiny chibi whose thighs overlap the seat. Clean restrained detail, no texture noise. Output PNG transparent.

视频用用户明确授权的 Ark 服务，两条完整 prompt 与任务 ID 保存在 D:/QBot-Spine-Hybrid/generation.json；重运行复用任务，避免重复计费。脚本 scripts/generate-spine-hybrid.mjs 需要显式 QBOT_GENERATE_HYBRID=1。脚本默认 D 盘，可用 QBOT_HYBRID_OUTPUT 指定试验目录。

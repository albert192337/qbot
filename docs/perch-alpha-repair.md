# 2026-09-27 窗沿停靠绿幕残留

## 原因与处理

张起灵 `perch.webm` 已包含可见绿色矩形和碎块，并非桌面窗口渲染故障。旧 `keyFilters` 连续串联两个 `chromakey`；第二个滤镜覆盖第一个滤镜写出的 alpha，先前去掉的亮绿被恢复。原视频像素实验：亮绿单 key 剩余 4,638 个可见绿像素，串联暗绿 key 后变成 246,153 个。

- 多 key 改为独立分支计算 alpha，再逐像素取最小值并合回原画。不扩大相似度、不全图去绿、不修改动作生成提示。
- `toWebm` 在归一化之前，每半秒（包括第一帧，兼容单帧素材）检查四角绿色像素是否残留。避免透明 padding 掩盖失败；不以角色内部绿色作为拒绝条件。
- 导出后实际用 libvpx-vp9 解码，确认每个采样帧既有透明区域又有可见主体。失败抛出 `Transparency QC`，不进入 done，保留 taskId 和原视频；重试只重新抠像。
- 云端错误文案明确“原视频已保留，重试只重新抠像”，避免 rekey 一词被旧认证错误正则误判。
- 本机原先使用 2018 年的替代 ffmpeg，已备份并恢复 `ffmpeg-static` 声明的官方 b6.1.1 Windows 二进制；同时以 `-vsync 0` 兼容旧版本采样。旧版本有两项既存去绿边像素测试不通过，正式版本通过。

## 本地素材

仅 GET 已成功任务 `cgt-20260926211903-26s7w` 并下载原视频，无新模型请求或费用。使用更新后的完整 `keyActionVideo` 生成 WebM/GIF，真实 Electron 对 5.042 秒视频抽查十个时间点、深浅背景合成；可见绿色像素每帧 38～64 / 409600，无矩形背景，主体轮廓完整。

已替换用户数据中 `53ed5068-dd60-4e2a-82c7-fb94250369d1/actions/perch.webm` 和 `perch.gif`，原 mp4 补存在 `.job/perch.mp4`。未改角色人设、其他动作或云端同步记录。

- 原素材备份：`output/perch-diagnosis/backup-20260927-155522/`
- 安装记录：`output/perch-diagnosis/installed.json`
- 实播抽帧：`output/perch-diagnosis/electron-contact-sheet.png`
- WebM SHA256：`9d643c7d26d4e63ac3bded93b6f5d951d249e0f8b24406626ceed50fecb60a19`
- GIF SHA256：`ba24b8d3eadab925e5076a4c4c1902551d1a8600166c06d7d64788b88943618f`

已运行客户端尚未刷新缓存；重新切换角色可加载新素材，重新启动客户端可加载本地新生成代码。自动审批拒绝开启运行实例的调试接口，因此未通过调试方式刷新、未重启用户实例。

## 验证与上线状态

- 48 项针对多 key、弱色度、去绿边、参考色、归一化、质检、重试的相关测试通过（各组最终通过）；全流程和 Job 13 项通过；云端专项 3 项通过。
- pipeline 和 App 构建通过；实际 Electron 解码与抽帧通过，测试入口 `scripts/test-perch-alpha.cjs`。
- App 全量类型检查被本次未修改的 `app/src/renderer/garden/main.ts:302–307` 空值类型错误阻断；未改动其他进行中的花园工作。pipeline 类型编译通过。
- 云端全套有一项既存创建/重启流程在本机超时，与先前部署记录一致；其余三项单独运行通过。没有将全套报成通过。
- **云端尚未部署**：SSH BatchMode 无可用认证，已请求用户提供登录方式。准备发布 `pipeline/dist/chroma.js`（及声明文件）和 `generation/service.mjs` 的透明质检错误文案增量；必须先核对线上代码、备份、确认无生成中任务，再替换并验证。还需在云端对该 job 的原 mp4 免费 rekey，以修复后续下载的成品。不能仅凭本地修复宣称线上后续流程已生效。

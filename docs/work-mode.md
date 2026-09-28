# 一起工作（张起灵试做）

桌宠双击进入一起工作，再次双击退出；右键「一起工作（键鼠联动）」和「结束一起工作」保留。双击不再触发说话，说话留在右键菜单。具有 `computer_idle` 与 `computer_typing` 两个已完成动作的角色可用；其他角色菜单禁用。两项沿用 customActions 资产格式，不改变默认出生动作，不自动提交生成费用。

Windows 模式内通过 `bubble.getWorkIdleMs` 读取键盘/鼠标按钮的汇总活动时长，25ms 串行轮询；约100–125ms无按下活动就停止敲击。GetAsyncKeyState只用于判断是否按下，移动鼠标不触发，不记录或发送键位与文字。首次采样及重新进入时已按住的按钮先忽略，松开后再按才触发。锁屏/原生读取失败进入待机；非Windows暂用Electron秒级接口回退。

工作模式使用同一个敲击视频：输入时继续播放，停手时原位 pause，加2.8秒周期、0.4%幅度的轻微呼吸缩放；恢复输入不seek、不换视频、不触发烟雾。原 computer_idle 素材仍保留供动作预览。模式优先于随机动作、行为动作与摸摸；手动动作、拖动、花园/双人互动、切角、隐藏或进入房间结束模式。暂不跨重启记住启用状态，不同步联机房友的键鼠状态。

## 试用与素材

双击仓库根目录 `打开张起灵一起工作.cmd`。`scripts/try-work-mode.cjs` 启动真实生产客户端的独立离线档案，复制本机张起灵及新增素材，不改正式存档。依赖已经构建的 app/out 及本机张起灵角色。

- `output/work-mode/computer-frame-original.png`：imagegen 按当前张起灵已选三视图制作的共用首帧。
- `computer-frame.png`：供视频使用的绿幕版首帧。
- `computer_idle` / `computer_typing`：各 5 秒，原 MP4 与透明 WebM / GIF。
- 同一首尾帧、同一画布，不对两个动作独立缩放，保留蓝兜帽、小黄鸡、电脑及盘坐构图。
- `generation.json` 留存视频任务 ID；生成脚本需显式 `QBOT_GENERATE_WORK=1`，重跑复用任务和已下载视频。

本机 FFmpeg 较旧，不支持 pipeline 背景取样使用的 fps_mode，因此试做脚本按每秒八个边缘采样选双 key，再调用现有 rim-only despill 透明转码（仅这组素材的轮廓环带取3像素，去除压缩绿边，不腐蚀透明轮廓）；没有修改通用抠像参数。

## 验证

`npm test -w app -- work-mode.test.ts state-machine.test.ts player.test.ts`：工作/待机切换、连续操作不重播、退出后的异步隔离、输入失败、动画无烟雾及原播放器/状态机回归。

`node app/node_modules/electron/cli.js scripts/test-work-mode.cjs`：独立 Electron，真实视频，模拟空闲时长；验证透明背景与不透明脸部、输入/停止/继续、行为动作不打断、退出/重进、手动播放及切角。

`node app/node_modules/electron/cli.js scripts/try-work-mode.cjs --verify`：真实主进程、原生菜单及系统空闲接口，截图 `output/work-mode/production.png`。自动化输入切换由前一个脚本覆盖；长期挂机、不同系统和安装包尚未验收。

## 2026-09-27 手臂修正

用户指出第一版画面左手缺少从左侧伸出的手臂连接。已重画共用首帧，显露左肩蓝袖—前臂—袖口—手腕，降低电脑遮挡，并用新首帧重生成两段视频。每段按4fps检查20个手部局部帧，左侧来向与袖口连接保持。旧素材保留在 output/work-mode/v1，新原始素材及手部接触表在 v2，试用默认文件已替换。实际 Electron 透明度/输入切换验证通过。

## 2026-09-27 正式安装与待机修复

用户要求从试用装入正式客户端，改为双击进入。旧待机视频本身会抬手，导致切到待机后仍像打字；v3以待机视频自身第一帧固定手、电脑和下半身，仅保留上方呼吸，在胸口处柔和衔接，无额外生成费。固定区域与运动区域来自同一视频，避免不同首帧绿幕色差造成半透明矩形；手部局部画面人工检查通过。脚本 scripts/fix-work-idle.mjs 可复现，v2原始视频保留。

已正常调用 app.quit 保存退出正式与试用实例，通过 scripts/install-work-mode.cjs 备份正式张起灵 manifest 并安装4个动作资源；记录 output/work-mode/installed.json。正式客户端用原始存档重启并切回张起灵，未修改其他角色素材或重置玩法数据。

69项相关回归、类型检查、构建通过。scripts/test-work-mode.cjs 修正了测试快照缺 revision 导致桌宠实际隐藏的缺陷，现明确等待桌宠有尺寸并用真实鼠标事件验证双击。最后 scripts/verify-work-mode-live.mjs 在正式实例验证双击、原生 Shift 按键后进入typing、停手回idle；结果 formal-input-verification.json passed=true，截图 formal.png。验证用临时输入窗口已关闭，正式桌宠保留工作模式。

最终修正版已覆盖正式角色的待机 WebM/GIF 并重新激活加载；独立 Electron 验证四角 alpha 为0、脸部不透明，正式截图 formal.png 已人工复查，无半透明矩形残留。

## 2026-09-27 快速停手与连续画面

正式版已正常保存后重启更新。71项回归、类型检查、构建及真实透明视频验收通过。隔离测试记录 `fast-stop-verification.json`：注入已超过100ms的空闲值后59ms内观察到暂停，时间轴1.3834→1.392004停止并保持不动，续播从1.42426继续；没有重置到0。这个59ms是测试轮询观察延迟，不是声称实际停手总延迟。正式实例核对毫秒级原生接口、paused=true、呼吸样式=true，见 formal-fast-state.json。

## 2026-09-27 排除鼠标移动与进入自动播放

用户明确：移动鼠标不算，单击、双击和键盘输入才触发。已改为键盘/鼠标按钮采样；进入模式直接解码静止帧而不调用play，忽略进入双击本身。30项专项、类型检查、构建及真实Electron视频检查通过；进入后的currentTime为0并持续不变，后续输入/停止/继续、退出及切角验证通过。正式客户端正常保存重启更新。

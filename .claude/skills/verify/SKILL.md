---
name: verify
description: 运行并驱动 QBot Electron 桌宠客户端做端到端验证（隔离实例 + CDP）
---

# QBot 客户端验证配方

## 隔离启动（不影响用户正在跑的实例）

```bash
mkdir -p /tmp/qbot-verify
# 可选：预写 config.json（如 {"talkFrequency":"chatty"} 加速语音验证）
cd app && QBOT_USER_DATA=/tmp/qbot-verify npx electron-vite dev -- --remote-debugging-port=9223
```

- `QBOT_USER_DATA` 隔离 userData（角色库/配置/单实例锁都独立），预置角色自动 seed
- electron-vite 的 `--` 透传参数给 Electron，CDP 口即开

## 驱动（CDP，Node 22 原生 WebSocket，零依赖）

- 目标列表：`curl http://127.0.0.1:9223/json`，pet 窗口 url 含 `/pet/`
- `Runtime.evaluate` 读 DOM 状态（气泡 `#bubble` 的 className/textContent、可见视频 = `#stage video` 中 `style.visibility === 'visible'` 者）
- `Input.dispatchMouseEvent`（mousePressed → 多次 mouseMoved >4px → mouseReleased）可触发真实拖拽路径（窗口真会移动）
- `Page.captureScreenshot` 直接截透明窗口做证据
- preload API 面：`window.qbot.*` 可在 pet 页 evaluate 里直接调用（如 settings.set）

## 坑

- 桌宠自主行为 30s~3min 随机插播；语音定时器打到非 idle 会跳过并重排完整区间——等气泡的超时窗口给足 400s
- 声音无法程序化观测，只能靠气泡/动画/无异常做代理证据，音质需人耳验收

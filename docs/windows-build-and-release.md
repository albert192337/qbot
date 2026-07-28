# Windows 构建与发包手册

在 Windows 上从零把 QBot 编译、验证、打成可分发包的完整流程。**2026-07-29 在 Windows 11 Home China (10.0.26100) + Node 24.18.0 + npm 11.16.0 实测跑通全程。**

Windows 包必须在 Windows 上构建：`ffmpeg-static` 装机时按当前平台下载二进制，交叉打包拿不到 `ffmpeg.exe`。

## TL;DR

```bash
# 1. 装依赖（国内网络必须跳过 postinstall，见下）
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install --ignore-scripts

# 2. 手动补两个二进制（postinstall 被跳过了）
cd node_modules/ffmpeg-static && FFMPEG_BINARIES_URL=https://registry.npmmirror.com/-/binary/ffmpeg-static node install.js && cd ../..
cd node_modules/electron && ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node install.js && cd ../..

# 3. 编译 + 验证
npm run build -w pipeline     # app 引用的是 dist/，这步不能省
npm test -w pipeline          # 48 测试
npm test -w app               # 140 测试
npx tsc --noEmit -p app

# 4. 打包
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ \
npm run dist -w app
```

产物在 `app/release/`：`QBot Setup <ver>.exe`（NSIS 安装包，~130 MB）+ `QBot-<ver>-win.zip`（免安装绿色版，~172 MB）。

## 国内网络：三个下载源都要绕

这是整个流程唯一真正卡人的地方。三处下载各走各的环境变量，**漏一个就卡住或失败**。

| 下载什么 | 环境变量 | 值 |
|---|---|---|
| electron 二进制 | `ELECTRON_MIRROR` | `https://npmmirror.com/mirrors/electron/` |
| ffmpeg 二进制 | `FFMPEG_BINARIES_URL` | `https://registry.npmmirror.com/-/binary/ffmpeg-static` |
| nsis / 7zip / icons 工具链 | `ELECTRON_BUILDER_BINARIES_MIRROR` | `https://npmmirror.com/mirrors/electron-builder-binaries/` |

### 为什么必须 `--ignore-scripts`

`ffmpeg-static` 的 postinstall 直连 GitHub Releases，国内会 `ETIMEDOUT`，而它的失败会让**整个 `npm install` 退出 1**：

```
npm error path D:\dev\qbot\node_modules\ffmpeg-static
npm error Error: connect ETIMEDOUT 20.205.243.166:443
```

`ELECTRON_MIRROR` 救不了它——那个变量只管 electron。所以先 `--ignore-scripts` 让依赖树装完，再手动跑两个 install.js。

注意 `--ignore-scripts` 会**同时**跳过 electron 的 postinstall，所以两个二进制都得补。补完确认一下：

```bash
ls node_modules/ffmpeg-static/ffmpeg.exe   # ~82 MB
ls node_modules/electron/dist/electron.exe
```

### 镜像里有没有你要的版本

`ffmpeg-static` 的 release tag 写在它自己的 package.json 里（当前 `b6.1.1`）。换版本前先确认镜像有：

```bash
curl -s https://registry.npmmirror.com/-/binary/ffmpeg-static/b6.1.1/ | tr ',' '\n' | grep win32
```

## 改版本号

四个 package.json（root + 三个 workspace）一起改：

```bash
npm version 0.2.0 --no-git-tag-version --workspaces --include-workspace-root
```

`npm version` 会顺带 `npm install` 刷新 lockfile，但**不会**重跑 postinstall，所以之前手动补的两个二进制还在（我实测确认过）。改完版本号别忘了删 `app/release/` 里的旧版本产物，不然新旧包混在一起。

## 验证清单

打包前这四步都要过。`npm run dist` 自己不跑测试，CI 也只跑 pipeline 的（`build-windows.yml` 缺 `npm test -w app`，那 140 个测试目前只在本地跑）。

```bash
npm run build -w pipeline   # 必须先 build：app 引用 pipeline/dist/，不是 src/
npm test -w pipeline        # 48 测试，含真跑 ffmpeg 的 e2e + WebM alpha 验证
npm test -w app             # 140 测试
npx tsc --noEmit -p app
```

打完包一定要**跑一下解包后的 exe**，只看 electron-builder 输出不算验证：

```bash
cd app/release/win-unpacked
QBOT_USER_DATA="$LOCALAPPDATA/qbot-pkgtest" ./QBot.exe

# 另开一个终端：确认 asar 里的 ffmpeg 真的可执行（血泪坑 9）
./resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg.exe -version
```

健康的样子是 4 个 `QBot.exe` 进程（主进程 + renderer），`tasklist | grep -i qbot` 看得到。

## 验证 Claude Code 联动

联动是最容易「看着装好了其实没通」的部分，值得单独端到端跑一次。**关键前提：Claude Code 在 Windows 上也用 bash 执行 hook**（`$0` = `/usr/bin/bash`，Git for Windows 提供），所以 hook 命令串是三平台共用的 POSIX，没有 Windows 分支。

用 `CLAUDE_CONFIG_DIR` 隔离，别拿自己的 `~/.claude/settings.json` 做实验：

```bash
mkdir -p /tmp/cchook
# 用生产安装器（withHooks）生成 settings，而不是手写——手写容易和真实产物不一致
# 见 app/src/main/hooks/claude.ts 的 withHooks / withoutHooks

# 启动打包版，确认服务发现
cat "$USERPROFILE/.qbot/port"          # 应是 24242
curl -s http://127.0.0.1:24242/state   # {"app":"qbot",...,"activity":"idle"}

# 跑真实会话（注意 CLAUDE_CONFIG_DIR 要用 Windows 路径形式）
CLAUDE_CONFIG_DIR='C:\Users\<you>\AppData\Local\Temp\cchook' \
  claude -p "用 Bash 跑 echo ok，再一句话总结" --permission-mode acceptEdits
```

轮询 `/state` 应看到：

```
+4.1s thinking/1    +11.0s working/1    +17.1s done/1    +17.4s idle/0
```

排查要点：

- **hook 失败是静默的**。正常输出里什么都看不到，必须 `claude -p ... --debug hooks`，失败信息只在那儿：
  ```
  SessionEnd hook [D:devqbotprobe.cmd] failed: /usr/bin/bash: line 1: command not found
  ```
  （上面这个例子就是反斜杠被 bash 当转义符吃掉了——hook 命令串必须保持 POSIX）
- headless（`claude -p`）下 `SessionEnd` 紧跟 `Stop` 到达，时间线里可能**看不到 `done`**，这是正常的（血泪坑 14）。要验 `done`/气泡就手动 POST 一个 Stop 而不发 SessionEnd。
- 用 shell 手搓 JSON 测 `/state` 时，`D:\dev\qbot` 这种反斜杠会被吃成非法转义、服务端回 400。用 `JSON.stringify` 生成，别手拼。

## 已知限制

- **包没签名**（`electron-builder.yml` 里 `identity: null`，Windows 侧也没配证书）。用户首次运行会撞 SmartScreen「未知发布者」，得点「更多信息 → 仍要运行」。要消掉就得买代码签名证书配 `CSC_LINK`/`CSC_KEY_PASSWORD`。
- 分发出去的实例**不含 API key**（`config.local.json` 是 gitignored 且不进包），用户要自己在设置里填才能孵化新角色。
- `~/.qbot/port` 是全局单文件，多开（`QBOT_USER_DATA`）时只有最后启动的那只会被 hook 驱动。
- `electron-builder.yml` 的 `electronVersion` 是**钉死的精确版本**（monorepo 提升导致 range 推断失败，血泪坑 11）。升 electron 时这里要一起改，否则打出来的包和 devDependencies 不一致。

## CI

`.github/workflows/build-windows.yml`：`workflow_dispatch` 手动触发，或打 `v*` tag 自动跑，产物走 `upload-artifact`。CI 在 GitHub runner 上不需要任何镜像变量。

两点和本地不同：CI 用 `npm ci`（不带 `--ignore-scripts`，postinstall 能正常连 GitHub）；CI **没跑 app 的 140 个测试**，如果要让 CI 完整守住，得在 type check 前补一步 `npm test -w app`。

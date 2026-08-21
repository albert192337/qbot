# 生成流程全景 + 抠像质量优化（实测记录）

> 本文分两部分：**一、当前生成流程与过程参数**（现状说明）；
> **二、抠像质量优化**（2026-08-21 落地，含实测数据与被否决的方案）。

---

## 一、整体流程

```
丢角色图 (source.png)
   │
   ▼ Stage 1  三视图生成 ── 同 prompt 并发 3 次独立请求（图生图，参考图=用户图）
   │          3 张候选 turnaround_cand_{0,1,2}.png
   ▼ Stage 1.5 人工挑选 ── 唯一人工交互点；不满意可整轮重生成
   │          选中 → 复制为资产包根目录 turnaround.png
   │
   ▼ Stage 2  绿幕首帧（×6 动作，并发）── 图生图，参考图=三视图
   │          QC：四角纯绿 + 背景均匀度，不过自动重试 1 次
   ▼ Stage 3  循环视频（×6 动作）── Seedance i2v 异步任务
   │          首帧同时作 first_frame + last_frame（循环的关键）
   │          下载绿幕 mp4 落盘 `.job/<action>.mp4`
   ▼ Stage 4  抠像转码（×6 动作）
   │          漂移 QC → 双 key 采样 → chromakey → rim despill → 尺寸归一化
   │          输出 actions/<action>.webm + actions/<action>.gif
   ▼ Stage 5  打包门槛 → manifest.json
```

每动作独立异步链（`Promise.allSettled` 并发，单动作失败不阻塞其他）；
打包门槛 `done ≥ 4` 且必含 `idle + drag`。断点续跑靠 `.job/state.json`，
`videoTaskId` 提交成功立即落盘（防重启重复提交扣钱）。

## 各阶段过程参数

### Stage 1 三视图

| 参数 | 值 |
|---|---|
| 候选数 | 3（同 prompt 并发）|
| 生图模型 | `doubao-seedream-5.0-lite` |
| 尺寸 | `3072x1536`（1440x1440 会 400）|
| 参考图 | 用户 source.png |

### Stage 2 绿幕首帧

| 参数 | 值 |
|---|---|
| 尺寸 | `2048x2048` |
| 参考图 | 选中的 turnaround.png |
| 重试 | QC 不过重试 1 次（`FRAME_MAX_ATTEMPTS = 2`）|
| 帧 QC | 四角 8×8 全绿（HSV h∈[80,165], s≥0.35, v≥0.25）**+ 四角色差 ≤25**|

### Stage 3 循环视频

| 参数 | 值 |
|---|---|
| 模型 | `doubao-seedance-1.5-pro` |
| 首/尾帧 | 同一张绿幕首帧 |
| prompt 尾缀 | `--resolution 480p --duration 5 --camerafixed true` |
| 输出 | 640×640 24fps h264 |
| 轮询 | 5s 间隔，15min 超时 |

### Stage 4 抠像转码（本次优化重点）

| 参数 | 值 | 常量 |
|---|---|---|
| 背景采样 | 首/尾帧各 8 点（四角+四边中点）8×8 平均色 | `sampleBackgroundColors` |
| key 选择 | **双 key 常态化**：色度极值两端（最亮绿 + 最暗绿）| `selectDualKeys` |
| 漂移 QC | 首/中/尾角落色两两 RGB 最大差 >25 判废 | `classifyDrift` |
| chromakey | `similarity=0.1, blend=0.07` | `CHROMAKEY_SIMILARITY/BLEND` |
| **去绿边** | **rim-only despill mix=0.5, band=1** | `RIM_DESPILL_MIX/BAND` |
| alpha 收边 | **默认 0**（已被 despill 取代，保留作回退）| `ALPHA_ERODE_PX` |
| 归一化 | 覆盖率目标 0.18，脚线对齐基线 0.86 | `normalizeFilter` |
| WebM | libvpx-vp9, yuva420p, crf30, `-auto-alt-ref 0` + `alpha_mode=1` | `toWebm` |
| GIF | 320px, 20fps, `dither=none`, `alpha_threshold=128` | `toGif` |

---

## 二、抠像质量优化（2026-08-21）

### 2.1 问题拆解：绿边到底是什么

用「大画布画主体 → bilinear 缩小」合成带真实抗锯齿边的绿幕素材
（与 h264 色度子采样在轮廓上留下的混色边同构），逐像素扫描主体边缘：

```
x=73  38f729  a=00   G+199   ← 纯背景绿，已抠掉
x=74  7cda74  a=7a   G+98    ← 混色带，半透明
x=75  bdffb5  a=ff   G+70    ← 绿边：不透明！但明显偏绿
x=76  fdfdfd  a=ff   G+0     ← 角色本体白
```
（`G` = greenness = `g − (r+b)/2`，绿偏程度的量化指标）

**关键发现：绿边像素的 alpha = 255（完全不透明）。**
这否决了「只处理半透明 rim（alpha∈(0,1)）」的直觉方案——那样根本抓不到 x=75。

### 2.2 为什么旧的 alpha 腐蚀方案治不好

| 方案 | x=75 结果 | 代价 |
|---|---|---|
| `erode 1`（旧默认）| `bdffb5` **颜色原样**，只是 a=ff→7a | 绿边还在，只是半透明地绿着 |
| `erode 2` | a→00，绿边终于没了 | 同时啃掉角色本体一圈（x=76 白色被削）|

**腐蚀从不改颜色，只挪 alpha。** 所以「没绿边」与「抠得完整」在腐蚀方案里无法兼得——
这正是原来那个矛盾的根源。

### 2.3 为什么不能用全帧 despill

`chroma.ts` 铁律 1 原文是「白色含大量绿通道，despill 会把白发/白衣染成粉紫」。
用 8 色块探针实测（全帧 despill mix=0.5）：

| 色块 | 原始 | 全帧 despill 后 | 判定 |
|---|---|---|---|
| 纯白 `fdfdfd` | G+0 | G+0 | 未复现染色 |
| 绿反光白 `e8f5e0` | G+18 | G-1 | 轻微，可接受 |
| **薄荷绿身体 `7fffd4`** | **G+86** | **G-1** | **本体被压成灰** |
| **橄榄绿衣服 `8fbc5a`** | **G+73** | **G-1** | **本体被压成灰** |
| 深色衣服 `1a1a1a` | G+0 | G+0 | 安全 |

**真正的危险不是白色，是绿色系角色**——即血泪坑 3 的「小青」案例。
所以 despill 不能全帧用，但**可以做空间门控**。铁律 1 已按此实测结论修订。

### 2.4 落地方案：rim-only despill

```
环带 mask = dilate^n(alpha) − erode^n(alpha)  → 二值化 → maskedmerge
```
- 用 `dilation` 向外扩是关键：绿边像素 alpha 已是 255，
  只用 `alpha − erode(alpha)` 的环带抓不到最外那圈。
- 只在环带内取 despill 版，**角色内部像素一个不碰**。

**三个必须显式钉死的像素格式**（少一个就翻车，全部实测）：
1. `alphaextract` 前必须 `format=yuva444p` —— 否则整图格式协商失败
   （`The following filters could not choose their formats`）。
2. mask 必须 `format=gbrp,format=rgba` 复制到 RGB 三通道 —— gray mask 会被自动转 yuv、
   chroma 补 128，`maskedmerge` 退化成 50% 混合，despill 只生效一半（实测 G+70 只降到 G+35）。
3. base/overlay 都走 rgba，与 mask 同格式，merge 才是真·二值取舍。

**despill 与 erode 互斥**：两段独立的 split/alphaextract 子图叠加会让 ffmpeg
重新协商格式，实测把角色内部也改坏（薄荷绿 G+86→G+42）。
`keyActionVideo` 已强制 `despillMix > 0 → erodePx = 0`。

### 2.5 实测效果（同一段移动视频，48 帧，前后对照）

| 指标 | 旧（单 key + erode1）| 新（双 key + rim despill）|
|---|---|---|
| 绿偏像素 (G>25) | 6048（1.132%）| **0（0.000%）**|
| 最绿残留 | G+34 | **G+0** |
| 不透明像素 | 534240 | **554736（+20496）**|
| GIF 绿偏 | — | **0（0.000%）**|

绿边完全消除，**且角色更完整**——多出 2 万个不透明像素，因为不再需要靠腐蚀削边。

绿色系角色回归（薄荷绿身体 + 深色衣服 + 白色块同帧）：
薄荷绿本体 6186 px 保留未压灰、深色衣服 2840 px 未抠穿、白色 1017 px 未染色。

### 2.6 其余落地项

- **双 key 常态化**（`selectDualKeys`）：不再只在漂移超标时才用双 key。
  取样本色度极值两端，覆盖帧内渐变与颗粒；统一背景时自动去重成单 key，零额外成本。
- **背景均匀度 QC**：`checkGreenFrame` 在四角全绿之外，增加四角色差 >25 判不均匀 → 触发重试。
  在生成端拦下渐变/纹理背景，背景越均匀 key 半径就能越小，越不吃角色。
- **prompt 补强**（纯追加，不改既有实测有效措辞）：
  首帧加「整个背景由同一个绿色色值均匀铺满，背景没有任何明暗变化或光照渐变」；
  视频加「背景全程保持同一个均匀绿色色值，不出现明暗跳变或光照闪烁」。
- **rekey CLI 调参**：`--despill <mix>`（0 = 关闭回退旧行为）、`--erode <px>`（仅 despill 关闭时生效），
  存量角色可逐动作试参重抠，零 API 花费。

### 2.7 未采纳

- **提高视频分辨率 480p→720p**：能从源头减窄绿边，但按条计费会显著抬高成本，
  且 rim despill 已把绿边清零，性价比不足。留作后续画质档位的选项。

### 2.8 回归测试

`pipeline/test/despill.test.ts`（6 例）锁住上述结论，其中两例是**对照组**——
直接断言「全帧 despill 会毁绿色角色」「腐蚀去不掉绿边」，
防止后人把这两条当成「优化」重新引入。`npm test -w pipeline` 共 80 例通过。

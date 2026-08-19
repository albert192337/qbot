# QBot 产品化：特性设计与动作体系重构

> 版本：v1.0（2026-08-16）
> 状态：草稿
> 上游文档：CLAUDE.md（产品全案）、各 spec（联机/皮肤市场/叽歪语音）

---

## 一、背景

QBot 的技术基础已经站住：管线（三视图→首帧→视频→抠像→资产包）、状态机（7 态）、agent 联动（Claude Code hooks）、飞书会议监听、举牌系统、联机框架（relay + 资产分发）。

但产品层面还停留在「能跑」阶段：动作只有 6 个且语义过载，用户和桌宠的关系是「观察者-被观察者」，没有真正的互动感。

本文档的目标：**系统化设计新特性，重构动作体系，让每只桌宠有「灵魂」**。

---

## 二、新特性全景

### 2.1 第一层：让它有灵魂（情感连接）

| 特性 | 核心设计 | 工时 | 依赖 |
|---|---|---|---|
| **情绪系统** | 每只角色有持久化 mood 值 `[-100, +100]`；拖拽 +5、忽视 -1、完成任务 +3、开会 -1、听歌 +2、点击 +10；mood >50 自动蹦跳，< -30 动作变慢+叹气，= -100 闹脾气 | 3-4d | 动作体系重构 |
| **时间感知** | 桌宠知道几点、周几；早安气泡、深夜关怀、午休变慢、周末心情衰减减半、节日祝福 | 2d | 文案库 + 每分钟 tick |
| **声音性格** | 基于叽歪语音 spec（WebAudio 程序化合成）；拖拽惊叫、放下叹息、完成开心、出错担忧、忽视叹气、听歌哼唱 | 5-7d | 叽歪语音引擎 |
| **习惯养成** | 本地记录每日活跃时间/编码时长/完成任务数；连续编码 >2h 久坐提醒、连续 5 天按时下班心情 +20、每周陪伴报告 | 3-4d | habit-tracker.ts |

### 2.2 第二层：让它有用（实用工具）

| 特性 | 核心设计 | 工时 | 依赖 |
|---|---|---|---|
| **便签/提醒** | 举牌延伸：右键「写便签」→ 举牌显示；支持定时提醒（到时间弹气泡+闪烁）；最多 3 条待提醒 | 2d | signboard.ts 扩展 |
| **番茄钟** | 右键「开始专注」→ 选时长（25/45/60min）；专注中举牌倒计时+低头认真动作；休息提醒；完成 +5 心情 | 2-3d | focus 动作 |
| **工作报告** | 右键「生成日报」→ 读当天 transcript → LLM 摘要 → markdown 日报；「今日完成 3 个 feature、2 个 bugfix，总编码 4.2h」 | 3-4d | transcript 数据 |
| **多角色轮播** | 设置中开启「角色轮播」→ 每 N 小时自动切换（默认 4h）；按心情值排序（最「饿」的优先）；切换时播放变身过渡 | 2d | 多角色管理 |

### 2.3 第三层：让它被看见（传播和社区）

| 特性 | 核心设计 | 工时 | 依赖 |
|---|---|---|---|
| **截图/录屏** | 右键「截图」→ 截取桌宠+举牌/气泡→保存+复制剪贴板；「录制 5s」→ 生成 GIF；截图自动加品牌水印 | 2-3d | GIF 转码 |
| **出生证明卡美化** | 更精美设计（多风格：简约/复古/赛博）；加入生成时间、动作列表、性格描述；一键分享 | 1-2d | hatch renderer |
| **角色图鉴** | Studio「角色图鉴」tab；所有已生成角色缩略图网格；成就系统（5 角色、心情 100、陪伴 7 天、完成 50 任务） | 3d | manifest 数据 |

---

## 三、动作体系现状与问题

### 3.1 现有动作（6 个）

| 动作 ID | 名称 | 动画语义 | 状态机用途 |
|---|---|---|---|
| `idle` | 待机呼吸 | 平静站立 | 常驻循环 |
| `drag` | 被拖拽悬空 | 被拎起挣扎 | 鼠标按住 |
| `sleep` | 睡觉 | 闭眼睡觉 | done 庆祝 |
| `tea` | 喝茶 | 悠闲喝茶 | agent thinking/working、meeting 默认 |
| `talk_happy` | 对话开心 | 开心说话 | music 默认、auto 随机 |
| `talk_annoyed` | 对话不耐烦 | 不耐烦说话 | agent waiting/error |

### 3.2 问题：语义过载

**一个动作被塞进了太多不相关的语义**：

| 动作 | 被复用为 | 语义冲突 |
|---|---|---|
| `tea` | agent thinking + agent working + meeting 旁听 + auto 随机 | 「喝茶」= 思考？= 工作？= 开会？= 随机发呆？ |
| `talk_happy` | 音乐摇摆 + auto 随机 | 听歌时「开心说话」？应该是随节奏晃头 |
| `talk_annoyed` | agent waiting + agent error + auto 随机 | 「不耐烦」= 等人？= 出错了？= 随机发呆？ |
| `sleep` | done 庆祝 + 未来可能用于 idle/深夜 | 任务完成了「睡觉」？庆祝应该是开心的 |

**auto 随机池**是 `available.filter(a => a !== 'idle' && a !== 'drag')`，意味着 tea/talk_happy/talk_annoyed/sleep 都会被随机播——但这些动作的语义是为特定场景设计的，随机播会让角色看起来「精神分裂」。

### 3.3 新功能对动作的需求

| 新功能 | 需要的动作 | 现有能否覆盖 |
|---|---|---|
| 情绪系统：开心 | 蹦跳/欢呼/转圈 | ❌ 无 |
| 情绪系统：低落 | 叹气/低头/蜷缩 | ❌ 无（sleep 语义不同） |
| 情绪系统：闹脾气 | 抗拒/背过身 | ❌ 无 |
| 时间感知：早安 | 打招呼/挥手 | ❌ 无（idle 是静态呼吸） |
| 时间感知：深夜关怀 | 揉眼睛/打哈欠 | ❌ 无 |
| 声音性格：被拖拽 | 惊叫（短促） | ✅ drag 动画可复用 |
| 声音性格：放下 | 满足叹息 | ❌ 无专属动作 |
| 番茄钟：专注 | 低头认真/伏案工作 | ❌ 无 |
| 番茄钟：休息提醒 | 伸懒腰 | ❌ 无 |
| 番茄钟：完成 | 庆祝（应该比 sleep 更有活力） | ❌ sleep 语义不对 |
| 工作报告：查看 | 指向/展示 | ❌ 无 |
| 习惯养成：久坐提醒 | 站起来活动/拉伸 | ❌ 无 |

**结论：现有 6 个动作远远不够，至少需要 10-12 个新动作。**

### 3.4 根本问题：管线生成成本太高

现在每加一个动作 = 生成管线跑一轮（首帧 1-2min + 视频 3-5min + 抠像 1min ≈ **5-8 分钟 + API 费用**）。如果要 16 个动作，光生成就要 1.5-2 小时，且每只新角色都要重跑。

这不可能让用户自选「我要哪些动作」——成本太高。

---

## 四、动作体系重构方案

### 4.1 核心思路：分层 + 组合

**不是给每个语义都生成新视频，而是把动作分三层，用组合逻辑覆盖所有场景。**

#### 第一层：基础动作（6 个，不变）

| 动作 | 用途 | 说明 |
|---|---|---|
| `idle` | 常驻待机 | 平静呼吸，永远在播 |
| `drag` | 被拖拽 | 鼠标按住时播放 |
| `sleep` | 睡觉/休息 | idle 的变体（深夜可用） |
| `tea` | 喝茶/悠闲 | 通用「无事发生」动作 |
| `talk_happy` | 开心说话 | 通用「正面情绪」动作 |
| `talk_annoyed` | 不耐烦说话 | 通用「负面情绪」动作 |

**这 6 个是管线 S 档默认生成的，每只角色都有。**

#### 第二层：场景动作（4 个，Studio 可选配置）

| 动作 | 用途 | 覆盖的新场景 |
|---|---|---|
| `focus` | 专注工作 | 番茄钟、agent working 深度模式 |
| `wave` | 打招呼/挥手 | 早安、用户上线、串门迎接 |
| `yawn` | 打哈欠/揉眼睛 | 深夜关怀、午休、困倦 |
| `celebrate` | 庆祝/欢呼 | done 庆祝、成就解锁、心情爆表 |

**这 4 个是新管线规格（S+ 档）可选生成的；用户不生成时，状态机自动回退到第一层最接近的动作（focus→tea, wave→talk_happy, yawn→sleep, celebrate→talk_happy）。**

#### 第三层：情绪变体（3 个，基于第一层动作的微调）

| 动作 | 用途 | 实现方式 |
|---|---|---|
| `idle_happy` | 开心时的 idle | idle 动画 + 额外蹦跳/晃动（程序化微调，不需要新视频） |
| `idle_sad` | 低落时的 idle | idle 动画 + 速率 0.7x + 偶尔低头（程序化微调） |
| `idle_angry` | 闹脾气时的 idle | idle 动画 + 背过身/抖动（程序化微调） |

**这 3 个不需要管线生成——通过程序化微调 idle 动画实现（改变播放速率、叠加轻微位移/旋转），零 API 成本。**

### 4.2 状态机映射重构

**当前映射（语义过载）**：

```
agent thinking  → tea
agent working   → tea
agent waiting   → talk_annoyed
agent error     → talk_annoyed
done            → sleep
music           → talk_happy
meeting         → tea
auto            → random(tea, talk_happy, talk_annoyed, sleep)
```

**重构后映射（语义清晰）**：

```
agent thinking   → tea（思考 = 喝茶，保留）
agent working    → focus（工作 = 专注，新动作）
agent waiting    → tea（等待 = 无聊喝茶，比 talk_annoyed 更自然）
agent error      → talk_annoyed（出错 = 不耐烦，保留）
done             → celebrate（完成 = 庆祝，新动作）
music            → idle_happy（听歌 = 开心晃动，情绪变体）
meeting          → tea（开会 = 喝茶旁听，保留）
auto             → random(tea, talk_happy, sleep)（排除 talk_annoyed，随机不该有负面情绪）

时间感知：
  早安           → wave（打招呼，新动作）
  深夜           → yawn（打哈欠，新动作）
  午休           → sleep（睡觉，已有）
  节日           → celebrate（庆祝，新动作）

番茄钟：
  专注中         → focus（专注，新动作）
  休息提醒       → yawn（打哈欠，新动作）
  完成           → celebrate（庆祝，新动作）

情绪系统：
  mood > 50      → idle_happy（开心变体）
  mood < -30     → idle_sad（低落变体）
  mood = -100    → idle_angry（闹脾气变体）
```

### 4.3 动作可用性保障

**回退机制**：当场景动作（第二层）不可用时，自动回退到第一层最接近的动作。

```ts
const ACTION_FALLBACK: Record<string, ActionId> = {
  focus: 'tea',
  wave: 'talk_happy',
  yawn: 'sleep',
  celebrate: 'talk_happy',
};
```

**Studio 配置**：用户可以在 Studio 中为每个场景（agent thinking/working/waiting/error/done、music、meeting、番茄钟、时间感知）单独指定动作，覆盖默认映射。

**manifest.json 扩展**：

```ts
interface Manifest {
  // ...现有字段
  agentActions: {
    thinking?: PlayableId;
    working?: PlayableId;
    waiting?: PlayableId;
    error?: PlayableId;
    doneAction?: PlayableId;
  };
  musicAction?: PlayableId;
  meetingAction?: PlayableId;
  // 新增
  timeActions?: {
    morning?: PlayableId;    // 早安
    night?: PlayableId;      // 深夜
    noon?: PlayableId;       // 午休
    holiday?: PlayableId;    // 节日
  };
  focusAction?: PlayableId;  // 专注
  celebrateAction?: PlayableId; // 庆祝
}
```

---

## 五、特性与动作的完整映射

| 特性 | 使用的动作 | 层级 | 生成需求 |
|---|---|---|---|
| **情绪系统：开心** | `idle_happy` | 第三层 | ❌ 程序化微调 |
| **情绪系统：低落** | `idle_sad` | 第三层 | ❌ 程序化微调 |
| **情绪系统：闹脾气** | `idle_angry` | 第三层 | ❌ 程序化微调 |
| **情绪系统：庆祝** | `celebrate` | 第二层 | ✅ S+ 档可选 |
| **时间感知：早安** | `wave` | 第二层 | ✅ S+ 档可选 |
| **时间感知：深夜** | `yawn` | 第二层 | ✅ S+ 档可选 |
| **时间感知：午休** | `sleep` | 第一层 | ✅ S 档默认 |
| **时间感知：节日** | `celebrate` | 第二层 | ✅ S+ 档可选 |
| **声音性格：被拖拽** | `drag` | 第一层 | ✅ S 档默认 |
| **声音性格：放下** | （无专属动作） | — | — |
| **番茄钟：专注** | `focus` | 第二层 | ✅ S+ 档可选 |
| **番茄钟：休息** | `yawn` | 第二层 | ✅ S+ 档可选 |
| **番茄钟：完成** | `celebrate` | 第二层 | ✅ S+ 档可选 |
| **工作报告** | （无专属动作） | — | — |
| **便签/提醒** | `signboard`（DOM） | — | — |
| **截图/录屏** | （无专属动作） | — | — |
| **角色图鉴** | （无专属动作） | — | — |
| **多角色轮播** | 各角色自带动作 | — | — |
| **习惯养成：久坐提醒** | `wave`（挥手=站起来） | 第二层 | ✅ S+ 档可选 |
| **习惯养成：周报** | `celebrate`（完成） | 第二层 | ✅ S+ 档可选 |

**总结**：新增 4 个场景动作（focus/wave/yawn/celebrate）+ 3 个情绪变体（idle_happy/idle_sad/idle_angry），共覆盖全部新特性。其中情绪变体不需要管线生成，零成本。

---

## 六、管线扩展：S+ 档

### 6.1 动作集规格

| 档位 | 动作数 | 动作列表 | 生成耗时 | 费用估算 |
|---|---|---|---|---|
| **S 档（默认）** | 6 | idle, drag, sleep, tea, talk_happy, talk_annoyed | 30-60min | ¥6-12 |
| **S+ 档（可选）** | 10 | S 档 + focus, wave, yawn, celebrate | 50-90min | ¥10-18 |

### 6.2 用户选择时机

**孵化流程末尾增加一步**：

```
三视图 → 挑选 → [生成进度] → 完成 → 出生证明卡
                                          ↓
                                    「要更多动作吗？」
                                    ├─ 标准版（6 个，免费）
                                    └─ 豪华版（10 个，+¥4 API 费用）
```

**Studio 也可追加生成**：已有角色 → Studio「动作管理」→ 「解锁更多动作」→ 补生成 focus/wave/yawn/celebrate。

### 6.3 管线改动

`pipeline/src/prompts.ts` 新增 4 个动作的 prompt：

- `focus`：低头专注，双手在身前（伏案工作既视感）
- `wave`：单手举起挥动（打招呼）
- `yawn`：双手举过头顶伸懒腰，嘴巴张开
- `celebrate`：双手举起蹦跳，开心表情

`pipeline/src/types.ts` 扩展：

```ts
const ACTION_IDS = ['idle', 'drag', 'sleep', 'tea', 'talk_happy', 'talk_annoyed'] as const;
const EXTENDED_ACTION_IDS = [...ACTION_IDS, 'focus', 'wave', 'yawn', 'celebrate'] as const;
```

---

## 七、情绪变体的程序化实现

### 7.1 技术方案

不需要为情绪变体生成新视频——通过**程序化微调** idle 动画实现：

| 变体 | 微调方式 | 实现位置 |
|---|---|---|
| `idle_happy` | 播放速率 1.1x + 叠加正弦波 Y 位移（蹦跳感） | `player.ts` |
| `idle_sad` | 播放速率 0.7x + 叠加微弱 X 旋转（低头感） | `player.ts` |
| `idle_angry` | 播放速率 1.2x + 叠加随机 X 位移（抖动感） | `player.ts` |

### 7.2 player.ts 扩展

```ts
interface MoodOverlay {
  playbackRate: number;
  translateY?: { amplitude: number; frequency: number }; // 正弦波蹦跳
  translateX?: { amplitude: number; random: boolean };   // 随机抖动
  rotateX?: number; // 低头角度
}

const MOOD_OVERLAYS: Record<string, MoodOverlay> = {
  idle_happy: { playbackRate: 1.1, translateY: { amplitude: 3, frequency: 2 } },
  idle_sad:   { playbackRate: 0.7, rotateX: 5 },
  idle_angry: { playbackRate: 1.2, translateX: { amplitude: 2, random: true } },
};
```

### 7.3 状态机集成

```ts
// state-machine.ts 新增 mood 态
case 'MOOD_CHANGE': {
  // 从 idle 进入情绪变体
  if (state.kind !== 'idle') return { state };
  const overlay = MOOD_OVERLAYS[event.moodVariant];
  if (!overlay) return { state };
  return {
    state: { kind: 'idle', moodVariant: event.moodVariant },
    play: 'idle',
    moodOverlay: overlay,
  };
}
```

---

## 八、优先级矩阵

### 8.1 按「成本-收益」排序

| 优先级 | 特性 | 工时 | 收益 | 理由 |
|---|---|---|---|---|
| **P0** | 便签/提醒 | 2d | 高 | 复用举牌，成本极低，立刻提升实用性 |
| **P0** | 截图/录屏 | 2-3d | 高 | 传播基建，越早做越好 |
| **P0** | 出生证明卡美化 | 1-2d | 高 | 与截图分享一起做 |
| **P1** | 情绪系统（程序化变体） | 2-3d | 极高 | 产品灵魂，零 API 成本 |
| **P1** | 时间感知 | 2d | 高 | 成本低，效果好 |
| **P1** | 管线扩展 S+ 档 | 3-4d | 中 | 为后续特性打基础 |
| **P2** | 番茄钟 | 2-3d | 中 | 实用功能，与情绪联动 |
| **P2** | 情绪系统（celebrate 等动作） | 1d | 中 | 依赖 S+ 档 |
| **P3** | 声音性格 | 5-7d | 高 | 依赖叽歪语音引擎 |
| **P3** | 工作报告 | 3-4d | 中 | 依赖 transcript 数据 |
| **P3** | 角色图鉴 | 3d | 中 | 游戏化留存 |
| **P4** | 习惯养成 | 3-4d | 中 | 数据积累需要时间 |
| **P4** | 多角色轮播 | 2d | 低 | 驱动生成，但需要用户有多个角色 |

### 8.2 按「用户感知」排序

| 阶段 | 用户能看到什么 |
|---|---|
| **P0 完成后** | 右键菜单多了「写便签」「截图」；出生证明卡变好看了 |
| **P1 完成后** | 桌宠有情绪了（开心会蹦跳、低落会叹气）；知道现在几点（早安/深夜关怀）；角色有 10 个动作可选 |
| **P2 完成后** | 可以开番茄钟了（专注+休息提醒）；任务完成会庆祝（不再睡觉） |
| **P3 完成后** | 桌宠会说话了（声音性格）；可以生成工作日报了；有角色图鉴和成就了 |
| **P4 完成后** | 桌宠会记住你的习惯（久坐提醒、每周报告）；角色会自动轮播 |

---

## 九、技术风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| **S+ 档生成失败率高** | 用户体验差 | 新动作 prompt 需要充分测试；失败时自动回退到 S 档 |
| **情绪变体微调效果差** | 程序化调整可能让动画看起来不自然 | 需要逐个调试参数；提供 Studio 手动调节 |
| **动作数量膨胀导致维护困难** | 状态机复杂度增加 | 严格分层（三层），新增动作只在第二层；第三层靠程序化 |
| **API 成本上升** | S+ 档比 S 档贵 ¥4-6 | 免费+付费分层（见 §6.2） |

---

## 十、总结

**一句话**：不是给每个语义都生成新视频，而是用「6 个基础动作 + 4 个场景动作 + 3 个情绪变体」的分层体系，覆盖全部新特性。其中情绪变体零成本（程序化微调），场景动作可选生成（S+ 档），基础动作不变（S 档）。

**核心创新**：
1. 情绪变体不需要管线生成——通过程序化微调 idle 动画实现，零 API 成本
2. 场景动作可选生成——用户不生成时自动回退到最接近的基础动作，保证体验完整
3. 状态机映射重构——消除语义过载，每个动作只对应一个清晰的语义

**下一步行动**：
1. 确认 S+ 档的 4 个新动作 prompt（focus/wave/yawn/celebrate）
2. 实现情绪变体的程序化微调（player.ts）
3. 重构状态机映射（state-machine.ts）
4. 实现便签/截图分享（P0 功能）

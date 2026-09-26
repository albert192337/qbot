# 本地决策模型：桌宠双槽位试验

2026-09-26。隔离评估，不连接正式桌宠，不读取用户聊天、设置或存档，不调用付费 API。

## 用户期望

一次决定两个槽位：先播放短反应（如吃惊），结束后进入持续行为（如郁闷趴着或跳舞）。4～8 个候选是首轮评测建议，不是模型能力或角色动作库的硬上限。Jev 官方 Choice 接口支持最多 255 个选项；本地 Laya 的限制应按自身模型和输入预算验证，不能继承 Jev 的上限或效果结论。

## 本轮方案

- Laya Multilingual 322M，模型版本 `e4e9ddf21a7b1903b7acffd8814ad4307bf63a67`，包版本 `laya==0.3.20`。
- CPU 两线程。最初准备使用 Git 忽略的 `.local/laya-eval/`，但本机 C 盘无剩余空间，试验文件已迁至 `D:\QBot-model-lab\laya-eval`；没有清理用户已有文件。
- 第一阶段选短反应；第二阶段接收原始情境和选定反应，再选后续行为。第二槽位依赖第一槽位，因此本轮采用两次推理。
- 8 个固定的中文合成场景，各比较 4、8、16 个候选，每组原序/倒序，共 48 对决定、96 次推理。
- 预先固定允许答案集合；不同候选数量使用嵌套候选，倒序实验保持选项与描述完全一致。每个槽位使用自己的候选池。
- 记录完整输入、选项、原始模型输出、单槽位/双槽位正确性、端到端时间和进程驻留内存。
- 这些是容易的冒烟样例，部分直接表达目标动作。即使全部通过，也不能证明能理解复杂人设或长时间自主行为；反之，失败意味着不宜直接接管正式桌宠。
- 概率未作桌宠领域校准，不把置信度数字解释成真实正确率。

## 与当前代码的衔接

`brain-llm` 已区分即时 `action` 和后续 `idleAction` / `idleMinutes`，并共用行为执行器。当前持续计划只允许待机候选，3～15 分钟；`ActionHold` 默认即时反应至少持续 6 秒。这些现有规则不能直接满足用户的一次短反应和任意持续行为。

正式接入前需要明确：

1. 反应槽支持 `none`、单次播放、完成事件和最大超时；不能强制把吃惊循环 6 秒。
2. 后续槽支持 `keep`，候选按角色实际资源及动作是否适合循环筛选；跳舞不能自动视为安静待机。
3. 反应与后续计划绑定同一轮决定和角色，动画完成后才进入后续槽；手动操作、拖拽、换角、隐藏和更高优先级状态可取消或覆盖。
4. 持续行为设最小驻留与最大时长，避免频繁切换；时长先由产品规则控制，单独评测后再考虑交给模型。
5. 任一推理超时或输出失效，保留当前行为；先以影子模式观察，再接入真实播放。

## 复现

在独立 Python 环境安装 CPU PyTorch、`laya==0.3.20` 和 `psutil`。下载上述固定版本的模型及 tokenizer/encoder 配置到 `.local/laya-eval/model`。运行：

```powershell
D:/QBot-model-lab/laya-eval/venv/Scripts/python.exe scripts/eval-laya-pet.py --model D:/QBot-model-lab/laya-eval/model
```

脚本强制 Hugging Face / Transformers 离线模式。结果位于 `output/laya-pet-eval/`，每次复测请传不同的 `--output` 目录，避免把不同运行的逐条记录混在一起。`--limit` 可用于先运行少量样例。

示例语义（待接入协议，不是现有 API）：

```json
{
  "reaction": { "action": "surprised", "repeat": 1 },
  "followup": { "action": "lie_sad", "durationSeconds": 180 },
  "transition": "after_reaction_ended"
}
```

`repeat`、时长和切换时机由应用控制，本轮模型仅选择两个动作；评估中的动作名称是合成标签，不代表当前角色均已有这些素材。

## 来源

- https://docs.typesafe.ai/primitives/choice
- https://huggingface.co/convaiinnovations/laya-multilingual
- https://huggingface.co/convaiinnovations/laya#honest-limits
- https://github.com/NandhaKishorM/laya

实测结果待本轮运行完成后补充。

# 桌面 AI 伙伴竞品调研

调研日期：2026-09-26。范围：23 个产品/项目，覆盖屏幕助手、角色陪伴、养成与专注、社交共处、实体桌面伙伴。

本报告基于官网、官方文档、代码仓库、Steam 商店及创始人访谈；没有安装实测。可下载或可购买只代表存在公开入口，不代表可靠性、留存或商业成功已被验证。价格为当日页面展示，地区、税费和模型用量另计。产品建议是分析判断。

**先核实名称：梦琪对应 Invoko / Clico**

42章经的创始人访谈确认梦琪是 Invoko 创始人、有字节背景。当前官方明确说明 Invoko 已纳入 Clico 品牌，覆盖 Mac、Chrome 插件与 Web。用户记忆中的“Clip”很可能指这一产品线，而不是此前检索到的几个 Clippy。访谈转载把早期产品转写为 Click，另一整理源写作 Clico，因此不据此认定历史准确拼写。没有可靠证据据此断言公司只在湾区办公。

来源：[42章经原节目](https://open.spotify.com/episode/6NsOxGTJHCv9JKb1TyVMmR)、[官方品牌说明](https://tryclico.com/invoko)。

**一、理解屏幕与代办任务：6 个**

| 产品 | 当前公开形态与状态 | 核心卖点 | 对 Qbot 的参考点 |
|---|---|---|---|
| [Clico / Invoko](https://tryclico.com/product/desktop) | Mac 下载、Chrome 插件、Web | 按住 Fn 语音提问；双击 Command 获取当前应用/选区建议；保存任务上下文；执行前确认 | 把“帮我看看这个”做成第一入口，减少复制截图 |
| [Meta Muse](https://ai.meta.com/muse/) | 移动端、Web、WhatsApp、Mac；官方已宣布 Mac computer use | 长期目标、记忆、后台工作、跨服务行动 | 角色持续负责一件事，完成后带结果回来 |
| [Logical](https://www.ycombinator.com/companies/logical) | 旧金山 YC F2025 团队；产品公开介绍与试用入口 | 跨应用理解工作背景，提出邮件草稿、待办与下一步建议 | 主动性应落实为可采纳的下一步；实际支持平台与成功率仍需实测 |
| [AirJelly](https://www.airjelly.ai/) | 官网提供 Apple Silicon Mac、Windows x64 下载 | 工作时间线、记忆、自动提取任务、日报与主动提醒 | 连续工作背景如何转成少量有用提醒 |
| [Cluely](https://cluely.com/) | [Mac / Windows 下载](https://cluely.com/download) | 会议实时辅助、笔记、即时回答 | 语音与建议的延迟、随手唤起；其不可见宣传未独立验证 |
| [Screenpipe](https://screenpipe.com/) | Mac / Windows / Linux；源码可查看 | 屏幕和音频历史、本地检索、供 Agent 使用的上下文接口 | 作为记忆基础设施参考；本身不以情感角色为核心 |

Clico 的定位是生产力助手。官网首页现偏向研究和图像/视频创作，但独立 Desktop 页面仍明确提供屏幕助手能力，不能因为首页变化就认定桌面产品消失。[首页](https://tryclico.com/)

Muse 的新方向包括实时 Avatar、可描述定制的语音，以及 Mac 应用操作；这些功能在公告里的发布状态不同，不应统一写为所有用户已经可用。[Meta Connect 官方公告](https://about.fb.com/br/news/2026/09/tudo-o-que-anunciamos-no-meta-connect-2026/)

AirJelly 的资料存在实质冲突：首页称完全本地、不上传，但隐私页明确说明屏幕理解会将截图和文字发送到远程服务，摘要、记忆等也可能使用云端。评估时应以具体处理路径为准，不能列为完全离线产品。[隐私说明](https://www.airjelly.ai/privacy)

**二、以角色为核心的 AI 桌面伙伴：8 个**

| 产品 | 当前公开形态与状态 | 陪伴能力与限制 | 对 Qbot 的参考点 |
|---|---|---|---|
| [Project AIRI](https://airi.build/en/docs/overview/) | 开源 Web / 桌面项目；另有 Steam 页面 | Live2D / VRM、聊天与语音、屏幕和游戏感知方向；部分集成实验性 | 角色、声音、屏幕理解如何协同 |
| [Asiden](https://asiden.ai/) | Windows 11 早期访问；官网售卖，Steam 待上架 | 3D 角色、文字/语音、记忆、选定屏幕共享；可选本地/云端 AI | 可纠正的记忆、游戏陪伴、控制话多程度 |
| [Dinoki](https://dinoki.ai/) | Mac / Windows 下载 | 像素角色、聊天记忆、Agent/Character Mode、工具接入；支持本地模型选项 | 轻量角色入口与后台任务状态 |
| [MateEngine](https://github.com/shinyflvre/Mate-Engine) | GitHub 免费版、Steam 付费支持版 | 自定义 VRM、动作、音乐互动、多角色、AI 聊天；README 多语言能力表存在差异 | 动作与模型生态；具体 AI 工具能力逐版本核实 |
| [VPet 虚拟桌宠模拟器](https://github.com/LorisYounger/VPet) | Windows、免费、开放源码与创意工坊 | 喂养、工作、状态动画、物品与插件；有聊天设置，具体 AI 能力取决配置 | 中文用户的养成预期、模组创作、状态反馈 |
| [YCamie / AI Shimeji](https://www.shimeji.ai/) | 官网提供生成和安装入口 | 描述或上传图片生成角色动作，宣称支持聊天；成品质量未实测 | 与 Qbot“图片生成角色”的流程直接重叠 |
| [Doja](https://www.doja.pet/) | Mac 菜单栏 AI 猫；候补阶段 | 官网主张本地观察屏幕、逐步理解习惯；自动办事被标为未来能力 | 低打扰的小动物形象；不能当成熟执行助手 |
| [Clippy — Keith / Avand](https://clippy.keithschacht.com/) | 浏览器运行的屏幕/语音演示 | 共享屏幕后问答、指引点击、可换角色 | 看同一块屏幕时的自然指代；不是已验证的自治 Agent |

AIRI 必须区分版本：自托管文档描述自选模型/API Key；Steam 页面描述 AIRI 账号与托管服务，不要求或允许填写第三方 Key，并仍显示即将推出。不能将两种使用方式混在一起。[桌面指南](https://airi.build/en/docs/overview/guide/tamagotchi/)、[Steam 页面](https://store.steampowered.com/app/3885340/Project_AIRI)

Asiden 的更新记录比“长期记忆”标签更有参考价值：区分用户明确说过的内容与系统推断，保留时间，允许修改/忘记，并避免把过去的安排继续当未来计划。以上为厂商更新说明，尚无独立准确率测试。[更新记录](https://asiden.ai/)

**三、专注、社交与角色关系：6 个**

| 产品 | AI 与平台边界 | 主要体验 | 对 Qbot 的参考点 |
|---|---|---|---|
| [Tori](https://tori.gg/) | 官网定位跨平台 AI 成长伙伴；具体桌面常驻能力待核实 | 目标规划、专注、屏蔽干扰、群体监督、经验与长期记忆 | 用户与角色共同完成一件现实任务 |
| [Pickle](https://www.pickle.com/terms-of-service) | 当前官方条款覆盖 iOS 与网站；相邻竞品 | 养成 AI 角色、语音与记忆、自己的电脑、与其他 Pickle 共处的 3D 世界 | 角色关系、办事与社交空间的结合；桌面常驻未核实 |
| [Desktop Mate](https://store.steampowered.com/app/3301060/Desktop_Mate/) | Windows / Apple Silicon Mac；传统角色陪伴，不据 IP 名称推断为生成式 AI | 窗沿停坐、摸头、鼠标互动、语音台词、闹钟、授权角色 DLC | 角色“真的住在这里”的动作与空间感 |
| [Bongo Cat](https://store.steampowered.com/app/3419430/Bongo_Cat/) | Windows / Mac；传统桌宠对照 | 敲键与点击反馈、积累点数、帽子与装扮 | 用户继续原本的工作也能产生养成反馈 |
| [Spirit City: Lofi Sessions](https://store.steampowered.com/app/2113850/Spirit_City_Lofi_Sessions/) | Windows / Apple Silicon Mac；非生成式 AI 核心 | 房间布置、音乐、精灵收集、待办、计时、习惯和日记 | 房间氛围与专注奖励如何支持持续使用 |
| [tiny desktop pals](https://store.steampowered.com/app/4720820/___tiny_desktop_pals/) | Steam，页面标注 2026-09-18 发布；真人联机对照 | 真实好友变成桌面小角色，同房、聊天、表情与在线陪伴 | 对 Qbot 联机方向直接相关；产品很新，缺少长期验证 |

这些传统桌宠不应因为没有大模型就被排除。它们回答了一个 AI 聊天工具常忽略的问题：用户没有问题要问时，为什么仍愿意让角色留在屏幕上？对 Qbot 来说，它们与 AI 助手争夺的是同一块常驻空间和注意力。

**四、大厂形象与实体桌面伙伴：3 个**

| 产品 | 形态与当前证据 | 借鉴点 |
|---|---|---|
| [Microsoft Mico](https://www.microsoft.com/en-us/microsoft-copilot/blog/2025/10/23/human-centered-ai/) | Copilot 的可选语音视觉形象，会用表情和色彩回应；不等同于自由漫游桌宠 | 让倾听、说话和情绪通过简洁动画表达 |
| [Razer AVA](https://www.razer.com/mena-en/concepts/project-ava) | 实体显示设备与电脑视觉，官网有预约/通知入口；另有软件 Beta 公告 | 游戏搭子、持续可见角色、行动时的实时反应；未核实硬件规模交付 |
| [EMO](https://living.ai/emo/) | 实体桌面机器人，官方产品与购买入口 | 摸头、移动、声音反应、表情和节日事件；学习非语言的生命感 |

AVA 已在 GDC 公布跨工具执行任务方向和 Beta，但概念展示、软件测试和硬件交付是三个不同阶段。[GDC 官方更新](https://www.razer.com/blog/razer-ava-goes-agentic-a-new-chapter-at-gdc-2026)

**商业模式观察**

| 模式 | 已核实例子 | 对 Qbot 的含义（建议） |
|---|---|---|
| 免费额度＋订阅 | Clico Free / Pro / Max；桌面页列月付 Pro $19.90、Max $49.90 | 持续云端推理需要有可解释的额度；不把静态陪伴也变成按句话收费 |
| 买断客户端＋模型选择 | Dinoki 页面列 Pro $25 一次性；本地/外部模型选项 | 客户端价格与云端模型成本分开理解 |
| 买断＋可选云端用量 | Asiden 官网列 $10 入门购买，并说明云端订阅与 Sparks | 本地基础陪伴和高成本智能功能可以拆分 |
| 免费基础＋角色/装扮内容 | Desktop Mate、Bongo Cat | 用户可能为形象与收藏付费；需要实际付费验证，不能由功能推断收入 |
| 买断＋场景 DLC | Spirit City | 房间与主题内容可持续供给 |
| 免费分发＋付费支持版 | MateEngine | 开放角色生态与便捷更新可形成不同价值层 |

价格来源为上文对应产品页。没有公开核实到这些产品可横向比较的 DAU、留存、收入或利润数据，因此不做规模排名。Steam 评论口碑也不能直接替代留存率。

**对 Qbot 的产品判断**

Qbot 现有方向已经覆盖图片生成角色、动作、桌面停靠、花园、房间与联机。最有机会形成连续体验的是“我创造的角色，和我一起度过工作与休息”，再让它逐步理解眼前的事情并完成少量任务。该判断基于本项目说明与以上产品比较，不是市场验证结论。

建议按三个闭环验证：

1. 一起看：明确唤起 → 读取选定窗口/区域 → 用角色口吻给短回答 → 需要时展开详情。以 Clico 为交互对照，以 AIRI/Asiden 为角色对照。
2. 一起记：保存用户交代的事情与共同经历 → 下次自然提起 → 用户能纠正或删除。以 Asiden 的记忆编辑为对照，避免把屏幕推断直接写成个人事实。
3. 一起完成：约定一件小任务 → 安静陪伴与状态反馈 → 完成时给结果与共同回忆。把花园/房间奖励连接到完成过程，观察奖励是否帮助专注。

社交可以并行保留为独立价值：朋友在线、角色来访、短互动，能让用户在不与 AI 对话时仍愿意打开。tiny desktop pals 是这条路线的直接比较对象，Pickle 是角色自主社交的相邻参考。

优先研究名单：Clico（即时屏幕交互）、Asiden（关系记忆）、AIRI（角色技术与玩法）、Desktop Mate（空间动作）、Spirit City（专注与内容）、tiny desktop pals（轻社交）。Muse/AirJelly 作为持续任务与主动性上限参考。

**下一轮实测应统一任务，避免只看宣传片**

| 测试 | 记录什么 | 为什么重要 |
|---|---|---|
| 首次安装到第一次有效互动 | 耗时、权限步骤、账号/模型配置、失败点 | 小团队产品常在首次使用流失 |
| 看当前屏幕提问 | 是否需要解释背景、指代准确率、首句延迟、总耗时 | 直接衡量上下文价值 |
| 连续使用 30 分钟 | 遮挡、误抢焦点、语音打断、CPU/GPU/内存 | 桌面常驻需要足够安静 |
| 次日恢复话题 | 记忆是否正确、有无时间混淆、是否可编辑 | “记得你”必须可验证 |
| 主动建议 | 每小时次数、相关率、采纳率、关闭率 | 主动性可能增加帮助，也可能增加干扰 |
| 完成同一小任务 | 成功率、确认次数、可取消性、结果可核查性 | 区分聊天、演示与可依赖的助手 |
| 无对话的一天 | 用户是否还愿意保留角色、因何互动 | 检验陪伴本身的价值 |
| 7 天自然使用 | 主动打开天数、回访理由、付费意愿、每日云端成本 | 验证持续使用与经济性 |

这些是建议测试项，本轮没有执行，也未虚构结果。未安装竞品、未创建账号、未产生付费或向产品方发消息。

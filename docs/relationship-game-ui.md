# 关系手账拆图实现（2026-09-29）

范围仅为关系手账页面及对应测试。保留关系存档、好感计算和 IPC；未改其他业务页面。

## 素材

用户确认的静态稿：`C:/Users/beta/.codex/generated_images/01a0e897-6dc9-7670-8154-2a7fb114dc68/exec-38dcc8c6-221a-4ac3-a8ed-23e5eb17982f.png`。

`scripts/slice-relationship-art.ps1` 按 `relationship-art/slices.json` 中的像素矩形拆出森林、装订扣、页脚纹样、爱心、握手、对话、铅笔、茶杯、挥手和爪印；图标只对边界连通的纸色像素去底。原稿只用于拆图，运行时没有整页图片覆盖。

字库为本地打包 ZCOOL KuaiLe，来自 https://github.com/google/fonts/tree/main/ofl/zcoolkuaile ，许可证随资源保存于 OFL.txt。不是模型图片中无法直接提取的原始字体。卡牌、纸张、分栏、页签和进度条用 CSS 重建，所有可变文字与编辑操作为真实 DOM。

真实头像读取安全派生 `__portrait.png`，不显示原始参考图。实际人名、视角、好感阶段、互动次数、昵称、手记与历史全部来自原关系接口。详情显示最近两条经历，回忆页显示全部。桌面保留左侧伙伴选择，中央维持参考稿的竖版手账比例；小窗改为单列滚动。

## 验证与加载

- 完整 App 构建及 TypeScript 检查通过。
- `scripts/test-relationships-ui.cjs` 独立 Electron 档案、真实 RelationshipStore，验证列表、字体、详情、来源筛选、编辑保存、保存失败与重试、草稿保护、重读持久化、小窗横向不溢出。小屋入口及控制台入口都已运行。
- 控制台测试环境：QBOT_QA_CONSOLE=1、QBOT_QA_PANE=relationships。测试夹具接受指定首屏，以免误查隐藏页面的同名表单。
- `scripts/preview-relationships-live.mjs <pid> show` 只切换到该页；`capture` 只截图；默认刷新前检查尚未保存的数据。正式客户端页面已打开，实际显示15位已认识角色，本地字体加载成功。没有重启桌宠进程或更改用户关系资料。
- 正式截图：`output/relationship-game/live.png`。测试截图：`output/relationships/`。

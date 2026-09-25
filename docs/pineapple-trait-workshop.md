# 菠萝词条工坊

2026-09-25。按用户要求试验新的可见区域：果实＝下面的主体，原果皮槽在试验页改称叶冠＝上面的叶子，挂饰＝外围独立装饰。现有 60 个词条均有显式外观定义和说明；果实、叶冠、体型各单选，挂饰最多两项。勾选即时生效，重复点击取消，提供恢复原生、六组搭配、拖动旋转、缩放、自动旋转、暂停动效和浅深背景。

这是独立美术试验，不修改正式花园的槽位分类、词条规则、存档或现有菠萝渲染器。效果均为模型材质或程序几何原型，仍需用户挑选美术方向，不能当作已完成的正式游戏适配。

- 页面：`app/src/renderer/pineapple-preview/`。复用付费减面模型，按果实/叶冠材质名分离网格。
- App 入口：桌宠右键与托盘菜单的「菠萝词条工坊（效果预览）…」，位于草莓基因工坊旁。独立单实例窗口，重复打开聚焦并恢复最小化；构建后重启 App 生效。
- 单独构建：`node scripts/build-pineapple-preview.cjs`，输出 `output/pineapple-lab/`，不覆盖运行中的主 App 构建。
- 打开：用 Electron 执行 `scripts/preview-pineapple-genes.cjs --show`。Windows 的 Electron 在 `app/node_modules/electron/dist/electron.exe`；设置 `NODE_PATH` 指向 `app/node_modules`，清除 `ELECTRON_RUN_AS_NODE`。
- 无 `--show` 时执行隔离界面检查，结果与截图在 `output/pineapple-genes/`。逐项检查 60 个勾选和模型区域图像变化、挂饰两项上限、叶冠单选、混合预设和窄窗口。
- 预览无 preload，不加载用户账户，临时 userData，阻断 HTTP(S)。关闭后释放模型、材质、贴图和渲染器。页隐藏暂停刷新，系统减少动态效果时默认停止动效。

果实与叶冠的变化独立应用，叶冠换材质不改变果实体；果实词条中的双生只复制下面果体。体型统一缩放整株与挂饰。叶冠会使用原果皮词条 ID，方便比较，但这些 ID 的正式语义尚未迁移。

# 菠萝美术试替换：用户选定附件版

2026-09-20。用户否定后续简化、疏叶和夸张染色版本，明确选回原「02 / 配饰词条」附件。本轮仅替换菠萝本体，不改变其他物种或词条逻辑。

## 已接入

- app/src/renderer/garden/assets/pineapple-plant.png：保留附件完整叶丛、奶油石块底座、柔和手绘层次的成熟植株。
- app/src/renderer/garden/assets/pineapple-fruit.png：对应收获果实，保留果冠、果皮分面与上色。
- botanical-art.ts 仅在 pineapple 的成熟植株/果实分支选择 PNG。背包、收获卡与图鉴沿用同一果实入口。种子袋、幼苗、未结果/再生植株继续使用原素材。
- 两张 PNG 是以内置 image_gen 基于用户附件提取重建的透明素材，并非从源图逐像素裁切。保留附件金黄与淡彩细节作为本体艺术表现；不会新增数值词条。
- 附件中朋克绑带、古典缎带等专门配饰图未接入；游戏继续按已有词条叠加原有 CSS 效果。本轮没有扩展组合资产系统。

## 验证

- TypeScript 检查与 App 构建通过。
- 两张图 1254×1254，透明角落 alpha=0。
- 复用 scripts/test-garden-mutations.cjs 的隔离 Electron 回归，将主测物种从草莓替换为菠萝，临时脚本 .superpowers/pineapple-preview.cjs，不访问真实用户存档或网络。
- 通过九物种、原生/单词条/组合/双生、采摘结果、480px 窄窗、减少动态效果的检查；检查了桌面与背包截图。
- 截图在 output/plant-art-study-2026-09-19/approved-pineapple/：desktop-preview.png、bag-preview.png。它们是实际生产 renderer 配合测试存档的截图，并非用户真实花园状态。
- Electron 在 app.exit 后输出一条 GPU 清理消息，renderer 控制台错误断言为空，脚本 PASS、退出码 0。

## 参考与生成提示词

用户选定参考已保存至 output/plant-art-study-2026-09-19/approved-pineapple/reference.png。以下通过内置 image_gen 使用该附件执行，原始生成结果仍保留在 Codex generated_images。

### 成熟植株

Use case: precise-object-edit / background-extraction. Asset type: production-ready transparent PNG game sprite.
The attached sheet is the USER'S APPROVED FINAL aesthetic. Faithfully extract/reconstruct its pineapple from the TOP ROW THIRD CELL, preserving the EXACT illustration style and proportions, not creating a new design. User rejected later simplified juvenile versions. Keep the original refined warm 2D hand-painted watercolor/gouache finish, subtle textured layered shading, dark soft plum contour, delicate cream highlights, warm gold pineapple diamond facets with subtle peach/lilac/cream surface undertones, sage-green layered leaves. Do not simplify to flat basic vector shapes, no exaggerated pink punk dye, no 3D render, no character face. Keep sophisticated, rich, charming detail as in the source.
Remove ONLY floating insects, all labels/headings, all other specimens, paper background and cast shadow. Single isolated pineapple sprite only, no words, no particles or unrelated accessories, no ribbons or belts. Entire silhouette in frame, centered, 5% clean transparent margin, sprite occupies approximately 88% canvas height, bottom grounded near lower margin. TRUE transparent alpha background, NOT white, cream, checkerboard painted background or scenery. Clear clean softly anti-aliased silhouette suitable for a desktop over arbitrary wallpaper. Output square image.
Keep the ENTIRE approved mature pineapple PLANT, exactly the original leaf-rich silhouette: tall compact green crown, single golden oval diamond-rind pineapple, the full broad curled sage-green basal leaf rosette around it, and the small cream root pebbles visible at the bottom. Do NOT prune leaves, change the leaf arrangement, or put fruit on a thin stem. Keep the body-to-foliage proportions from the top-row third specimen. Remove the fireflies from that specimen, otherwise preserve its plant identity and detailed finish.

### 收获果实

Use case: precise-object-edit / background-extraction. Asset type: production-ready transparent PNG game sprite.
The attached sheet is the USER'S APPROVED FINAL aesthetic. Faithfully extract/reconstruct its pineapple from the TOP ROW THIRD CELL, preserving the EXACT illustration style and proportions, not creating a new design. User rejected later simplified juvenile versions. Keep the original refined warm 2D hand-painted watercolor/gouache finish, subtle textured layered shading, dark soft plum contour, delicate cream highlights, warm gold pineapple diamond facets with subtle peach/lilac/cream surface undertones, sage-green layered leaves. Do not simplify to flat basic vector shapes, no exaggerated pink punk dye, no 3D render, no character face. Keep sophisticated, rich, charming detail as in the source.
Remove ONLY floating insects, all labels/headings, all other specimens, paper background and cast shadow. Single isolated pineapple sprite only, no words, no particles or unrelated accessories, no ribbons or belts. Entire silhouette in frame, centered, 5% clean transparent margin, sprite occupies approximately 88% canvas height, bottom grounded near lower margin. TRUE transparent alpha background, NOT white, cream, checkerboard painted background or scenery. Clear clean softly anti-aliased silhouette suitable for a desktop over arbitrary wallpaper. Output square image.
Make the HARVESTED fruit from that same approved pineapple plant. Keep the exact plump golden diamond-rind fruit and its OWN upper sage-green pineapple crown. Remove the surrounding basal leaf rosette and the little cream pebbles, revealing a naturally rounded complete fruit bottom. This is the same fruit picked from the reference, not a new style. Preserve dimensional painted diamond facets, golden fine details, subtle peach/lilac highlight patches and sophisticated layered leafy crown. No lower leaves, soil, roots, stones, stand or separate growing stem.


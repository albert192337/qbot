# 双人互动小桌（临时，可替换）

`pair-side-table-placeholder.png` 是 2026-09-26 通过内置 imagegen 生成的透明 PNG 临时美术。用于双人喝茶互动，替换原先椭圆桌面和两枚咖啡表情；桌面保持空白。

房间美术定稿后，换成房间小桌的侧面版本。当前尚未绑定房间家具选择或库存。替换入口是 `../pair-interaction.ts` 的 `pairTableUrl`；保留透明背景、完整桌脚和原图比例，在 `../pair-interaction.css` 的 `.pair-tea` 调整尺寸与脚线。DOM 的 `data-art-status="replaceable-placeholder"` 也标记了临时状态，不在玩家画面上加文字。

## 生成提示词

使用内置 imagegen（非 CLI），先生成再调整腿长。最终编辑提示词：

> Edit this temporary game table sprite. Keep the same honey oak material and side elevation and bare tabletop and truly transparent alpha background. Correct the furniture proportions: make the tabletop HALF as wide relative to the legs, and make all legs TWICE as tall. Final visible object width to height must be approximately 2:1, a small side table with clear tall legs, NOT a long bench. Tightly frame the whole object with only 3% transparent padding on all sides. No cups, no items, no text, no floor, no background.

原始生成方向：温暖蜂蜜橡木、柔和棕色轮廓、Q 版手绘独立家具、近水平侧视、圆角长方形空桌面、透明背景、完整短桌脚；不含杯子、茶具、人物、房间、地面或文字。

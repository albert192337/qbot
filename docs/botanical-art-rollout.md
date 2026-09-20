# 植物手绘素材铺量（2026-09-20）

## 已确认的美术原则

用户批准附件版菠萝在游戏中的试替换，并要求扩展到现有植物。铺量过程中用户进一步纠正：向日葵、荷花太写实、细节密集；蓝莓、苹果树的叶子底座不自然。以这次修正为后续统一准则：

- 简约、可爱、精致；饱满的大形体、暖色细描边、少量柔和高光。
- 高级感来自轮廓、配色和明暗关系，不来自密集籽粒、莲蓬孔洞或写实微纹理。
- 向日葵单圈大花瓣、光滑花心；荷花五片大花瓣，无莲蓬孔洞。
- 不给所有植物套同一种叶子底座。蓝莓露枝干、苹果露树干；番茄减少底叶、郁金香保留三片主叶。
- 保留已认可菠萝、草莓的收藏插画语言，不添加五官或玩偶肢体。

## 实现范围

九种植物的成熟植株与收获物使用配套透明 PNG（新增八组 16 张；菠萝沿用批准版本）。路径：`app/src/renderer/garden/assets/botanical/`，菠萝在上一级。种子袋沿用纸袋形状，内嵌同款收获物和遗传词条。地里、背包、收获弹窗、图鉴、繁育预览共享同一素材入口。

幼苗和未成熟/再生阶段仍沿用原有资产及规则，本轮替换的是成熟形态和收获物。没有调整成长时长、重量、售价、词条概率或存档结构。

词条：朋克叶尖染色、铆钉饰带和别针；古典丝带与徽章；萤火五个小光点；花雨七片花瓣。异色/薄荷/珊瑚复用原画纹理染色；虹彩以原画明暗为基础分区着色；鎏金扫光、冰冻晶体和裂纹、雷击细电弧、闪亮星芒、双生复用透明精灵。配饰和特效为代码绘制小几何模块，不生成组合图片。双生的贴图、材质和配饰使用同一缩放/旋转；离屏/窗口隐藏暂停，支持减少动态效果。多词条保留可读轮廓。

## 验证与预览

- `npm test -w app -- garden`：43 项通过。
- `npx tsc --noEmit -p app` 与 App 构建通过。
- `scripts/test-garden-art.cjs`：隔离 Electron 的实际生产 renderer，9 组植株/收获物、种子袋、14 个词条、4 种组合、双生、480px 布局和减少动态效果。并排图只重新排列实际渲染的 DOM，非另画的效果稿。
- `scripts/test-garden-mutations.cjs`：真实规则收获、持久化词条与数值、组合特效。
- 截图：`output/plant-art-study-2026-09-19/rollout/all-species.png`、`trait-effects.png`。透明素材均为 1254×1254；人工检查 alpha、轮廓、底部结构及缩小后的效果。
- 验证不写用户存档，不调用外部图像 API。未做长期 CPU/GPU 压力测试。

## 生成来源和最终提示词

全部使用内置 image_gen；保留生成器返回的透明像素，不做程序绘图替代或自动抠图。初版被纠正的素材保留在生成目录，项目引用的是修订版本。下列为每个最终选用文件的准确调用提示词；菠萝见 `docs/pineapple-art-preview.md`。

### tomato-plant.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-52c531bc-a5c7-4e62-b8b1-62b03009d81f.png`

```text
Use case: precise-object-edit. Reference is the plant being edited. Simplify this tomato plant into a naturally branching little tomato vine. Keep THREE plump ripe coral-red tomatoes and their refined soft highlights. Use only FOUR broad smooth sage leaves around the upper branches. REMOVE the entire lower leaf pile/rosette/pedestal; show the short clean branching green stems below the fruit with negative space. No roots, stones, or soil. User principle: simple, cute, sophisticated. Soft plump shapes, warm dark plum outlines, restrained 2-3 painted shade planes, subtle cream highlights. No dense detail, repeated microtextures, realism, faces, eyes, limbs, text, accessories, soil tiles or scenery. Genuine transparent alpha background. One sprite on square canvas, fill 85% of height, bottom at 93%, keep entire shape inside frame. Preserve the approved colours and charming illustration style.
```

### blueberry-plant.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-d84adf6c-0c63-4575-b820-c5a1724c8990.png`

```text
Use case: precise-object-edit. Edit reference image 1, the current plant sprite. User correction: too realistic, too densely packed and repetitive, not cute enough. PRINCIPLE: simple, cute, sophisticated; high quality comes from harmonious silhouette and restrained shading, not from lots of detail. Keep the charming plump blueberry colours, dark warm outline and soft refined painted shading but simplify the plant. A compact airy little blueberry shrub with THREE large blueberries, each with one simple shallow five-point indentation, no realistic speckled textures. Exactly FIVE smooth oval sage leaves in the upper branches, visible slender woody branching stems with negative space between berries and leaves. REMOVE the entire bottom circle/pile/pedestal of leaves. Exposed slim branch base, no stones, no mound. Cute, simple, sophisticated, naturally structured. Reference 2 is the approved pineapple for the refined warm illustration finish ONLY; do not copy its rosette shape. Keep genuine transparent alpha background. One single full plant sprite centered in a square, about 85% of square height, bottom at 93%. No face, eyes, limbs, text, labels, frames, ornaments, particles or 3D plastic. Do not use flat single-colour vector art either: preserve 2-3 gentle painted shade layers and a few tasteful highlights.
```

### apple-plant.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-5410e798-f9cc-49d1-bcf1-8b63db0bd46f.png`

```text
Use case: precise-object-edit. Edit reference image 1, the current plant sprite. User correction: too realistic, too densely packed and repetitive, not cute enough. PRINCIPLE: simple, cute, sophisticated; high quality comes from harmonious silhouette and restrained shading, not from lots of detail. Keep the plump red apples, refined hand-painted colour and warm dark outline, but simplify into a charming miniature APPLE TREE. A rounded compact green crown formed by THREE large soft foliage masses, with only FIVE individually delineated large leaves total. THREE plump coral-red apples. The short trunk is visibly exposed below the crown, smooth shaded brown with no bark texture. REMOVE the entire leaf pedestal and all bottom leaves. The trunk ends cleanly with two tiny root tips, no stump ring, no soil tile or stone base. Cute, simple and sophisticated, spacious readable shapes. Reference 2 is the approved pineapple for the refined warm illustration finish ONLY; do not copy its rosette shape. Keep genuine transparent alpha background. One single full plant sprite centered in a square, about 85% of square height, bottom at 93%. No face, eyes, limbs, text, labels, frames, ornaments, particles or 3D plastic. Do not use flat single-colour vector art either: preserve 2-3 gentle painted shade layers and a few tasteful highlights.
```

### tulip-plant.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-6e409f7b-2ac2-4822-9b3f-1ad60a7d0985.png`

```text
Use case: precise-object-edit. Reference is the plant being edited. Keep these three pink tulip cups and their relative heights, but simplify each cup to THREE broad softly shaded petal planes, no additional tiny nested petals. Reduce leaves to exactly THREE large graceful folded sage lance leaves attached to visible stems, remove the many small base leaves and the dense pedestal. More open negative space. User principle: simple, cute, sophisticated. Soft plump shapes, warm dark plum outlines, restrained 2-3 painted shade planes, subtle cream highlights. No dense detail, repeated microtextures, realism, faces, eyes, limbs, text, accessories, soil tiles or scenery. Genuine transparent alpha background. One sprite on square canvas, fill 85% of height, bottom at 93%, keep entire shape inside frame. Preserve the approved colours and charming illustration style.
```

### strawberry-plant.png

原始输出：`C:/Users/Administrator/.codex/generated_images/01a0ba50-6d38-7883-b3b4-8eb009ebb6d6/exec-9b767f3b-a74c-4713-8672-6ea45da6afb8.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the approved pineapple sprite: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved accessory sheet: use it ONLY to match illustration style, with NO accessories or particles in this base sprite. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject: A single large rose-pink heart-shaped strawberry with tiny gold seeds and glossy pale highlights, three scalloped sage leaves and one small white flower above, nested in a generous curled leafy rosette, as in the strawberry in the reference.
```

### lotus-plant.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-4997b3f6-5c5d-41df-9eed-8be9ae01362c.png`

```text
Use case: precise-object-edit. Edit reference image 1, the current plant sprite. User correction: too realistic, too densely packed and repetitive, not cute enough. PRINCIPLE: simple, cute, sophisticated; high quality comes from harmonious silhouette and restrained shading, not from lots of detail. Redesign the LOTUS to be cute, simple and sophisticated. ONE compact plump lotus blossom with exactly FIVE broad rounded blush-pink petals total in a simple cup silhouette. NO visible lotus seed pod, NO dots, NO stamens, NO tiny repeated details. Soft cream highlight on ONE petal, short curved green stem and exactly ONE rounded lotus pad tilted at the foot. No many-layered pointed petals, no leaf pedestal. Refined few large soft shaded planes, no realistic botanical detail. Reference 2 is the approved pineapple for the refined warm illustration finish ONLY; do not copy its rosette shape. Keep genuine transparent alpha background. One single full plant sprite centered in a square, about 85% of square height, bottom at 93%. No face, eyes, limbs, text, labels, frames, ornaments, particles or 3D plastic. Do not use flat single-colour vector art either: preserve 2-3 gentle painted shade layers and a few tasteful highlights.
```

### sunflower-plant.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-98782a13-74ce-402a-9d7a-aa2e4b53372d.png`

```text
Use case: precise-object-edit. Edit reference image 1, the current plant sprite. User correction: too realistic, too densely packed and repetitive, not cute enough. PRINCIPLE: simple, cute, sophisticated; high quality comes from harmonious silhouette and restrained shading, not from lots of detail. Redesign the SUNFLOWER to be cute, simple and sophisticated. Use ONE ring of exactly 9 broad plump rounded golden petals, not many pointed curled petals. Its center must be a SMALL smooth warm cocoa circle, NO individually drawn seeds, NO scales, NO repeating dots, NO dense texture. Short gently curved stem, exactly TWO broad smooth sage leaves growing from stem, exposed little stem at the bottom. No ground rosette or leaf pedestal. Refined few large soft shaded planes, no realistic botanical detail. Reference 2 is the approved pineapple for the refined warm illustration finish ONLY; do not copy its rosette shape. Keep genuine transparent alpha background. One single full plant sprite centered in a square, about 85% of square height, bottom at 93%. No face, eyes, limbs, text, labels, frames, ornaments, particles or 3D plastic. Do not use flat single-colour vector art either: preserve 2-3 gentle painted shade layers and a few tasteful highlights.
```

### carrot-plant.png

原始输出：`C:/Users/Administrator/.codex/generated_images/01a0ba50-6d38-7883-b3b4-8eb009ebb6d6/exec-262ab044-238a-45df-9771-0c2ab467c185.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the approved pineapple sprite: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved accessory sheet: use it ONLY to match illustration style, with NO accessories or particles in this base sprite. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject: One plump warm coral-orange carrot with softly faceted ridges and tiny cream gleams, its upper two thirds visible above the ground, a rich plume of layered fernlike sage carrot leaves and low leafy clusters, a few cream stones at its foot.
```

### strawberry-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-bf2fcdbb-6c59-4292-953f-b6a4942b9de1.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the matching planted version of this species: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved harvested pineapple, match its cutout inventory presentation with NO accessory or particles. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject:  Produce the matching HARVESTED ITEM VERSION, keeping its fruit or flower shape, colours, brushwork and surface details identical to reference image 1. Remove ALL ground foliage, stones and roots. ONE harvested rose-pink heart-shaped strawberry, tiny gold seeds, refined cream highlights, with a small compact green calyx of THREE leaves and ONE tiny white flower attached at the top. No large upper fan of leaves, no ground foliage.
```

### lotus-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-7a03370a-922e-40d6-ae46-40ba89e45c40.png`

```text
Use case: precise-object-edit. Reference is the plant being edited. Create the matching harvested lotus: keep this exact simple FIVE-petal pink flower, remove the large lotus leaf pad entirely; retain a short gently curved cut stem and ONE tiny leaf. NO seed pod, no dots, no stamens, no additional petals. User principle: simple, cute, sophisticated. Soft plump shapes, warm dark plum outlines, restrained 2-3 painted shade planes, subtle cream highlights. No dense detail, repeated microtextures, realism, faces, eyes, limbs, text, accessories, soil tiles or scenery. Genuine transparent alpha background. One sprite on square canvas, fill 85% of height, bottom at 93%, keep entire shape inside frame. Preserve the approved colours and charming illustration style.
```

### sunflower-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-125f0c27-7030-49a7-9af2-7b185cd4687f.png`

```text
Use case: precise-object-edit. Reference is the plant being edited. Create the matching harvested sunflower: keep this exact simple 9-petal flower and smooth small brown center; remove the two large stem leaves, keep only ONE small attached leaf and a short cut stem. NO seed dots, no additional petals. User principle: simple, cute, sophisticated. Soft plump shapes, warm dark plum outlines, restrained 2-3 painted shade planes, subtle cream highlights. No dense detail, repeated microtextures, realism, faces, eyes, limbs, text, accessories, soil tiles or scenery. Genuine transparent alpha background. One sprite on square canvas, fill 85% of height, bottom at 93%, keep entire shape inside frame. Preserve the approved colours and charming illustration style.
```

### carrot-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-7ebcabf0-3c2a-4c35-9e15-e656698e4252.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the matching planted version of this species: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved harvested pineapple, match its cutout inventory presentation with NO accessory or particles. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject:  Produce the matching HARVESTED ITEM VERSION, keeping its fruit or flower shape, colours, brushwork and surface details identical to reference image 1. Remove ALL ground foliage, stones and roots. ONE harvested plump coral-orange carrot with visible tapered tip, shallow graceful ridges, refined warm highlights, and a compact tuft of THREE sage carrot leaves attached at the top. No bed of foliage.
```

### tomato-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-bd111a1d-2245-4f5a-825b-72fbd36af70e.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the matching planted version of this species: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved harvested pineapple, match its cutout inventory presentation with NO accessory or particles. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject:  Produce the matching HARVESTED ITEM VERSION, keeping its fruit or flower shape, colours, brushwork and surface details identical to reference image 1. Remove ALL ground foliage, stones and roots. ONE harvested round plump ripe coral-red tomato with its small star-shaped sage green calyx and short stalk. Match the fruit on the plant precisely. No bush, no root foliage, no multiple tomatoes.
```

### blueberry-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-df4c7876-2b96-4b97-ac4c-f4feb7d61361.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the matching planted version of this species: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved harvested pineapple, match its cutout inventory presentation with NO accessory or particles. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject:  Produce the matching HARVESTED ITEM VERSION, keeping its fruit or flower shape, colours, brushwork and surface details identical to reference image 1. Remove ALL ground foliage, stones and roots. A harvested compact cluster of THREE plump indigo-blue blueberries with dusty lavender bloom and indented star crowns, ONE small sage leaf attached to a tiny branching stalk. No bush, roots or leaf rosette.
```

### apple-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-371c7cfa-3d36-420c-8e21-73a56f7ce80d.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the matching planted version of this species: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved harvested pineapple, match its cutout inventory presentation with NO accessory or particles. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject:  Produce the matching HARVESTED ITEM VERSION, keeping its fruit or flower shape, colours, brushwork and surface details identical to reference image 1. Remove ALL ground foliage, stones and roots. ONE harvested plump coral-red apple with a short curved brown stem and ONE small sage leaf. Warm ivory painted highlights and refined facets identical to the fruit in the tree. No tree, roots, rosette or multiple apples.
```

### tulip-fruit.png

原始输出：`C:\Users\Administrator\.codex\generated_images\01a0ba50-6d38-7883-b3b4-8eb009ebb6d6\exec-01d8cb3e-2b22-438c-adf6-68508c7d593d.png`

```text
Use case: stylized-concept. Create ONE production 2D game sprite with a genuinely transparent background (alpha), square canvas. Reference image 1 is the matching planted version of this species: strictly match its refined hand-painted gouache/cel illustration, warm dark plum hand-inked outline, soft layered shading, sage green foliage, subtle warm cream specular marks, rich collectible quality. Reference image 2 is the approved harvested pineapple, match its cutout inventory presentation with NO accessory or particles. The user rejected later simplistic juvenile redesigns. No face, eyes, limbs, chibi character, plastic 3D rendering, flat vector, sticker border, frame, text, watermark, labels, soil tile, pot, or scenery. Front three-quarter game-icon perspective. Centered full silhouette fills approximately 84% of square height and 78% of width, baseline at 93% of canvas, generous readable forms and intricate restrained interior paint. Transparent space around it; no background cast shadow. Keep the same scale and craftsmanship as the pineapple. Subject:  Produce the matching HARVESTED ITEM VERSION, keeping its fruit or flower shape, colours, brushwork and surface details identical to reference image 1. Remove ALL ground foliage, stones and roots. ONE harvested elegant pink-coral tulip with layered pointed petals, warm ivory painted highlights, a short cut stem and ONE gracefully folded attached sage-green leaf. No roots or base leaf rosette.
```


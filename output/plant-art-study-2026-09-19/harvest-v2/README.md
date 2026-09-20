# D 方案：疏叶、收获形态与词条修订

日期：2026-09-20。使用内置 image_gen 根据用户反馈生成，未修改游戏代码。

## 本轮反馈与落实

- 地里叶子过多：收至两片小底叶和短茎，取消环绕叶丛与石头底座，果实为主视觉。
- 查看收获后的外形：每张上排为种植中，下排为同个体采摘后；收获后去掉泥土、底叶和接地茎，仅保留果实自身的草莓萼片/菠萝冠叶。
- 萤火不要写实虫子：用黄绿发光圆点表现，不画翅膀、身体或触角。此轮为静态特效示意，尚无粒子动画。
- 朋克强化染色：大面积紫红撞色、玫红斜向色块、青色跳色，并染色整片冠叶/萼片；取消上一轮绑带和别针方向。

## 输出

- strawberry.png：草莓，四列为原生、萤火、朋克、朋克＋萤火，上下两状态，共 8 个小样。
- pineapple.png：菠萝，相同四列与上下两状态，共 8 个小样。

评审：果实可见面积提升，收获形态清楚，朋克通过大色块保持种植/收获身份。草莓萤火有部分圆环形光晕，菠萝更接近实心光点；正式粒子建议统一为小圆点中心加柔光。菠萝冠叶仍偏大，可在最终资产阶段再调。此轮为概念板，不是透明生产素材或已接入的游戏表现。

## 完整提示词

### 草莓

Use case: style-transfer and precise-object-edit. Make a new polished 2D game-art comparison sheet based on the supplied approved illustration references.
Reference 1 provides the cute chunky hand-drawn fruit shapes and soft warm style. Reference 2 shows previous accessory exploration; DO NOT copy its excessive foliage, insect drawings, straps, bows, safety pins or medallions.
USER'S REVISIONS ARE THE MAIN GOAL: much LESS ground foliage; show the SAME individual fruit before and after harvest; FIREFLY must be simple cute glowing DOT PARTICLES, never insects; PUNK must be much more exaggerated bold DYED color blocking.
Style: unequivocal hand-drawn 2D illustration, warm dark-plum rounded outlines, flat pastel shapes and one or two soft cel-shadows, subtle gouache grain, tiny cream drawn highlights. Rounded sweet plump shapes, cozy collectible game art, no faces. Not a 3D render, no photorealism, no lens lighting.
Layout: wide 3:2 horizontal art sheet, exactly 4 columns x 2 rows, eight distinct specimens of ONE specified fruit species. Column headings exactly '原生', '萤火', '朋克', '朋克＋萤火'. Row labels in left gutter exactly '种植中' for upper row and '收获后' for lower. Each top/bottom pair is the SAME fruit identity, silhouette, color patches and traits, simply detached from its plant after harvest. Keep fruit size consistent between paired views, plenty of space and full margins. One small sheet title specified below. Flat light ivory paper background, no border/cards/UI. Tiny pale lavender grounding oval for harvested fruit only, no scene. Fruit itself occupies at least 75% of each specimen visual area; open negative space.
Planted TOP row: one large fruit on a SHORT unobtrusive stem, ONLY TWO or THREE small supporting basal leaves total, leaves each no wider than one third fruit width, no rear fan, no surrounding wreath, no pebbles, no pot. Tiny flat brown soil oval below stem, soil no wider than fruit. Fruit visible almost entirely; plants should feel like fruit with a minimal growing support, not a leafy bush.
Harvested BOTTOM row: ONLY the picked fruit with species-specific little calyx/crown. NO soil, NO roots, NO stalk to ground, NO basal leaves, NO pebbles, NO flowers, NO foliage platform. It is a beautiful clean collectible fruit icon, clearly distinct from a planted specimen. Keep trait appearance and particles upon harvesting.
Column 1 原生: ordinary species color, green crown/calyx, no fancy effects or decoration.
Column 2 萤火: same ordinary fruit body as col1, surround with 6 to 8 simple varying-sized soft ROUND luminous butter-yellow and pale mint-green dots, each dot with one soft pale halo, loose asymmetrical arc close to fruit. Dots should resemble friendly floating light motes, no eyes, wings, legs, antennae, black dots, insect bodies, bugs, star shapes, sparkles, or flower shapes. Do NOT change fruit color or add other traits.
Column 3 朋克: deliberate radically bolder dye design. Fruit has a large asymmetric deep-berry-purple patch covering ~30% of one side, a broad hot-magenta diagonal paint/dye slash wrapping from the patch across the species-color body, and a small vivid cyan contrast stripe. Natural rind or seed detail remains visible. Crown/calyx has entire alternating blades dyed hot pink and dark plum with a little electric teal edge, not just slightly pink tips. Read like playful graphic punk hair dye adapted to fruit. Each color block large and clean, not lots of tiny marks. Preserve cute rounded fruit shape; rich colorful, not grim/horror. NO clothing, studs, belts, pins, necklaces, glasses, faces, text graffiti or music-note particles.
Column 4 朋克＋萤火: EXACTLY the same bold dye pattern and palette as column 3 plus the friendly round glowing yellow/mint dot particles of column 2. This column proves additive composition, do not invent a different colorway, no other traits.
Do not inherit twins, gilded seeds, crystals, ice, lightning, iridescence or generic star sparkles from any reference. SINGLE fruit in every cell. Chinese text is small but clearly legible. No extra captions.
Species: STRAWBERRY ONLY. Title exactly '草莓 / 种植与收获'. Single very plump squat heart-shaped berry, warm strawberry-pink baseline with pale CREAM oval seeds, tiny soft green five-lobed calyx. NO large leaf fan or white flower above fruit in either row. In top row a very short fine curving stem connects calyx to the small supporting plant; only 2 or 3 tiny basal leaves. In bottom row detached berry with ONLY small calyx and tiny stem nub. Strawberry fruit remains large and lovable, not tall pointy or realistically narrow. In punk columns the cream seeds stay readable over the magenta/plum body patches.

### 菠萝

Use case: style-transfer and precise-object-edit. Make a new polished 2D game-art comparison sheet based on the supplied approved illustration references.
Reference 1 provides the cute chunky hand-drawn fruit shapes and soft warm style. Reference 2 shows previous accessory exploration; DO NOT copy its excessive foliage, insect drawings, straps, bows, safety pins or medallions.
USER'S REVISIONS ARE THE MAIN GOAL: much LESS ground foliage; show the SAME individual fruit before and after harvest; FIREFLY must be simple cute glowing DOT PARTICLES, never insects; PUNK must be much more exaggerated bold DYED color blocking.
Style: unequivocal hand-drawn 2D illustration, warm dark-plum rounded outlines, flat pastel shapes and one or two soft cel-shadows, subtle gouache grain, tiny cream drawn highlights. Rounded sweet plump shapes, cozy collectible game art, no faces. Not a 3D render, no photorealism, no lens lighting.
Layout: wide 3:2 horizontal art sheet, exactly 4 columns x 2 rows, eight distinct specimens of ONE specified fruit species. Column headings exactly '原生', '萤火', '朋克', '朋克＋萤火'. Row labels in left gutter exactly '种植中' for upper row and '收获后' for lower. Each top/bottom pair is the SAME fruit identity, silhouette, color patches and traits, simply detached from its plant after harvest. Keep fruit size consistent between paired views, plenty of space and full margins. One small sheet title specified below. Flat light ivory paper background, no border/cards/UI. Tiny pale lavender grounding oval for harvested fruit only, no scene. Fruit itself occupies at least 75% of each specimen visual area; open negative space.
Planted TOP row: one large fruit on a SHORT unobtrusive stem, ONLY TWO or THREE small supporting basal leaves total, leaves each no wider than one third fruit width, no rear fan, no surrounding wreath, no pebbles, no pot. Tiny flat brown soil oval below stem, soil no wider than fruit. Fruit visible almost entirely; plants should feel like fruit with a minimal growing support, not a leafy bush.
Harvested BOTTOM row: ONLY the picked fruit with species-specific little calyx/crown. NO soil, NO roots, NO stalk to ground, NO basal leaves, NO pebbles, NO flowers, NO foliage platform. It is a beautiful clean collectible fruit icon, clearly distinct from a planted specimen. Keep trait appearance and particles upon harvesting.
Column 1 原生: ordinary species color, green crown/calyx, no fancy effects or decoration.
Column 2 萤火: same ordinary fruit body as col1, surround with 6 to 8 simple varying-sized soft ROUND luminous butter-yellow and pale mint-green dots, each dot with one soft pale halo, loose asymmetrical arc close to fruit. Dots should resemble friendly floating light motes, no eyes, wings, legs, antennae, black dots, insect bodies, bugs, star shapes, sparkles, or flower shapes. Do NOT change fruit color or add other traits.
Column 3 朋克: deliberate radically bolder dye design. Fruit has a large asymmetric deep-berry-purple patch covering ~30% of one side, a broad hot-magenta diagonal paint/dye slash wrapping from the patch across the species-color body, and a small vivid cyan contrast stripe. Natural rind or seed detail remains visible. Crown/calyx has entire alternating blades dyed hot pink and dark plum with a little electric teal edge, not just slightly pink tips. Read like playful graphic punk hair dye adapted to fruit. Each color block large and clean, not lots of tiny marks. Preserve cute rounded fruit shape; rich colorful, not grim/horror. NO clothing, studs, belts, pins, necklaces, glasses, faces, text graffiti or music-note particles.
Column 4 朋克＋萤火: EXACTLY the same bold dye pattern and palette as column 3 plus the friendly round glowing yellow/mint dot particles of column 2. This column proves additive composition, do not invent a different colorway, no other traits.
Do not inherit twins, gilded seeds, crystals, ice, lightning, iridescence or generic star sparkles from any reference. SINGLE fruit in every cell. Chinese text is small but clearly legible. No extra captions.
Species: PINEAPPLE ONLY. Title exactly '菠萝 / 种植与收获'. Single plump rounded squat honey-yellow pineapple with broad simple diamond rind cells, a compact upright crown of 5 rounded leaf blades. Crown no more than 35% of fruit-body height. Keep this crown attached in both planted and harvested forms; it is part of the picked pineapple, NOT the surrounding bush. In top row ONLY 2 tiny low basal leaves and one short stalk connect fruit to tiny soil oval. In bottom row clean picked pineapple with its compact top crown, NO leaves around bottom. For punk variants whole crown blades alternate vivid magenta, plum and mint-teal; body dye follows diagonal large color-block pattern but diamond outlines remain visible. No little diamond gemstones on rind.


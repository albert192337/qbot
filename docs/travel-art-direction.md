# 旅行地图与手账 · 2026-09-15

## 巴黎花园项目配图试做

新增内置 imagegen 生成的三张 1536×1024 独立项目插画：
- app/src/renderer/garden/assets/travel/paris-garden-walk.png
- app/src/renderer/garden/assets/travel/paris-garden-picnic.png
- app/src/renderer/garden/assets/travel/paris-garden-flowers.png

本轮覆盖巴黎花园三阶段，其余项目仍沿用原显示方式。底部体验卡有配图缩略图，可点开大图；手账按记录 city/project/step 选择同张项目图，兼容旧记录。地图整体风格与经济数据不变。

生成使用共同提示词（在第一句之后插入下列主题段）：

> Production game experience postcard, landscape 3:2. Match Travel Chuanchuan 旅行串串 flat textured gouache / screenprinted cut-paper art: large charming simple shapes, tactile mottled paper grain, pastel buttery yellow, sage green, dusty turquoise and coral accents. Polished cute illustration, coherent hand-painted irregular shapes, carefully composed hero subject. Not a map. No letters, no text, no UI, no characters, no border, no watermarks. Full bleed. Distinct illustration of the actual activity.

walk:
> A charming Paris garden stroll: winding cream footpath between clipped green trees and pink rose beds, elegant small fountain, green park chair, a few falling petals. Ground-level intimate view, inviting and peaceful.

picnic:
> A Paris picnic beside a fountain: wicker picnic basket, red gingham blanket, croissants, strawberries, tiny jam jar and lemonade; fountain and formal garden gently visible behind. Focus on the picnic objects.

flowers:
> A keepsake bouquet of dried flowers from Paris: lavender, pale pink dried roses, golden wheat and tiny cream daisies, wrapped in warm kraft paper tied with dusty coral ribbon; a small blank souvenir tag, resting on a green park bench with softly simplified garden behind.

没有参考图输入，未使用 CLI 或项目内付费 API。scripts/test-travel.cjs 验证三阶段真实点击、三张不同图片加载、预览关闭和手账图片一致。

本次按用户提供的旅行串串截图统一成平面纸纹插画。参考图仅用于美术方向，不随安装包分发。使用内置 image_gen 工具生成，未使用项目供应商 API 或 CLI。第一轮细密水彩稿弃用，最终采用参考图的大色块版本。

## 素材

- app/src/renderer/garden/assets/travel/world.png
- app/src/renderer/garden/assets/travel/kyoto.png
- app/src/renderer/garden/assets/travel/paris.png
- app/src/renderer/garden/assets/travel/island.png

四张均为 1024×1536。Vite 打包为本地文件；运行时不联网取图。手账按城市聚合旧记录，每地点取最后一次体验作为照片题目，照片是对应地图的局部取景，桌宠形象用纪念头像表示，尚无专属旅行姿态或独立剧情照片。世界地图是装饰性旅行示意图。

## 最终提示词

每张调用一次内置工具，reference image 是用户的 codex-clipboard-b12797a9-6437-4fd5-90cb-22fa51e3cd7d.png。共同前后缀如下，中间插入下列各场景文字：

> Reference image is STRICT visual style reference, not edit target. Generate ONE portrait 2:3 full-bleed game illustration asset. Match the provided Travel Chuanchuan screenshot's actual flat screenprinted cut-paper illustration style closely: large simple shapes, sparse whimsical oversized landmark stickers, minimal internal detail, velvety mottled grain, pastel mustard yellow, dusty turquoise, cream, sage green and deep muted teal. The exact same visual simplicity, flat perspective, and print texture as the reference.

World:
> World atlas with Europe on left at (23%,28%), Kyoto Japan on upper right at (82%,28%) and a holiday tropical island at (60%,72%). Oversized individual landmarks: Eiffel tower on left, torii on right, shell and palm on lower island. Tiny triangular trees, cream coasts, cyan oceans, yellow continents. No paths, no dots (app draws route overlays).

Kyoto:
> Local Kyoto illustrated map with five distinct oversized landmark vignettes: cute matcha teahouse upper left at 25%,27%; red torii and lantern street upper right at 77%,30%; cherry tree picnic garden center left at 26%,53%; rocky hot spring center right at 76%,56%; wind chime workshop bottom middle at 50%,79%. Winding narrow cream path connects them. Pale yellow ground, sage hills.

Paris:
> Local Paris illustrated map with five distinct oversized landmark vignettes: croissant bakery upper left at 25%,27%; blue river and small boat upper right at 77%,30%; art museum center left at 26%,53%; Eiffel tower center right at 76%,56%; flower fountain picnic garden bottom middle at 50%,79%. Cream paths between them. Pale yellow ground, blue river.

Island:
> Local tropical island illustrated map five distinct oversized landmark vignettes: shell sandcastle beach upper left at 25%,27%; snorkeling cove fish upper right at 77%,30%; coconut shack center left at 26%,53%; striped lighthouse center right at 76%,56%; shell souvenir shop bottom middle at 50%,79%. Cream sandy paths. Pale yellow island, cyan sea.

共同后缀：
> No text at all, no interface, no labels, no footer, no characters. Preserve abundant quiet open ground, landmarks occupy only 40% of surface. DO NOT produce photorealism, detailed watercolor architecture, 3d rendering, botanical detail or busy tiny objects. This must feel like the reference game map, not a storybook landscape painting.

## 交互与验证

世界地图进入已解锁城市；当地点击五个地点切换底部单一体验条。消费成功后盖章与纸花、定位到对应地点；失败不播放成功反馈。底部导航固定，旧花园样式隔离。每个城市显示一条手账，最多五张地点照片，存档中全部原始体验记录保留。

旅行价格与 5×3 进度未改；长期收益曲线仍待校准。

类型检查、构建、travel/travel-memory/garden-service 单测，scripts/test-travel.cjs 用独立存档、阻断网络验证真实鼠标、连续扣款保护、旧记录聚合、重启恢复、地图素材和窄窗。截图保存在 .superpowers/travel。

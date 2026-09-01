/**
 * 语义动作解析：意图词 → 本地可用动作的映射。
 *
 * 规则引擎和 LLM 输出的都是意图词（intent），比如 "happy"、"angry"、"point"，
 * 而不是具体的 ActionId。解析层负责把意图词映射到当前角色实际有的动作，
 * 缺动作时逐级降级，最终 fallback 到 idle。
 *
 * 设计动机（spec §4.3）：
 *  - 不同角色的动作库不一样（有的 M 档动作没生成、有的有自定义动作）
 *  - 规则和模型不应该关心「这个角色到底有哪些动作」
 *  - 用户可以在控制台校正映射（个性化，不影响规则/模型）
 */
import type { PlayableId } from '@qbot/pipeline';

/** 解析结果 */
export interface ResolveResult {
  /** 实际播放的动作 id */
  action: PlayableId;
  /** 命中等级（用于统计和调试面板） */
  matchLevel: 'exact' | 'synonym' | 'category' | 'fallback';
  /** 降级链（debug 用：依次尝试了哪些动作，哪些不可用） */
  tried: PlayableId[];
}

/**
 * 内置同义词/分类映射表。
 * key = 意图词（小写），value = 候选动作列表（按优先级排列）。
 *
 * 顺序：精确动作名 → 同义意图 → 语义分类 → idle 兜底。
 * 这个表是「通用常识」，用户校正覆盖在 settings.actionIntentMap 里。
 */
const INTENT_MAP: Record<string, PlayableId[]> = {
  // ── 精确匹配 S 档动作名（允许规则/模型直接用 action id 当 intent） ──
  idle: ['idle'],
  sleep: ['sleep'],
  tea: ['tea'],
  talk_happy: ['talk_happy'],
  talk_annoyed: ['talk_annoyed'],
  drag: ['drag'],

  // ── 常见情绪/状态意图 ──
  happy: ['talk_happy', 'tea', 'idle'],
  glad: ['talk_happy', 'tea', 'idle'],
  excited: ['talk_happy', 'tea', 'idle'],
  celebrate: ['talk_happy', 'tea', 'idle'],
  cheer: ['talk_happy', 'tea', 'idle'],

  annoyed: ['talk_annoyed', 'tea', 'idle'],
  angry: ['talk_annoyed', 'tea', 'idle'],
  upset: ['talk_annoyed', 'tea', 'idle'],
  pout: ['talk_annoyed', 'tea', 'idle'],
  smug: ['talk_annoyed', 'tea', 'idle'], // M 档没生成时降级
  sassy: ['talk_annoyed', 'tea', 'idle'],

  thinking: ['tea', 'idle'],
  thought: ['tea', 'idle'],
  focus: ['tea', 'idle'],
  concentrate: ['tea', 'idle'],
  working: ['tea', 'idle'],

  sleepy: ['sleep', 'idle'],
  tired: ['sleep', 'idle'],
  bored: ['sleep', 'tea', 'idle'],
  rest: ['sleep', 'idle'],

  wave: ['talk_happy', 'tea', 'idle'], // 等 M 档 wave
  greet: ['talk_happy', 'tea', 'idle'],
  hello: ['talk_happy', 'tea', 'idle'],
  bye: ['talk_happy', 'tea', 'idle'],

  eat: ['tea', 'idle'], // 喝茶当吃东西的降级
  drink: ['tea', 'idle'],

  // ── 常用中文意图（模型可能直接输出中文）──
  开心: ['talk_happy', 'tea', 'idle'],
  高兴: ['talk_happy', 'tea', 'idle'],
  庆祝: ['talk_happy', 'tea', 'idle'],
  生气: ['talk_annoyed', 'tea', 'idle'],
  烦躁: ['talk_annoyed', 'tea', 'idle'],
  傲娇: ['talk_annoyed', 'tea', 'idle'],
  思考: ['tea', 'idle'],
  喝茶: ['tea', 'idle'],
  睡觉: ['sleep', 'idle'],
  困: ['sleep', 'idle'],
  无聊: ['sleep', 'tea', 'idle'],
  招手: ['talk_happy', 'tea', 'idle'],
  你好: ['talk_happy', 'tea', 'idle'],

  // ── M 档动作（目前 S 档没有的，先放降级链末尾，等 M 档生成后自动提升） ──
  point: ['talk_happy', 'tea', 'idle'], // M 档生成后: ['point', 'talk_happy', ...]
  turn_away: ['talk_annoyed', 'tea', 'idle'],
  cheer_up: ['talk_happy', 'tea', 'idle'],
  clap: ['talk_happy', 'tea', 'idle'],
  facepalm: ['talk_annoyed', 'tea', 'idle'],
  dance: ['talk_happy', 'tea', 'idle'],
  shock: ['talk_annoyed', 'tea', 'idle'],
  nod: ['tea', 'idle'],
  shake_head: ['talk_annoyed', 'tea', 'idle'],
  stretch: ['sleep', 'idle'],
  yawn: ['sleep', 'idle'],
  salute: ['tea', 'idle'],
};

/** 分类兜底：如果意图词不在表里，按粗分类降级 */
const CATEGORY_FALLBACK: Record<string, PlayableId[]> = {
  positive: ['talk_happy', 'tea', 'idle'],
  negative: ['talk_annoyed', 'tea', 'idle'],
  neutral: ['tea', 'idle'],
  rest: ['sleep', 'idle'],
};

/** 最终兜底：任何情况都至少返回 idle */
const FINAL_FALLBACK: PlayableId = 'idle';

/**
 * 解析意图词 → 实际可用动作。
 * @param intent 意图词（大小写不敏感）
 * @param available 当前角色可用的动作列表
 * @param userOverride 用户自定义覆盖映射（intent → action），优先级最高
 */
export function resolveAction(
  intent: string,
  available: PlayableId[],
  userOverride?: Record<string, PlayableId>,
): ResolveResult {
  const key = intent.toLowerCase().trim();
  const availSet = new Set(available);

  // 1. 用户自定义覆盖（最高优先级）
  if (userOverride && userOverride[key]) {
    const act = userOverride[key];
    if (availSet.has(act)) {
      return { action: act, matchLevel: 'exact', tried: [act] };
    }
    // 用户覆盖的动作当前角色没有 → 继续走内置映射
  }

  // 2. 精确匹配意图词本身就是一个可用动作
  if (availSet.has(key as PlayableId)) {
    return { action: key as PlayableId, matchLevel: 'exact', tried: [key as PlayableId] };
  }

  // 3. 内置同义词表
  const candidates = INTENT_MAP[key];
  if (candidates) {
    const tried: PlayableId[] = [];
    for (const cand of candidates) {
      tried.push(cand);
      if (availSet.has(cand)) {
        // 第一个候选 = exact，第二个 = synonym，第三个及以后 = category
        const level =
          tried.length === 1 ? 'synonym' : (tried.length === 2 ? 'synonym' : 'category');
        return { action: cand, matchLevel: level, tried };
      }
    }
  }

  // 4. 情绪分类兜底（粗略猜一下：含 happy/glad 等词 → positive）
  const category = guessCategory(key);
  const catCandidates = CATEGORY_FALLBACK[category];
  if (catCandidates) {
    const tried: PlayableId[] = [];
    for (const cand of catCandidates) {
      tried.push(cand);
      if (availSet.has(cand)) {
        return { action: cand, matchLevel: 'category', tried };
      }
    }
  }

  // 5. 最终 fallback
  return { action: FINAL_FALLBACK, matchLevel: 'fallback', tried: [FINAL_FALLBACK] };
}

/** 根据意图词的关键词粗略猜情绪分类（词表外意图的兜底） */
function guessCategory(intent: string): string {
  const positive = /happy|glad|excited|joy|love|like|fun|laugh|smile|cheer|celebrate|开心|高兴|快乐|喜欢|笑|庆祝|棒|赞/;
  const negative = /angry|annoy|sad|upset|mad|cry|hate|angry|生气|难过|讨厌|哭|烦|讨厌|恼/;
  const rest = /sleep|tired|rest|nap|yawn|sleepy|睡|困|休息|累|打哈欠/;
  if (positive.test(intent)) return 'positive';
  if (negative.test(intent)) return 'negative';
  if (rest.test(intent)) return 'rest';
  return 'neutral';
}

/**
 * 批量解析：一组意图词各自解析（用于规则的动作候选列表）。
 * 返回第一个可用的。
 */
export function resolveFirstAvailable(
  intents: string[],
  available: PlayableId[],
  userOverride?: Record<string, PlayableId>,
): ResolveResult | null {
  for (const intent of intents) {
    const r = resolveAction(intent, available, userOverride);
    if (r.matchLevel !== 'fallback') return r;
  }
  return intents.length > 0 ? resolveAction(intents[0], available, userOverride) : null;
}

/** 列出所有已知意图（调试面板/校正面板展示用） */
export function listKnownIntents(): string[] {
  return Object.keys(INTENT_MAP).sort();
}

/** 分类列表（校正面板分组用） */
export function listCategories(): string[] {
  return Object.keys(CATEGORY_FALLBACK);
}

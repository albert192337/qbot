/** Displayed character writing; separate from the model's private decision note. */
export type PetExpression = 'speech' | 'thought';

export function parseExpression(value: unknown): PetExpression {
  return value === 'thought' ? 'thought' : 'speech';
}

export const EXPRESSION_INSTRUCTIONS = '每次生成文字时，用 expression 选择 "speech"（说出口）或 "thought"（思考气泡），文字仍放在 say。thought 字段只是日记，不会自动冒泡。思考气泡是角色一闪而过的小念头：对已有观察的反应、自己的兴趣、安静的关心或明确的想象。用第一人称、短而有性格，不写分析过程，不问用户问题、不催回应、不连续提醒喝水休息。按情境自然选择，不必轮流，也不必每次都发文字。用户提出具体问题或请求时用 speech 明确回应；用户随口分享、无需回答时可用 thought。思考同样遵守感知边界和主动文字预算。';

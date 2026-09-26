/** Apply personality to expression and movement without changing visual identity. */
export function personaPrompt(persona?: string): string {
  if (!persona?.trim()) return '';
  return '角色人设：' + persona.trim() + '。按照此设定表现角色。保留动作的用途，表情、姿态和动作幅度优先符合人设；与人设冲突的夸张表情或活泼动作改为符合性格的表现。例如冷淡、寡言的角色开心时可以轻微微笑或点头，不必咧嘴大笑或兴奋蹦跳。人设不得改变参考图的外形、服装、比例或画风。';
}

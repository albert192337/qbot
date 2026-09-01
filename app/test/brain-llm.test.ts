/**
 * LLM 脑纯逻辑单测：prompt 构造、响应解析（脏输出容错）、节流、标签翻译。
 * 真实 API 调用不在这里测（brain-llm.ts 的 fetch 可注入，联调时手动验证）。
 */
import { describe, expect, it } from 'vitest';
import {
  agentActivityLabel,
  buildBrainMessages,
  parseBrainResponse,
  shouldThink,
  timeLabel,
  type BrainInput,
} from '../src/main/brain-llm-rules';

const INTENTS = ['happy', 'smug', 'sleepy', 'thinking', 'annoyed', 'wave'];

function baseInput(overrides: Partial<BrainInput> = {}): BrainInput {
  return {
    personaName: '小绿',
    personaTraits: '毒舌但心软',
    timeLabel: '周三 23:40 深夜',
    currentApp: 'Code',
    todaySwitches: 23,
    activeMinutes: 480,
    topApps: [
      { name: 'Code', switches: 12 },
      { name: 'Edge', switches: 8 },
    ],
    agentLabel: '正在埋头干活',
    inMeeting: false,
    musicPlaying: false,
    recentLines: ['还不睡呀？'],
    availableIntents: INTENTS,
    ...overrides,
  };
}

describe('buildBrainMessages', () => {
  it('system 含人设名、性格、铁律、意图词、JSON 格式', () => {
    const msgs = buildBrainMessages(baseInput());
    expect(msgs[0].role).toBe('system');
    const sys = msgs[0].content;
    expect(sys).toContain('小绿');
    expect(sys).toContain('毒舌但心软');
    expect(sys).toContain('不行动');
    expect(sys).toContain('happy');
    expect(sys).toContain('JSON');
  });

  it('user 含当前应用、账本、agent 状态、最近台词', () => {
    const msgs = buildBrainMessages(baseInput());
    const user = msgs[1].content;
    expect(user).toContain('Code');
    expect(user).toContain('23');
    expect(user).toContain('埋头干活');
    expect(user).toContain('还不睡呀？');
  });

  it('开会/听歌状态进上下文', () => {
    const user = buildBrainMessages(baseInput({ inMeeting: true, musicPlaying: true }))[1].content;
    expect(user).toContain('开会');
    expect(user).toContain('听歌');
  });

  it('无性格描述时不炸', () => {
    const msgs = buildBrainMessages(baseInput({ personaTraits: undefined }));
    expect(msgs[0].content).toContain('小绿');
  });
});

describe('parseBrainResponse', () => {
  it('标准 do=true 响应', () => {
    const r = parseBrainResponse(
      '{"thought":"主人又在熬夜","do":true,"action":"sleepy","say":"还不睡呀"}',
      INTENTS,
    );
    expect(r?.do).toBe(true);
    expect(r?.action).toBe('sleepy');
    expect(r?.say).toBe('还不睡呀');
    expect(r?.thought).toBe('主人又在熬夜');
  });

  it('do=false 只有想法', () => {
    const r = parseBrainResponse('{"thought":"没什么特别的","do":false}', INTENTS);
    expect(r?.do).toBe(false);
    expect(r?.action).toBeUndefined();
  });

  it('裹 markdown 代码块也能解析', () => {
    const text = '好的，我决定：\n```json\n{"thought":"x","do":true,"action":"happy","say":"嗨"}\n```';
    const r = parseBrainResponse(text, INTENTS);
    expect(r?.do).toBe(true);
    expect(r?.action).toBe('happy');
  });

  it('前后带解释文字也能提取', () => {
    const text = 'Let me think... {"thought":"y","do":true,"action":"wave","say":""} done';
    const r = parseBrainResponse(text, INTENTS);
    expect(r?.do).toBe(true);
    expect(r?.action).toBe('wave');
    expect(r?.say).toBeUndefined(); // 空字符串
  });

  it('非法 JSON 返回 null', () => {
    expect(parseBrainResponse('我不输出 JSON', INTENTS)).toBeNull();
    expect(parseBrainResponse('', INTENTS)).toBeNull();
    expect(parseBrainResponse('{broken', INTENTS)).toBeNull();
  });

  it('action 不在白名单 → 忽略动作但保留 say', () => {
    const r = parseBrainResponse(
      '{"thought":"x","do":true,"action":"explode","say":"哇"}',
      INTENTS,
    );
    expect(r?.do).toBe(true);
    expect(r?.action).toBeUndefined();
    expect(r?.say).toBe('哇');
  });

  it('action 非法且无 say → 降级为不行动', () => {
    const r = parseBrainResponse('{"thought":"x","do":true,"action":"explode","say":""}', INTENTS);
    expect(r?.do).toBe(false);
  });

  it('超长台词被截断', () => {
    const longSay = '字'.repeat(100);
    const r = parseBrainResponse(
      `{"thought":"x","do":true,"action":"happy","say":"${longSay}"}`,
      INTENTS,
    );
    expect(r?.say?.length).toBeLessThanOrEqual(40);
  });

  it('do 字段缺失/非 true 视为不行动', () => {
    expect(parseBrainResponse('{"thought":"x"}', INTENTS)?.do).toBe(false);
    expect(parseBrainResponse('{"thought":"x","do":"yes"}', INTENTS)?.do).toBe(false);
  });

  it('thought 缺失给默认值', () => {
    const r = parseBrainResponse('{"do":false}', INTENTS);
    expect(r?.thought).toBeTruthy();
  });

  it('action 大小写不敏感', () => {
    const r = parseBrainResponse('{"thought":"x","do":true,"action":"HAPPY","say":"嗨"}', INTENTS);
    expect(r?.action).toBe('happy');
  });
});

describe('shouldThink 节流', () => {
  it('从没思考过 → true', () => {
    expect(shouldThink(1000, null, 900_000)).toBe(true);
  });

  it('间隔不足 → false', () => {
    expect(shouldThink(1000 + 10 * 60_000, 1000, 15 * 60_000)).toBe(false);
  });

  it('间隔足够 → true', () => {
    expect(shouldThink(1000 + 20 * 60_000, 1000, 15 * 60_000)).toBe(true);
  });
});

describe('标签翻译', () => {
  it('agentActivityLabel 覆盖各状态', () => {
    expect(agentActivityLabel('working')).toContain('干活');
    expect(agentActivityLabel('done')).toContain('干完');
    expect(agentActivityLabel('error')).toContain('出错');
    expect(agentActivityLabel('idle')).toContain('闲');
  });

  it('timeLabel 含周几和时段', () => {
    // 2026-08-31 是周一
    const monday = new Date('2026-08-31T23:40:00');
    const label = timeLabel(monday);
    expect(label).toContain('周一');
    expect(label).toContain('23:40');
    expect(label).toContain('深夜');
  });
});

import { describe, expect, it } from 'vitest';
import {
  baseName,
  ELLIPSIS,
  FALLBACK_TEXT,
  flattenMarkdown,
  isSuperseded,
  lastAssistantEntry,
  MESSAGE_KIND,
  MESSAGE_MAX_CHARS,
  sessionKeyOf,
  sessionLabel,
  shortSession,
  SOURCE_MAX_CHARS,
  toBubbleText,
  truncate,
  type AgentMessageKind,
} from '../src/main/agent-message';

/** 造一行 transcript JSONL */
const line = (o: Record<string, unknown>) => JSON.stringify(o);
const assistant = (text: string, extra: Record<string, unknown> = {}) =>
  line({
    type: 'assistant',
    timestamp: '2026-07-26T03:00:00.000Z',
    message: { content: [{ type: 'text', text }] },
    ...extra,
  });

describe('markdown 展平', () => {
  it('闭合围栏代码块换成占位符', () => {
    expect(flattenMarkdown('前\n```js\nconst a=1;\n```\n后')).toBe('前 ［代码］ 后');
  });

  it('未闭合围栏也要处理（transcript 被截断时）', () => {
    expect(flattenMarkdown('前\n```js\nconst a=1;')).toBe('前 ［代码］');
  });

  it('inline code 保留内容去反引号', () => {
    expect(flattenMarkdown('改 `agent-server.ts` 就行')).toBe('改 agent-server.ts 就行');
  });

  it('标题 / 引用 / 列表 / 水平线', () => {
    expect(flattenMarkdown('### 标题')).toBe('标题');
    expect(flattenMarkdown('> 引用')).toBe('引用');
    expect(flattenMarkdown('- 甲\n- 乙')).toBe('· 甲 · 乙');
    expect(flattenMarkdown('1. 甲\n2. 乙')).toBe('· 甲 · 乙');
    expect(flattenMarkdown('上\n---\n下')).toBe('上 下');
  });

  it('链接与图片只留文字', () => {
    expect(flattenMarkdown('见 [文档](https://x.com/a)')).toBe('见 文档');
    expect(flattenMarkdown('![猫图](a.png)')).toBe('猫图');
  });

  it('粗体与星号斜体剥符号', () => {
    expect(flattenMarkdown('**很重要**')).toBe('很重要');
    expect(flattenMarkdown('这是 *斜体* 啦')).toBe('这是 斜体 啦');
  });

  it('ANSI 转义剥除', () => {
    expect(flattenMarkdown('\u001b[31m红\u001b[0m')).toBe('红');
  });

  it('多行压成单行', () => {
    expect(flattenMarkdown('第一段\n\n第二段\n   缩进')).toBe('第一段 第二段 缩进');
  });

  it('回归：snake_case / __init__ 的下划线不许被当斜体剥掉', () => {
    expect(flattenMarkdown('改 agent_server_test 文件')).toBe('改 agent_server_test 文件');
    expect(flattenMarkdown('实现 __init__ 方法')).toBe('实现 __init__ 方法');
    expect(flattenMarkdown('_leading 和 trailing_')).toBe('_leading 和 trailing_');
  });

  it('空串与纯空白', () => {
    expect(flattenMarkdown('')).toBe('');
    expect(flattenMarkdown('   \n\n  ')).toBe('');
  });
});

describe('截断', () => {
  it('短于或等于上限原样返回', () => {
    expect(truncate('短', 10)).toBe('短');
    expect(truncate('0123456789', 10)).toBe('0123456789');
  });

  it('超限加省略号', () => {
    const r = truncate('01234567890', 10);
    expect(r.endsWith(ELLIPSIS)).toBe(true);
    expect([...r].length).toBeLessThanOrEqual(11);
  });

  it('拉丁文回退到词边界，不切在单词中间', () => {
    const r = truncate('the quick brown fox jumps over', 20);
    expect(r).toBe('the quick brown fox' + ELLIPSIS);
  });

  it('中文无空格走硬切', () => {
    expect(truncate('一二三四五六七八九十', 5)).toBe('一二三四五' + ELLIPSIS);
  });

  it('回归：emoji 代理对不许被劈开', () => {
    const r = truncate('🎉🎉🎉🎉🎉', 3);
    expect([...r]).toEqual(['🎉', '🎉', '🎉', ELLIPSIS]);
    expect(r).not.toContain('\ufffd');
  });

  it('toBubbleText 先展平再截断，不超上限', () => {
    const raw = '# 标题\n\n' + '啊'.repeat(300);
    const r = toBubbleText(raw);
    expect([...r].length).toBeLessThanOrEqual(MESSAGE_MAX_CHARS + 1);
    expect(r.startsWith('标题')).toBe(true);
  });
});

describe('transcript 尾块解析', () => {
  it('反向取最后一条 assistant', () => {
    const tail = [assistant('第一条'), line({ type: 'user' }), assistant('第二条')].join('\n');
    expect(lastAssistantEntry(tail, true)?.text).toBe('第二条');
  });

  it('尾部不是 assistant 时继续往前找（实测形状）', () => {
    const tail = [
      assistant('结论'),
      line({ type: 'system' }),
      line({ type: 'last-prompt' }),
    ].join('\n');
    expect(lastAssistantEntry(tail, true)?.text).toBe('结论');
  });

  it('跳过 text block 为空的 assistant（纯 tool_use 行）', () => {
    const toolOnly = line({
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name: 'Bash' }] },
    });
    expect(lastAssistantEntry([assistant('真结论'), toolOnly].join('\n'), true)?.text).toBe(
      '真结论',
    );
  });

  it('回归：跳过 isSidechain 的子 agent 回复', () => {
    const tail = [assistant('主线结论'), assistant('子 agent 的话', { isSidechain: true })].join(
      '\n',
    );
    expect(lastAssistantEntry(tail, true)?.text).toBe('主线结论');
  });

  it('多个 text block 拼接', () => {
    const multi = line({
      type: 'assistant',
      message: { content: [{ type: 'text', text: '甲' }, { type: 'text', text: '乙' }] },
    });
    expect(lastAssistantEntry(multi, true)?.text).toBe('甲\n乙');
  });

  it('atFileStart=false 时丢弃可能被字节截断的首行', () => {
    const tail = [assistant('残行'), line({ type: 'user' })].join('\n');
    expect(lastAssistantEntry(tail, false)).toBeNull();
    expect(lastAssistantEntry(tail, true)?.text).toBe('残行');
  });

  it('非法 JSON 行忽略，CRLF 与尾部空行安全', () => {
    const tail = ['{坏行', assistant('好行'), '', ''].join('\r\n');
    expect(lastAssistantEntry(tail, true)?.text).toBe('好行');
  });

  it('解析 timestamp；缺失或非法为 0', () => {
    expect(lastAssistantEntry(assistant('x'), true)?.at).toBe(
      Date.parse('2026-07-26T03:00:00.000Z'),
    );
    const noTs = line({ type: 'assistant', message: { content: [{ type: 'text', text: 'x' }] } });
    expect(lastAssistantEntry(noTs, true)?.at).toBe(0);
  });

  it('空输入 / 全无 assistant → null', () => {
    expect(lastAssistantEntry('', true)).toBeNull();
    expect(lastAssistantEntry(line({ type: 'user' }), true)).toBeNull();
  });
});

describe('来源标签', () => {
  it('posix 与 windows 路径都取目录名', () => {
    expect(baseName('/Users/albert/dev/QBot')).toBe('QBot');
    expect(baseName('C:\\Users\\albert\\dev\\QBot')).toBe('QBot');
  });

  it('结尾斜杠不影响', () => {
    expect(baseName('/a/b/QBot/')).toBe('QBot');
  });

  it('cwd 缺失或非字符串时回落 agentId', () => {
    expect(sessionLabel(undefined, 'claude')).toBe('claude');
    expect(sessionLabel(123, 'claude')).toBe('claude');
    expect(sessionLabel('/', 'claude')).toBe('claude');
  });

  it('超长标签截断', () => {
    const label = sessionLabel('/x/' + 'あ'.repeat(40), 'claude');
    expect([...label].length).toBe(SOURCE_MAX_CHARS);
    expect(label.endsWith(ELLIPSIS)).toBe(true);
  });

  it('shortSession 去连字符取 4 位小写；空串安全', () => {
    expect(shortSession('7569EE9A-741c-40a5')).toBe('7569');
    expect(shortSession('')).toBe('');
  });

  it('sessionKeyOf 与会话表同键；空 session 落到 default', () => {
    expect(sessionKeyOf('claude', 'abc')).toBe('claude:abc');
    expect(sessionKeyOf('claude', '')).toBe('claude:default');
  });
});

describe('在飞消息的代际守卫', () => {
  it('同 seq = 没被取代', () => {
    expect(isSuperseded(1, 1)).toBe(false);
  });

  it('有更新的 seq = 被取代', () => {
    expect(isSuperseded(2, 1)).toBe(true);
  });

  it('回归：条目被删除不算被取代（headless 下 SessionEnd 紧跟 Stop 会清掉代际表，误判会让刚结束那轮的气泡被自己杀掉）', () => {
    expect(isSuperseded(undefined, 1)).toBe(false);
  });
});

describe('hook 事件 → 气泡类型', () => {
  it('只有 Stop 与 Notification 冒泡', () => {
    expect(MESSAGE_KIND.Stop).toBe('done');
    expect(MESSAGE_KIND.Notification).toBe('attention');
    expect(MESSAGE_KIND.PreToolUse).toBeUndefined();
    expect(MESSAGE_KIND.SessionEnd).toBeUndefined();
    expect(MESSAGE_KIND.UserPromptSubmit).toBeUndefined();
  });

  it('每个气泡类型都有兜底文案（漏一个就会冒空气泡）', () => {
    for (const k of ['done', 'attention'] as AgentMessageKind[]) {
      expect(FALLBACK_TEXT[k], k).toBeTruthy();
    }
  });
});

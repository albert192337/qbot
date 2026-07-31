/**
 * Claude Code hooks 安装器的纯变换测试。
 *
 * 重点守住两件事：
 * 1. hook 命令串必须是 POSIX 且不含 Windows 专属写法——Claude Code 在三平台
 *    都用 bash 执行 hook（Windows 上是 Git for Windows 的 /usr/bin/bash，实测确认），
 *    一旦有人「为 Windows 好心」改成 cmd/PowerShell 写法，联动会静默失效。
 * 2. 安装/卸载只碰自己的条目：别人的 hook 和 settings 里其余配置一律不动。
 */
import { describe, expect, it, vi } from 'vitest';

// 该模块 import 了 electron 的 dialog（只在 toggle 里用），单测里给个空壳
vi.mock('electron', () => ({ dialog: { showMessageBox: vi.fn() } }));

const {
  HOOK_EVENTS,
  hasOurHooks,
  hookCommand,
  withHooks,
  withoutHooks,
} = await import('../src/main/hooks/claude');

const OTHERS = { hooks: [{ type: 'command', command: 'echo someone-else' }] };

describe('hookCommand', () => {
  const cmd = hookCommand();

  it('用 POSIX sh 执行，不含 Windows 专属写法', () => {
    expect(cmd.startsWith('sh -c')).toBe(true);
    // %VAR% / powershell / cmd.exe 都意味着有人按错误的假设改过
    expect(cmd).not.toMatch(/%[A-Za-z_]+%/);
    expect(cmd.toLowerCase()).not.toContain('powershell');
    expect(cmd.toLowerCase()).not.toContain('cmd.exe');
    expect(cmd).not.toContain('\\'); // 反斜杠路径在 bash 里是转义符
  });

  it('从 ~/.qbot/port 读端口，HOME 缺失时退回 USERPROFILE', () => {
    expect(cmd).toContain('${HOME:-$USERPROFILE}/.qbot/port');
  });

  it('含可识别标记，供安装/卸载/去重使用', () => {
    expect(cmd).toContain('.qbot/port');
  });

  it('只打本机，且带超时与兜底 exit 0（绝不拖慢 agent）', () => {
    expect(cmd).toContain('http://127.0.0.1:');
    expect(cmd).toContain('-m 2');
    expect(cmd).toContain('exit 0');
  });

  it('把 stdin 的事件 JSON 原样 POST', () => {
    expect(cmd).toContain('--data-binary @-');
    expect(cmd).toContain('-X POST');
  });
});

describe('withHooks', () => {
  it('写入全部 7 类事件', () => {
    const s = withHooks({});
    expect(Object.keys(s.hooks ?? {}).sort()).toEqual([...HOOK_EVENTS].sort());
    expect(HOOK_EVENTS.length).toBe(7);
  });

  it('幂等：装两次不叠加', () => {
    const once = withHooks({});
    const twice = withHooks(once);
    for (const ev of HOOK_EVENTS) {
      expect(twice.hooks?.[ev]).toHaveLength(1);
    }
  });

  it('保留别人的 hook 条目', () => {
    const s = withHooks({ hooks: { Stop: [OTHERS] } });
    expect(s.hooks?.Stop).toHaveLength(2);
    expect(s.hooks?.Stop[0]).toEqual(OTHERS);
  });

  it('不动 settings 里的其余配置', () => {
    const s = withHooks({ theme: 'dark', permissions: { allow: ['Bash'] } });
    expect(s.theme).toBe('dark');
    expect(s.permissions).toEqual({ allow: ['Bash'] });
  });

  it('每条 hook 都有 timeout 兜底', () => {
    const s = withHooks({});
    for (const ev of HOOK_EVENTS) {
      expect(s.hooks?.[ev][0].hooks[0].timeout).toBeGreaterThan(0);
    }
  });
});

describe('withoutHooks', () => {
  it('摘掉自己的，保留别人的', () => {
    const installed = withHooks({ hooks: { Stop: [OTHERS] } });
    const s = withoutHooks(installed);
    expect(s.hooks?.Stop).toEqual([OTHERS]);
  });

  it('自己是唯一条目时删掉整个事件键（不留空数组）', () => {
    const s = withoutHooks(withHooks({}));
    expect(s.hooks?.UserPromptSubmit).toBeUndefined();
    expect(Object.keys(s.hooks ?? {})).toHaveLength(0);
  });

  it('不动其余配置', () => {
    const s = withoutHooks(withHooks({ theme: 'dark' }));
    expect(s.theme).toBe('dark');
  });

  it('装→卸是往返的（回到原样）', () => {
    const before = { theme: 'dark', hooks: { Stop: [OTHERS] } };
    expect(withoutHooks(withHooks(before))).toEqual(before);
  });
});

describe('hasOurHooks', () => {
  it('装前 false，装后 true，卸后 false', () => {
    expect(hasOurHooks({})).toBe(false);
    const installed = withHooks({});
    expect(hasOurHooks(installed)).toBe(true);
    expect(hasOurHooks(withoutHooks(installed))).toBe(false);
  });

  it('只有别人的 hook → false', () => {
    expect(hasOurHooks({ hooks: { Stop: [OTHERS] } })).toBe(false);
  });

  it('畸形 settings 不抛（hooks 不是数组 / 缺字段）', () => {
    expect(hasOurHooks({ hooks: { Stop: 'nope' as never } })).toBe(false);
    expect(hasOurHooks({ hooks: { Stop: [{} as never] } })).toBe(false);
  });
});

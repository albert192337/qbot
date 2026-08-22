/**
 * 表情包导入纯逻辑单测：文件名消毒（安全相关）+ 落盘命名 + manifest 合并。
 */
import { describe, expect, it } from 'vitest';
import {
  isManualOverride,
  mergedActionIds,
  mergeImported,
  mergeSpares,
  safeFileName,
  stemFor,
} from '../src/main/sticker-rules';
import type { ManifestImportedAction } from '@qbot/pipeline';

function entry(sourceName: string): ManifestImportedAction {
  return {
    webm: `imported/${sourceName}.webm`,
    raw: `imported/_raw/${sourceName}`,
    durationSec: 2,
    sourceName,
  };
}

describe('safeFileName（贴纸名来自用户文件系统，落盘前必须洗）', () => {
  it('普通名字原样保留（含中文）', () => {
    expect(safeFileName('happy.gif')).toBe('happy.gif');
    expect(safeFileName('开心猫猫.gif')).toBe('开心猫猫.gif');
    expect(safeFileName('cat-01_v2.gif')).toBe('cat-01_v2.gif');
  });

  it('剥掉目录部分（POSIX 与 Windows 分隔符都要）', () => {
    expect(safeFileName('/etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\Windows\\evil.gif')).toBe('evil.gif');
  });

  it('目录穿越被挡住', () => {
    // 关键断言：结果里绝不能出现 .. 或分隔符，否则能写出角色目录
    for (const evil of ['../../../etc/passwd', '..\\..\\system32', '../secret.gif']) {
      const out = safeFileName(evil);
      expect(out).not.toContain('..');
      expect(out).not.toContain('/');
      expect(out).not.toContain('\\');
    }
  });

  it('纯点名字判废（. / .. 洗完还是点）', () => {
    expect(safeFileName('..')).toBe('sticker');
    expect(safeFileName('.')).toBe('sticker');
    expect(safeFileName('')).toBe('sticker');
  });

  it('空格与特殊字符换成下划线', () => {
    expect(safeFileName('my sticker!.gif')).toBe('my_sticker_.gif');
    expect(safeFileName('a;rm -rf b.gif')).toBe('a_rm_-rf_b.gif');
  });
});

describe('stemFor（落盘文件名主干）', () => {
  it('槽位贴纸按槽位命名（播放层按 key 找文件）', () => {
    expect(stemFor('idle', '随便什么名.gif')).toBe('idle');
    expect(stemFor('talk_happy', 'x.gif')).toBe('talk_happy');
  });

  it('备选库加 spare_ 前缀，避免和槽位文件重名互相覆盖', () => {
    expect(stemFor(null, 'happy.gif')).toBe('spare_happy');
    // 关键：名叫 idle.gif 的备选贴纸不能覆盖槽位的 idle.webm
    expect(stemFor(null, 'idle.gif')).toBe('spare_idle');
    expect(stemFor(null, 'idle.gif')).not.toBe(stemFor('idle', 'x.gif'));
  });

  it('备选库名也过消毒', () => {
    expect(stemFor(null, '../evil.gif')).toBe('spare_evil');
  });

  it('无扩展名不炸', () => {
    expect(stemFor(null, 'noext')).toBe('spare_noext');
  });
});

describe('isManualOverride（追溯用户是否改过模型建议）', () => {
  it('建议与选择一致 → 不算改', () => {
    expect(isManualOverride('idle', 'idle')).toBe(false);
  });

  it('改成别的槽位 → 算改', () => {
    expect(isManualOverride('idle', 'sleep')).toBe(true);
  });

  it('建议落槽但用户扔进备选库 → 算改', () => {
    expect(isManualOverride('idle', null)).toBe(true);
  });

  it('模型没建议但用户手动指定 → 算改', () => {
    expect(isManualOverride(undefined, 'tea')).toBe(true);
  });

  it('模型没建议且用户也不用 → 不算改', () => {
    expect(isManualOverride(undefined, null)).toBe(false);
  });
});

describe('mergeImported / mergeSpares（分批导入）', () => {
  it('第二批不清掉第一批占的槽位', () => {
    const first = { idle: entry('a.gif') };
    const second = { sleep: entry('b.gif') };
    const merged = mergeImported(first, second);
    expect(Object.keys(merged).sort()).toEqual(['idle', 'sleep']);
  });

  it('同槽位后来者覆盖', () => {
    const merged = mergeImported({ idle: entry('old.gif') }, { idle: entry('new.gif') });
    expect(merged.idle.sourceName).toBe('new.gif');
  });

  it('首次导入（existing 为 undefined）', () => {
    expect(mergeImported(undefined, { idle: entry('a.gif') })).toEqual({
      idle: entry('a.gif'),
    });
  });

  it('备选库追加而非替换', () => {
    const merged = mergeSpares([entry('a.gif')], [entry('b.gif')]);
    expect(merged?.map((s) => s.sourceName)).toEqual(['a.gif', 'b.gif']);
  });

  it('都为空时给 undefined（manifest 里不留空数组）', () => {
    expect(mergeSpares(undefined, [])).toBeUndefined();
    expect(mergeSpares([], [])).toBeUndefined();
  });
});

describe('mergedActionIds（播放层合并口径，spec §4.3）', () => {
  it('导入贴纸覆盖同名标准动作，不重复计数', () => {
    const ids = mergedActionIds({
      actions: { idle: { status: 'done' }, sleep: { status: 'done' } },
      importedActions: { idle: {} },
    });
    expect(ids.sort()).toEqual(['idle', 'sleep']);
  });

  it('未生成完的标准动作不进池，但同名导入贴纸能补上', () => {
    const ids = mergedActionIds({
      actions: { idle: { status: 'done' }, tea: { status: 'failed' } },
      importedActions: { tea: {} },
    });
    // tea 生成失败，但贴纸让它可用了
    expect(ids.sort()).toEqual(['idle', 'tea']);
  });

  it('导入贴纸没有 status 字段也算可用（落盘即可播）', () => {
    const ids = mergedActionIds({ actions: {}, importedActions: { idle: {} } });
    expect(ids).toEqual(['idle']);
  });

  it('三方合并：标准 + 导入 + 自定义', () => {
    const ids = mergedActionIds({
      actions: { idle: { status: 'done' } },
      importedActions: { sleep: {} },
      customActions: { walk: { status: 'done' }, dance: { status: 'pending' } },
    });
    // dance 还在生成中，不算
    expect(ids.sort()).toEqual(['idle', 'sleep', 'walk']);
  });

  it('无导入时退化为原有行为', () => {
    const ids = mergedActionIds({ actions: { idle: { status: 'done' } } });
    expect(ids).toEqual(['idle']);
  });
});

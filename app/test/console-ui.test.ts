import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { icon } from '../src/renderer/console/icons';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('console UI invariants', () => {
  it('renders semantic SVG icons instead of emoji glyphs', () => {
    expect(icon('characters')).toContain('<svg');
    expect(icon('characters')).toContain('aria-hidden="true"');
    expect(icon('characters')).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('keeps hatch styles scoped to the hatch pane', () => {
    const source = read('../src/renderer/console/panes/hatch.ts');
    expect(source).toContain('@scope (.pane[data-pane="hatch"])');
    expect(source).not.toContain('\n:root {');
  });

  it('does not use blocking browser dialogs in console panes', () => {
    const files = [
      'hatch.ts',
      'market.ts',
      'persona.ts',
      'prompts.ts',
      'stickers.ts',
    ];
    for (const file of files) {
      const source = read(`../src/renderer/console/panes/${file}`);
      expect(source).not.toMatch(/\b(?:window\.)?(?:confirm|alert)\s*\(/);
    }
  });

  it('keeps supporting character tools inside one role workspace entry', () => {
    const source = read('../src/renderer/console/main.ts');
    expect(source).toContain("label: '创建角色'");
    expect(source).toContain("label: '角色工作台'");
    expect(source).toContain("id: 'scene-actions', label: '动作配置'");
    expect(source).toContain("hiddenFromSidebar: true, navParent: 'characters'");
    expect(source).toContain('ROLE_WORKSPACE_TABS');
  });

  it('reviews the source image before starting paid character generation', () => {
    const source = read('../src/renderer/console/panes/hatch.ts');
    expect(source).toContain('id="hatch-source-preview"');
    expect(source).toContain('id="hatch-btn-start" disabled');
    expect(source).toContain('selectedSourceFile');
    expect(source).toContain('高级生成设置');
    expect(source).toContain('开始后先生成 1 个角色方案供你确认');
    expect(source).toContain('11 个常用动作');
    expect(source).not.toContain('表现力动作（M 档）');
  });

  it('uses one online-space entry instead of separate room actions', () => {
    const ipcSource = read('../src/main/ipc.ts');
    const traySource = read('../src/main/tray.ts');
    expect(ipcSource).toContain("label: '一起玩…'");
    expect(traySource).toContain("label: '一起玩…'");
    expect(ipcSource).not.toMatch(/label:\s*'小房间/);
    expect(ipcSource).not.toMatch(/label:\s*'公共房间/);
    expect(traySource).not.toMatch(/label:\s*'小房间/);
    expect(traySource).not.toMatch(/label:\s*'公共房间/);
  });

  it('offers two presentation modes inside the same online room', () => {
    const html = read('../src/renderer/lounge/index.html');
    const renderer = read('../src/renderer/lounge/view.ts');
    const preload = read('../src/preload/index.ts');
    expect(html).toContain('data-display-mode="room"');
    expect(html).toContain('data-display-mode="desktop"');
    expect(html).toContain('不会退出或重连房间');
    expect(renderer).toContain('window.qbot.rooms.getDisplayMode()');
    expect(renderer).toContain('window.qbot.rooms.setDisplayMode(mode)');
    expect(renderer).toContain('window.qbot.rooms.onDisplayModeChanged');
    expect(preload).toContain("ipcRenderer.invoke('rooms:getDisplayMode')");
    expect(preload).toContain("ipcRenderer.invoke('rooms:setDisplayMode', mode)");
  });

  it('offers persisted room-size presets in the room context menu', () => {
    const roomSource = read('../src/renderer/room/main.ts');
    const preload = read('../src/preload/index.ts');
    expect(roomSource).toContain('房间大小');
    expect(roomSource).toContain("['small', '小']");
    expect(roomSource).toContain("['medium', '中']");
    expect(roomSource).toContain("['large', '大']");
    expect(preload).toContain("ipcRenderer.invoke('room:setSizePreset', preset)");
  });
});

import { expect, it } from 'vitest';
import type { Manifest } from '@qbot/pipeline';
import { brainActions } from '../src/main/brain-actions';
import { parseBrainResponse } from '../src/main/brain-llm-rules';
const action = (status = 'done', motionDesc = '动作描述') => ({ status, webm: 'a.webm', motionDesc });

it('读取新增预设、自定义和贴纸，排除未完成动作，并与播放覆盖顺序一致', () => {
  const manifest = {
    actions: { idle: action(), dance: action('done', '旧动作') },
    importedActions: { tea: { webm: 'tea.webm', category: '喝茶' } },
    expressionActions: { cheer: action(), dance: action('done', '跳舞') },
    customActions: { MyDance: action('done', '新舞步'), pending: action('pending'), failed: action('failed'), dance: action('done', '自定义舞步') },
  } as unknown as Manifest;
  const catalog = brainActions(manifest);
  expect(catalog.map((a) => a.id)).toEqual(['idle', 'dance', 'tea', 'cheer', 'MyDance']);
  expect(catalog.find((a) => a.id === 'dance')?.description).toBe('自定义舞步');
  expect(parseBrainResponse('{"do":true,"action":"MyDance"}', catalog.map((a) => a.id))?.action).toBe('MyDance');
  manifest.customActions!.pending.status = 'done';
  expect(brainActions(manifest).map((a) => a.id)).toContain('pending');
});
it('没有角色或没有已完成动作，模型不能虚构可播动作', () => {
  expect(brainActions()).toEqual([]);
  expect(parseBrainResponse('{"do":true,"action":"happy","say":"你好"}', [])).toMatchObject({ action: undefined, say: '你好' });
});

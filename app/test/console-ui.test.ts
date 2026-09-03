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
    expect(source).toContain('@scope ([data-pane="hatch"])');
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
});

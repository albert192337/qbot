import { expect,it } from 'vitest';
import { parseSemanticSuggestions } from '../src/main/sticker-semantics';
it('open multi-label semantics keep exact IDs and reject unknown IDs without inventing a fixed bucket',()=>{
  const result=parseSemanticSuggestions('```json\n[{"id":"a","tags":["扫地","工作","扫地"],"loop":"yes","subjects":"multiple"},{"id":"b","tags":["工作","疲惫"],"loop":"bad"},{"id":"evil","tags":["注入"]}]\n```',['a','b']);
  expect(result.a.tags).toEqual(['扫地','工作']);expect(result.b.tags).toEqual(['工作','疲惫']);
  expect(result.a.subjects).toBe('multiple');expect(result.b.loop).toBe('uncertain');
  expect(result).not.toHaveProperty('evil');
});
it('malformed or missing model records never silently replace user tags',()=>{
  expect(()=>parseSemanticSuggestions('not json',['a'])).toThrow();
  expect(parseSemanticSuggestions('[{"id":"a","tags":null}]',['a'])).toEqual({});
});

import {describe,it,expect} from 'vitest';
import {HeadOverlayRegistry,headAllows,headWinner,HEAD_PRIORITY} from '../src/shared/desktop-overlays';
describe('desktop head-area priority',()=>{
 it('gives a food wish exclusive priority over speech and tasks regardless of arrival order',()=>{
  expect(headWinner(['quest','speech','wish'])).toBe('wish');expect(headWinner(['wish','quest','speech'])).toBe('wish');
  expect(headAllows('wish','speech')).toBe(false);expect(headAllows('wish','quest')).toBe(false);
  expect(HEAD_PRIORITY.interaction).toBeGreaterThan(HEAD_PRIORITY.wish);
 });
 it('restores only still-active content, without replaying expired speech',()=>{
  const r=new HeadOverlayRegistry();r.report(1,'wish',true);r.report(2,'speech',true);expect(r.snapshot().winner).toBe('wish');
  r.report(2,'speech',false);r.report(1,'wish',false);expect(r.snapshot().winner).toBe(null);
  r.report(2,'speech',true);r.report(1,'wish',true);r.report(1,'wish',false);expect(r.snapshot().winner).toBe('speech');
 });
 it('releases window claims on hide/reload/crash without deleting another window claims',()=>{
  const r=new HeadOverlayRegistry();r.report(1,'wish',true);r.report(2,'speech',true);r.report(3,'speech',true);
  r.release(1);expect(r.snapshot().winner).toBe('speech');r.release(2);expect(r.snapshot().winner).toBe('speech');r.release(3);expect(r.snapshot().winner).toBe(null);
  const revision=r.snapshot().revision;expect(r.release(3)).toBe(false);expect(r.snapshot().revision).toBe(revision);
 });
 it('ignores identical reports and provides current priority to late subscribers',()=>{
  const r=new HeadOverlayRegistry();r.report(1,'wish',true);const snapshot=r.snapshot();
  expect(r.report(1,'wish',true)).toBe(false);expect(r.snapshot()).toEqual(snapshot);
  r.report(1,'interaction',true);expect(r.snapshot().winner).toBe('interaction');r.report(1,'interaction',false);expect(r.snapshot().winner).toBe('wish');
 });
});

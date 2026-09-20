import { expect, it } from 'vitest';
import type { Manifest, ManifestAction } from '../src/types';
import { clearLegacyStickerMotionLabels, generationMotionDesc } from '../src/action-prompt';

it('adapts imported and generated legacy aliases without discarding explicit edits',()=>{
  const legacy = {motionDesc:'扭呀扭；；扭呀扭'} as ManifestAction;
  const user = {motionDesc:'扭呀扭；扭呀扭',motionDescSource:'user'} as ManifestAction;
  const m = {actions:{idle:{...legacy},drag:user},customActions:{st_old:legacy,generated_idle:{...legacy}},
    stickerLibrary:{items:[{name:'扭呀扭',tags:['扭呀扭']}]}} as unknown as Manifest;
  expect(generationMotionDesc(m,m.actions.idle)).toBeUndefined();
  expect(generationMotionDesc(m,user)).toBe(user.motionDesc);
  expect(generationMotionDesc(m,{motionDesc:'手写的新动作'} as ManifestAction)).toBe('手写的新动作');
  clearLegacyStickerMotionLabels(m);
  expect(m.actions.idle.motionDesc).toBeUndefined();
  expect(m.customActions!.generated_idle.motionDesc).toBeUndefined();
  expect(user.motionDesc).toBe('扭呀扭；扭呀扭');
});

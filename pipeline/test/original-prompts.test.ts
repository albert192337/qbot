import { expect, it } from 'vitest';
import { ACTION_IDS } from '../src/types';
import { originalActionSpec, originalFramePrompt, originalVideoPrompt } from '../src/original-prompts';
it('preserves original anatomy and style for every base action without forced limb motion',()=>{
  for(const id of ACTION_IDS){
    const spec=originalActionSpec(id);expect(spec.poseDesc).toBeTruthy();expect(spec.motionDesc).toBeTruthy();
    expect(originalFramePrompt(spec.poseDesc)).toContain('原画风');
    expect(originalFramePrompt(spec.poseDesc)).not.toContain('粗描边贴纸插画风格');
    expect(spec.poseDesc+spec.motionDesc).not.toMatch(/双臂|双腿|髋部|膝部/);
    expect(originalVideoPrompt(spec.motionDesc)).toContain('--duration 5');
  }
  expect(originalActionSpec('idle').poseDesc).toContain('原有姿态');
});

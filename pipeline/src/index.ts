/** @qbot/pipeline 公共出口：app 主进程从这里 import */
export * from './types.js';
export { Job } from './job.js';
export { runPipeline, runTurnaround, pickTurnaround, runActions, runPackage, keyActionVideo } from './stages.js';
export type { PipelineHooks } from './stages.js';
export { createArkClient, toDataUrl } from './ark.js';
export type { ArkClient } from './ark.js';
export { createGptImageGenerator } from './gpt-image.js';
export type { HttpPost } from './gpt-image.js';
export {
  resolveFfmpegPath,
  sampleKeyColor,
  sampleBackgroundColors,
  toWebm,
  toGif,
  computeAlphaBBox,
  computeAlphaStats,
  ALPHA_ERODE_PX,
  NORM_TARGET_COVERAGE,
  NORM_SCALE_MIN,
  NORM_SCALE_MAX,
  normalizeFilter,
  probeSize,
} from './chroma.js';
export { checkGreenFrame, checkVideoDrift, classifyDrift, selectChromaKey } from './qc.js';
export { turnaroundPrompt, framePrompt, videoPrompt, actionSpec, ACTIONS, ABSTRACT_ACTIONS, FAITHFUL_ACTIONS, DEFAULT_CHARACTER_DESC } from './prompts.js';

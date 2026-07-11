/** @qbot/pipeline 公共出口：app 主进程从这里 import */
export * from './types.js';
export { Job } from './job.js';
export { runPipeline, runTurnaround, pickTurnaround, runActions, runPackage } from './stages.js';
export type { PipelineHooks } from './stages.js';
export { createArkClient, toDataUrl } from './ark.js';
export type { ArkClient } from './ark.js';
export { createGptImageGenerator } from './gpt-image.js';
export type { HttpPost } from './gpt-image.js';
export {
  resolveFfmpegPath,
  sampleKeyColor,
  toWebm,
  toGif,
  computeAlphaBBox,
  normalizeFilter,
  probeSize,
} from './chroma.js';
export { checkGreenFrame, checkVideoDrift, classifyDrift } from './qc.js';
export { turnaroundPrompt, framePrompt, videoPrompt, actionSpec, ACTIONS, ABSTRACT_ACTIONS, DEFAULT_CHARACTER_DESC } from './prompts.js';

/** @qbot/pipeline 公共出口：app 主进程从这里 import */
export * from './types.js';
export { Job } from './job.js';
export { runPipeline, runTurnaround, pickTurnaround, runActions, runPackage, keyActionVideo } from './stages.js';
export type { PipelineHooks } from './stages.js';
export { createArkClient, toDataUrl } from './ark.js';
export type { ArkClient, VisionChatOpts, VisionPart } from './ark.js';
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
  RIM_DESPILL_MIX,
  RIM_DESPILL_BAND,
  rimDespillFilter,
  erodeFilter,
  NORM_TARGET_COVERAGE,
  NORM_SCALE_MIN,
  NORM_SCALE_MAX,
  normalizeFilter,
  probeSize,
  gifToWebm,
  probeDurationSec,
  STICKER_CANVAS,
} from './chroma.js';
export {
  labelStickers,
  scanStickerDir,
  extractFrames,
  parseLabels,
  buildLabelParts,
  extractJsonArray,
  resolveSlots,
  confidenceTier,
  STICKER_CATEGORIES,
  CATEGORY_TO_SLOT,
  MAX_STICKERS_PER_BATCH,
  LABEL_CHUNK_SIZE,
  FRAMES_PER_STICKER,
  SUPPORTED_EXTS,
  CONFIDENCE_HIGH,
  CONFIDENCE_LOW,
  LABEL_SYSTEM_PROMPT,
} from './sticker-import.js';
export type {
  StickerLabel,
  StickerCategory,
  StickerFrames,
  SlotAssignment,
  ConfidenceTier,
} from './sticker-import.js';
export { checkGreenFrame, checkVideoDrift, classifyDrift, selectChromaKey, selectDualKeys } from './qc.js';
export { turnaroundPrompt, framePrompt, videoPrompt, actionSpec, ACTIONS, ABSTRACT_ACTIONS, FAITHFUL_ACTIONS, DEFAULT_CHARACTER_DESC, expressionActionSpec, EXPRESSION_ACTIONS, EXPRESSION_ABSTRACT_ACTIONS, EXPRESSION_FAITHFUL_MOTION } from './prompts.js';
export { EXPRESSION_ACTION_IDS } from './types.js';
export type { ExpressionActionId } from './types.js';

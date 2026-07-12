/**
 * 语音包：一包 = 一组纯数据韵律/音色参数（voice spec §5）。
 * 加新包 = 加一条常量，引擎代码不动。参数起点来自头脑风暴试听 demo 的调校值。
 */
import type { VoicePackId } from '../../../shared/voice-assign';

export interface VoicePack {
  id: VoicePackId;
  /** 基频 Hz */
  basePitch: number;
  /** 每音节节拍（秒） */
  stepSec: number;
  /** 7Hz 小颤音（奶音包） */
  vibrato: boolean;
  /** 音高按五声音阶旋律蹦跳 + 长短交替节拍（活泼包） */
  melodic: boolean;
}

export const VOICE_PACKS: Record<VoicePackId, VoicePack> = {
  soft: { id: 'soft', basePitch: 415, stepSec: 0.17, vibrato: false, melodic: false },
  bouncy: { id: 'bouncy', basePitch: 445, stepSec: 0.145, vibrato: false, melodic: true },
  baby: { id: 'baby', basePitch: 540, stepSec: 0.18, vibrato: true, melodic: false },
};

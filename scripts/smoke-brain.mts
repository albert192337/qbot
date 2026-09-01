/**
 * 一次性烟测：真实调一次 Ark LLM 脑，验证 API 可达 + 模型按 prompt 返回合法决策。
 * 花费：每次约 1k tokens（< 1 分钱），3 个场景共几分钱。
 * 跑法：npx tsx scripts/smoke-brain.mts
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chatCompleteWithRetry } from '../app/src/main/llm-client.ts';
import {
  buildBrainMessages,
  parseBrainResponse,
  type BrainInput,
} from '../app/src/main/brain-llm-rules.ts';

const INTENTS = [
  'happy', 'smug', 'sleepy', 'thinking', 'annoyed', 'wave',
  'celebrate', 'shock', 'nod', 'stretch', 'dance', 'relaxed',
];

// Key 来源：仓库 config.local.json（dev fallback）→ 用户设置 config.json
let apiKey: string | undefined;
try {
  apiKey = (JSON.parse(readFileSync('config.local.json', 'utf8')) as { arkApiKey?: string }).arkApiKey;
} catch { /* 无 config.local.json 就试用户设置 */ }
if (!apiKey) {
  const settingsPath = join(homedir(), 'Library/Application Support/@qbot/app/config.json');
  apiKey = (JSON.parse(readFileSync(settingsPath, 'utf8')) as { arkApiKey?: string }).arkApiKey;
}
if (!apiKey) {
  console.error('找不到 arkApiKey（config.local.json 和用户设置 config.json 都没有）');
  process.exit(1);
}
console.log('使用 arkApiKey:', apiKey.slice(0, 6) + '…');

const scenarios: Array<{ name: string; input: BrainInput }> = [
  {
    name: '深夜加班',
    input: {
      personaName: '小绿',
      personaTraits: '毒舌但心软、有点傲娇',
      timeLabel: '周三 23:40 深夜',
      currentApp: 'Visual Studio Code',
      todaySwitches: 23,
      activeMinutes: 480,
      topApps: [
        { name: 'Visual Studio Code', switches: 12 },
        { name: 'Microsoft Edge', switches: 8 },
      ],
      agentLabel: '正在埋头干活',
      inMeeting: false,
      musicPlaying: false,
      recentLines: ['还不睡呀？'],
      availableIntents: INTENTS,
    },
  },
  {
    name: '周一早上',
    input: {
      personaName: '小绿',
      personaTraits: '毒舌但心软、有点傲娇',
      timeLabel: '周一 10:00 上午',
      currentApp: 'Microsoft Outlook',
      todaySwitches: 5,
      activeMinutes: 40,
      topApps: [{ name: 'Microsoft Outlook', switches: 3 }],
      agentLabel: '闲着，没在干活',
      inMeeting: false,
      musicPlaying: false,
      recentLines: [],
      availableIntents: INTENTS,
    },
  },
  {
    name: 'Claude 刚跑完 + 在听歌',
    input: {
      personaName: '小绿',
      personaTraits: '毒舌但心软、有点傲娇',
      timeLabel: '周五 18:30 晚上',
      currentApp: 'Visual Studio Code',
      todaySwitches: 31,
      activeMinutes: 560,
      topApps: [
        { name: 'Visual Studio Code', switches: 18 },
        { name: '网易云音乐', switches: 4 },
      ],
      agentLabel: '刚跑完一轮，干完活了',
      inMeeting: false,
      musicPlaying: true,
      recentLines: ['搞定！'],
      availableIntents: INTENTS,
    },
  },
];

for (const sc of scenarios) {
  console.log(`\n${'═'.repeat(60)}\n场景：${sc.name}\n${'═'.repeat(60)}`);
  const messages = buildBrainMessages(sc.input);
  try {
    const raw = await chatCompleteWithRetry({ apiKey, messages });
    console.log('【模型原始返回】\n' + raw.trim());
    const decision = parseBrainResponse(raw, INTENTS);
    console.log('【解析结果】', JSON.stringify(decision, null, 2));
  } catch (err) {
    console.error('【调用失败】', err instanceof Error ? err.message : err);
  }
}

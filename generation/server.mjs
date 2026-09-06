import { readFile } from 'node:fs/promises';
import * as pipeline from '../pipeline/dist/index.js';
import { createGenerationService } from './service.mjs';
const apiKey = process.env.ARK_API_KEY;
if (!apiKey) throw new Error('ARK_API_KEY is required');
const config = {
  apiKey, gptImageApiKey: process.env.GPT_IMAGE_API_KEY,
  ffmpegPath: await pipeline.resolveFfmpegPath(process.env.FFMPEG_PATH), concurrency: 2,
};
const invites = process.env.INVITE_FILE ? JSON.parse(await readFile(process.env.INVITE_FILE, 'utf8')) : [];
const app = await createGenerationService({ dataDir: process.env.DATA_DIR ?? '/var/lib/qbot-generation', pipeline, config, invites });
app.server.listen(Number(process.env.PORT ?? 24253), '127.0.0.1', () => console.log('[generation] listening on loopback'));
// systemd restart kills work after timeout; job state has durable upstream IDs for resumption.
process.on('SIGTERM', () => { app.stop(); setTimeout(() => process.exit(0), 5000).unref(); });

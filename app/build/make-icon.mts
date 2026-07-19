/**
 * 从预置吉祥物 source.png 生成 build/icon.png（透明底、alpha bbox 居中的正方形 512）。
 * electron-builder 会自动由 icon.png 转出各平台格式（win 的 ico 等）。
 * 只依赖仓库已有的 ffmpeg-static（PNG↔raw RGBA），抠背景的 flood fill 在 Node 里做。
 * 用法：npx tsx app/build/make-icon.mts
 */
import { execFile } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const ffmpeg = (await import('ffmpeg-static')).default as unknown as string;

const root = path.resolve(import.meta.dirname, '../..');
const src = path.join(root, 'app/resources/presets/mascot/source.png');
const out = path.join(root, 'app/build/icon.png');
const tmpRaw = out + '.raw';

const W = 512, H = 512;
await execFileP(ffmpeg, [
  '-y', '-i', src,
  '-vf', `scale=${W}:${H}`,
  '-f', 'rawvideo', '-pix_fmt', 'rgba', tmpRaw,
]);
const data = await readFile(tmpRaw);

const idx = (x: number, y: number) => (y * W + x) * 4;
const isWhite = (x: number, y: number) => {
  const i = idx(x, y);
  return data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235;
};

// 从四边 flood fill：只把「外部」近白背景抠透明，角色身上的白色保留
const seen = new Uint8Array(W * H);
const queue: Array<[number, number]> = [];
for (let x = 0; x < W; x++) queue.push([x, 0], [x, H - 1]);
for (let y = 0; y < H; y++) queue.push([0, y], [W - 1, y]);
while (queue.length) {
  const [x, y] = queue.pop()!;
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const s = y * W + x;
  if (seen[s]) continue;
  seen[s] = 1;
  if (!isWhite(x, y)) continue;
  data[idx(x, y) + 3] = 0;
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

// alpha bbox 居中：把角色平移到画布中心（不缩放，留边距即可）
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (data[idx(x, y) + 3] > 0) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
const dx = Math.round((W - 1 - maxX - minX) / 2);
const dy = Math.round((H - 1 - maxY - minY) / 2);
const shifted = Buffer.alloc(data.length);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    data.copy(shifted, idx(nx, ny), idx(x, y), idx(x, y) + 4);
  }

await writeFile(tmpRaw, shifted);
await execFileP(ffmpeg, [
  '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', tmpRaw,
  '-frames:v', '1', out,
]);
await unlink(tmpRaw);
console.log('wrote', out);

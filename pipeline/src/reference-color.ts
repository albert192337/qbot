import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

/** Conservative opt-in: transparent, predominantly white ink drawing, no coloured fills. */
export function hasFlatWhiteFill(rgba: Buffer, width: number): boolean {
  let opaque = 0, transparent = 0, white = 0, ink = 0, coloured = 0, grayFill = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 250) { transparent++; continue; }
    opaque++;
    const lo = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    const hi = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]);
    if (lo >= 250 && hi - lo <= 5) white++;
    if (hi <= 64) ink++;
    // Small cool antialiasing fringes in imported GIFs are not coloured fills.
    if (hi > 160 && hi - lo > 24) coloured++;
    // Preserve intentional light-gray areas too. Require a flat 3x3 patch so
    // gray antialiasing around black outlines cannot disable white restoration.
    const pixel = i / 4, x = pixel % width;
    if (lo >= 192 && hi < 248 && x > 0 && x < width - 1 && i >= width * 4 && i + width * 4 + 7 < rgba.length) {
      let flat = true;
      for (let dy = -1; dy <= 1 && flat; dy++) for (let dx = -1; dx <= 1 && flat; dx++) {
        const neighbour = i + (dy * width + dx) * 4;
        if (rgba[neighbour + 3] < 250 || [0, 1, 2].some(c => Math.abs(rgba[neighbour + c] - rgba[i + c]) > 5)) flat = false;
      }
      if (flat) grayFill++;
    }
  }
  return opaque >= 100 && transparent / (opaque + transparent) >= 0.1 &&
    white / opaque >= 0.35 && ink / opaque >= 0.03 && coloured / opaque < 0.002 && grayFill / opaque < 0.002;
}

/** Keep dark lines, gently lift near-whites, and give white fills a stable plateau.
 * Applied after keying/despill, never to alpha. Only eligible original sticker references use it.
 */
export function flatWhiteFilter(): string {
  const curve = "'if(lte(val,192),val,if(gte(val,224),255,192+(val-192)*63/32))'";
  return `format=rgba,lutrgb=r=${curve}:g=${curve}:b=${curve}`;
}

export async function referenceColorFilter(reference: string, ffmpeg: string): Promise<string | undefined> {
  const { stdout } = await exec(ffmpeg, ['-v', 'error', '-i', reference,
    '-vf', 'scale=512:512:flags=neighbor',
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
  { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024, timeout: 30_000, windowsHide: true });
  return hasFlatWhiteFill(stdout, 512) ? flatWhiteFilter() : undefined;
}

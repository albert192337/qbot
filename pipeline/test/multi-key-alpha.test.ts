import { beforeAll, afterAll, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { keyFilters, chromaKeyParams, assertGreenBackgroundCleared, assertTransparentWebm, toWebm, toGif } from '../src/chroma';
import { getFfmpegPath } from './fixtures';
const exec = promisify(execFile);
let ff: string, dir: string, source: string;
const keys = ['15b235', '328b42'];
const single = (k: string) => { const p = chromaKeyParams(k); return `chromakey=0x${k}:${p.similarity}:${p.blend}`; };
beforeAll(async () => {
  ff = await getFfmpegPath(); dir = await mkdtemp(path.join(os.tmpdir(), 'qbot-multi-key-'));
  source = path.join(dir, 'green.mp4');
  await exec(ff, ['-y','-v','error','-f','lavfi','-i','color=c=0x15b235:s=128x128:r=10:d=1',
    '-vf','drawbox=x=64:y=0:w=64:h=128:color=0x328b42:t=fill,drawbox=x=32:y=32:w=64:h=64:color=0x202040:t=fill,drawbox=x=48:y=48:w=32:h=32:color=0x7fffd4:t=fill',
    '-c:v','libx264','-pix_fmt','yuv420p',source]);
});
afterAll(async () => { if (dir) await rm(dir, {recursive:true,force:true}); });
async function pixels(file: string, vf: string, webm = false) {
  const {stdout} = await exec(ff, ['-v','error',...(webm?['-c:v','libvpx-vp9']:[]),'-i',file,
    '-vf',vf+',format=rgba','-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'], {encoding:'buffer',maxBuffer:8e6});
  return stdout;
}
it('merges alpha from different keys instead of restoring removed background; key order is immaterial', async () => {
  const serial = await pixels(source, keys.map(single).join(','));
  const merged = await pixels(source, keyFilters(keys));
  const reverse = await pixels(source, keyFilters([...keys].reverse()));
  const individual = await Promise.all(keys.map(k => pixels(source, single(k))));
  const a = (b: Buffer,x:number,y:number) => b[(y*128+x)*4+3];
  expect(a(serial,16,16)).toBeGreaterThan(200);
  for (const raw of [merged,reverse]) {
    expect(a(raw,16,16)).toBe(0); expect(a(raw,112,16)).toBe(0);
    expect(a(raw,40,40)).toBe(255);
    expect(a(raw,64,64)).toBe(Math.min(...individual.map(b => a(b,64,64))));
  }
},60000);
it('rejects residual green even when it appears after the first sampled frame', () => {
  const raw=Buffer.alloc(96*96*4*2);
  for(let i=0;i<raw.length;i+=4) {raw[i+1]=180;raw[i+3]=i<96*96*4?0:255;}
  expect(()=>assertGreenBackgroundCleared(raw)).toThrow('green background remains');
  expect(()=>assertGreenBackgroundCleared(raw.subarray(0,96*96*4))).not.toThrow();
});
it('encoded WebM/GIF retain dark subject and the expected alpha of a colour near the key', async () => {
  const webm=path.join(dir,'fixed.webm'), gif=path.join(dir,'fixed.gif');
  const keyed=await pixels(source,keyFilters(keys));
  const expectedAlpha=keyed[(64*128+64)*4+3];
  await toWebm(source,webm,keys,ff);
  await toGif(source,gif,keys,ff);
  for (const file of [webm,gif]) {
    const raw=await pixels(file,'scale=128:128',file===webm);
    const px=(x:number,y:number)=>[...raw.subarray((y*128+x)*4,(y*128+x)*4+4)];
    expect(px(16,16)[3]).toBe(0); expect(px(112,16)[3]).toBe(0);
    expect(px(40,40)[3]).toBe(255);
    expect(px(40,40)[0]).toBeLessThan(45); expect(px(40,40)[2]).toBeGreaterThan(50);
    if(file===webm){
      expect(Math.abs(px(64,64)[3]-expectedAlpha)).toBeLessThanOrEqual(3);
    } else expect(px(64,64)[3]).toBe(expectedAlpha<128?0:255);
  }
},60000);
it('rejects an encoded opaque video rather than reporting done', async () => {
  const bad=path.join(dir,'opaque.webm');
  await exec(ff,['-y','-v','error','-i',source,'-c:v','libvpx-vp9','-pix_fmt','yuv420p',bad]);
  await expect(assertTransparentWebm(bad,ff)).rejects.toThrow('opaque or empty');
});

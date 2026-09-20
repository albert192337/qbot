import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { flatWhiteFilter, hasFlatWhiteFill } from '../src/reference-color';
import { toWebm, toGif } from '../src/chroma';
import { getFfmpegPath } from './fixtures';
const exec = promisify(execFile);
let dir: string, ff: string;
beforeAll(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'qbot-colour-'));ff=await getFfmpegPath();});
afterAll(async()=>{if(dir)await rm(dir,{recursive:true,force:true});});

function reference(fill: number[], accent?: number[]) {
  const rgba=Buffer.alloc(64*64*4);
  for(let y=8;y<56;y++)for(let x=8;x<56;x++){
    const colour=x<12||x>=52||y<12||y>=52 ? [0,0,0] : accent&&x<20&&y<20 ? accent : fill;
    rgba.set([...colour,255],(y*64+x)*4);
  }
  return rgba;
}
it('only restores transparent white ink artwork; keeps cream, gray, mint and small coloured accents unchanged',()=>{
  expect(hasFlatWhiteFill(reference([255,255,255]),64)).toBe(true);
  for(const colour of [[240,240,240],[254,252,243],[127,255,212]])expect(hasFlatWhiteFill(reference(colour),64)).toBe(false);
  expect(hasFlatWhiteFill(reference([255,255,255],[255,80,90]),64)).toBe(false);
  expect(hasFlatWhiteFill(reference([255,255,255],[230,230,230]),64)).toBe(false);
  const opaque=reference([255,255,255]);for(let i=3;i<opaque.length;i+=4)opaque[i]=255;
  expect(hasFlatWhiteFill(opaque,64)).toBe(false);
});

it('restores flickering yellow/gray whites through real WebM and GIF encoding while preserving alpha and black lines',async()=>{
  for(const [i,colour] of ['0xf7eef5','0xf1f0e8'].entries())await exec(ff,['-v','error','-y','-f','lavfi','-i','color=c=0x00ff00:s=128x128:d=1',
    '-vf',`drawbox=x=24:y=24:w=80:h=80:color=black:t=fill,drawbox=x=32:y=32:w=64:h=64:color=${colour}:t=fill`,'-frames:v','1',path.join(dir,`frame${i}.png`)],{windowsHide:true});
  const src=path.join(dir,'raw.mp4');
  await exec(ff,['-v','error','-y','-framerate','2','-i',path.join(dir,'frame%d.png'),'-vf','fps=20','-c:v','libx264','-pix_fmt','yuv420p',src],{windowsHide:true});
  const webm=path.join(dir,'fixed.webm'),gif=path.join(dir,'fixed.gif');
  const norm='scale=128:128,pad=256:256:64:64:color=black@0,crop=128:128:64:64';
  await toWebm(src,webm,['00ff00'],ff,norm,0,0.5,flatWhiteFilter());
  await toGif(src,gif,['00ff00'],ff,norm,0.5,flatWhiteFilter());
  for(const file of [webm,gif]){
    const {stdout}=await exec(ff,['-v','error',...(file===webm?['-c:v','libvpx-vp9']:[]),'-i',file,'-vf','fps=2,scale=128:128,format=rgba','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{encoding:'buffer',maxBuffer:2*1024*1024,windowsHide:true});
    expect(stdout.length).toBe(128*128*4*2);
    for(let f=0;f<2;f++){
      const px=(x:number,y:number)=>[...stdout.subarray((f*128*128+y*128+x)*4,(f*128*128+y*128+x)*4+4)];
      expect(Math.min(...px(64,64).slice(0,3))).toBeGreaterThanOrEqual(250);
      expect(px(64,64)[3]).toBe(255);
      expect(px(4,4)[3]).toBe(0);
      expect(Math.max(...px(28,64).slice(0,3))).toBeLessThanOrEqual(8);
    }
  }
},60_000);

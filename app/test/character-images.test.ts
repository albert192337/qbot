import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveFfmpegPath } from '@qbot/pipeline';
import { imageChoices, selectedImage, saveCover, displayImage } from '../src/main/character-images';
import { packCharacterDir, unpackCharacter } from '../src/main/asset-pack';
let dir:string;
afterEach(async()=>{if(dir)await rm(dir,{recursive:true,force:true});});
it('selects frames from downloaded WebM, saves an isolated cover, and excludes cover metadata from packages',async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'qbot-images-'));await mkdir(path.join(dir,'actions'));
  const ffmpeg=await resolveFfmpegPath();
  await promisify(execFile)(ffmpeg,['-v','error','-f','lavfi','-i','color=c=red:s=48x48:d=1','-c:v','libvpx-vp9',path.join(dir,'actions/st_one.webm')],{windowsHide:true});
  const manifest={id:'test',sourceImage:'source.png',turnaround:'',actions:{},customActions:{st_one:{status:'done',webm:'actions/st_one.webm'}},stickerLibrary:{items:[{id:'st_one',name:'无聊'}]}};
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));await writeFile(path.join(dir,'source.png'),'original-reference');
  const selection={kind:'action',actionId:'st_one',seconds:0.3} as const;
  const choices=await imageChoices(dir);expect(choices.some(c=>c.label==='无聊')).toBe(true);
  const png=await selectedImage(dir,selection);expect(png.subarray(1,4).toString()).toBe('PNG');
  await saveCover(dir,selection);
  expect(await readFile(path.join(dir,'source.png'),'utf8')).toBe('original-reference');
  expect(JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'))).toEqual(manifest);
  const pack=await packCharacterDir(dir);const unpacked=path.join(dir,'unpacked');await unpackCharacter(pack.buffer,unpacked);
  expect(pack.buffer.includes(Buffer.from('original-reference'))).toBe(false);
  expect((await readFile(path.join(unpacked,'source.png'))).subarray(1,4).toString()).toBe('PNG');
  expect(await displayImage(unpacked)).toBe('source.png');
  await expect(readFile(path.join(unpacked,'cover.png'))).rejects.toThrow();
  await expect(readFile(path.join(unpacked,'.cover.json'))).rejects.toThrow();
  await expect(selectedImage(dir,{...selection,seconds:5})).rejects.toThrow('没有可用帧');
  await expect(selectedImage(dir,{...selection,seconds:-1})).rejects.toThrow('帧时间无效');
  await expect(selectedImage(dir,{...selection,actionId:'../outside'})).rejects.toThrow('动作不可用');
},20000);

it('uses only the first turnaround panel despite an old source cover, and refreshes changed artwork', async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'qbot-portrait-'));
  const ffmpeg = await resolveFfmpegPath();
  await promisify(execFile)(ffmpeg, ['-v','error','-f','lavfi','-i','color=c=red:s=90x30,drawbox=x=30:y=0:w=60:h=30:color=blue:t=fill','-frames:v','1',path.join(dir,'turnaround.png')], { windowsHide:true });
  await writeFile(path.join(dir,'manifest.json'), JSON.stringify({sourceImage:'source.png',turnaround:'turnaround.png',actions:{}}));
  await writeFile(path.join(dir,'source.png'),'private-original');
  await writeFile(path.join(dir,'cover.png'),'private-original');
  await writeFile(path.join(dir,'.cover.json'),JSON.stringify({selection:{kind:'source'}}));
  expect((await imageChoices(dir)).some(c=>c.selection.kind==='source')).toBe(false);
  await expect(selectedImage(dir,{kind:'source'})).rejects.toThrow('不可展示或上传');
  const [first, same] = await Promise.all([displayImage(dir), displayImage(dir)]);
  expect(first).toBe(same);
  const png = await readFile(path.join(dir,first!));
  expect(png.readUInt32BE(16)).toBe(30);
  expect(png.readUInt32BE(20)).toBe(30);
  const {stdout} = await promisify(execFile)(ffmpeg,['-v','error','-i',path.join(dir,first!),'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{encoding:'buffer',windowsHide:true});
  for(let i=0;i<stdout.length;i+=3) { expect(stdout[i]).toBeGreaterThan(240); expect(stdout[i+2]).toBeLessThan(10); }
  const pack=await packCharacterDir(dir);
  expect(pack.buffer.includes(Buffer.from('private-original'))).toBe(false);
  const unpacked=path.join(dir,'unpacked');await unpackCharacter(pack.buffer,unpacked);
  expect(await readFile(path.join(unpacked,'source.png'))).toEqual(png);
  await promisify(execFile)(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=green:s=120x30','-frames:v','1',path.join(dir,'turnaround.png')],{windowsHide:true});
  expect(await displayImage(dir)).not.toBe(first);
},20000);

it('leaves a placeholder when only a raw reference and an unverified legacy cover exist',async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'qbot-no-portrait-'));
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({sourceImage:'source.png',turnaround:'missing.png',actions:{},stickerLibrary:{items:[]}}));
  await writeFile(path.join(dir,'source.png'),'private-original');
  await writeFile(path.join(dir,'cover.png'),'private-original');
  expect(await displayImage(dir)).toBeUndefined();
  expect((await packCharacterDir(dir)).buffer.includes(Buffer.from('private-original'))).toBe(false);
});

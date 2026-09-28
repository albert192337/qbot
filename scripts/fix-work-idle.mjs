// Remove generated typing from the idle clip: the keyboard, hands and lower
// sleeves are held at the shared starting pose. Only the upper body can breathe.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { toWebm, toGif, rimDespillFilter, selectDualKeys } from '../pipeline/dist/index.js';
const dir=path.resolve('output/work-mode'),out=path.join(dir,'v3');
await fs.mkdir(out,{recursive:true});
const ff=path.resolve('app/node_modules/ffmpeg-static/ffmpeg.exe');
const mp4=path.join(out,'computer_idle.mp4');
// The first 64% of the canvas is head/hood/chest; hands start below 69%.
// Feather the small chest boundary and keep everything below 66% exactly still.
execFileSync(ff,['-y','-i',path.join(dir,'v2/computer_idle.mp4'),
  '-filter_complex',"[0:v]scale=640:640,setsar=1,fps=24,format=yuv444p,split[motion][freeze];[freeze]trim=end_frame=1,setpts=PTS-STARTPTS,loop=loop=-1:size=1:start=0[still];[motion][still]blend=all_expr='A*max(0,min(1,(0.66*H-Y)/(0.025*H)))+B*(1-max(0,min(1,(0.66*H-Y)/(0.025*H))))',format=yuv420p[out]",
  '-map','[out]','-t','5','-c:v','libx264','-crf','12','-an',mp4],{stdio:'ignore'});
const raw=execFileSync(ff,['-v','error','-i',mp4,'-vf','fps=1,scale=64:64','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
const colors=[];
for(let off=0;off+64*64*3<=raw.length;off+=64*64*3){for(const [x,y] of [[1,1],[62,1],[1,62],[62,62],[32,1],[32,62],[1,32],[62,32]]){const i=off+(y*64+x)*3;colors.push(raw.subarray(i,i+3).toString('hex'));}}
const keys=selectDualKeys(colors),rim=rimDespillFilter(0.5,3).replace(/^,/, '');
if(!keys.length)throw Error('Missing chroma background');
await toWebm(mp4,path.join(out,'computer_idle.webm'),keys,ff,undefined,0,0,rim);
await toGif(mp4,path.join(out,'computer_idle.gif'),keys,ff,undefined,0,rim);
console.log('Idle clip ready; generated hand motion removed.');

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const ff=path.resolve('pipeline/node_modules/ffmpeg-static/ffmpeg.exe');
const src='output/perch-diagnosis/perch.mp4';
const filters={bright:'chromakey=0x15b235:0.1:0.07', dark:'chromakey=0x328b42:0.04:0.012', serial:'chromakey=0x15b235:0.1:0.07,chromakey=0x328b42:0.04:0.012'};
for(const [name,vf] of Object.entries(filters)){
 const raw=execFileSync(ff,['-v','error','-i',src,'-vf',vf+',format=rgba','-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:10e6});
 let total=0,opaque=0;for(let i=0;i<raw.length;i+=4){if(raw[i+1]>raw[i]+40&&raw[i+1]>raw[i+2]+40){total++;if(raw[i+3]>32)opaque++;}}
 console.log(name,{greenPixels:total,visibleGreen:opaque});
}

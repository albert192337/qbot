import {execFileSync as exec} from 'node:child_process';
import path from 'node:path';
import {keyFilters,rimDespillFilter} from '../../pipeline/dist/chroma.js';
const ff=path.resolve('output/perch-diagnosis/ffmpeg.exe'),src='output/perch-diagnosis/colours.mp4';
exec(ff,['-y','-v','error','-f','lavfi','-i','color=c=0x15b235:s=128x128:r=10:d=1','-vf','drawbox=x=64:y=0:w=64:h=128:color=0x328b42:t=fill,drawbox=x=32:y=32:w=64:h=64:color=0x202040:t=fill,drawbox=x=48:y=48:w=32:h=32:color=0x7fffd4:t=fill','-c:v','libx264','-pix_fmt','yuv420p',src]);
for(const [label,vf] of Object.entries({single:keyFilters(['15b235']),multi:keyFilters(['15b235','328b42']),singleRim:keyFilters(['15b235'])+',format=yuva420p'+rimDespillFilter(),multiRim:keyFilters(['15b235','328b42'])+',format=yuva420p'+rimDespillFilter()})){
 const raw=exec(ff,['-v','error','-i',src,'-vf',vf+',format=rgba','-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1']);
 console.log(label,[...raw.subarray((64*128+64)*4,(64*128+64)*4+4)]);
}

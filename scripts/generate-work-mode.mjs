// Explicit, paid two-video trial. Reruns reuse persisted task IDs and downloads.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createArkClient, toDataUrl, selectDualKeys, toWebm, toGif, rimDespillFilter } from '../pipeline/dist/index.js';

if (process.env.QBOT_GENERATE_WORK !== '1') throw Error('Set QBOT_GENERATE_WORK=1 to authorize paid video generation.');
const dir = path.resolve(process.env.QBOT_WORK_OUTPUT || 'output/work-mode');
await fs.mkdir(dir, { recursive: true });
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const config = { ...await read('config.local.json').catch(()=>({})), ...await read(path.join(process.env.APPDATA,'@qbot/app/config.json')).catch(()=>({})) };
if (!config.arkApiKey) throw Error('Missing existing Ark key');
const ark = createArkClient({ apiKey: config.arkApiKey });
const ffmpeg = path.resolve('app/node_modules/ffmpeg-static/ffmpeg.exe');
const frame = path.join(dir,'computer-frame.png');
try { await fs.access(frame); } catch {
  if (!process.argv[2]) throw Error('Pass generated starting PNG path.');
  await fs.copyFile(process.argv[2],path.join(dir,'computer-frame-original.png'));
  // Flatten imagegen alpha onto the uniform video chroma background.
  execFileSync(ffmpeg,['-y','-f','lavfi','-i','color=c=0x00FF00:s=1280x1280','-i',process.argv[2],'-filter_complex','[0:v][1:v]overlay=0:0:format=auto,format=rgb24','-frames:v','1',frame],{stdio:'ignore'});
}
const stateFile = path.join(dir,'generation.json');
const state = await read(stateFile).catch(()=>({}));
const save = () => fs.writeFile(stateFile,JSON.stringify(state,null,2));
const motions = {
  computer_idle: '角色盘坐在笔记本电脑前安静待机，双手始终静静放在键盘上，不打字。只有极轻微呼吸和一次自然眨眼。',
  computer_typing: '角色盘坐在笔记本电脑前持续认真敲键盘，双手以很小的幅度交替轻轻打字，手指只在键盘附近小幅动作，不抬高手臂。连续打字贯穿整段。',
};
for (const [id,motion] of Object.entries(motions)) {
  if (!state[id]) {
    const prompt = `${motion} 双臂始终严格沿用首帧的左右肩膀、蓝色袖子、肘部、袖口、手腕和手掌连接关系。画面左手从画面左侧袖口自然伸向键盘左半边，右手从右侧袖口伸向右半边，手背朝上，双手不交叉，不翻腕、不变形、不增减手指，不从胸腹凭空长出手。严格保留首帧角色的五官、黑发、蓝色兜帽服装、头顶黄色小鸡和冷静表情。头部身体轮廓、笔记本电脑、机位、画面构图和大小始终固定，小鸡不跳动，不移动镜头，不缩放，不转身，不说话，不新增物体。动作幅度非常小，首尾姿态完全相同，可无缝循环。纯色鲜绿色背景保持均匀恒定，没有阴影、纹理或渐变。 --resolution 480p --duration 5 --camerafixed true`;
    state[id] = { taskId: await ark.submitVideoTask({prompt,frameDataUrl:toDataUrl(await fs.readFile(frame))}),prompt };
    await save();console.log(id+': submitted');
  }
}
await Promise.all(Object.keys(motions).map(async id => {
  const mp4 = path.join(dir,id+'.mp4');
  try { await fs.access(mp4); } catch {
    const deadline = Date.now()+20*60_000;
    while (true) {
      const task = await ark.getVideoTask(state[id].taskId);
      if(task.status==='failed')throw Error(id+': '+task.error);
      if(task.status==='succeeded') { await ark.downloadVideo(task.videoUrl,mp4);break; }
      if(Date.now()>deadline)throw Error('Timed out; rerun to resume existing task.');
      await new Promise(r=>setTimeout(r,5000));
    }
  }
  // Small uniform background samples also support this machine's older FFmpeg.
  const samples = execFileSync(ffmpeg,['-v','error','-i',mp4,'-vf','fps=1,scale=64:64','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
  const colors=[];
  for(let off=0;off+64*64*3<=samples.length;off+=64*64*3){
    for(const [x,y] of [[1,1],[62,1],[1,62],[62,62],[32,1],[32,62],[1,32],[62,32]]){
      const index=off+(y*64+x)*3;colors.push(samples.subarray(index,index+3).toString('hex'));
    }
  }
  const keys = selectDualKeys(colors);
  if(!keys.length)throw Error('No chroma background: '+id);
  // Identical canvas/transform for both clips: never normalize them independently.
  const rim = rimDespillFilter(0.5, 3).replace(/^,/, '');
  await toWebm(mp4,path.join(dir,id+'.webm'),keys,ffmpeg,undefined,0,0,rim);
  await toGif(mp4,path.join(dir,id+'.gif'),keys,ffmpeg,undefined,0,rim);
  console.log(id+': ready');
}));

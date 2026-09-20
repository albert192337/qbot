// Start the existing app against an isolated loopback room service.
const {spawn}=require('node:child_process');
const {mkdtemp,rm}=require('node:fs/promises');
const path=require('node:path');const os=require('node:os');const net=require('node:net');
const root=path.resolve(__dirname,'..');
(async()=>{
  const data=await mkdtemp(path.join(os.tmpdir(),'qbot-social-dev-'));
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const server=spawn(process.execPath,[path.join(root,'rooms/server.mjs')],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:data},stdio:['ignore','pipe','inherit'],windowsHide:true});
  let client;let stopped=false;
  const cleanup=async()=>{if(stopped)return;stopped=true;client?.kill();server.kill();if(path.dirname(path.resolve(data))===path.resolve(os.tmpdir())&&path.basename(data).startsWith('qbot-social-dev-'))await rm(data,{recursive:true,force:true});};
  process.on('SIGINT',()=>void cleanup());process.on('SIGTERM',()=>void cleanup());
  let launched=false;
  server.stdout.on('data',bytes=>{
    if(launched||!String(bytes).includes('listening'))return;launched=true;
    console.log(`一起玩开发环境已就绪：ws://127.0.0.1:${port}\n右键桌宠 → 一起玩 → 本地试演。此启动方式的真实房间列表也仅在本机测试服务中。`);
    client=spawn(process.execPath,[path.join(root,'node_modules/electron-vite/bin/electron-vite.js'),'dev'],{cwd:path.join(root,'app'),env:{...process.env,QBOT_ROOMS_URL:`ws://127.0.0.1:${port}`},stdio:'inherit',windowsHide:true});
    client.on('exit',()=>void cleanup());client.on('error',e=>{console.error(e.message);void cleanup();});
  });
  server.on('exit',()=>{if(!stopped){console.error('本地房间服务已停止');void cleanup();}});
  server.on('error',e=>{console.error(e.message);void cleanup();});
})().catch(e=>{console.error(e);process.exitCode=1});

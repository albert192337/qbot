import fs from 'node:fs/promises';
import path from 'node:path';
import { createArkClient } from '../../pipeline/dist/ark.js';
const config = {...JSON.parse(await fs.readFile('config.local.json','utf8').catch(()=>'{}')), ...JSON.parse(await fs.readFile(path.join(process.env.APPDATA,'@qbot/app/config.json'),'utf8'))};
const ark = createArkClient({apiKey:config.arkApiKey});
try {
 const task = await ark.getVideoTask('cgt-20260926211903-26s7w');
 console.log('Existing task:',task.status);
 if(task.videoUrl){await ark.downloadVideo(task.videoUrl,'output/perch-diagnosis/perch.mp4'); console.log('Original video downloaded');}
} catch(e){console.log('Read-only retrieval failed:',e.status ?? e.name);process.exitCode=1;}

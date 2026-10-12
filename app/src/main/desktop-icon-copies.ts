import {app} from 'electron';
import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {DesktopInventory, DesktopObject} from '../shared/interaction-behaviors';

interface LocalObject extends DesktopObject { location: string; iconLocation?:string; target?:string }
const publicObject=({id,name,kind}:LocalObject):DesktopObject=>({id,name,kind});
let snapshot:{at:number;items:LocalObject[];source:DesktopInventory['source']}|undefined;
let pending:Promise<typeof snapshot>|undefined;
const run=promisify(execFile);
const idFor=(location:string)=>createHash('sha256').update(process.platform==='win32'?location.toLowerCase():location).digest('hex').slice(0,24);

async function scan():Promise<NonNullable<typeof snapshot>> {
  if(process.platform==='win32') {
    try {
      // Fixed program: model/user names are never interpolated into shell code.
      const script=`[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$desktopShell=New-Object -ComObject Shell.Application
$shortcutShell=New-Object -ComObject WScript.Shell
$desktopItems=@($desktopShell.NameSpace(0).Items() | ForEach-Object {
 $iconLocation='';$target=''
 if($_.IsFileSystem -and $_.Path.EndsWith('.lnk',[StringComparison]::OrdinalIgnoreCase)){try{$shortcut=$shortcutShell.CreateShortcut($_.Path);$iconLocation=$shortcut.IconLocation;$target=$shortcut.TargetPath}catch{}}
 [PSCustomObject]@{name=$_.Name;location=$_.Path;folder=$_.IsFolder;filesystem=$_.IsFileSystem;iconLocation=$iconLocation;target=$target}
})
ConvertTo-Json -InputObject $desktopItems -Compress`;
      const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:6000,maxBuffer:4*1024*1024,encoding:'utf8'});
      const rows=JSON.parse(stdout.replace(/^\uFEFF/,''));
      if(!Array.isArray(rows))throw Error('Invalid desktop snapshot');
      const items:LocalObject[]=rows.filter(r=>typeof r.name==='string'&&typeof r.location==='string'&&r.location&&r.name.toLowerCase()!=='desktop.ini').map(r=>({id:idFor(r.location),name:r.name,location:r.location,iconLocation:r.iconLocation,target:r.target,kind:!r.filesystem?'virtual':/\.(lnk|url)$/i.test(r.location)?'shortcut':r.folder?'folder':'file'}));
      return {at:Date.now(),items,source:'shell'};
    }catch{/* Explicit partial fallback, never invented object names. */}
  }
  const roots=[app.getPath('desktop'),...(process.platform==='win32'&&process.env.PUBLIC?[path.join(process.env.PUBLIC,'Desktop')]:[])];
  const items:LocalObject[]=[];let readable=false;
  for(const root of new Set(roots))try{
    const entries=await readdir(root,{withFileTypes:true});readable=true;
    for(const e of entries)if(!e.name.startsWith('.')&&e.name.toLowerCase()!=='desktop.ini'){
      const location=path.join(root,e.name),shortcut=/\.(lnk|url)$/i.test(e.name);
      items.push({id:idFor(location),name:shortcut?e.name.replace(/\.(lnk|url)$/i,''):e.name,location,kind:shortcut?'shortcut':e.isDirectory()?'folder':'file'});
    }
  }catch{/* Other desktop root may still be readable. */}
  return {at:Date.now(),items,source:readable?'directories':'unavailable'};
}
export async function desktopInventory(fresh=false):Promise<DesktopInventory> {
  if(fresh||!snapshot||Date.now()-snapshot.at>30000){
    if(!pending)pending=scan().then(value=>snapshot=value).finally(()=>{pending=undefined;});
    await pending;
  }
  return {items:(snapshot?.items??[]).map(publicObject),source:snapshot?.source??'unavailable'};
}
async function iconImage(item:LocalObject):Promise<string>{
  // Resolve only OS shortcut metadata to obtain the correct application icon; never launch it.
  const iconLocation=item.iconLocation?.replace(/,\s*-?\d+\s*$/,'').replace(/^"|"$/g,'').replace(/%([^%]+)%/g,(value,key)=>process.env[key]??value);
  for(const location of [...new Set([iconLocation,item.target,item.location].filter((s):s is string=>!!s))])try{
    const icon=await app.getFileIcon(location,{size:'normal'});if(!icon.isEmpty())return icon.toDataURL();
  }catch{}
  return '';
}
/** Only IDs from the current OS inventory, never model supplied paths. */
export async function desktopIconCopy(id:string):Promise<{object:DesktopObject;image:string}|null>{
  await desktopInventory(true);
  const item=snapshot?.items.find(o=>o.id===id);if(!item)return null;
  return {object:publicObject(item),image:await iconImage(item)};
}
/** Pair effects transmit bitmaps only, never local paths or file contents. */
export async function readDesktopIconCopies():Promise<string[]> {
  await desktopInventory();
  return (await Promise.all((snapshot?.items??[]).slice(0,4).map(iconImage))).filter(Boolean);
}

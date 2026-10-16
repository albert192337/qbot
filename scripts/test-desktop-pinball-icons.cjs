// Windows integration regression: extract actual Shell items, then exercise the
// same IPC and collision renderer with an isolated wallet/window.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/desktop-pinball');
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(__dirname,'desktop-pinball-native.cs'),'utf8');
const snapshotPath=path.join(out,'shell-icon-snapshot.json'),script=path.join(out,'verify-shell-icons.ps1');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
fs.writeFileSync(script,'\uFEFF'+`$ErrorActionPreference='Stop'\nAdd-Type -ReferencedAssemblies System.Core,Microsoft.CSharp,System.Web.Extensions,System.Drawing -TypeDefinition @'\n${source}\n'@\n$json=New-Object System.Web.Script.Serialization.JavaScriptSerializer\n$json.MaxJsonLength=16777216\n[IO.File]::WriteAllText(${quote(snapshotPath)},$json.Serialize([PinballDesktop]::Snapshot()))\n`);
const probe=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script],{cwd:root,windowsHide:true,encoding:'utf8',timeout:30000});
assert.equal(probe.status,0,probe.stderr||probe.error?.message);
const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const examples=['POPO云文档','微信','TapTap','王者荣耀世界','竞拍之王'];
const selected=examples.map(name=>{const item=snapshot.icons.find(p=>p.name===name);assert.ok(item?.image,'Missing Shell artwork: '+name);return{name:item.name,image:item.image};});
// Web shortcuts must retain their per-shortcut artwork, not share one globe.
assert.notEqual(selected[0].image,selected[4].image);
assert.equal(new Set(selected.map(p=>p.image)).size,examples.length);
fs.writeFileSync(path.join(out,'shell-icon-fixtures.json'),JSON.stringify(selected));
for(let i=0;i<selected.length;i++)fs.writeFileSync(path.join(out,'shell-icon-'+i+'.png'),Buffer.from(selected[i].image.split(',')[1],'base64'));
console.log('Shell extraction: '+snapshot.icons.filter(p=>p.image).length+' icons; custom URL/LNK samples distinct.');
const ui=spawnSync(process.execPath,[path.join(__dirname,'preview-desktop-pinball.cjs'),'--verify','--shell-icons'],{cwd:root,windowsHide:true,stdio:'inherit',timeout:90000});
process.exitCode=ui.status??1;

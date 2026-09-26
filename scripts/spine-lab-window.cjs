const {app,BrowserWindow}=require('electron');
const path=require('node:path');
app.setPath('userData',path.resolve(__dirname,'../output/spine-lab/electron-profile'));
app.whenReady().then(()=>{const win=new BrowserWindow({width:1220,height:880,show:process.env.SPINE_LAB_SHOW==='1',webPreferences:{contextIsolation:true,nodeIntegration:false}});win.loadURL(process.env.SPINE_LAB_URL||'http://127.0.0.1:24361');});
app.on('window-all-closed',()=>app.quit());

const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('gardenLab',{
 getState:()=>ipcRenderer.invoke('lab:get'),setState:s=>ipcRenderer.send('lab:set',s),
 grow:()=>ipcRenderer.send('lab:grow'),toggleDesktop:()=>ipcRenderer.invoke('lab:desktop'),closeDesktop:()=>ipcRenderer.send('lab:close-desktop'),
 onDesktopClick:fn=>ipcRenderer.on('lab:desktop-click',(_e,data)=>fn(data)),
 onState:fn=>ipcRenderer.on('lab:state',(_e,s)=>fn(s)),onGrow:fn=>ipcRenderer.on('lab:grow',()=>fn()),onDesktop:fn=>ipcRenderer.on('lab:desktop-state',(_e,s)=>fn(s)),
});

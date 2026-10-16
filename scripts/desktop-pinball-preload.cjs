const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('pinball',{
 get:()=>ipcRenderer.invoke('pinball:get'),
 icon:id=>ipcRenderer.invoke('pinball:icon',id),
 launch:(x,count=1)=>ipcRenderer.invoke('pinball:launch',x,count),
 equip:id=>ipcRenderer.invoke('pinball:equip',id),
 assign:(id,type)=>ipcRenderer.invoke('pinball:assign',id,type),
 rects:r=>ipcRenderer.send('pinball:rects',r),
 close:()=>ipcRenderer.send('pinball:close'),
 subscribe:fn=>{const listener=(_e,data)=>fn(data);ipcRenderer.on('pinball:state',listener);return()=>ipcRenderer.removeListener('pinball:state',listener);},
});
contextBridge.exposeInMainWorld('qbot',{pet:{getCursor:()=>ipcRenderer.invoke('pinball:cursor')}});

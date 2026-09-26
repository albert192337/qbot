require('../../out/preload/index.js');
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('roomlab',{
  resize:(width,editing)=>ipcRenderer.send('roomlab:resize',width,editing),
  pin:value=>ipcRenderer.send('roomlab:pin',value),
});

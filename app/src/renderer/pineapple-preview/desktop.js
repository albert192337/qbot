// Each desktop specimen owns an immutable appearance snapshot and a private channel.
export function desktopPreview({getState,applyState,render}){
 const params=new URLSearchParams(location.search),desktop=params.get('desktop')==='1';
 const children=new Map(),button=document.getElementById('desktop-toggle'),recall=document.getElementById('desktop-recall');
 const refresh=()=>{for(const [id,item] of children)if(item.child.closed){item.channel.close();children.delete(id);}button.textContent='添加一颗到桌面';recall.textContent='全部收回（'+children.size+'）';recall.disabled=children.size===0;document.body.dataset.desktopCount=String(children.size);};
 const closeAll=()=>{for(const item of children.values()){if(!item.child.closed)item.child.close();item.channel.close();}children.clear();refresh();};
 let receiver;
 if(desktop){document.body.classList.add('desktop-preview');document.getElementById('desktop-return').onclick=()=>window.close();receiver=new BroadcastChannel('fruit-study-'+params.get('channel'));receiver.onmessage=({data})=>{if(data?.type==='state'){applyState(data.state);render();}};}
 button.onclick=()=>{const id=crypto.randomUUID(),state=structuredClone(getState()),channel=new BroadcastChannel('fruit-study-'+id),url=new URL(location.href);url.searchParams.set('desktop','1');url.searchParams.set('channel',id);url.hash='';channel.onmessage=({data})=>{if(data?.type==='ready')channel.postMessage({type:'state',state});};const child=window.open(url.href,'fruit-desktop-'+id);if(child)children.set(id,{child,channel});else channel.close();refresh();};
 recall.onclick=closeAll;refresh();const timer=setInterval(refresh,500);
 addEventListener('pagehide',()=>{clearInterval(timer);closeAll();receiver?.close();},{once:true});
 return {desktop,send(){},ready(){receiver?.postMessage({type:'ready'});}};
}

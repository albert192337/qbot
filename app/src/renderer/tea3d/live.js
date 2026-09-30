/** Connect the managed room to the same active-character and member feeds as 2D. */
export async function connectLiveRoom({actors,create,remove,stand,suspend,driver:Driver,status}) {
 const api=window.qbot;let disposed=false,revision=0,fingerprint='',hiddenMembers=[],hidden=false,activity='idle';
 async function refresh(){const ticket=++revision;
 try{const [active,peers]=await Promise.all([api.characters.getActive(),api.rooms.getSceneMembers()]);if(disposed||ticket!==revision)return;
 const members=[...(active?[{id:'self',character:active,nickname:active.manifest.name,mode:activity}]:[]),...peers].filter(m=>m.character?.manifest&&!hiddenMembers.includes(m.id));
 const key=JSON.stringify(members.map(m=>[m.id,m.character]));
 if(key!==fingerprint){for(const a of [...actors])remove(a);fingerprint=key;
 members.forEach((m,i)=>{const a=create(i,m.character.dirId,m.character);a.memberId=m.id;a.mesh.name=m.nickname||'角色';a.groundX=members.length===1?0:-3.4+i*6.8/(members.length-1);stand(a);
 a.driver=new Driver({play:(action,loop)=>{a.action=action;if(hidden||document.hidden)return;if(a.source.kind==='Spine')a.player.play(action,loop);else if(loop)a.player.playLooping(action);else a.player.play(action);}});
 a.driver.setCharacter(a.source.available,m.character.manifest.agentActions);});}
 members.forEach(m=>actors.find(a=>a.memberId===m.id)?.driver.applyState({mode:m.mode||'idle',action:m.action}));
 document.body.dataset.members=String(members.length);status(members.length+' 位角色 · 双击房间打开聊天');if(hidden)suspend(true);
 }catch(e){status('角色状态暂时未能更新：'+e.message);}}
 const unsubs=[api.characters.onActivated(()=>void refresh()),api.rooms.onSceneChanged(()=>void refresh()),
 api.agent.onStatus(s=>{activity=s.activity;const a=actors.find(a=>a.memberId==='self');a?.driver.applyState({mode:activity});}),
 api.desktop.onChanged(s=>{hidden=s.hidden;hiddenMembers=s.hiddenMembers;suspend(hidden);void refresh();})];
 unsubs.push(api.behaviorAction.onPlay(({action,loops})=>{const a=actors.find(a=>a.memberId==='self');if(!a||hidden||!a.source.available.includes(action))return;
 let remaining=Math.max(1,loops||1);a.onEnded=()=>{if(--remaining>0){if(a.source.kind==='Spine')a.player.play(action,false);else a.player.playOnce(action);}else{a.onEnded=null;a.driver.dragEnd();}};
 if(action==='idle'){a.onEnded=null;a.driver.dragEnd();}else if(a.source.kind==='Spine')a.player.play(action,false);else a.player.playOnce(action);
 }));
 const stage=document.querySelector('#stage'),chat=()=>api.rooms.open();stage.addEventListener('dblclick',chat);
 try{const initial=await api.agent.getStatus();activity=initial.activity;}catch{}
 await refresh();return()=>{disposed=true;revision++;unsubs.forEach(fn=>fn());stage.removeEventListener('dblclick',chat);};
}

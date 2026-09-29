import{c as re}from"./index-DPb5_7o8.js";const be=`<!-- 列表视图 -->
<div
  id="list-view"
  style="flex: 1; display: flex; flex-direction: column; min-height: 0"
>
  <div id="topbar">
    <h1>联机空间</h1>
    <input
      id="nickname"
      aria-label="公开昵称"
      placeholder="昵称"
      maxlength="16"
    />
    <button id="create-btn">开房</button>
  </div>
  <div id="tabs">
    <button type="button" class="tab on" data-kind="">全部</button>
    <button type="button" class="tab" data-kind="idle">摸鱼</button>
    <button type="button" class="tab" data-kind="study">自习</button>
    <button type="button" class="tab" data-kind="night">夜猫</button>
    <button type="button" class="tab" data-kind="coop">联机</button>
    <input
      id="search"
      aria-label="搜索房间"
      placeholder="搜房名 / 8 位房号"
      maxlength="24"
    />
    <button id="join-id" class="ghost">按房号敲门</button
    ><button id="refresh-btn" class="ghost">刷新</button>
  </div>
  <div id="list"></div>
</div>

<!-- 房内视图 -->
<div id="room-view">
  <div id="room-head">
    <span id="room-title"></span>
    <button id="settings-btn" class="ghost" style="display: none">设置</button>
    <button id="leave-btn" class="ghost">退出房间</button>
  </div>
  <div id="display-mode-bar">
    <div class="display-mode-copy">
      <div class="display-mode-title">宠物显示位置</div>
      <div id="display-mode-hint">只改变本机画面，不会退出或重连房间</div>
    </div>
    <div class="mode-switch" role="group" aria-label="联机空间展示模式">
      <button type="button" data-display-mode="room" aria-pressed="false">
        开启房间背景
      </button>
      <button type="button" data-display-mode="desktop" aria-pressed="false">
        关闭房间背景
      </button>
    </div>
  </div>
  <div id="members"></div>
  <div id="chat"></div>
  <div id="composer">
    <input
      id="chat-input"
      aria-label="聊天内容"
      placeholder="说点什么…"
      maxlength="200"
    />
    <button id="send-btn">发送</button>
  </div>
</div>

<div id="status"></div>

<!-- 弹层：开房 / 房间设置 / 发言须知 -->
<div id="modal"><div class="sheet" id="sheet"></div></div>
`,W={idle:"摸鱼房",study:"自习室",night:"夜猫房",coop:"联机房"},pe={idle:"摸鱼中",thinking:"在思考",working:"在敲代码",waiting:"等回应",done:"刚搞定",error:"出错了",music:"听歌中"},fe=200;async function he(k){k.innerHTML=be;const P=[];function w(e,t){P.push(e(t))}const l=e=>k.querySelector(`[id="${e}"]`),X=l("list-view"),Z=l("room-view"),O=l("list"),z=l("members"),f=l("chat"),G=l("status"),V=l("nickname"),K=l("search"),S=l("chat-input"),Q=l("room-title"),U=l("settings-btn"),Y=[...k.querySelectorAll("[data-display-mode]")],x=l("modal"),m=l("sheet");let I=[],N=new Set,_=null,y="",r=null,L="desktop",A=!1,g=[];const $=[];let q=!1,M=null;function c(e,t=!1){G.textContent=e,G.classList.toggle("error",t)}function E(e){return(e instanceof Error?e.message:String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/,"")}function ee(e){const t=new Date(e);return`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}function C(){const e=M;M=null,e?.(),x.classList.remove("on"),m.removeAttribute("role"),m.removeAttribute("aria-modal"),m.replaceChildren()}function D(){for(const e of Y){const t=e.dataset.displayMode===L;e.classList.toggle("on",t),e.setAttribute("aria-pressed",String(t)),e.disabled=A}}async function ce(e){if(!(A||e===L)){A=!0,D();try{L=await window.qbot.rooms.setDisplayMode(e),c(L==="room"?"房友已进入房间场景":"房友已回到透明桌面")}catch(t){c(E(t),!0)}finally{A=!1,D()}}}k.addEventListener("keydown",e=>{e.key==="Escape"&&!e.isComposing&&x.classList.contains("on")&&(e.preventDefault(),e.stopPropagation(),C())}),x.addEventListener("click",e=>{e.target===x&&C()});function H(){const e=K.value.trim().toLowerCase(),t=I.filter(n=>(!_||n.kind===_)&&(!e||n.name.toLowerCase().includes(e))).sort((n,o)=>{const a=N.has(n.roomId)?1:0,i=N.has(o.roomId)?1:0;return a!==i?i-a:n.online!==o.online?o.online-n.online:o.lastActiveAt-n.lastActiveAt});if(O.replaceChildren(),t.length===0){const n=document.createElement("div");n.id="empty",n.textContent=I.length===0?`还没有联机房间
开一个，等人来串门`:"没有符合条件的房间",n.style.whiteSpace="pre-line",O.appendChild(n);return}for(const n of t){const o=document.createElement("div");o.className="room";const a=document.createElement("button");a.type="button",a.setAttribute("aria-label",`收藏 ${n.name}`),a.className=`fav${N.has(n.roomId)?" on":""}`,a.textContent="★",a.title="收藏（置顶）",a.addEventListener("click",async s=>{s.stopPropagation();try{N=new Set(await window.qbot.rooms.toggleFavorite(n.roomId)),H()}catch(p){c(E(p),!0)}});const i=document.createElement("div");i.className="room-main";const u=document.createElement("div");u.className="room-name",u.textContent=n.name,u.title=n.name;const v=document.createElement("div");v.className="room-meta";const h=document.createElement("span");h.className="kind",h.textContent=W[n.kind]??n.kind;const b=document.createElement("span");b.className=`dot${n.online>0?"":" off"}`,v.append(h,b,document.createTextNode(`${n.online}/${n.capacity} 在线 · 常客 ${n.members}`)),i.append(u,v);const d=document.createElement("button");d.textContent="进入",d.addEventListener("click",()=>{oe(n.roomId)}),o.append(a,i,d),O.appendChild(o)}}async function F(){c("加载中…");try{I=await window.qbot.rooms.list(),c(`${I.length} 个联机房间`)}catch(e){c(E(e),!0),I=[]}H()}function R(e){r&&r.roomId!==e.roomId&&(g=[],$.length=0),r=e,X.style.display="none",Z.style.display="flex",Q.textContent=`${e.name} (${e.members.filter(t=>t.online).length}/${e.capacity})`,U.style.display=e.ownerId===y?"":"none",j(),J(),S.focus()}function T(){r=null,g=[],J(),Z.style.display="none",X.style.display="flex",F()}function j(){if(z.replaceChildren(),!r)return;const e=[...r.members].sort((t,n)=>Number(n.online)-Number(t.online)||t.joinedAt-n.joinedAt);for(const t of e)z.appendChild(de(t));Q.textContent=`${r.name} (${r.members.filter(t=>t.online).length}/${r.capacity})`}function de(e){const t=document.createElement("div");t.className=`member${e.online?"":" offline"}`,t.dataset.memberId=e.memberId;const n=document.createElement("div");n.className="avatar",n.textContent=e.nickname.slice(0,1)||"友";const o=document.createElement("div"),a=document.createElement("div");a.className="member-name",a.textContent=e.memberId===y?`${e.nickname}（你）`:e.nickname;const i=document.createElement("div");return i.className="member-mode",i.textContent=e.online?pe[e.mode??"idle"]??"在线":"不在",o.append(a,i),t.append(n,o),e.memberId!==y&&e.online&&(t.title="点一下打个招呼",t.addEventListener("click",()=>{window.qbot.rooms.wave(e.memberId),B(`你跟 ${e.nickname} 打了招呼`)})),r?.ownerId===y&&e.memberId!==y&&t.addEventListener("contextmenu",async u=>{u.preventDefault(),await re(k,`把 ${e.nickname} 移出房间？之后 ta 无法再进入。`)&&window.qbot.rooms.kick(e.memberId).catch(v=>c(E(v),!0))}),t}function J(){f.replaceChildren();for(const e of g)f.appendChild(te(e));f.scrollTop=f.scrollHeight}function te(e){const t=document.createElement("div"),n=e.memberId===y;t.className=`msg${n?" mine":""}`,t.dataset.msgId=e.id;const o=document.createElement("div");o.className="msg-who",o.textContent=n?ee(e.at):`${e.nickname} · ${ee(e.at)}`;const a=document.createElement("div");if(a.className="bubble",a.textContent=e.text,t.append(o,a),n||t.addEventListener("contextmenu",async i=>{i.preventDefault(),await re(k,`举报 ${e.nickname} 的这条发言？
举报只会记录下来，不会自动删除或封禁。`)&&(window.qbot.rooms.report(e.id),c("已记录你的举报"))}),n){const i=document.createElement("button");i.type="button",i.className="msg-del",i.textContent="撤回",i.addEventListener("click",()=>window.qbot.rooms.deleteChat(e.id)),t.appendChild(i)}return t}function B(e){const t=document.createElement("div");t.className="sys",t.textContent=e,f.appendChild(t),f.scrollTop=f.scrollHeight}async function ne(){try{return(await window.qbot.settings.get()).roomsChatConsent?!0:await le(await window.qbot.rooms.isSecure())?(await window.qbot.settings.set({roomsChatConsent:!0}),!0):!1}catch(e){return c(E(e),!0),!1}}async function oe(e){if(!q){q=!0;try{if(!await ne())return;c("进入房间…"),R(await window.qbot.rooms.join(e)),c("")}catch(t){c(E(t),!0)}finally{q=!1}}}function le(e){return new Promise(t=>{M=()=>t(!1),m.replaceChildren();const n=document.createElement("h2");n.textContent="进入联机空间前";const o=document.createElement("div");o.className="hint",o.textContent=`联机空间里，你的发言会发送到房间服务器，房内所有人都能看到，并且会保留最近 50 条供后来的人查看。

桌宠状态（在思考/在敲代码/在开会/在听歌等）和桌宠当前实际举起的牌面文字也会实时同步给房友。这意味着手动输入的牌子、工作完成提示，以及正在播放的歌曲名和歌手都可能被房友看到。牌面文字只随在线状态实时转发，不写入房间记录；收牌或离线后不再保留。

没有显示在牌子上的具体项目、文件名、工作目录、AI 对话正文和 transcript 都不会同步。

进房后，你的角色昵称、人设和桌宠形象（动作动画）会缓存到房间服务器，供房友桌面显示；可在「设置」里关闭「展示我的桌宠形象」。关闭后只停止上传形象，状态和牌面仍会同步。`+(e?"":`

⚠ 当前与房间服务器的连接未加密，同网络下他人可能看到你的发言和牌面文字。`),o.style.whiteSpace="pre-line";const a=document.createElement("div");a.className="row";const i=document.createElement("button");i.className="ghost",i.textContent="再想想",i.addEventListener("click",()=>{C(),t(!1)});const u=document.createElement("button");u.textContent="知道了，进房",u.addEventListener("click",()=>{M=null,C(),t(!0)}),a.append(i,u),m.append(n,o,a),x.classList.add("on"),m.setAttribute("role","dialog"),m.setAttribute("aria-modal","true"),m.setAttribute("aria-label","朋友留言桌")})}async function me(){if(q)return;q=!0;const e=await ne();if(q=!1,!e)return;m.replaceChildren();const t=document.createElement("h2");t.textContent="开一个房间";const n=(d,s)=>{const p=document.createElement("div");p.className="field";const se=document.createElement("label");return se.textContent=d,p.append(se,s),p},o=document.createElement("input");o.placeholder="房间名",o.maxLength=24;const a=document.createElement("select");for(const[d,s]of Object.entries(W)){const p=document.createElement("option");p.value=d,p.textContent=s,a.appendChild(p)}const i=document.createElement("select");for(let d=4;d<=12;d+=2){const s=document.createElement("option");s.value=String(d),s.textContent=`${d} 人`,d===8&&(s.selected=!0),i.appendChild(s)}const u=document.createElement("select");for(const[d,s]of[["1","公开（出现在房间列表）"],["0","私密（只有拿到房号的人能进）"]]){const p=document.createElement("option");p.value=d,p.textContent=s,u.appendChild(p)}const v=document.createElement("div");v.className="row";const h=document.createElement("button");h.className="ghost",h.textContent="取消",h.addEventListener("click",C);const b=document.createElement("button");b.textContent="开房",b.addEventListener("click",async()=>{const d=o.value.trim();if(!d){o.focus();return}b.disabled=!0;try{await window.qbot.rooms.create({name:d,kind:a.value,capacity:Number(i.value),listed:u.value==="1"}),C()}catch(s){c(E(s),!0),b.disabled=!1}}),v.append(h,b),m.append(t,n("房间名",o),n("类型",a),n("容量",i),n("可见性",u),v),x.classList.add("on"),m.setAttribute("role","dialog"),m.setAttribute("aria-modal","true"),m.setAttribute("aria-label","朋友留言桌"),o.focus()}function ue(){if(!r)return;m.replaceChildren();const e=document.createElement("h2");e.textContent="房间设置";const t=document.createElement("input");t.value=r.name,t.maxLength=24;const n=document.createElement("select");for(const[b,d]of Object.entries(W)){const s=document.createElement("option");s.value=b,s.textContent=d,b===r.kind&&(s.selected=!0),n.appendChild(s)}const o=document.createElement("select");for(const[b,d]of[["1","公开"],["0","私密"]]){const s=document.createElement("option");s.value=b,s.textContent=d,b==="1"===r.listed&&(s.selected=!0),o.appendChild(s)}const a=(b,d)=>{const s=document.createElement("div");s.className="field";const p=document.createElement("label");return p.textContent=b,s.append(p,d),s},i=document.createElement("div");i.className="hint",i.textContent=`房号 ${r.roomId}（私密房把房号发给朋友即可进入）`;const u=document.createElement("div");u.className="row";const v=document.createElement("button");v.className="ghost",v.textContent="取消",v.addEventListener("click",C);const h=document.createElement("button");h.textContent="保存",h.addEventListener("click",async()=>{try{await window.qbot.rooms.update({name:t.value.trim(),kind:n.value,listed:o.value==="1"}),C()}catch(b){c(E(b),!0)}}),u.append(v,h),m.append(e,a("房间名",t),a("类型",n),a("可见性",o),i,u),x.classList.add("on"),m.setAttribute("role","dialog"),m.setAttribute("aria-modal","true"),m.setAttribute("aria-label","朋友留言桌")}function ae(){const e=S.value.trim();if(!e)return;const t=Date.now(),n=$.filter(a=>t-a<6e4),o=$[$.length-1];if(o&&t-o<3e3){c(`慢一点，${Math.ceil((3e3-(t-o))/1e3)} 秒后再说`,!0);return}if(n.length>=10){c("说得太快了，缓一分钟",!0);return}window.qbot.rooms.chat(e.slice(0,fe)),$.push(t),S.value="",c("")}w(window.qbot.rooms.onStatus,e=>{y=e.memberId??y,e.phase==="in-room"&&e.room?R(e.room):e.phase==="online"&&r?T():e.phase==="off"&&e.error&&(c(e.error,!0),r&&T())}),w(window.qbot.rooms.onHistory,e=>{g=e,J()}),w(window.qbot.rooms.onChat,e=>{g=[...g,e].slice(-50);const t=f.scrollHeight-f.scrollTop-f.clientHeight<40;f.appendChild(te(e)),t&&(f.scrollTop=f.scrollHeight)}),w(window.qbot.rooms.onChatDeleted,e=>{g=g.filter(t=>t.id!==e),f.querySelector(`[data-msg-id="${CSS.escape(e)}"]`)?.remove()}),w(window.qbot.rooms.onMemberIn,e=>{if(!r)return;const t=r.members.findIndex(n=>n.memberId===e.memberId);t>=0?r.members[t]=e:r.members.push(e),j(),B(`${e.nickname} 来了`)}),w(window.qbot.rooms.onMemberOut,e=>{if(!r)return;const t=r.members.find(n=>n.memberId===e);t&&(t.online=!1,t.mode=void 0),j(),t&&B(`${t.nickname} 走了`)}),w(window.qbot.rooms.onPresence,e=>{if(!r)return;const t=r.members.find(n=>n.memberId===e.memberId);t&&(t.online=!0,t.mode=e.mode,t.action=e.action,j())}),w(window.qbot.rooms.onWave,e=>{B(`${e.fromNickname} 跟你打招呼`)}),P.push(window.qbot.rooms.onKicked(()=>{c("你被移出了这个房间",!0),T()})),w(window.qbot.rooms.onError,e=>c(e,!0)),w(window.qbot.rooms.onDisplayModeChanged,e=>{L=e,D()}),l("create-btn").addEventListener("click",()=>{me()}),l("join-id").addEventListener("click",()=>{const e=K.value.trim();if(!/^[0-9A-Z]{8}$/.test(e)){c("在搜索框填入 8 位房号，再敲门。",!0);return}oe(e)}),l("refresh-btn").addEventListener("click",()=>{F()}),l("leave-btn").addEventListener("click",()=>{window.qbot.rooms.leave().then(T).catch(e=>c(E(e),!0))}),U.addEventListener("click",ue),l("send-btn").addEventListener("click",ae),S.addEventListener("keydown",e=>{e.key==="Enter"&&!e.isComposing&&ae()}),K.addEventListener("input",H);for(const e of Y)e.addEventListener("click",()=>{const t=e.dataset.displayMode;ce(t)});for(const e of k.querySelectorAll(".tab"))e.addEventListener("click",()=>{for(const t of k.querySelectorAll(".tab"))t.classList.remove("on");e.classList.add("on"),_=e.dataset.kind||null,H()});V.addEventListener("change",()=>{const e=V.value.trim().slice(0,16);window.qbot.settings.set({nickname:e,marketNickname:e}).then(()=>c("昵称已保存（下次连接生效）")).catch(t=>c(E(t),!0))});const ie=async()=>{const e=await window.qbot.settings.get();V.value=e.nickname??e.marketNickname??"",N=new Set(e.roomsFavorites??[]),L=await window.qbot.rooms.getDisplayMode(),D();const t=await window.qbot.rooms.getCache();y=t.status.memberId??"",t.status.phase==="in-room"&&t.room?(g=t.chat,R(t.room)):await F()};return await ie(),{onVisible:ie,unmount:()=>P.forEach(e=>e())}}export{he as mountView};

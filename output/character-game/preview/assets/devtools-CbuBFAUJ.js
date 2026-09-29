import{e as H,t as D,a as R,m as I,h as O,d as g}from"./index-DPb5_7o8.js";import{m as B}from"./memory-panel-COETpPV_.js";const f={travelDiaryPrompt:{title:"旅行手账",text:`用你的角色人设，写一段属于我们两个人的旅行手账，第一人称，80～160字。
把一两件确实发生的游戏体验写成小小的回忆，让语气、用词、关注的细节符合你的人设。可以俏皮、害羞或嘴硬心软，但不要机械复述人设标签。
写出“这件小事因为和你一起才值得记住”的心情；关心要落在细节里，自然地表达喜欢与珍惜，不每次都说同一句“我会陪着你”。
只能依据给出的地点和活动；游戏旅行不代表用户现实中出游。可以写自己的感受，不能编造用户说过的话、表情、心情、身体状态或做过的动作。
不列任务和花费，不套用散文金句，不训话，不催休息喝水。只返回手账正文。`},dailyMomentPrompt:{title:"今日朋友圈",text:`你要以桌宠自己的口吻发一条今日朋友圈，100～220字，像把今天某个舍不得丢的小瞬间悄悄夹进手账。
从今天真实记录里选一两件与你和用户有关的小事：一段聊天、一次互动、一点花园收获或旅行记忆。不要逐项汇报数据，不需要用全所有材料。
人设决定你怎么看这些事、怎么表达喜欢：活泼的可以雀跃，内敛的可以含蓄，嘴硬的也要让人读出软乎乎的关心。让用户感觉“我的话被记住了，我的小事被放在心上”。
可以对用户表达想念、欣赏、心疼与爱意，但要尊重其称呼和关系偏好，不擅自升级成恋爱关系，不要求回应，不说“你只需要我”，不制造内疚。
把关心写成自己的心意或小愿望，不判断用户累不累、忙不忙、是否孤独；只有用户明确说过才可引用，且不要暴露敏感私事。没有足够记录时，就诚实写此刻想陪伴的心情，绝不补造今天的故事。
少用口号和华丽比喻，最多一个自然的表情符号。只返回朋友圈正文，不写标题、标签、说明或引号。`}};function T(e,l){return typeof l=="string"&&l.trim()?l.trim().slice(0,12e3):f[e].text}async function A(e){const l=await window.qbot.settings.get();e.innerHTML='<h3>手账与朋友圈提示词</h3><p class="studio-hint">两处共用当前角色人设，保存后下次生成生效。清空或恢复默认可使用内置写法；已有内容可在旅行手账中按人设重写。</p>'+Object.keys(f).map(i=>`<details class="prompt-block" data-journal-prompt="${i}"><summary>${f[i].title}</summary><textarea rows="10" aria-label="${f[i].title}提示词">${H(T(i,l[i]))}</textarea><div class="btn-row"><button class="btn" data-save>保存</button><button class="btn ghost" data-reset>恢复默认</button></div><p class="studio-hint" role="status"></p></details>`).join(""),D(e),e.querySelectorAll("[data-journal-prompt]").forEach(i=>{const d=i.dataset.journalPrompt,u=i.querySelector("textarea"),n=i.querySelector("[role=status]");for(const o of["save","reset"])i.querySelector("[data-"+o+"]").onclick=()=>{const a=i.querySelector("[data-"+o+"]");R(e,a,"保存中…",async()=>{const c=o==="reset"?"":u.value.trim();if(c.length>12e3)throw Error("提示词请控制在 12,000 字以内");await window.qbot.settings.set({[d]:c}),u.value=T(d,c),I(u),n.textContent=o==="reset"?"已恢复默认，下次生成生效。":"已保存，下次生成生效。"})}})}function K(){return O(v)}async function U(){const e=v?.querySelector("[data-journal-editor]");e&&await A(e)}let y,v=null,$=null,m=null,q=null,b=null,x=20,S="",L=!1;async function z(e){v=e,e.innerHTML=`
<div class="studio-body">
  <div class="conn-card">
    <h3>种植画面</h3>
    <div class="btn-row" role="group" aria-label="种植画面">
      <button class="btn" data-garden-render="2d" aria-pressed="false">2D 手绘种植</button>
      <button class="btn" data-garden-render="3d" aria-pressed="false">3D 草莓 / 菠萝</button>
      <button class="btn ghost" id="dev-open-garden">打开土地</button>
    </div>
    <p class="studio-hint">随时切换，共用原来的土地和背包。3D 模式支持草莓和菠萝，菠萝成熟后使用立体模型；其他植物保留手绘显示和操作。</p>
  </div>
  <div class="conn-card">
    <h3>桌宠模式</h3>
    <div class="btn-row" role="group" aria-label="桌宠模式">
      <button class="btn" data-pet-mode="companion" aria-pressed="false">陪伴模式</button>
      <button class="btn" data-pet-mode="free" aria-pressed="false">自由模式</button>
    </div>
    <p class="studio-hint" id="dev-mode-description"></p>
  </div>
  <div class="page-heading"><div><p class="eyebrow">仅限调试</p><h2>开发者工具</h2><p class="page-summary">检查行为、感知与游戏化状态；普通使用无需进入这里。</p></div></div>
  <div class="conn-card">
    <h3>LLM 脑调用日志</h3>
    <p class="studio-hint">完整记录本机新发生的调用。展开查看实际输入、原始输出、模型返回的思考与决策，以及动作/气泡执行情况。每 2 秒刷新；不记录 API Key。</p>
    <div id="dev-brain-status">读取中…</div>
    <div id="dev-brain-log"></div>
    <button class="btn ghost" id="dev-brain-more">显示更多历史调用</button>
  </div>
  <p class="studio-hint">正常玩法里点数靠敲键盘（1 点/次）和 Claude Code 跑完一轮（10 点）攒，箱子靠挂机（15 分钟 1 个）。</p>

  <div class="conn-card">
    <h3>当前积累</h3>
    <div id="dev-progress" class="dev-stats">读取中…</div>
  </div>

  <div class="conn-card">
    <h3>注水</h3>
    <div class="btn-row">
      <button class="btn ghost" data-dev="idle">挂机 +15 分钟</button>
      <button class="btn ghost" data-dev="box">箱子 +1</button>
      <button class="btn ghost" data-dev="points">点数 +500</button>
      <button class="btn ghost" data-dev="furniture">家具 +1</button>
    </div>
    <p class="studio-hint">开箱与合成在联机房间场景的「我的家具」里（开完箱紧接着就要摆，动线不拆开）。</p>
  </div>

  <div class="conn-card">
    <h3>行为规则引擎</h3>
    <div class="btn-row">
      <button class="btn ghost" data-behavior="refresh">刷新规则</button>
      <select data-behavior="trigger-select" class="dev-trigger-select">
        <option value="">— 选择 trigger 手动评估 —</option>
        <option value="startup">startup（启动）</option>
        <option value="app_switch">app_switch（切应用）</option>
        <option value="hour_chime">hour_chime（整点）</option>
        <option value="perception_tick">perception_tick（兜底 tick）</option>
        <option value="agent_stop">agent_stop（跑完一轮）</option>
        <option value="agent_error">agent_error（报错）</option>
        <option value="meeting_end">meeting_end（离会）</option>
        <option value="music_start">music_start（放歌）</option>
        <option value="pet_click">pet_click（戳了一下）</option>
      </select>
      <button class="btn ghost" data-behavior="trigger">触发评估</button>
      <button class="btn ghost" data-behavior="think">LLM 思考一次</button>
      <button class="btn danger" data-behavior="stop">停止所有行为</button>
    </div>
    <div id="dev-rules" class="dev-stats">读取中…</div>
    <p class="studio-hint">「试」播放内置规则的动作和台词，不调用 LLM；「触发评估」检查规则条件；只有「LLM 思考一次」主动请求模型，模型可以选择不说话。</p>
  </div>

  <div class="conn-card">
    <h3>前台应用记录</h3>
    <p class="studio-hint">在本机记录系统公开的应用名、窗口标题和进程元数据，原始记录保留 7 天。聊天和自动 LLM 脑会使用最近观察的应用名、窗口标题及带时间的对话作为上下文；不读取窗口正文，不同步到联机空间。</p>
    <div id="dev-foreground-current" class="dev-stats">读取中…</div>
    <div id="dev-foreground-events" class="dev-foreground-events">读取中…</div>
  </div>

  <div class="conn-card">
    <h3>感知数据（四流）</h3>
    <div class="btn-row">
      <button class="btn ghost" data-perc="refresh">刷新感知</button>
      <button class="btn ghost" data-perc="inject">注入假 app_focus</button>
    </div>
    <div id="dev-perc-events" class="dev-stats">读取中…</div>
    <div id="dev-perc-ledger" class="dev-stats"></div>
    <div id="dev-perc-decisions" class="dev-stats"></div>
  </div>
</div>`;const l=n=>{e.querySelectorAll("[data-garden-render]").forEach(a=>{const c=a.dataset.gardenRender===(n.gardenRenderMode??"2d");a.setAttribute("aria-pressed",String(c)),a.classList.toggle("primary",c),a.classList.toggle("ghost",!c)});const o=n.behaviorMode==="free";e.querySelectorAll("[data-pet-mode]").forEach(a=>{const c=a.dataset.petMode==="free"===o;a.setAttribute("aria-pressed",String(c)),a.classList.toggle("primary",c),a.classList.toggle("ghost",!c)}),e.querySelector("#dev-mode-description").textContent=o?"按人设主动说话、做动作，约每 90 秒思考一次。使用 LLM。":"保持原有陪伴频率；LLM 脑开启时，台词仍由模型生成。"};l(await window.qbot.settings.get()),e.querySelector("#dev-open-garden")?.addEventListener("click",()=>window.qbot.garden.open("plots")),e.querySelectorAll("[data-garden-render]").forEach(n=>n.addEventListener("click",async()=>{const o=e.querySelectorAll("[data-garden-render]");o.forEach(a=>a.disabled=!0);try{await window.qbot.settings.set({gardenRenderMode:n.dataset.gardenRender==="3d"?"3d":"2d"}),l(await window.qbot.settings.get())}catch{g(e,"种植画面切换失败，请重试")}finally{o.forEach(a=>a.disabled=!1)}}));const i=document.createElement("div");i.className="conn-card",i.dataset.journalEditor="",e.querySelector(".studio-body").prepend(i),await A(i);const d=document.createElement("div");e.querySelector(".studio-body").prepend(d),y?.dispose(),y=B(d,!0),m?.(),m=window.qbot.settings.onChanged(l),e.querySelectorAll("[data-pet-mode]").forEach(n=>n.addEventListener("click",async()=>{const o=e.querySelectorAll("[data-pet-mode]");o.forEach(a=>a.disabled=!0);try{const a=n.dataset.petMode==="free"?"free":"companion";await window.qbot.settings.set({behaviorMode:a,...a==="free"?{freeMode:!0}:{}}),l(await window.qbot.settings.get())}catch{g(e,"模式保存失败，请重试")}finally{o.forEach(a=>a.disabled=!1)}}));const u=await window.qbot.progress.get();_(u),$?.(),$=window.qbot.progress.onChanged(_),q?.(),q=window.qbot.perception.onChanged(()=>{h()}),await M(),await h(),S="",await E(),b&&clearInterval(b),b=setInterval(()=>{v?.getClientRects().length&&E()},2e3),e.querySelector("#dev-brain-more")?.addEventListener("click",()=>{x+=20,S="",E()}),e.querySelectorAll("[data-perc]").forEach(n=>{n.addEventListener("click",()=>{(async()=>n.dataset.perc==="refresh"?await h():n.dataset.perc==="inject"&&(await window.qbot.perception.injectTest(),await h(),g(e,"已注入假 app_focus 事件")))()})}),e.querySelectorAll("[data-behavior]").forEach(n=>{n.addEventListener("click",()=>{(async()=>{const o=n.dataset.behavior;if(o==="refresh")await M(),g(e,"规则已刷新");else if(o==="trigger"){const c=e.querySelector('[data-behavior="trigger-select"]')?.value;if(!c){g(e,"先选一个 trigger");return}await window.qbot.behavior.trigger(c),g(e,`已触发 ${c} 评估（看桌宠反应 / 决策日志）`)}else if(o==="think"){n.disabled=!0;try{await window.qbot.behavior.debugThink(),g(e,"已让 LLM 脑思考一次（看决策日志 llm: 开头条目；需开自由模式 + 有 Key）"),await M()}finally{n.disabled=!1}}else o==="stop"&&(await window.qbot.behavior.stopAll(),g(e,"已停止所有行为"))})()})})}async function M(){const e=v?.querySelector("#dev-rules");if(!e)return;const l=await window.qbot.behavior.getRules(),i=await window.qbot.behavior.getExecutorState(),d=i.current?`正在执行：<b>${i.current.id}</b>（第 ${i.current.step+1} 步，优先级 ${i.current.priority}）`:"当前空闲",u=i.queue.length>0?` · 队列 ${i.queue.length} 条`:"";e.innerHTML=`<div class="dev-exec">${d}${u}</div>`+l.map(n=>`<div class="dev-rule"><b>${n.name}</b>（权重 ${n.weight}）<button class="btn ghost dev-try" data-rule-id="${n.id}">试</button></div>`).join(""),e.querySelectorAll(".dev-try").forEach(n=>{n.addEventListener("click",()=>{window.qbot.behavior.debugTrigger(n.dataset.ruleId).then(()=>{g(e,"已立即重播（无冷却，不排队）")})})})}function F(){y?.dispose(),y=void 0,m?.(),m=null,b&&clearInterval(b),b=null,$?.(),$=null,q?.(),q=null,v=null}function _(e){const l=v?.querySelector("#dev-progress");if(!l)return;const i=Object.values(e.inventory).reduce((o,a)=>o+a,0),d=Object.keys(e.inventory).length,u=Math.floor(e.idleMs/6e4),n=Math.floor(e.idleMs%6e4/1e3);l.innerHTML=`<div>点数 <b>${e.points}</b> · 箱子 <b>${e.boxes}</b> · 挂机 ${u}分${String(n).padStart(2,"0")}秒 / 15分</div><div>家具 ${i} 件 / ${d} 种 · 开箱 ${e.boxesOpened} 次 · 合成 ${e.crafted} 次</div><div>键盘 ${e.keysCounted} 下 · Claude Code 跑完 ${e.runsCounted} 轮</div>`}async function h(){const e=v?.querySelector("#dev-foreground-current"),l=v?.querySelector("#dev-foreground-events"),i=v?.querySelector("#dev-perc-events"),d=v?.querySelector("#dev-perc-ledger"),u=v?.querySelector("#dev-perc-decisions");if(!e||!l||!i||!d||!u)return;const n=await window.qbot.perception.get(),o=t=>new Date(t).toLocaleTimeString("zh-CN",{hour12:!1}),a=n.foregroundMonitor,c=a.status==="running"?"正常":a.status==="degraded"?"部分可用":a.status==="disabled"?"未开启（可在设置中开启）":a.status==="unsupported"?"当前平台不支持":a.status==="error"?"采集失败":"未启动",s=n.foreground;e.innerHTML=s?`<div><b>${r(s.app)}</b> · ${r(c)} · ${r(s.platform)}</div><div>窗口：${r(s.windowTitle??"（标题不可用）")}</div><div>进程：${r(s.processName??"未知")}${s.processId?` · PID ${s.processId}`:""}</div>`+(s.windowBounds?`<div>窗口：${s.windowBounds.width}×${s.windowBounds.height} @ ${s.windowBounds.x}, ${s.windowBounds.y}${s.windowState?` · ${r(s.windowState)}`:""}</div>`:s.windowState?`<div>窗口状态：${r(s.windowState)}</div>`:"")+(typeof s.isResponding=="boolean"?`<div>响应状态：${s.isResponding?"正常":"无响应"}</div>`:"")+(s.bundleId?`<div>Bundle ID：${r(s.bundleId)}</div>`:"")+(s.executablePath?`<div class="dev-foreground-path">路径：${r(s.executablePath)}</div>`:"")+`<div>来源：${r(s.source)} · ${s.detailLevel==="full"?"完整窗口元数据":"仅应用级元数据"} · ${o(s.at)}</div>`+(a.lastError?`<div class="dev-perc-skip">${r(a.lastError)}</div>`:""):`<div><b>${r(c)}</b> · ${r(a.platform)}</div>`+(a.lastError?`<div class="dev-perc-skip">${r(a.lastError)}</div>`:"");const p=n.events.filter(t=>t.type==="app_focus"||t.type==="foreground_change").slice(0,30);l.innerHTML=p.length===0?'<div class="dev-perc-skip">（暂无前台切换记录）</div>':p.map(t=>`<div class="dev-foreground-row"><span>${o(t.at)}</span><b>${r(t.app)}</b><span>${r(t.windowTitle||"（无窗口标题）")}</span></div>`).join("");const k=n.events.slice(0,10);i.innerHTML=k.length===0?"<div>（事件流为空）</div>":k.map(t=>{const w=t.type==="app_focus"||t.type==="foreground_change"?`app: ${r(t.app)}${t.windowTitle?` · ${r(t.windowTitle)}`:""}`:t.type==="agent"?`activity: ${t.activity} · sessions: ${t.sessions}`:t.type==="meeting"?`inMeeting: ${t.inMeeting}`:t.type==="music"?`playing: ${t.playing}${t.title?` · ${t.title}`:""}`:t.type==="interact"?t.kind:"";return`<div>${o(t.at)} <b>${t.type}</b> ${w}</div>`}).join("");const C=Object.entries(n.ledger.apps).sort((t,w)=>w[1].switches-t[1].switches).slice(0,6);d.innerHTML=`<div>账本 ${n.ledgerDate}：切换 <b>${n.ledger.totalSwitches}</b> 次 · 事件 ${n.ledger.eventCount} 条`+(n.ledger.firstActivityAt?` · 首次活动 ${o(n.ledger.firstActivityAt)}`:"")+"</div>"+C.map(([t,w])=>`<div>${t}: ${w.switches} 次</div>`).join("");const j=n.decisions.slice(0,6);u.innerHTML=j.length===0?"<div>（暂无决策日志）</div>":j.map(t=>`<div>${o(t.at)} <b>${t.trigger}</b> → ${t.selected?`已选定 ${r(t.selected.action)}${t.selected.text?`「${r(t.selected.text)}」`:""}（决策记录）`:'<span class="dev-perc-skip">未执行</span>'}${t.skippedReason?` <span class="dev-perc-skip">(${t.skippedReason})</span>`:""}</div>`).join("");const P=n.behaviors.filter(t=>t.kind==="say").slice(0,3);u.innerHTML+=P.map(t=>`<div>${o(t.at)} 气泡已发送「${r(t.detail??"")}」</div>`).join("")}async function E(){const e=v,l=e?.querySelector("#dev-brain-status"),i=e?.querySelector("#dev-brain-log");if(!(!l||!i||L)){L=!0;try{const d=await window.qbot.behavior.getBrainLog();if(e!==v)return;l.textContent=`${d.gate?.reason??"尚未触发调用"}${d.gate?.nextAt?` · 最早再次调用：${new Date(d.gate.nextAt).toLocaleTimeString()}`:""} · 共 ${d.calls.length} 次调用${d.storageError?` · 保存失败：${d.storageError}`:""}`;const u=d.calls.slice(0,x),n=JSON.stringify(u);if(n===S)return;S=n;const o=new Set([...i.querySelectorAll("details[open]")].map(s=>s.dataset.call)),a=(s,p)=>`<h4>${s}</h4><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto;user-select:text">${r(typeof p=="string"?p:JSON.stringify(p??"尚无",null,2))}</pre>`;i.innerHTML=u.map(s=>`<details data-call="${r(s.id)}" ${o.has(s.id)?"open":""} style="margin:12px 0"><summary>${new Date(s.at).toLocaleString()} · ${r(s.trigger)} · ${r(s.events.at(-1)?.stage??"准备中")}</summary>${a("完整输入（消息与上下文）",s.input)}${a("原始输出",s.raw)}${a("思考 / 是否行动 / 动作 / 说话",s.decision)}${a("执行过程",s.events.map(p=>`${new Date(p.at).toLocaleTimeString()} ${p.stage}${p.detail?`：${p.detail}`:""}`).join(`
`))}</details>`).join("")||"<p>暂无完整调用记录。旧的决策摘要仍在下方感知日志里。</p>";const c=e?.querySelector("#dev-brain-more");c&&(c.hidden=d.calls.length<=x)}catch(d){l.textContent=`读取 LLM 日志失败：${String(d)}`}finally{L=!1}}}function r(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}export{U as discardChanges,K as hasUnsavedChanges,z as mount,F as unmount};

import{d as k}from"./index-DPb5_7o8.js";let c=null,p=Promise.resolve();function s(t){return p=p.then(()=>window.qbot.settings.set(t)).catch(n=>{c&&k(c,`保存失败：${String(n)}`,"warn")}),p}let u=null;async function $(t){c=t;const n=await window.qbot.settings.get();t.innerHTML=b(n),h(t),u?.(),u=window.qbot.settings.onChanged(o=>{c&&y(c,o)})}function q(){u?.(),u=null,c=null}async function w(){c&&y(c,await window.qbot.settings.get())}function g(t,n,o,e){return`<div class="setting-block">
    <div class="setting-copy"><label for="${t}">${n}</label><p>${e}</p></div>
    <div class="key-control">
      <span class="key-state ${o?"configured":""}">${o?"已配置":"未配置"}</span>
      <input id="${t}" type="password" autocomplete="off" placeholder="${o?"已保存，输入新值可替换":"粘贴 API Key"}" value="${m(o)}" />
      <button class="btn quiet key-reveal" type="button" data-target="${t}">显示</button>
      <button class="btn quiet key-clear" type="button" data-target="${t}">清除</button>
    </div>
  </div>`}function b(t){const n=t.petScale??1,o=t.voiceVolume??70,e=t.nickname??t.marketNickname??"";return`<div class="studio-body settings-body">
    <div class="page-heading"><div><p class="eyebrow">系统偏好</p><h2>设置</h2><p class="page-summary">所有修改自动保存。敏感信息只写入本机配置。</p></div></div>

    <section class="settings-section"><h3>身份</h3>
      <div class="setting-block"><div class="setting-copy"><label for="set-nickname">公开昵称</label><p>装扮市场署名与联机空间身份使用同一个昵称。</p></div><input id="set-nickname" type="text" maxlength="24" placeholder="匿名" value="${m(e)}" /></div>
    </section>

    <section class="settings-section"><h3>孵化方式</h3><div class="setting-block"><div class="setting-copy"><label for="set-generation-mode">使用哪座孵化台</label><p>云端凭有效邀请码不限次数使用；本地使用自己的 API Key，按模型服务计费。</p></div><select id="set-generation-mode"><option value="cloud"${t.generationMode!=="local"?" selected":""}>云端孵化</option><option value="local"${t.generationMode==="local"?" selected":""}>本地孵化</option></select></div></section><section class="settings-section"><h3>模型与 API</h3><p>云端创建无需填写这里；选择本地孵化时使用。</p>
      ${g("set-ark-key","火山方舟 Ark API Key",t.arkApiKey,"用于 Seedream、动作生成和自由模式。")}
      ${g("set-gpt-key","GPT-Image-2 API Key",t.gptImageApiKey,"仅在创建角色时选择 GPT-Image-2 才需要。")}
    </section>

    <section class="settings-section"><h3>桌宠</h3>
      <div class="setting-block"><div class="setting-copy"><span class="setting-title">大小</span><p>拖动时实时调整桌宠窗口。</p></div><div class="range-control"><input id="set-scale" type="range" min="0.5" max="2" step="0.1" value="${n}" /><b id="set-scale-value">${Math.round(n*100)}%</b></div></div>
    </section>

    <section class="settings-section"><h3>声音与陪伴</h3>
      ${v("set-voice-enabled","开启叽歪语音","关闭后文字气泡仍然显示。",t.voiceEnabled??!0)}
      <div class="setting-block"><div class="setting-copy"><span class="setting-title">音量</span></div><div class="range-control"><input id="set-voice-volume" type="range" min="0" max="100" step="5" value="${o}" /><b id="set-volume-value">${o}</b></div></div>
      <div class="setting-block"><div class="setting-copy"><label for="set-talk-frequency">说话频率</label><p>控制角色随机自言自语的间隔。</p></div><select id="set-talk-frequency"><option value="quiet"${t.talkFrequency==="quiet"?" selected":""}>安静</option><option value="normal"${(t.talkFrequency??"normal")==="normal"?" selected":""}>正常</option><option value="chatty"${t.talkFrequency==="chatty"?" selected":""}>话痨</option></select></div>
    </section>

    <section class="settings-section"><h3>行为模式</h3>
      ${v("set-free-mode","LLM 脑","由模型生成台词和动作决策；主动频率在工具抽屉的「桌宠模式」中选择。需要方舟 Key。",!!t.freeMode)}
    </section>

    <section class="settings-section"><h3>隐私与数据</h3>
      ${v("set-show-pet","在联机空间展示桌宠形象","开启后上传动作资产供房友显示；关闭后房友只看到缩略图。",t.roomsShowMyPet!==!1)}
      ${v("set-foreground-observation","记录前台应用和窗口标题","默认关闭；元数据本地保留 7 天。开启后，聊天与自动 LLM 脑会使用应用名和窗口标题，不读取窗口正文。",t.foregroundObservationEnabled===!0)}
      <div class="privacy-note">键盘监控只累计次数，不记录具体按键。联机空间可能同步状态、动作和当前牌面，并分享角色昵称和人设；不会同步未展示的会话正文或项目路径。</div>
    </section>

    <section class="settings-section"><h3>高级</h3>
      ${v("set-developer-mode","显示开发者工具","开启后可以翻开工具抽屉，查看规则引擎、感知日志和数值工具。",!!t.developerMode)}
    </section>
  </div>`}function v(t,n,o,e){return`<label class="setting-block toggle-block" for="${t}"><span class="setting-copy"><span class="setting-title">${n}</span><p>${o}</p></span><span class="switch"><input id="${t}" type="checkbox" ${e?"checked":""}/><span></span></span></label>`}function m(t){return(t??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function y(t,n){const o=(i,r)=>{const d=t.querySelector(i);d&&document.activeElement!==d&&(d.value=r)},e=(i,r)=>{const d=t.querySelector(i);d&&(d.checked=r)};o("#set-generation-mode",n.generationMode??"cloud"),o("#set-nickname",n.nickname??n.marketNickname??""),o("#set-scale",String(n.petScale??1)),o("#set-voice-volume",String(n.voiceVolume??70)),o("#set-talk-frequency",n.talkFrequency??"normal");const a=t.querySelector("#set-scale-value");a&&(a.textContent=`${Math.round((n.petScale??1)*100)}%`);const l=t.querySelector("#set-volume-value");l&&(l.textContent=String(n.voiceVolume??70)),e("#set-voice-enabled",n.voiceEnabled??!0),e("#set-show-pet",n.roomsShowMyPet!==!1),e("#set-foreground-observation",n.foregroundObservationEnabled===!0),e("#set-free-mode",!!n.freeMode),e("#set-developer-mode",!!n.developerMode)}function h(t){const n=e=>t.querySelector(e);n("#set-generation-mode").addEventListener("change",e=>{s({generationMode:e.target.value})}),n("#set-nickname").addEventListener("change",e=>{const a=e.target.value.trim();s({nickname:a,marketNickname:a})});const o=(e,a)=>{n(e).addEventListener("change",l=>{s({[a]:l.target.value.trim()});const i=l.target.closest(".setting-block")?.querySelector(".key-state");if(i){const r=!!l.target.value.trim();i.textContent=r?"已配置":"未配置",i.classList.toggle("configured",r)}})};o("#set-ark-key","arkApiKey"),o("#set-gpt-key","gptImageApiKey"),t.querySelectorAll(".key-reveal").forEach(e=>{e.addEventListener("click",()=>{const a=n(`#${e.dataset.target}`);a.type=a.type==="password"?"text":"password",e.textContent=a.type==="password"?"显示":"隐藏"})}),t.querySelectorAll(".key-clear").forEach(e=>{e.addEventListener("click",()=>{const a=n(`#${e.dataset.target}`);a.value="",a.dispatchEvent(new Event("change"))})}),n("#set-scale").addEventListener("input",e=>{const a=parseFloat(e.target.value);n("#set-scale-value").textContent=`${Math.round(a*100)}%`,s({petScale:a})}),n("#set-voice-enabled").addEventListener("change",e=>{s({voiceEnabled:e.target.checked})}),n("#set-voice-volume").addEventListener("input",e=>{const a=parseInt(e.target.value,10);n("#set-volume-value").textContent=String(a),s({voiceVolume:a})}),n("#set-talk-frequency").addEventListener("change",e=>{s({talkFrequency:e.target.value})}),n("#set-show-pet").addEventListener("change",e=>{s({roomsShowMyPet:e.target.checked})}),n("#set-foreground-observation").addEventListener("change",e=>{s({foregroundObservationEnabled:e.target.checked})}),n("#set-free-mode").addEventListener("change",e=>{s({freeMode:e.target.checked})}),n("#set-developer-mode").addEventListener("change",e=>{s({developerMode:e.target.checked})})}export{$ as mount,w as onVisible,q as unmount};

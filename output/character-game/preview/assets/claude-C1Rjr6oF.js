import{d as l}from"./index-DPb5_7o8.js";const u={idle:"空闲",thinking:"思考中",working:"干活中",waiting:"等你处理",done:"刚完成",error:"出错了"};let c=null,o=null;async function g(n){c=n,n.innerHTML=`
<div class="studio-body">
  <div class="page-heading"><div><p class="eyebrow">连接</p><h2>Claude Code</h2><p class="page-summary">让桌宠感知编码会话，并用动作和气泡反馈当前进度。</p></div></div>

  <div class="conn-card">
    <div class="conn-row">
      <span class="conn-label">联动状态</span>
      <span id="claude-state" class="conn-value">检测中…</span>
    </div>
    <div class="conn-row">
      <span class="conn-label">当前活动</span>
      <span id="claude-activity" class="conn-value">—</span>
    </div>
    <div class="conn-row">
      <span class="conn-label">配置文件</span>
      <span class="conn-value"><code>~/.claude/settings.json</code></span>
    </div>
    <div class="btn-row">
      <button id="claude-toggle" class="btn" disabled>检测中…</button>
      <button id="claude-scenes" class="btn ghost">配置状态动作</button>
    </div>
    <p class="studio-hint">安装会写入 <code>~/.claude/settings.json</code>（首次写入前自动备份），
    点击后会弹出系统确认框。卸载同样走这个按钮，幂等可反复切换。</p>
  </div>
</div>`,await i();const t=await window.qbot.agent.getStatus();d(t),o?.(),o=window.qbot.agent.onStatus(d),n.querySelector("#claude-toggle")?.addEventListener("click",e=>{const s=e.currentTarget;(async()=>{s.disabled=!0,s.textContent="处理中…";try{const a=await window.qbot.claude.toggle();l(n,a?"Claude Code 联动已接入 ✓":"已卸载 Claude Code 联动")}catch(a){l(n,`操作失败：${a instanceof Error?a.message:String(a)}`,"warn")}finally{await i()}})()}),n.querySelector("#claude-scenes")?.addEventListener("click",()=>{window.qbot.ui.openConsole("scene-actions")})}function v(){o?.(),o=null,c=null}async function b(){await i()}async function i(){const n=c;if(!n)return;const t=await window.qbot.claude.getStatus(),e=n.querySelector("#claude-state"),s=n.querySelector("#claude-toggle");e&&(e.textContent=t?"已接入":"未接入",e.classList.toggle("ok",t)),s&&(s.disabled=!1,s.textContent=t?"卸载联动":"接入 Claude Code 联动",s.classList.toggle("ghost",t))}function d(n){const t=c?.querySelector("#claude-activity");if(!t)return;const e=u[n.activity]??n.activity;t.textContent=n.sessions>0?`${e}（${n.sessions} 个会话）`:e}export{g as mount,b as onVisible,v as unmount};

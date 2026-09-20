import { JOURNAL_PROMPTS, journalPrompt, type JournalPromptKey } from '../../../shared/journal-prompts';
import { esc, guard, markControlsClean, trackDirtyControls } from './_studio-shared';

export async function mountJournalPrompts(host:HTMLElement):Promise<void> {
  const settings=await window.qbot.settings.get();
  host.innerHTML='<h3>手账与朋友圈提示词</h3><p class="studio-hint">两处共用当前角色人设，保存后下次生成生效。清空或恢复默认可使用内置写法；已有内容可在旅行手账中按人设重写。</p>'+
    (Object.keys(JOURNAL_PROMPTS) as JournalPromptKey[]).map(key=>`<details class="prompt-block" data-journal-prompt="${key}"><summary>${JOURNAL_PROMPTS[key].title}</summary><textarea rows="10" aria-label="${JOURNAL_PROMPTS[key].title}提示词">${esc(journalPrompt(key,settings[key]))}</textarea><div class="btn-row"><button class="btn" data-save>保存</button><button class="btn ghost" data-reset>恢复默认</button></div><p class="studio-hint" role="status"></p></details>`).join('');
  trackDirtyControls(host);
  host.querySelectorAll<HTMLElement>('[data-journal-prompt]').forEach(block=>{
    const key=block.dataset.journalPrompt as JournalPromptKey,ta=block.querySelector('textarea')!,status=block.querySelector('[role=status]')!;
    for(const action of ['save','reset'])block.querySelector<HTMLButtonElement>('[data-'+action+']')!.onclick=()=>{
      const button=block.querySelector<HTMLButtonElement>('[data-'+action+']')!;
      void guard(host,button,'保存中…',async()=>{
        const value=action==='reset'?'':ta.value.trim();
        if(value.length>12000)throw Error('提示词请控制在 12,000 字以内');
        await window.qbot.settings.set({[key]:value});ta.value=journalPrompt(key,value);markControlsClean(ta);status.textContent=action==='reset'?'已恢复默认，下次生成生效。':'已保存，下次生成生效。';
      });
    };
  });
}

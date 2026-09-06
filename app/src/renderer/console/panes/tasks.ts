import { navigate, taskCharacters } from '../workspace';
import { esc, guard, confirmBox } from './_studio-shared';
let root: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let revision = 0;
let off:(()=>void)[]=[];
export function unmount():void {off.forEach(fn=>fn());off=[];if(timer)clearTimeout(timer);timer=undefined;root=null;++revision;}
export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  const update = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = undefined; if (root?.classList.contains('active')) void refresh(); }, 750);
  };
  off=[window.qbot.hatch.onProgress(update),window.qbot.hatch.onCloudStatus(update),window.qbot.studio.onCustomAction(update)];
  await refresh();
}
export async function onVisible(): Promise<void> { await refresh(); }
async function refresh(): Promise<void> {
  if (!root) return;
  const host = root;
  if (host.querySelector('.studio-confirm-mask') || host.querySelector('button:disabled')) return;
  const turn = ++revision;
  const characters = taskCharacters(await window.qbot.characters.list());
  const statuses = await Promise.all(characters.map((c) => window.qbot.hatch.getStatus(c.dirId).catch(() => null)));
  if (turn !== revision || host.querySelector('.studio-confirm-mask') || host.querySelector('button:disabled')) return;
  host.innerHTML = `<div class="studio-body"><div class="page-heading"><div><p class="eyebrow">后台任务</p><h2>生成任务</h2><p class="page-summary">离开页面不会中断生成。查看进度、确认形象，或继续未完成的任务。</p></div><button class="btn" id="tasks-refresh">刷新</button></div>
    ${characters.length ? '<div class="task-list"></div>' : '<div class="pane-placeholder"><b>当前没有待处理的生成任务</b><p>完成的角色都在角色库中。</p><div class="btn-row"><button class="btn primary" data-go="characters">打开角色库</button><button class="btn" data-go="hatch">创建角色</button></div></div>'}</div>`;
  characters.forEach((character, index) => {
    const status = statuses[index];
    const additions = [...Object.values(character.manifest?.customActions ?? {}), ...Object.values(character.manifest?.expressionActions ?? {})];
    const isCreation = character.hasUnfinishedJob || Object.values(character.manifest?.actions ?? {}).some((a) => a.status === 'failed');
    const actionStates = Object.values(status?.actions ?? {});
    const failed = actionStates.filter((a) => a.status === 'failed').length;
    const done = actionStates.filter((a) => a.status === 'done').length;
    const label = status?.error ? status.error : status?.cloudPhase === 'queued' ? `云端排队中（第 ${status.queuePosition || 1} 位）` : !isCreation ? `${additions.filter((a) => a.status === 'pending').length} 个生成中 · ${additions.filter((a) => a.status === 'failed').length} 个需重试` : status?.stage === 'awaiting_pick' ? '等待确认形象' : failed ? `${failed} 个动作需要重试` : status?.running ? '正在生成' : status?.stage === 'done' ? '查看生成结果' : '已暂停，可继续';
    const row = document.createElement('article'); row.className = 'task-row';
    row.innerHTML = `<div><h3>${esc(character.manifest?.name || '创建中的角色')}</h3><p>${esc(label)}${isCreation && actionStates.length ? ` · 已完成 ${done}/${actionStates.length}` : ''}</p></div><div class="btn-row"><button class="btn primary" data-view>${isCreation ? '查看任务' : '管理动作'}</button>${isCreation && !status?.running && status?.stage !== 'done' ? '<button class="btn" data-resume>继续生成</button>' : ''}<button class="btn danger" data-delete>删除</button></div>`;
    row.querySelector('[data-view]')!.addEventListener('click', () => navigate(isCreation ? { pane: 'hatch', taskId: character.dirId } : { pane: 'persona', dirId: character.dirId }));
    row.querySelector<HTMLButtonElement>('[data-resume]')?.addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      void (async () => {
        if (!(await confirmBox(host, '继续这个任务？将从已保存的进度继续，后续生成会调用已配置的模型服务。'))) return;
        await guard(host, button, '继续中…', async () => {
          await window.qbot.hatch.resume(character.dirId);
          navigate({ pane: 'hatch', taskId: character.dirId });
        });
      })();
    });
    row.querySelector<HTMLButtonElement>('[data-delete]')!.addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      void (async () => {
        const running = status?.running || additions.some((a) => a.status === 'pending');
        const message = `从列表删除这个任务？角色和已生成的动作会保留。${running ? '正在运行的生成不会停止，仍可能产生费用。' : ''}之后发起新的生成时，会重新显示任务。`;
        if (!(await confirmBox(host, message))) return;
        let deleted = false;
        await guard(host, button, '删除中…', async () => {
          await window.qbot.hatch.deleteTask(character.dirId);
          deleted = true;
          window.dispatchEvent(new CustomEvent('console:characters-changed'));
        });
        if (deleted) await refresh();
      })();
    });
    host.querySelector('.task-list')!.appendChild(row);
  });
  host.querySelector('#tasks-refresh')!.addEventListener('click', () => void refresh());
  host.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((button) => button.addEventListener('click', () => navigate({ pane: button.dataset.go! })));
}

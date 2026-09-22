import { renderWeatherCard, updateWeatherCountdown } from './weather-card';
import type { GardenWeatherStatus } from '../../shared/garden-weather';
import { renderTravel, celebrateTravel } from './travel';
import './style.css';
import { groupSeeds } from './inventory';
import { gardenIcon } from './icons';
import { quickLayout } from './quick-layout';
import { gardenLane } from '../../shared/garden-layout';
import { botanicalArt } from './botanical-art';
import { attachMutationEffects } from './mutation-effects';
import { supplyArt } from './supply-art';
import { mountStrawberry3D } from './strawberry-3d.js';
import { SPECIES, TRAITS, FERTILIZERS, TIER_NAMES, LEVEL_XP, CULTIVATION_MS, fruitQuality, traitSlot, SLOT_NAMES, canBreed, needsReveal, cultivationRemaining, mutationMultiplier, gardenQuest, tier, level, growth, growthLabel, type Species, type Trait, type Plant, type Produce, type GardenState, type GardenCommand, type GardenReveal, type Seed } from '../../shared/garden';
const sprout = new URL('./assets/sprout.png', import.meta.url).href;
const api = window.qbot.garden;
const root = document.querySelector<HTMLElement>('#app')!;
const strip = new URLSearchParams(location.search).get('view') === 'strip';
let render3d=false;
function setRenderMode(settings: {gardenRenderMode?: string}): void {
    const next=settings.gardenRenderMode==='3d';
    if(next===render3d)return;
    render3d=next;document.body.classList.toggle('garden-3d',next);render();
}
window.qbot.settings.onChanged(setRenderMode);
void window.qbot.settings.get().then(setRenderMode).catch(()=>{});
let page = new URLSearchParams(location.search).get('view') ?? 'bag';
let weatherStatus:GardenWeatherStatus|undefined,weatherReceivedAt=0,weatherFetching=false;
function showWeather(status:GardenWeatherStatus):void {
 renderWeatherCard(root,status);
 if(new URLSearchParams(location.search).get('view')!=='weather')root.prepend(button('← 返回花园',()=>go('plots'),'weather-back'));
}
async function refreshWeather(){if(weatherFetching||page!=='weather')return;weatherFetching=true;try{weatherStatus=await api.weather();weatherReceivedAt=Date.now();if(page==='weather')showWeather(weatherStatus);}catch{if(page==='weather')root.textContent='天气暂时无法读取，稍后自动重试。';}finally{weatherFetching=false;}}
let state: GardenState | undefined, busy = false, fetching = false, signature = '', parentId: string | null = null;
let buyMode = false, sellMode = false;
const buySelection = new Map<string, number>();
const sellSelection = new Set<string>();
let selectedSpecies: Species = 'lotus';
let quickPlot: number | null = null;
let petBounds = { left: 370, right: 730, top: 180, bottom: 540 };
let gardenDirection: 'left' | 'right' = 'left';
let speechBounds: {left:number;right:number;top:number;bottom:number} | null = null;
api.onSpeechBounds(bounds => { speechBounds = bounds; positionQuick(); positionQuest(); });
let quickResult: GardenReveal | null = null;
let harvestedParent: string | null = null;
const harvestedByPlot = new Map<number, string>();
document.body.classList.toggle('strip', strip);
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (text)
        e.textContent = text;
    if (cls)
        e.className = cls;
    return e;
}
function button(label: string, action: () => void, cls = '', disabled = false): HTMLButtonElement {
    const b = el('button', label, cls);
    b.type = 'button';
    b.disabled = disabled || busy;
    b.onclick = action;
    return b;
}
function notice(text: string): void { const n = document.querySelector('#notice')!; n.textContent = text; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 4500); }
function tags(ts: Trait[]): HTMLElement {
    const row = el('div', undefined, 'tags');
    if (!ts.length)
        row.append(el('span', '原生', 'tag normal'));
    for (const category of ['fruit', 'skin', 'accessory'] as const) {
        const group = ts.filter(t => traitSlot(t) === category);
        if (!group.length) continue;
        const line = el('div', undefined, 'trait-group');
        line.append(el('small', SLOT_NAMES[category], 'trait-label'));
        for (const t of group) line.append(el('span', TRAITS[t].name, `tag ${TRAITS[t].tier}`));
        row.append(line);
    }
    return row;
}
function art(sp: Species, ts: Trait[] = [], ratio = 1, mode: 'fruit'|'plant'|'seed' = 'fruit', regrowing = false, baseTraits: Trait[] = []): HTMLElement {
    const shown = regrowing && ratio < .8 ? baseTraits : ratio < .55 ? [] : ts;
    const box = el('div', undefined, `art ${shown.join(' ')} quality-${ratio >= .8 ? tier(shown) : 'normal'}`);
    box.dataset.species = sp;
    box.dataset.artMode = mode;
    if (mode === 'seed') {
        // The paper packet stays neutral; its emblem carries the actual inherited appearance.
        box.className = 'art seed-art';
        const packet = el('img');
        packet.src = botanicalArt(sp, 'seed'); packet.alt = SPECIES[sp].name + '种子'; packet.draggable = false;
        const emblem = art(sp, ts, 1, 'fruit');
        emblem.classList.add('seed-emblem');
        box.append(packet, emblem);
        return box;
    }
    const img = el('img');
    img.src = mode === 'plant' && ratio < .55 && !regrowing ? sprout : botanicalArt(sp, mode, ratio >= .8);
    img.alt = SPECIES[sp].name;
    img.draggable = false;
    box.append(img);
    if (shown.includes('twin')) {
        const other = img.cloneNode() as HTMLImageElement;
        other.className = 'twin-copy';
        box.append(other);
    }
    attachMutationEffects(box, img.src, shown);
    if(render3d&&sp==='strawberry')mountStrawberry3D(box,{mode,ratio,traits:shown,regrowing});
    return box;
}
function plantArt(p: Plant): HTMLElement {
    if (needsReveal(p) && p.readyAt <= Date.now()) return el('div', '？', 'art mystery-fruit');
    return art(p.species, needsReveal(p)?[]:p.traits, growth(p), 'plant', !!p.harvestIndex, needsReveal(p)?[]:p.baseTraits);
}
function qualityBadge(p: Produce): HTMLElement { const q=fruitQuality(p.traits);return el('span',TIER_NAMES[q]+'果实','tag '+q); }
function plantActions(host:HTMLElement,p:Plant,index:number):void {
    host.append(qualityBadge(p));
    if (needsReveal(p)) {
        host.append(el('p','彩色惊喜尚未揭晓 · 陪它完成培育','muted'));
        const progress=el('progress');progress.max=CULTIVATION_MS;progress.value=CULTIVATION_MS-cultivationRemaining(p,Date.now());progress.dataset.cultivation=p.id;host.append(progress);
        const label=el('small',Math.ceil(cultivationRemaining(p,Date.now())/1000)+' 秒');label.dataset.cultivationLabel=p.id;host.append(label);
        const active=p.cultivation?.startedAt!==undefined;
        host.append(button(active?'暂停培育':p.cultivation?'继续培育':'陪伴培育 · 30 秒',()=>void act({type:active?'pauseCultivation':'cultivate',plot:index}),'primary'));
    } else {
        host.append(tags(p.traits),el('small',p.kg.toFixed(3)+' kg · ◉ '+p.value,'muted'),button('收获 ✦',()=>void act({type:'harvest',plot:index}),'primary'),button(p.bred?'已经繁育过':'与背包果实繁育 ♡',()=>{parentId=p.id;render();},'',!canBreed(p)));
        if (!canBreed(p)&&!p.bred) host.append(el('small','金色及以上品质可以繁育','muted'));
    }
}
function breedingCandidates(): Produce[] {
    const inPlot=state!.plots.some(p=>p?.id===parentId);
    return allParents().filter(p=>p.id!==parentId&&(inPlot?state!.produce.some(x=>x.id===p.id):state!.plots.some(x=>x?.id===p.id)));
}
function go(next: string): void { document.querySelectorAll('.result-popup').forEach(n=>n.remove()); page = next; parentId = null; buyMode = sellMode = false; buySelection.clear(); sellSelection.clear(); render(); }
function allParents(): Produce[] { return [...state!.produce, ...state!.plots.filter((p): p is Plant => !!p && p.readyAt <= Date.now())].filter(canBreed); }
async function act(command: GardenCommand): Promise<void> {
    if(render3d&&(command.type==='plant'||command.type==='plantMany')&&state?.seeds.find(s=>s.id===command.seed)?.species!=='strawberry'){
        notice('3D 模式先支持草莓；其他植物可切回 2D 后播种。');return;
    }
    if (busy)
        return;
    busy = true;
    render();
    try {
        const r = await api.act(command);
        if (!r.ok) {
            notice(r.error === '不支持的花园操作' ? '花园版本已更新，请重启桌宠后再试' : r.error);
            await refresh(true);
            return;
        }
        state = r.state;
        if (command.type === 'travelExperience') celebrateTravel(command.city,command.project,command.step);
        signature = JSON.stringify(state);
        if (command.type === 'buyMany') { buySelection.clear(); buyMode = false; }
        if (command.type === 'sellMany') { sellSelection.clear(); sellMode = false; }
        if (command.type === 'breed')
            parentId = null;
        if (strip && command.type === 'harvest' && r.reveal?.produce) {
            harvestedParent = r.reveal.produce.id;
            harvestedByPlot.set(command.plot, r.reveal.produce.id);
            quickPlot = command.plot;
        }
        if (strip && command.type === 'plant') { harvestedParent = null; harvestedByPlot.delete(command.plot); }
        if (command.type === 'sell' || command.type === 'sellMany')
            notice('已出售，花园币已到账');
        if (command.type === 'buy' || command.type === 'buyMany')
            notice('已放进背包');
        if (command.type === 'travelNext') notice('到达新的目的地');
        if (command.type === 'fertilize')
            notice('施肥成功');
        if (r.reveal) {
            if (strip && (r.reveal.seed || r.reveal.produce)) { quickResult = r.reveal; if (quickPlot === null) quickPlot = 0; }
            else reveal(r.reveal);
        }
    }
    catch (e) {
        notice(e instanceof Error ? e.message : String(e));
    }
    finally {
        busy = false;
        render();
    }
}
async function refresh(force = false): Promise<void> {
    if (fetching)
        return;
    fetching = true;
    try {
        const next = await api.get();
        const key = JSON.stringify(next);
        const unveiled=state?.plots.find(p=>p&&needsReveal(p)&&next.plots.some(n=>n?.id===p.id&&n.revealed));
        state = next;
        if(unveiled){const p=next.plots.find(p=>p?.id===unveiled.id)!;const r={title:'惊喜揭晓！',produce:p,message:'果实仍在地里，选择收获或繁育。'};if(strip){quickResult=r;quickPlot=next.plots.indexOf(p);}else reveal(r);}
        if (force || key !== signature) {
            signature = key;
            render();
        }
    }
    catch (e) {
        notice(e instanceof Error ? e.message : String(e));
    }
    finally {
        fetching = false;
    }
}
function renderStrip(): void {
    const sides = [el('section', undefined, 'soil-side single')];
    state!.plots.forEach((p, i) => {
        const b = button('', () => {
            quickPlot = i; parentId = null; quickResult = null; harvestedParent = harvestedByPlot.get(i) ?? null;
            render();
        }, 'plot');
        b.setAttribute('aria-label', `${i + 1}号土地${p ? ` ${SPECIES[p.species].name}` : ' 种植'}`);
        b.dataset.plot = String(i);
        if (p) {
            const a = plantArt(p);
            a.dataset.plant = p.id;
            a.addEventListener('click', event => {
                event.stopPropagation();
                if (busy) return;
                quickPlot = i; parentId = null; quickResult = null; harvestedParent = null;
                render();
            });
            b.append(a);
        }
        else {
            b.append(el('span', '+', 'empty-plot'));
            if(render3d){const soil=el('div',undefined,'art soil-3d');mountStrawberry3D(soil,{mode:'soil'});b.prepend(soil);}
        }
        b.classList.toggle('plot-3d',render3d&&(!p||p.species==='strawberry'));
        const mark = el('span', undefined, 'plot-mark');
        mark.innerHTML = gardenIcon('ready'); mark.setAttribute('aria-hidden', 'true');
        b.append(el('span', undefined, 'soil'), mark);
        sides[0].append(b);
    });
    const tools = el('nav', undefined, 'garden-tools');
    for (const [name, label] of [['bag', '背包'], ['shop', '商店'], ['book', '图鉴']] as const) {
        const control = button('', () => api.open(name), 'garden-icon');
        control.innerHTML = gardenIcon(name); control.title = label; control.setAttribute('aria-label', label);
        tools.append(control);
    }
    const quest = questPill();
    const harvest = button(`采摘 ${state!.plots.filter(p=>p && p.readyAt<=Date.now() && !p.keep && !needsReveal(p)).length}`, () => void act({type:'harvestMany'}), 'strip-harvest', !state!.plots.some(p=>p && p.readyAt<=Date.now() && !p.keep && !needsReveal(p)));
    const sow = button('批量播种', () => api.open('sow'), 'strip-sow');
    const controls = el('div', undefined, 'garden-controls');
    controls.setAttribute('aria-label', '花园工具栏');
    controls.append(tools, harvest, sow);
    root.replaceChildren(...sides, controls, quest);
    tick(false);
    renderQuickMenu();
    requestAnimationFrame(syncStripMouse);
}

function inventorySummary(): HTMLElement {
    const summary = el('div', undefined, 'inventory-summary');
    summary.append(el('span', `种子 ${state!.seeds.length}`));
    for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[])
        summary.append(el('span', `${FERTILIZERS[f].name.replace('肥料', '')} ${state!.fertilizers[f]}`));
    return summary;
}
function closeQuick(): void {
    quickPlot = null; parentId = null; quickResult = null; harvestedParent = null;
    root.querySelectorAll('.quick-menu').forEach(menu => menu.remove());
    requestAnimationFrame(syncStripMouse);
}
function renderQuickMenu(): void {
    root.querySelectorAll('.quick-menu').forEach(menu => menu.remove());
    if (quickPlot === null || !state) return;
    const index = quickPlot, p = state.plots[index];
    const menu = el('aside', undefined, `quick-menu${quickResult ? ' result-card' : ''}`);
    menu.setAttribute('aria-label', `${index + 1}号土地操作`);
    const heading = el('div', undefined, 'quick-heading');
    heading.append(el('strong', quickResult ? quickResult.title : `${index + 1}号地${p ? ` · ${SPECIES[p.species].name}` : ''}`), button('×', closeQuick, 'quick-close'));
    menu.append(heading);
    if (!quickResult && p) menu.append(el('small', `剩余 ${p.harvestsLeft ?? 1} 次采摘${p.fertilizers.length ? ' · '+FERTILIZERS[p.fertilizers[0]].name : ''}`, 'muted'));
    const list = el('div', undefined, 'quick-list');
    if (quickResult) {
        resultContents(list, quickResult);
        list.append(button('收好', closeQuick, 'primary'));
    } else if (parentId) {
        const candidates = breedingCandidates();
        for (const candidate of candidates) {
            const where = state.produce.some(x => x.id === candidate.id) ? '背包' : '土地';
            const row = button('', () => void act({ type: 'breed', first: parentId!, second: candidate.id }), 'quick-row');
            row.append(el('strong', `${SPECIES[candidate.species].name} · ${where}`), tags(candidate.traits));
            list.append(row);
        }
        if (!candidates.length) list.append(el('small', '暂无其他可繁育的成熟植物'));
        list.append(button('返回', () => { parentId = null; render(); }));
    } else if (harvestedParent && !p) {
        const item = state.produce.find(x => x.id === harvestedParent);
        if (item) list.append(button(item.bred ? '已繁育' : '繁育 ♡', () => { parentId = item.id; render(); }, 'quick-row', !canBreed(item)));
        list.append(button('播种', () => { harvestedParent = null; render(); }, 'primary'));
    } else if (!p) {
        list.append(button('批量播种', () => api.open('sow'), 'primary'));
        for (const { seed, count } of groupSeeds(state.seeds.filter(s=>!render3d||s.species==='strawberry'))) {
            const row = button('', () => void act({ type: 'plant', plot: index, seed: seed.id }), 'quick-row');
            row.append(supplyArt('seed', seed.species), el('strong', `${SPECIES[seed.species].name} ×${count}`));
            if (seed.genes.length) row.append(tags(seed.genes));
            list.append(row);
        }
        if (!state.seeds.length) list.append(el('small', '种子用完了'), button('去商店补货', () => api.open('shop')));
    } else if (p.readyAt <= Date.now()) {
        plantActions(list,p,index);
    } else {
        const status = el('small'); status.dataset.ready = String(p.readyAt); list.append(status);
        for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]) {
            const used = p.fertilizers.length > 0;
            if (!state.fertilizers[f]) continue;
            const row = button('', () => void act({ type: 'fertilize', plot: index, fertilizer: f }), 'quick-row', used || !state.fertilizers[f]);
            row.append(supplyArt('fertilizer', f), el('strong', `${FERTILIZERS[f].name.replace('肥料','')} ×${state.fertilizers[f]}`), ...(used ? [el('small','✓')] : []));
            row.title = FERTILIZERS[f].description;
            list.append(row);
        }
        list.append(button('测试：立即成熟', () => void act({ type: 'mature' }), 'test-button'));
    }
    if (p && !quickResult && !parentId) list.append(button(p.keep ? '✓ 留养中' : '留养', () => void act({type:'keep',plot:index}), 'keep-button'));
    menu.append(list); root.append(menu); positionQuick();
    requestAnimationFrame(syncStripMouse);
}
function positionQuick(): void {
    const menu = root.querySelector<HTMLElement>('.quick-menu');
    const plot = root.querySelector<HTMLElement>(`[data-plot="${quickPlot}"]`);
    if (!menu || !plot) return;
    const soil = plot.getBoundingClientRect(), side = plot.parentElement!.getBoundingClientRect();
    const width = quickResult ? 230 : 220;
    menu.style.width = `${width}px`;
    menu.style.maxHeight = '350px';
    const plants = [...root.querySelectorAll<HTMLElement>('.plot .art')].map(plant => {
        const r = plant.getBoundingClientRect();
        // 生长有高度过渡，提前避开目标高度，不能等动画长大后才挪菜单。
        return {left:r.left,right:r.right,bottom:r.bottom,top:Math.min(r.top,r.bottom-(parseFloat(plant.style.height)||r.height))-10};
    });
    const layout = quickLayout(innerWidth, innerHeight, width, menu.offsetHeight, soil.x + soil.width / 2, [petBounds, ...plants, ...(speechBounds ? [speechBounds] : [])], !!quickResult);
    menu.style.maxHeight = `${layout.maxHeight}px`;
    menu.style.left = `${layout.left}px`;
    menu.style.top = `${layout.top}px`;
}
function render(): void {
    document.body.classList.toggle('weather-mode',page==='weather');
    if(page==='weather'){if(weatherStatus)showWeather(weatherStatus);else root.textContent='正在读取天气…';void refreshWeather();return;}
    document.body.classList.toggle('travel-mode', !strip && (page === 'travel' || page === 'moments'));
    if (!state) {
        root.textContent = '正在打开花园…';
        return;
    }
    if (strip) {
        renderStrip();
        return;
    }
    if (page === 'travel' || page === 'moments') {
        const content = el('section');
        renderTravel(content,state,page,act,go,busy,render);
        root.replaceChildren(content);
        return;
    }
    const head = el('header');
    const title = el('div');
    title.append(el('div', '种一点期待', 'eyebrow'), el('h1', '小小花园'), el('p', '收获 +10 经验 · 每级生长时间缩短 3% · 最高 8 级', 'subtitle'));
    const money = el('div', undefined, 'wallet');
    money.append(el('small', '花园币'), el('strong', `◉ ${state.coins.toLocaleString()}`));
    const display=button(render3d?'3D 草莓 · 切回 2D':'2D 手绘 · 试试 3D',()=>{
        void window.qbot.settings.set({gardenRenderMode:render3d?'2d':'3d'}).catch(()=>notice('画面切换失败，请重试'));
    },'garden-render-toggle');
    display.setAttribute('aria-label','切换种植画面');
    head.append(title,display,money);
    const nav = el('nav', undefined, 'tabs');
    for (const [id, name] of [['plots', '我的土地'], ['bag', '背包'], ['shop', '限时商店'], ['book', '植物图鉴']]) {
        const tab = button('', () => go(id), page === id || (id === 'plots' && page.startsWith('plot:')) ? 'active' : '');
        tab.innerHTML = gardenIcon(id === 'plots' ? 'ready' : id as 'bag'|'shop'|'book');
        tab.append(el('span', name)); nav.append(tab);
    }
    nav.append(button('天气',()=>go('weather')),button('世界旅行',()=>go('travel')),button('朋友圈',()=>go('moments')));
    const content = el('section', undefined, `content page-${page.split(':')[0]}`);
    if (page === 'shop')
        renderShop(content);
    else if (page === 'sow')
        renderSowing(content);
    else if (page === 'book')
        renderBook(content);
    else if (page === 'plots' || page.startsWith('plot:'))
        renderPlots(content);
    else
        renderBag(content);
    const foot = el('footer');
    foot.append(el('span', 'DEMO · 离线继续生长 · 成熟不枯萎'), button('测试：立即成熟', () => void act({ type: 'mature' }), 'test-button'));
    root.replaceChildren(head, questPill(), nav, content, foot);
    if (parentId)
        breeding(content);
    tick(false);
}
function seedCard(seed: Seed, plot?: number, count = 1): HTMLElement {
    const card = el('article', undefined, 'card seed-card');
    card.append(art(seed.species, seed.genes, 1, 'seed'), el('h3', `${SPECIES[seed.species].name}${seed.bred ? ' · 繁育种子' : '种子'} ×${count}`), el('p', growthLabel(seed.species), 'muted'));
    if (seed.genes.length || seed.bred) {
        card.append(tags(seed.genes));
        if (seed.parents)
            card.append(el('small', seed.parents.map(x => SPECIES[x].name).join(' × ')));
    }
    if(render3d&&seed.species!=='strawberry'){card.append(el('small','切回 2D 后可播种','muted'));return card;}
    if (plot !== undefined)
        card.append(button('种在这里', () => void act({ type: 'plant', plot, seed: seed.id }), 'primary'));
    const countToPlant = Math.min(count, state!.plots.filter(p=>!p).length);
    card.append(button(`批量播种 · ${countToPlant} 块`, () => void act({type:'plantMany',seed:seed.id}), 'primary batch-sow', !countToPlant));
    return card;
}
function renderSowing(host: HTMLElement): void {
    const empty = state!.plots.filter(p=>!p).length;
    const heading = el('div', undefined, 'batch-toolbar');
    heading.append(el('h2', '批量播种'), el('small', `空地 ${empty} 块`, 'muted'));
    host.append(heading);
    if (!empty) host.append(el('p', '土地已种满', 'muted'));
    const grid = el('div', undefined, 'grid');
    groupSeeds(state!.seeds).forEach(({seed,count})=>grid.append(seedCard(seed,undefined,count)));
    host.append(grid);
    if (!state!.seeds.length) host.append(button('去商店',()=>go('shop'),'primary'));
}
function renderPlots(host: HTMLElement): void {
    host.append(button('批量播种',()=>go('sow'),'primary'));
    const plots = el('div', undefined, 'plot-picker');
    for (let i = 0; i < 6; i++)
        plots.append(button(`${i + 1}号 ${state!.plots[i] ? SPECIES[state!.plots[i]!.species].name : '空地'}`, () => go(`plot:${i}`), page === `plot:${i}` ? 'active' : ''));
    host.append(plots, button(`一键采摘 · ${state!.plots.filter(p=>p && p.readyAt<=Date.now() && !p.keep && !needsReveal(p)).length}`, () => void act({type:'harvestMany'}), 'primary', !state!.plots.some(p=>p && p.readyAt<=Date.now() && !p.keep && !needsReveal(p))));
    const index = page.startsWith('plot:') ? Number(page.split(':')[1]) : 0;
    const p = state!.plots[index];
    if (!p) {
        host.append(el('h2', `给 ${index + 1} 号土地选一粒种子`), el('p', '每株只施肥一次，覆盖全部采摘。', 'muted'));
        const grid = el('div', undefined, 'grid');
        groupSeeds(state!.seeds).forEach(({ seed, count }) => grid.append(seedCard(seed, index, count)));
        host.append(grid);
        if (!state!.seeds.length)
            host.append(el('p', '背包里还没有种子。去商店看看，或打开陪伴宝箱。'), button('逛商店', () => go('shop'), 'primary'));
        return;
    }
    const detail = el('article', undefined, 'plant-detail');
    const img = plantArt(p);
    img.dataset.detailPlant = p.id;
    const info = el('div');
    info.append(el('div', `${index + 1} 号土地 / ${p.bred ? '已繁育' : needsReveal(p)?'待培育揭晓':canBreed(p)?'可繁育一次':'金色起可繁育'}`, 'eyebrow'), el('h2', SPECIES[p.species].name));
    const status = el('p', '', 'grow-status');
    status.dataset.ready = String(p.readyAt);
    info.append(status, el('small', `剩余 ${p.harvestsLeft ?? 1} 次采摘`, 'muted'), button(p.keep ? '✓ 留养中' : '留养', () => void act({type:'keep',plot:index})));
    const bar = el('progress');
    bar.max = 1;
    bar.dataset.growth = p.id;
    info.append(bar);
    if (p.readyAt <= Date.now()) {
        plantActions(info,p,index);
    }
    else {
        info.append(el('p', '临近成熟时，稀有植株会泛起光芒。', 'muted'));
        for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]) {
            const used = p.fertilizers.length > 0;
            if (!state!.fertilizers[f]) continue;
            info.append(button(`${FERTILIZERS[f].name} · ${used ? '已使用' : `剩 ${state!.fertilizers[f]}`} — ${FERTILIZERS[f].description}`, () => void act({ type: 'fertilize', plot: index, fertilizer: f }), 'fert-button', used || !state!.fertilizers[f]));
        }
    }
    detail.append(img, info);
    host.append(detail);
}
function renderBag(host: HTMLElement): void {
    for (const id of sellSelection) if (!state!.produce.some(p=>p.id===id && !p.locked)) sellSelection.delete(id);
    const toolbar = el('div', undefined, 'batch-toolbar');
    toolbar.append(el('h2', `收获篮 · ${state!.produce.length}`), button(sellMode ? '取消' : '批量售出', () => { sellMode=!sellMode; sellSelection.clear(); render(); }));
    if (sellMode) toolbar.append(button('全选', () => { state!.produce.filter(p=>!p.locked).forEach(p=>sellSelection.add(p.id)); render(); }));
    host.append(toolbar);
    const grid = el('div', undefined, 'grid');
    for (const p of state!.produce) {
        const card = el('article', undefined, `card produce-card border-${tier(p.traits)}${sellSelection.has(p.id)?' selected':''}`);
        card.append(art(p.species,p.traits),el('h3',SPECIES[p.species].name),qualityBadge(p),tags(p.traits),el('p',`${p.kg.toFixed(3)} kg · ◉ ${p.value}`));
        card.append(button(p.locked?'★ 已收藏':'☆ 收藏',()=>void act({type:'lock',id:p.id}), 'collection'));
        if (sellMode) card.append(button(sellSelection.has(p.id)?'✓ 已选':'选择',()=>{sellSelection.has(p.id)?sellSelection.delete(p.id):sellSelection.add(p.id);render();},'select-check',!!p.locked));
        else card.append(button('繁育 ♡',()=>{parentId=p.id;render();},'',!canBreed(p)),button(`出售 · ${p.value}`,()=>void act({type:'sell',id:p.id}),'',!!p.locked));
        grid.append(card);
    }
    if (!state!.produce.length) grid.append(el('p','还没有收获','empty'));
    host.append(grid);
    if (sellMode) {
        const total = state!.produce.filter(p=>sellSelection.has(p.id)).reduce((v,p)=>v+p.value,0);
        const bar = el('div',undefined,'batch-bar');
        bar.append(button(`售出 ${sellSelection.size} 份 · ◉ ${total}`,()=>void act({type:'sellMany',ids:[...sellSelection]}),'primary',!sellSelection.size));host.append(bar);
    }
    host.append(el('h2',`种子口袋 · ${state!.seeds.length}`));
    const seeds=el('div',undefined,'grid');
    groupSeeds(state!.seeds).forEach(({seed,count})=>seeds.append(seedCard(seed,undefined,count)));host.append(seeds);
    host.append(el('h2','肥料'));
    const fertilizers=el('div',undefined,'grid');
    for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]) {
        if (!state!.fertilizers[f]) continue;
        const c=el('article',undefined,'card');c.append(fertilizerArt(f),el('h3',`${FERTILIZERS[f].name} ×${state!.fertilizers[f]}`),el('small',FERTILIZERS[f].description));fertilizers.append(c);
    }
    host.append(fertilizers);
}
function fertilizerArt(kind: string): HTMLElement { const item=supplyArt('fertilizer',kind);item.classList.add('fert-art');return item; }
function questPill(): HTMLElement {
    const q=gardenQuest(state!);
    return button(`✿  ${q.text}`,()=>strip?api.open(q.page):go(q.page),'quest-pill');
}
function renderShop(host: HTMLElement): void {
    for (const [id,count] of buySelection) { const o=state!.shop.offers.find(o=>o.id===id); if (!o || !o.stock) buySelection.delete(id); else if (count>o.stock) buySelection.set(id,o.stock); }
    const banner=el('div',undefined,'batch-toolbar');const countdown=el('strong');countdown.id='refresh-clock';
    banner.append(countdown,button(buyMode?'取消':'批量购买',()=>{buyMode=!buyMode;buySelection.clear();render();}));
    if (buyMode) banner.append(button('全选',()=>{state!.shop.offers.filter(o=>o.stock).forEach(o=>buySelection.set(o.id,o.stock));render();}));
    host.append(banner);
    const grid=el('div',undefined,'grid shop-grid');
    for (const o of state!.shop.offers) {
        const quality=o.kind==='seed'?SPECIES[o.item as Species].rarity: FERTILIZERS[o.item as keyof typeof FERTILIZERS].grade===3?'gold':FERTILIZERS[o.item as keyof typeof FERTILIZERS].grade===2?'blue':'normal';
        const card=el('article',undefined,`card shop-card border-${quality}${buySelection.has(o.id)?' selected':''}${!o.stock?' sold-out':''}`);
        const name=o.kind==='seed'?SPECIES[o.item as Species].name:FERTILIZERS[o.item as keyof typeof FERTILIZERS].name;
        card.append(o.kind==='seed'?art(o.item as Species,[],1,'seed'):fertilizerArt(o.item),el('h3',name),el('span',TIER_NAMES[quality],`tag ${quality}`),el('small',o.stock?`剩余 ${o.stock}`:'缺货','stock'));
        if (o.kind === 'seed') card.append(el('small', growthLabel(o.item as Species), 'growth-duration'));
        if (buyMode) {
            const selected=buySelection.has(o.id);
            card.append(button(selected?'✓':'选择',()=>{selected?buySelection.delete(o.id):buySelection.set(o.id,o.stock);render();},'select-check',!o.stock));
            if (selected) {
                const qty=el('div',undefined,'quantity');
                qty.append(button('−',()=>{buySelection.set(o.id,Math.max(1,buySelection.get(o.id)!-1));render();}),el('span',String(buySelection.get(o.id))),button('+',()=>{buySelection.set(o.id,Math.min(o.stock,buySelection.get(o.id)!+1));render();}));card.append(qty);
            }
            card.append(el('span',`◉ ${o.price}`,'unit-price'));
        } else card.append(button(o.stock?`◉ ${o.price}`:'缺货',()=>void act({type:'buy',offer:o.id}),'buy-price',!o.stock||state!.coins<o.price));
        if (o.kind==='fertilizer') card.title=FERTILIZERS[o.item as keyof typeof FERTILIZERS].description;
        grid.append(card);
    }
    host.append(grid);
    if (buyMode) {
        const total=state!.shop.offers.reduce((v,o)=>v+o.price*(buySelection.get(o.id)??0),0),count=[...buySelection.values()].reduce((a,b)=>a+b,0);
        const bar=el('div',undefined,'batch-bar');
        bar.append(el('strong',`◉ ${total.toLocaleString()}`,total>state!.coins?'insufficient':''),button(`购买 ${count} 份`,()=>void act({type:'buyMany',items:[...buySelection].map(([offer,count])=>({offer,count}))}),'primary',!count||total>state!.coins));host.append(bar);
    }
}
function renderBook(host: HTMLElement): void {
    const selector = el('div', undefined, 'plot-picker');
    for (const sp of Object.keys(SPECIES) as Species[])
        selector.append(button(SPECIES[sp].name, () => { selectedSpecies = sp; render(); }, selectedSpecies === sp ? 'active' : ''));
    host.append(selector);
    const sp = selectedSpecies, lv = level(state!.xp[sp]);
    const heading = el('div', undefined, 'book-heading');
    heading.append(art(sp), el('h2', `${SPECIES[sp].name} · Lv.${lv}`), el('p', `${state!.xp[sp]} 经验${lv < LEVEL_XP.length ? ` / 下一级 ${LEVEL_XP[lv]}` : ' · 已达最高等级'}`));
    const xpbar=el('progress');xpbar.max=lv<8?LEVEL_XP[lv]-LEVEL_XP[lv-1]:1;xpbar.value=lv<8?state!.xp[sp]-LEVEL_XP[lv-1]:1;
    heading.append(xpbar);
    const nextFactors=Object.values(TRAITS).filter(t=>t.level===lv+1).map(t=>t.name);
    if(nextFactors.length)heading.append(el('small','下一级解锁：'+nextFactors.join('、'),'muted'));
    host.append(heading);
    host.append(el('p', '每次收获 +10 经验；首次图鉴奖励另加 20 经验和积分。每级生长时间缩短 3%、天气因子概率提高 6%；升级解锁新因子。', 'muted'));
    const grid = el('div', undefined, 'factor-grid');
    for (const t of ['base', ...Object.keys(TRAITS)] as ('base' | Trait)[]) {
        const key = `${sp}:${t}`, unlocked = state!.discovered.includes(key), required = t === 'base' ? 1 : TRAITS[t].level;
        const card = el('article', undefined, `factor ${unlocked ? 'unlocked' : ''}`);
        card.append(art(sp, t === 'base' ? [] : [t]), el('strong', t === 'base' ? '原生' : TRAITS[t].name, t === 'base'?'tag normal':`tag ${TRAITS[t].tier}`), el('span', unlocked ? (state!.claimed.includes(key) ? '✓ 已领取' : '+20 待领取') : lv < required ? `Lv.${required} 开放` : '尚未发现'));
        if (t !== 'base')
            card.append(el('small', `${SLOT_NAMES[traitSlot(t)]} · ${TIER_NAMES[TRAITS[t].tier]}`));
        grid.append(card);
    }
    const count = state!.discovered.filter(k => !state!.claimed.includes(k)).length;
    host.append(grid, button(`一键领取本次积分 · ${count * 20}`, () => void act({ type: 'claim' }), 'primary claim', count === 0));
}
function breeding(host: HTMLElement): void {
    const drawer = el('aside', undefined, 'breed-drawer');
    drawer.append(button('× 取消', () => { parentId = null; render(); }, 'close-drawer'), el('h2', '选另一株亲本'), el('p', '可以跨物种。子代随一方，每个词条 50% 概率继承；亲本保留但各消耗一次繁育资格。', 'muted'));
    const candidates = breedingCandidates();
    for (const p of candidates) {
        const c = el('div', undefined, 'parent-row');
        const where = state!.produce.some(x => x.id === p.id) ? '背包' : '土地';
        c.append(art(p.species, p.traits), el('strong', `${SPECIES[p.species].name} · ${where}`), tags(p.traits), button('与它繁育', () => void act({ type: 'breed', first: parentId!, second: p.id }), 'primary'));
        drawer.append(c);
    }
    if (!candidates.length)
        drawer.append(el('p', '还需要一株未繁育过的成熟植物。'));
    host.append(drawer);
}
function reveal(r: GardenReveal): void {
    document.querySelectorAll('.result-popup').forEach(node => node.remove());
    const card = el('aside', undefined, 'result-popup result-card');
    card.setAttribute('role', 'status');
    const close = () => card.remove();
    const heading = el('div', undefined, 'quick-heading');
    const dismiss = button('×', close, 'quick-close'); dismiss.disabled = false;
    dismiss.setAttribute('aria-label', '关闭');
    heading.append(el('strong', r.title), dismiss);
    card.append(heading);
    resultContents(card, r);
    const done = button('收好', close, 'primary'); done.disabled = false; card.append(done);
    document.body.append(card);
}
function resultContents(body: HTMLElement, r: GardenReveal): void {
    if (r.produce) {
        const p = r.produce;
        body.classList.add('harvest-reveal', `quality-${tier(p.traits)}`);
        body.append(art(p.species, p.traits), el('strong', SPECIES[p.species].name), tags(p.traits), el('div', `${p.kg.toFixed(3)} kg · ◉ ${p.value}`, 'result-stats'));
        body.querySelectorAll<HTMLElement>('.tag').forEach((tag, i) => tag.style.setProperty('--reveal-i', String(i)));
        if (p.traits.length) body.append(el('div', `${p.traits.length} 重变异 · 词条售价 ×${(p.growthVersion===2?mutationMultiplier(p.traits):p.traits.reduce((m,t)=>m*TRAITS[t].multiplier,1)).toFixed(2)}`, 'harvest-multiplier'));
    }
    if (r.seed) {
        body.append(art(r.seed.species, r.seed.genes, 1, 'seed'), el('strong', `${SPECIES[r.seed.species].name} · 繁育种子 ×1`), tags(r.seed.genes), el('small', '重量待成熟后揭晓'));
    }
    if (r.harvests && r.harvests.length > 1) {
        const row=el('div',undefined,'harvest-summary');
        for (const p of r.harvests) { const item=el('div');item.append(art(p.species,p.traits),el('small',SPECIES[p.species].name));row.append(item); }
        body.append(row);
    }
    if (r.message) body.append(el('p', r.message));
}
function time(ms: number): string { const seconds = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
let lastMaturity = '';
function tick(allowRender = true): void {
    if (!state)
        return;
    const now = Date.now();
    const maturity = state.plots.map(p => p ? `${p.id}:${render3d&&growth(p, now)>=.22}:${growth(p, now) >= .55}:${growth(p, now) >= .8}:${p.readyAt <= now}` : '-').join('|');
    if (allowRender && lastMaturity && maturity !== lastMaturity) {
        lastMaturity = maturity;
        render();
        return;
    }
    lastMaturity = maturity;
    document.querySelectorAll<HTMLElement>('[data-plot]').forEach(e => {
        const p = state!.plots[Number(e.dataset.plot)];
        const mark = e.querySelector<HTMLElement>('.plot-mark')!;
        mark.hidden = !p || p.readyAt > now;
        if (p) {
            const ratio = growth(p, now);
            const visualRatio = p.harvestIndex ? .8+ratio*.2 : ratio;
            const a = e.querySelector<HTMLElement>('.art')!;
            a.style.height = `${visualRatio < .55 ? 35 + visualRatio * 60 : (90 + visualRatio * 55) * ((!needsReveal(p) && p.traits.includes('giant')) ? 1.8 : 1)}px`;
            const side = e.parentElement!;
            const width = (!needsReveal(p) && p.traits.includes('giant')) && ratio >= .55 ? 200 : 70;
            const center = Math.max(width / 2, Math.min(e.offsetLeft + e.clientWidth / 2, side.clientWidth - width / 2));
            a.style.width = `${width}px`;
            a.style.left = `${center - e.offsetLeft}px`;
            if(render3d&&p.species==='strawberry'){
                a.style.width=`${p.traits.includes('giant')?150:112}px`;
                a.style.height=`${p.traits.includes('giant')?172:135}px`;
                a.style.left='50%';
            }
        }
    });
    document.querySelectorAll<HTMLElement>('[data-ready]').forEach(e => e.textContent = Number(e.dataset.ready) <= now ? '成熟了！' : `距离成熟 ${time(Number(e.dataset.ready) - now)}`);
    document.querySelectorAll<HTMLProgressElement>('[data-growth]').forEach(e => { const p = state!.plots.find(p => p?.id === e.dataset.growth); if (p)
        e.value = growth(p); });
    document.querySelectorAll<HTMLProgressElement>('[data-cultivation]').forEach(e=>{const p=state!.plots.find(p=>p?.id===e.dataset.cultivation);if(p)e.value=CULTIVATION_MS-cultivationRemaining(p,now);});
    document.querySelectorAll<HTMLElement>('[data-cultivation-label]').forEach(e=>{const p=state!.plots.find(p=>p?.id===e.dataset.cultivationLabel);if(p)e.textContent=(p.cultivation?.startedAt!==undefined?'正在培育 · ':'待培育 · ')+Math.ceil(cultivationRemaining(p,now)/1000)+' 秒';});
    const clock = document.querySelector('#refresh-clock');
    if (strip) { positionQuick(); positionQuest(); }
    if (clock)
        clock.textContent = `下一批 ${time(state.shop.refreshAt - now)}`;
}
api.onAnchor(({ left, right, bottom, top, side }) => {
    gardenDirection = side ?? (left >= innerWidth - right ? 'left' : 'right');
    petBounds = { left, right, top: top ?? bottom + 25 - (right - left), bottom: bottom + 25 };
    document.documentElement.style.setProperty('--pet-left', `${left}px`);
    document.documentElement.style.setProperty('--pet-right', `${right}px`);
    document.documentElement.style.setProperty('--baseline', `${bottom}px`);
    const lane = gardenLane(left, right, innerWidth, gardenDirection);
    document.documentElement.style.setProperty('--garden-left', `${lane.left}px`);
    document.documentElement.style.setProperty('--garden-width', `${lane.width}px`);
    document.documentElement.style.setProperty('--tools-left', `${lane.toolsLeft}px`);
    tick(false);
    positionQuick();
});
api.onChanged(() => void refresh());
api.onPage(next => { go(next); void refresh(); });
if (strip) {
    document.addEventListener('mousemove', e => { pointer = { x: e.clientX, y: e.clientY }; syncStripMouse(); });
    document.addEventListener('mouseleave', () => { pointer = { x: -1, y: -1 }; syncStripMouse(); });
    document.addEventListener('pointerdown', e => { if (!(e.target as Element).closest('.quick-menu,.plot,dialog')) closeQuick(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) closeQuick(); });
    window.addEventListener('blur', () => { if (!document.querySelector('dialog[open]')) closeQuick(); });
}
let ignored = true, pointer = { x: -1, y: -1 };
function syncStripMouse(): void {
    if (!strip) return;
    const target = document.elementFromPoint(pointer.x, pointer.y);
    const next = !document.querySelector('dialog[open]') && !target?.closest('button,.quick-menu');
    if (next !== ignored) { ignored = next; api.ignoreMouse(next); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(true); else if (strip) closeQuick(); });
setInterval(() => { if (!document.hidden) {
    if(page==='weather'){if(weatherStatus){updateWeatherCountdown(root,weatherStatus,weatherStatus.now+Date.now()-weatherReceivedAt);}if(Date.now()-weatherReceivedAt>=5000)void refreshWeather();return;}
    tick();
    if (state && (Date.now() >= state.shop.refreshAt || state.plots.some(p=>p?.cultivation?.startedAt!==undefined)))
        void refresh();
} }, 1000);
void refresh(true);

function positionQuest(): void {
    const quest=root.querySelector<HTMLElement>('.quest-pill'), controls=root.querySelector<HTMLElement>('.garden-controls');
    if (!quest || !controls) return;
    const left=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--garden-left'))||12;
    const center=(petBounds.left+petBounds.right)/2;
    const x=Math.max(8,Math.min(center-quest.offsetWidth/2,innerWidth-quest.offsetWidth-8));
    let top=petBounds.top-quest.offsetHeight-10;
    if (speechBounds && x<speechBounds.right && x+quest.offsetWidth>speechBounds.left && top+quest.offsetHeight>speechBounds.top && top<speechBounds.bottom) top=speechBounds.top-quest.offsetHeight-8;
    quest.style.left=`${x}px`;quest.style.top=`${Math.max(8,top)}px`;
    const baseline=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--baseline'))||petBounds.bottom-25;
    controls.style.left=`${Math.max(8,Math.min(left,innerWidth-controls.offsetWidth-8))}px`;
    controls.style.top=`${Math.max(8,Math.min(innerHeight-controls.offsetHeight-8,baseline+12))}px`;
}

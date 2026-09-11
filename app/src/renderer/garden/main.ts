import './style.css';
import { groupSeeds } from './inventory';
import { gardenIcon } from './icons';
import { quickLayout } from './quick-layout';
import { gardenLane } from '../../shared/garden-layout';
import { supplyArt } from './supply-art';
import { SPECIES, TRAITS, FERTILIZERS, TIER_NAMES, tier, level, growth, type Species, type Trait, type Plant, type Produce, type GardenState, type GardenCommand, type GardenReveal, type Seed } from '../../shared/garden';
const assets = {
    lotus: new URL('./assets/lotus.png', import.meta.url).href,
    strawberry: new URL('./assets/strawberry.png', import.meta.url).href,
    sunflower: new URL('./assets/sunflower.png', import.meta.url).href,
};
const sprout = new URL('./assets/sprout.png', import.meta.url).href;
const api = window.qbot.garden;
const root = document.querySelector<HTMLElement>('#app')!;
const strip = new URLSearchParams(location.search).get('view') === 'strip';
let page = new URLSearchParams(location.search).get('view') ?? 'bag';
let state: GardenState | undefined, busy = false, fetching = false, signature = '', parentId: string | null = null;
let selectedSpecies: Species = 'lotus';
let quickPlot: number | null = null;
let petBounds = { left: 370, right: 730, top: 180, bottom: 540 };
let gardenDirection: 'left' | 'right' = 'left';
let speechBounds: {left:number;right:number;top:number;bottom:number} | null = null;
api.onSpeechBounds(bounds => { speechBounds = bounds; positionQuick(); });
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
    for (const category of ['body', 'accessory'] as const) {
        const group = ts.filter(t => TRAITS[t].category === category);
        if (!group.length) continue;
        const line = el('div', undefined, 'trait-group');
        line.append(el('small', category === 'body' ? '本体' : '配饰', 'trait-label'));
        for (const t of group) line.append(el('span', TRAITS[t].name, `tag ${TRAITS[t].tier}`));
        row.append(line);
    }
    return row;
}
function art(sp: Species, ts: Trait[] = [], ratio = 1): HTMLElement {
    const shown = ratio < .55 ? [] : ts;
    const box = el('div', undefined, `art ${shown.join(' ')} quality-${ratio >= .8 ? tier(shown) : 'normal'}`);
    const img = el('img');
    img.src = ratio < .55 ? sprout : assets[sp];
    img.alt = SPECIES[sp].name;
    img.draggable = false;
    box.append(img);
    for (const t of shown.filter(t => ['punk', 'classical', 'firefly', 'petals'].includes(t))) {
        const layer = el('div', undefined, `accessory-layer fx-${t}`);
        layer.setAttribute('aria-hidden', 'true');
        const symbols = t === 'punk' ? ['ϟ', '♪', 'ϟ', '♫'] : t === 'classical' ? ['♬', '♪', '♫', '♩'] : t === 'petals' ? ['❀', '✿', '❀', '✿'] : ['•', '•', '•', '•'];
        symbols.forEach((symbol, i) => {
            const particle = el('span', symbol);
            particle.style.setProperty('--i', String(i)); layer.append(particle);
        });
        box.append(layer);
    }
    if (shown.includes('twin')) {
        const other = img.cloneNode() as HTMLImageElement;
        other.className = 'twin-copy';
        box.append(other);
    }
    if (shown.includes('shiny'))
        box.append(el('span', '✦', 'spark s1'), el('span', '✧', 'spark s2'), el('span', '✦', 'spark s3'));
    return box;
}
function go(next: string): void { page = next; parentId = null; render(); }
function allParents(): Produce[] { return [...state!.produce, ...state!.plots.filter((p): p is Plant => !!p && p.readyAt <= Date.now())].filter(p => !p.bred); }
async function act(command: GardenCommand): Promise<void> {
    if (busy)
        return;
    busy = true;
    render();
    try {
        const r = await api.act(command);
        if (!r.ok) {
            notice(r.error);
            await refresh(true);
            return;
        }
        state = r.state;
        signature = JSON.stringify(state);
        if (command.type === 'breed')
            parentId = null;
        if (strip && command.type === 'harvest' && r.reveal?.produce) {
            harvestedParent = r.reveal.produce.id;
            harvestedByPlot.set(command.plot, r.reveal.produce.id);
            quickPlot = command.plot;
        }
        if (strip && command.type === 'plant') { harvestedParent = null; harvestedByPlot.delete(command.plot); }
        if (command.type === 'sell')
            notice('已出售，花园币已到账');
        if (command.type === 'buy')
            notice('已放进背包');
        if (command.type === 'fertilize')
            notice('施肥成功');
        if (r.reveal) {
            if (strip && (r.reveal.seed || r.reveal.produce)) quickResult = r.reveal;
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
        state = next;
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
            const a = art(p.species, p.traits, growth(p));
            a.dataset.plant = p.id;
            a.addEventListener('click', event => {
                event.stopPropagation();
                if (busy) return;
                quickPlot = i; parentId = null; quickResult = null; harvestedParent = null;
                if (p.readyAt <= Date.now()) void act({ type: 'harvest', plot: i });
                else render();
            });
            b.append(a);
        }
        else
            b.append(el('span', '+', 'empty-plot'));
        const mark = el('span', undefined, 'plot-mark');
        mark.innerHTML = gardenIcon('ready'); mark.setAttribute('aria-hidden', 'true');
        b.append(el('span', undefined, 'soil'), mark);
        sides[0].append(b);
    });
    const tools = el('nav', undefined, 'garden-tools');
    for (const [name, label] of [['bag', '背包'], ['shop', '商店'], ['book', '图鉴'], ['close', '收起花园']] as const) {
        const control = button('', () => name === 'close' ? api.toggle() : api.open(name), 'garden-icon');
        control.innerHTML = gardenIcon(name); control.title = label; control.setAttribute('aria-label', label);
        tools.append(control);
    }
    root.replaceChildren(...sides, tools);
    tick(false);
    renderQuickMenu();
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
    heading.append(el('strong', quickResult ? (quickResult.seed ? '繁育成功' : '收获成功') : `${index + 1}号地${p ? ` · ${SPECIES[p.species].name}` : ''}`), button('×', closeQuick, 'quick-close'));
    menu.append(heading);
    if (!quickResult) menu.append(inventorySummary());
    const list = el('div', undefined, 'quick-list');
    if (quickResult) {
        resultContents(list, quickResult);
        list.append(button('收好', closeQuick, 'primary'));
    } else if (parentId) {
        const candidates = allParents().filter(x => x.id !== parentId);
        for (const candidate of candidates) {
            const where = state.produce.some(x => x.id === candidate.id) ? '背包' : '土地';
            const row = button('', () => void act({ type: 'breed', first: parentId!, second: candidate.id }), 'quick-row');
            row.append(el('strong', `${SPECIES[candidate.species].name} · ${where}`), tags(candidate.traits));
            list.append(row);
        }
        if (!candidates.length) list.append(el('small', '暂无其他可繁育的成熟植物'));
        list.append(button('返回', () => { parentId = null; render(); }));
    } else if (harvestedParent) {
        const item = state.produce.find(x => x.id === harvestedParent);
        if (item) list.append(button(item.bred ? '已繁育' : '繁育 ♡', () => { parentId = item.id; render(); }, 'quick-row', item.bred));
        list.append(button('播种', () => { harvestedParent = null; render(); }, 'primary'));
    } else if (!p) {
        for (const { seed, count } of groupSeeds(state.seeds)) {
            const row = button('', () => void act({ type: 'plant', plot: index, seed: seed.id }), 'quick-row');
            row.append(supplyArt('seed', seed.species), el('strong', `${SPECIES[seed.species].name} ×${count}`));
            if (seed.bred) row.append(tags(seed.genes));
            list.append(row);
        }
        if (!state.seeds.length) list.append(el('small', '种子用完了'), button('去商店补货', () => api.open('shop')));
    } else if (p.readyAt <= Date.now()) {
        list.append(tags(p.traits), button('收获 ✦', () => void act({ type: 'harvest', plot: index }), 'primary'), button(p.bred ? '已经繁育过' : '繁育 ♡', () => { parentId = p.id; render(); }, '', p.bred));
    } else {
        const status = el('small'); status.dataset.ready = String(p.readyAt); list.append(status);
        for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]) {
            const used = p.fertilizers.includes(f);
            const row = button('', () => void act({ type: 'fertilize', plot: index, fertilizer: f }), 'quick-row', used || !state.fertilizers[f]);
            row.append(supplyArt('fertilizer', f), el('strong', `${FERTILIZERS[f].name.replace('肥料','')} ×${state.fertilizers[f]}`), ...(used ? [el('small','✓')] : []));
            row.title = FERTILIZERS[f].description;
            list.append(row);
        }
        list.append(button('测试：立即成熟', () => void act({ type: 'mature' }), 'test-button'));
    }
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
    if (!state) {
        root.textContent = '正在打开花园…';
        return;
    }
    if (strip) {
        renderStrip();
        return;
    }
    const head = el('header');
    const title = el('div');
    title.append(el('div', '种一点期待', 'eyebrow'), el('h1', '小小花园'), el('p', '今天也有小小的惊喜。', 'subtitle'));
    const money = el('div', undefined, 'wallet');
    money.append(el('small', '花园币'), el('strong', `◉ ${state.coins.toLocaleString()}`));
    head.append(title, money);
    const nav = el('nav', undefined, 'tabs');
    for (const [id, name] of [['plots', '我的土地'], ['bag', '背包'], ['shop', '限时商店'], ['book', '植物图鉴']]) {
        const tab = button('', () => go(id), page === id || (id === 'plots' && page.startsWith('plot:')) ? 'active' : '');
        tab.innerHTML = gardenIcon(id === 'plots' ? 'ready' : id as 'bag'|'shop'|'book');
        tab.append(el('span', name)); nav.append(tab);
    }
    const content = el('section', undefined, `content page-${page.split(':')[0]}`);
    if (page === 'shop')
        renderShop(content);
    else if (page === 'book')
        renderBook(content);
    else if (page === 'plots' || page.startsWith('plot:'))
        renderPlots(content);
    else
        renderBag(content);
    const foot = el('footer');
    foot.append(el('span', 'DEMO · 离线继续生长 · 成熟不枯萎'), button('测试：立即成熟', () => void act({ type: 'mature' }), 'test-button'));
    root.replaceChildren(head, nav, inventorySummary(), content, foot);
    if (parentId)
        breeding(content);
    tick(false);
}
function seedCard(seed: Seed, plot?: number, count = 1): HTMLElement {
    const card = el('article', undefined, 'card seed-card');
    card.append(art(seed.species), el('h3', `${SPECIES[seed.species].name}${seed.bred ? ' · 繁育种子' : '种子'} ×${count}`), el('p', `${SPECIES[seed.species].minutes} 分钟成熟`, 'muted'));
    if (seed.bred) {
        card.append(el('small', '已继承基因', 'muted'), tags(seed.genes));
        if (seed.parents)
            card.append(el('small', seed.parents.map(x => SPECIES[x].name).join(' × ')));
    }
    if (plot !== undefined)
        card.append(button('种在这里', () => void act({ type: 'plant', plot, seed: seed.id }), 'primary'));
    return card;
}
function renderPlots(host: HTMLElement): void {
    const plots = el('div', undefined, 'plot-picker');
    for (let i = 0; i < 6; i++)
        plots.append(button(`${i + 1}号 ${state!.plots[i] ? SPECIES[state!.plots[i]!.species].name : '空地'}`, () => go(`plot:${i}`), page === `plot:${i}` ? 'active' : ''));
    host.append(plots);
    const index = page.startsWith('plot:') ? Number(page.split(':')[1]) : 0;
    const p = state!.plots[index];
    if (!p) {
        host.append(el('h2', `给 ${index + 1} 号土地选一粒种子`), el('p', '种下后，每种肥料各可使用一次。', 'muted'));
        const grid = el('div', undefined, 'grid');
        groupSeeds(state!.seeds).forEach(({ seed, count }) => grid.append(seedCard(seed, index, count)));
        host.append(grid);
        if (!state!.seeds.length)
            host.append(el('p', '背包里还没有种子。去商店看看，或打开陪伴宝箱。'), button('逛商店', () => go('shop'), 'primary'));
        return;
    }
    const detail = el('article', undefined, 'plant-detail');
    const img = art(p.species, p.traits, growth(p));
    img.dataset.detailPlant = p.id;
    const info = el('div');
    info.append(el('div', `${index + 1} 号土地 / ${p.bred ? '已繁育' : '可繁育一次'}`, 'eyebrow'), el('h2', SPECIES[p.species].name));
    const status = el('p', '', 'grow-status');
    status.dataset.ready = String(p.readyAt);
    info.append(status);
    const bar = el('progress');
    bar.max = 1;
    bar.dataset.growth = p.id;
    info.append(bar);
    if (p.readyAt <= Date.now()) {
        info.append(tags(p.traits), el('p', '收获后揭晓重量与售价，也可以先繁育。', 'muted'));
        const actions = el('div', undefined, 'actions');
        actions.append(button('收获 ✦', () => void act({ type: 'harvest', plot: index }), 'primary'), button('繁育 ♡', () => { parentId = p.id; render(); }, '', p.bred));
        info.append(actions);
    }
    else {
        info.append(el('p', '临近成熟时，稀有植株会泛起光芒。', 'muted'));
        for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]) {
            const used = p.fertilizers.includes(f);
            info.append(button(`${FERTILIZERS[f].name} · ${used ? '已使用' : `剩 ${state!.fertilizers[f]}`} — ${FERTILIZERS[f].description}`, () => void act({ type: 'fertilize', plot: index, fertilizer: f }), 'fert-button', used || !state!.fertilizers[f]));
        }
    }
    detail.append(img, info);
    host.append(detail);
}
function renderBag(host: HTMLElement): void {
    host.append(el('h2', `收获篮 · ${state!.produce.length}`), el('p', '珍藏一朵，或让它变成下一粒种子的起点。', 'muted'));
    const grid = el('div', undefined, 'grid');
    for (const p of state!.produce) {
        const card = el('article', undefined, `card produce-card border-${tier(p.traits)}`);
        card.append(art(p.species, p.traits), el('h3', SPECIES[p.species].name), tags(p.traits), el('p', `${p.kg.toFixed(3)} kg · ◉ ${p.value}`), el('small', p.bred ? '已繁育 · 仍可出售' : '可繁育一次', 'muted'));
        card.append(button('繁育 ♡', () => { parentId = p.id; render(); }, '', p.bred), button(`出售 · ${p.value} 币`, () => {
            const existing = card.querySelector('.sell-confirm');
            if (existing)
                return;
            const row = el('div', undefined, 'sell-confirm');
            row.append(el('small', '出售后无法再繁育或取回。'), button('确认出售', () => void act({ type: 'sell', id: p.id }), 'primary'), button('取消', () => row.remove()));
            card.append(row);
        }));
        grid.append(card);
    }
    if (!state!.produce.length)
        grid.append(el('p', '篮子还是空的。成熟后收获的植物会放在这里。', 'empty'));
    host.append(grid, el('h2', `种子口袋 · ${state!.seeds.length}`));
    const seeds = el('div', undefined, 'grid');
    groupSeeds(state!.seeds).forEach(({ seed, count }) => seeds.append(seedCard(seed, undefined, count)));
    host.append(seeds);
    host.append(button('去土地种植 →', () => go('plots'), 'primary'), el('h2', '肥料'));
    const fertilizers = el('div', undefined, 'grid');
    for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]) {
        const c = el('article', undefined, 'card');
        c.append(fertilizerArt(f), el('h3', `${FERTILIZERS[f].name} × ${state!.fertilizers[f]}`), el('p', FERTILIZERS[f].description));
        fertilizers.append(c);
    }
    host.append(fertilizers);
}
function fertilizerArt(kind: string): HTMLElement {
    const item = el('div', undefined, 'fert-art');
    const color = kind === 'speed' ? '#edbd70' : kind === 'mutation' ? '#c5a7d7' : '#8bbbad';
    const mark = kind === 'speed' ? '↗' : kind === 'mutation' ? '✦' : '+';
    item.innerHTML = `<svg viewBox="0 0 80 90" aria-hidden="true"><path d="M26 10h28l-3 15q16 16 14 49Q40 85 15 74q-2-33 14-49Z" fill="${color}" stroke="#635d47" stroke-width="3" stroke-linejoin="round"/><path d="M27 25h26M26 15h28" stroke="#635d47" stroke-width="3"/><ellipse cx="40" cy="53" rx="16" ry="18" fill="#fff4d8"/><text x="40" y="63" text-anchor="middle" font-size="28" fill="#635d47">${mark}</text></svg>`;
    return item;
}
function renderShop(host: HTMLElement): void {
    const banner = el('div', undefined, 'shop-banner');
    banner.append(el('h2', '今天会遇见什么？'), el('p', '每 5 分钟更新一批，售完就等下一次。'));
    const countdown = el('strong');
    countdown.id = 'refresh-clock';
    banner.append(countdown);
    host.append(banner);
    const grid = el('div', undefined, 'grid');
    for (const o of state!.shop.offers) {
        const card = el('article', undefined, 'card');
        if (o.kind === 'seed')
            card.append(art(o.item as Species));
        else
            card.append(fertilizerArt(o.item));
        const name = o.kind === 'seed' ? `${SPECIES[o.item as Species].name}种子` : FERTILIZERS[o.item as keyof typeof FERTILIZERS].name;
        card.append(el('h3', name), el('p', `本批剩余 ${o.stock} 件`, 'muted'), button(o.stock ? `◉ ${o.price} · 买一份` : '本批售罄', () => void act({ type: 'buy', offer: o.id }), 'primary', !o.stock || state!.coins < o.price));
        grid.append(card);
    }
    host.append(grid, el('p', '卖出收获可获得花园币。陪伴宝箱也会开出种子和肥料。', 'muted'));
}
function renderBook(host: HTMLElement): void {
    const selector = el('div', undefined, 'plot-picker');
    for (const sp of Object.keys(SPECIES) as Species[])
        selector.append(button(SPECIES[sp].name, () => { selectedSpecies = sp; render(); }, selectedSpecies === sp ? 'active' : ''));
    host.append(selector);
    const sp = selectedSpecies, lv = level(state!.xp[sp]);
    const heading = el('div', undefined, 'book-heading');
    heading.append(art(sp), el('h2', `${SPECIES[sp].name} · Lv.${lv}`), el('p', `${state!.xp[sp]} 经验${lv < 3 ? ` / 下一级 ${lv * 40}` : ' · 已达 demo 最高等级'}`));
    host.append(heading);
    host.append(el('p', '首次收获解锁因子。每项奖励 20 积分与 20 点物种经验；升级开放新的随机因子。', 'muted'));
    const grid = el('div', undefined, 'factor-grid');
    for (const t of ['base', ...Object.keys(TRAITS)] as ('base' | Trait)[]) {
        const key = `${sp}:${t}`, unlocked = state!.discovered.includes(key), required = t === 'base' ? 1 : TRAITS[t].level;
        const card = el('article', undefined, `factor ${unlocked ? 'unlocked' : ''}`);
        card.append(art(sp, t === 'base' ? [] : [t]), el('strong', t === 'base' ? '原生' : TRAITS[t].name), el('span', unlocked ? (state!.claimed.includes(key) ? '✓ 已领取' : '+20 待领取') : lv < required ? `Lv.${required} 开放` : '尚未发现'));
        if (t !== 'base')
            card.append(el('small', `${TRAITS[t].category === 'body' ? '本体' : '配饰'} · ${TIER_NAMES[TRAITS[t].tier]}`));
        grid.append(card);
    }
    const count = state!.discovered.filter(k => !state!.claimed.includes(k)).length;
    host.append(grid, button(`一键领取本次积分 · ${count * 20}`, () => void act({ type: 'claim' }), 'primary claim', count === 0));
}
function breeding(host: HTMLElement): void {
    const drawer = el('aside', undefined, 'breed-drawer');
    drawer.append(button('× 取消', () => { parentId = null; render(); }, 'close-drawer'), el('h2', '选另一株亲本'), el('p', '可以跨物种。子代随一方，每个词条 50% 概率继承；亲本保留但各消耗一次繁育资格。', 'muted'));
    const candidates = allParents().filter(p => p.id !== parentId);
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
        body.append(art(p.species, p.traits), el('strong', SPECIES[p.species].name), tags(p.traits), el('div', `${p.kg.toFixed(3)} kg · ◉ ${p.value}`, 'result-stats'));
    }
    if (r.seed) {
        body.append(art(r.seed.species, r.seed.genes), el('strong', `${SPECIES[r.seed.species].name} · 繁育种子 ×1`), tags(r.seed.genes), el('small', '重量待成熟后揭晓'));
    }
    if (r.message) body.append(el('p', r.message));
}
function time(ms: number): string { const seconds = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
let lastMaturity = '';
function tick(allowRender = true): void {
    if (!state)
        return;
    const now = Date.now();
    const maturity = state.plots.map(p => p ? `${p.id}:${growth(p, now) >= .55}:${growth(p, now) >= .8}:${p.readyAt <= now}` : '-').join('|');
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
            const a = e.querySelector<HTMLElement>('.art')!;
            a.style.height = `${ratio < .55 ? 35 + ratio * 60 : (90 + ratio * 55) * (p.traits.includes('giant') ? 1.8 : 1)}px`;
            const side = e.parentElement!;
            const width = p.traits.includes('giant') && ratio >= .55 ? 200 : 70;
            const center = Math.max(width / 2, Math.min(e.offsetLeft + e.clientWidth / 2, side.clientWidth - width / 2));
            a.style.width = `${width}px`;
            a.style.left = `${center - e.offsetLeft}px`;
        }
    });
    document.querySelectorAll<HTMLElement>('[data-ready]').forEach(e => e.textContent = Number(e.dataset.ready) <= now ? '成熟了！' : `距离成熟 ${time(Number(e.dataset.ready) - now)}`);
    document.querySelectorAll<HTMLProgressElement>('[data-growth]').forEach(e => { const p = state!.plots.find(p => p?.id === e.dataset.growth); if (p)
        e.value = growth(p); });
    const clock = document.querySelector('#refresh-clock');
    if (strip) positionQuick();
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
    tick();
    if (state && Date.now() >= state.shop.refreshAt)
        void refresh();
} }, 1000);
void refresh(true);

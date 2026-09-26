import { renderCharacterHeader } from './character-header';
import type { CharacterMeta } from '../../shared/ipc-types';
import { MAX_GARDEN_PLOTS, FRUIT_DRAG_TYPE, emptyPlots, feedingWish, unlockedPlots, visiblePlot } from '../../shared/garden-progression';
import { renderWeatherCard, updateWeatherCountdown } from './weather-card';
import {renderDaily,renderSprays,renderFriends,renderVisit,applyDye,inviteGardenFriend} from './life';
import type { GardenWeatherStatus } from '../../shared/garden-weather';
import { renderTravel, celebrateTravel } from './travel';
import './style.css';
import { groupSeeds } from './inventory';
import { gardenIcon } from './icons';
import { quickLayout } from './quick-layout';
import { gardenLane } from '../../shared/garden-layout';
import { botanicalArt } from './botanical-art';
import { juvenileArt } from './juvenile-art';
import { secretGrowth } from './secret-growth';
import { attachMutationEffects } from './mutation-effects';
import { supplyArt } from './supply-art';
import { mountStrawberry3D } from './strawberry-3d.js';
import { mountPineapple3D } from './pineapple-3d.js';
import { supportsGarden3D } from '../../shared/garden-render';
import { SPECIES, TRAITS, FERTILIZERS, TIER_NAMES, LEVEL_XP, CULTIVATION_MS, fruitQuality, traitSlot, SLOT_NAMES, canBreed, needsReveal, cultivationRemaining, mutationMultiplier, gardenQuest, tier, level, growth, growthLabel, type Species, type Trait, type Plant, type Produce, type GardenState, type GardenCommand, type GardenReveal, type Seed } from '../../shared/garden';
import { traitSource, wishMatches, wishLabel } from '../../shared/garden-life';
import {cultivationFraction,cultivationHintPosition} from '../../shared/cultivation-hint';
import {renderAppraisal,renderProvenance,renderV3Breeding,renderNotebook,renderV3Weather} from './v3';
import {V3_XP,AFFINITIES,speciesLevel,fertilizerDescription,scoreOf} from '../../shared/garden-v3';
import './v3.css';
const sprout = new URL('./assets/sprout.png', import.meta.url).href;
const api = window.qbot.garden;
const root = document.querySelector<HTMLElement>('#app')!;
const strip = new URLSearchParams(location.search).get('view') === 'strip';
window.qbot.overlays.onChanged(s=>{document.body.dataset.headOverlay=s.winner??'';if(strip){positionQuest();requestAnimationFrame(syncStripMouse);}});
let render3d=false;
function setRenderMode(settings: {gardenRenderMode?: string}): void {
    const next=settings.gardenRenderMode==='3d';
    if(next===render3d)return;
    render3d=next;document.body.classList.toggle('garden-3d',next);render();
}
window.qbot.settings.onChanged(setRenderMode);
void window.qbot.settings.get().then(setRenderMode).catch(()=>{});
let page = new URLSearchParams(location.search).get('view') ?? 'bag';
let weatherStatus:GardenWeatherStatus|undefined,weatherReceivedAt=0,weatherFetching=false,v3WeatherHour=-1;
function showWeather(status:GardenWeatherStatus):void {
 renderWeatherCard(root,status);
 if(new URLSearchParams(location.search).get('view')!=='weather')root.prepend(button('← 返回花园',()=>go('plots'),'weather-back'));
}
async function refreshWeather(){if(state?.v3||weatherFetching||page!=='weather')return;weatherFetching=true;try{weatherStatus=await api.weather();weatherReceivedAt=Date.now();if(page==='weather'&&!state?.v3)showWeather(weatherStatus);}catch{if(page==='weather'&&!state?.v3)root.textContent='天气暂时无法读取，稍后自动重试。';}finally{weatherFetching=false;}}
let state: GardenState | undefined, busy = false, fetching = false, signature = '', parentId: string | null = null;
let buyMode = false, sellMode = false;
let characters: CharacterMeta[] = [], draggingFruit = false, switchingActor = false;
let actorRevision = 0;
async function loadCharacters() {
    try { characters = await window.qbot.characters.list(); if (!strip) render(); } catch { /* The garden remains usable while character metadata is unavailable. */ }
}
async function switchActor(id: string) {
    if (busy || switchingActor) throw Error('请等待当前操作完成');
    actorRevision++; switchingActor = true; busy = true; render();
    try { await window.qbot.characters.activate(id); const next = await api.get(); state = next; signature = JSON.stringify(next); }
    finally { switchingActor = false; busy = false; render(); }
}
function feedFruit(id: string, actor: string | undefined) {
    if (!state || busy) return;
    draggingFruit = false;
    if (!actor || actor !== state.activeActor) { notice('角色已切换，请重新选择果实。'); return; }
    const fruit = state.produce.find(p => p.id === id), wish = fruit && feedingWish(state, fruit);
    if (!fruit || !wish) { notice('这颗果实不符合今日心愿，或正在收藏、鉴定中。'); return; }
    void act({ type: 'feed', wish: wish.id, produce: id, actor });
}
const buySelection = new Map<string, number>();
const sellSelection = new Set<string>();
let selectedSpecies: Species = 'lotus';
let quickPlot: number | null = null;
let petBounds = { left: 370, right: 730, top: 180, bottom: 540 };
let performerBounds:typeof petBounds|undefined;
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
    for (const category of ['fruit', 'skin', 'accessory','size'] as const) {
        const group = ts.filter(t => traitSlot(t) === category);
        if (!group.length) continue;
        const line = el('div', undefined, 'trait-group');
        line.append(el('small', SLOT_NAMES[category], 'trait-label'));
        for (const t of group) line.append(el('span', TRAITS[t].name, `tag ${TRAITS[t].tier}`));
        row.append(line);
    }
    return row;
}
function art(sp: Species, ts: Trait[] = [], ratio = 1, mode: 'fruit'|'plant'|'seed' = 'fruit', regrowing = false, quality?: ReturnType<typeof fruitQuality>): HTMLElement {
    // Growing plants may show their species, but no trait appearance until maturity.
    const shown = mode === 'plant' && ratio < 1 ? [] : ts;
    const box = el('div', undefined, `art ${shown.join(' ')} quality-${ratio >= .8 ? (quality ?? tier(shown)) : 'normal'}`);
    box.dataset.species = sp;
    box.dataset.artMode = mode;
    if (mode === 'plant' && ratio < 1 && (ratio >= .22 || regrowing)) {
        box.append(juvenileArt(sp));
        return box;
    }
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
    img.src = mode === 'plant' && ratio < .55 && !regrowing ? sprout : botanicalArt(sp, mode);
    img.alt = SPECIES[sp].name;
    img.draggable = false;
    box.append(img);
    if (shown.includes('twin')) {
        const other = img.cloneNode() as HTMLImageElement;
        other.className = 'twin-copy';
        box.append(other);
    }
    attachMutationEffects(box, img.src, shown, quality === 'gold' && (mode !== 'plant' || ratio >= 1));
    if(render3d&&sp==='strawberry'&&(mode!=='plant'||ratio>=1))mountStrawberry3D(box,{mode,ratio,traits:shown,regrowing});
    if(render3d&&sp==='pineapple'&&(mode!=='plant'||ratio>=1))mountPineapple3D(box,{mode,ratio,traits:shown});
    return box;
}
function produceArt(p: Produce): HTMLElement { return art(p.species, p.traits, 1, 'fruit', false, fruitQuality(p.traits,p)); }
function cultivationActive(p:Plant):boolean {return p.cultivation?.startedAt!==undefined||!!state?.cooperations?.some(t=>t.plant===p.id&&!t.done&&Object.values(t.members).some(m=>m.seenAt+15000>Date.now()));}
function plantArt(p: Plant): HTMLElement {
    if (needsReveal(p) && (p.readyAt <= Date.now() || growth(p) >= .55)) return secretGrowth(fruitQuality(p.traits,p), true, cultivationActive(p));
    const result = art(p.species, needsReveal(p)?[]:p.traits, growth(p), 'plant', !!p.harvestIndex, fruitQuality(p.traits,p));
    if (p.readyAt > Date.now()) {
        const quality = fruitQuality(p.traits,p);
        result.classList.remove('quality-normal');
        result.classList.add('growing-quality', `quality-${quality}`);
        result.dataset.growingQuality = quality;
        result.setAttribute('aria-label', `${SPECIES[p.species].name}，${TIER_NAMES[quality]}品质，生长中`);
    }
    return p.readyAt > Date.now() || needsReveal(p) ? result : applyDye(result,p);
}
function qualityBadge(p: Produce): HTMLElement { const q=fruitQuality(p.traits,p);return el('span',TIER_NAMES[q]+'果实','tag '+q); }
function plantActions(host:HTMLElement,p:Plant,index:number):void {

    host.append(qualityBadge(p));
    if (needsReveal(p)) {
        host.append(el('p','？ ？ ？ · 培育完成后揭晓','muted'));
        const progress=el('progress');progress.max=p.growthVersion===3?180000:CULTIVATION_MS;progress.value=progress.max-cultivationRemaining(p,Date.now());progress.dataset.cultivation=p.id;host.append(progress);
        const label=el('small',Math.ceil(cultivationRemaining(p,Date.now())/1000)+' 秒');label.dataset.cultivationLabel=p.id;host.append(label);
        if(state?.online)host.append(button('邀请好友培育',()=>{void inviteGardenFriend(state!.life!.owner,index,notice).catch(e=>notice(String(e)));}));
        if(state?.online){host.append(el('p',`大家一起培育会更快，好奖励的概率也更高。今日还可领取 ${state.cooperationRewardsLeft??5} 次物资${state.cooperationRewardsLeft===0?'；仍可加速和留共同记录':''}。`),button('培育 · 单人约 3 分钟',()=>void act({type:'cultivate',plot:index}),'primary'),button('暂停培育',()=>void act({type:'pauseCultivation',plot:index})),button('查看共同培育',()=>go('visit:'+state!.life!.owner)),button(state!.rehearsal?'邀请所有测试伙伴':'分享到世界',()=>{void api.cooperate(state!.life!.owner,index,'share').then(()=>notice(state!.rehearsal?'测试伙伴已加入待培育名单':'已分享到世界频道')).catch(e=>notice(String(e)));}));return;}
        host.append(el('p','彩色惊喜尚未揭晓 · 陪它完成培育','muted'));
        const active=p.cultivation?.startedAt!==undefined;
        host.append(button(active?'暂停培育':p.cultivation?'继续培育':p.growthVersion===3?'培育 · 约 3 分钟':'培育 · 约 3 分钟',()=>void act({type:active?'pauseCultivation':'cultivate',plot:index}),'primary'));
    } else {
        host.append(tags(p.traits),el('small',p.kg.toFixed(3)+' kg · ◉ '+p.value,'muted'),button('收获 ✦',()=>void act({type:'harvest',plot:index}),'primary'),button(p.bred?'已经繁育过':'与背包果实繁育 ♡',()=>{parentId=p.id;render();},'',!canBreed(p)));
        if (!canBreed(p)&&!p.bred) host.append(el('small','金色及以上品质可以繁育','muted'));
        renderProvenance(host,p);renderAppraisal(host,p,state!,act);
        const sprays=el('details',undefined,'plot-sprays');sprays.open=state!.life?.pending?.target===p.id;sprays.append(el('summary','🧴 使用喷雾'));
        renderSprays(sprays,{state:state!,act,go,refresh:()=>refresh(true),notice,busy,plantArt},p.id);host.append(sprays);
    }
}
function breedingCandidates(): Produce[] {
    const inPlot=state!.plots.some(p=>p?.id===parentId);
    return allParents().filter(p=>p.id!==parentId&&(inPlot?state!.produce.some(x=>x.id===p.id):state!.plots.some(x=>x?.id===p.id)));
}
function go(next: string): void { if(strip){api.open(next);return;} document.querySelectorAll('.result-popup').forEach(n=>n.remove()); page = next; parentId = null; buyMode = sellMode = false; buySelection.clear(); sellSelection.clear(); render(); }
function allParents(): Produce[] { return [...state!.produce, ...state!.plots.filter((p): p is Plant => !!p && p.readyAt <= Date.now())].filter(p=>canBreed(p)&&!('batch'in p&&(p as Plant).batch?.candidates.length)&&(!state!.v3?.appraisals[p.id]||state!.v3.appraisals[p.id].done)); }
async function act(command: GardenCommand, onSuccess?:()=>void): Promise<void> {
    if(render3d&&(command.type==='plant'||command.type==='plantMany')&&!supportsGarden3D(state?.seeds.find(s=>s.id===command.seed)?.species)){
        notice('3D 模式支持草莓和菠萝；其他植物可切回 2D 后播种。');return;
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
        onSuccess?.();
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
        if (command.type === 'feed') notice('投喂成功，角色经验已增加');
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
    if (fetching || switchingActor || draggingFruit)
        return;
    fetching = true;
    const revision = actorRevision;
    try {
        const next = await api.get();
        if (revision !== actorRevision || switchingActor) return;
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
        if (revision !== actorRevision && !switchingActor) void refresh(true);
    }
}
function renderStrip(): void {
    let cultivationHint: HTMLElement | undefined;
    const sides = [el('section', undefined, 'soil-side single')];
    sides[0].style.gridTemplateColumns = `repeat(${MAX_GARDEN_PLOTS}, minmax(0, 1fr))`;
    state!.plots.forEach((p, i) => {
        if (!state!.cultivationVisit && !visiblePlot(state!, i)) return;
        const b = button('', () => {
            quickPlot = i; parentId = null; quickResult = null; harvestedParent = harvestedByPlot.get(i) ?? null;
            render();
        }, 'plot');
        b.disabled=!!state!.cultivationVisit;
        b.setAttribute('aria-label', `${i + 1}号土地${p ? ` ${SPECIES[p.species].name}` : ' 种植'}`);
        b.dataset.plot = String(i); b.style.gridColumn = String(i + 1);
        if (p) {
            const a = plantArt(p);
            a.dataset.plant = p.id;
            a.addEventListener('click', event => {
                event.stopPropagation();
                if (busy||state!.cultivationVisit) return;
                quickPlot = i; parentId = null; quickResult = null; harvestedParent = null;
                render();
            });
            b.append(a);
            if(needsReveal(p)&&cultivationActive(p))b.append(el('span','🔎','research-mark'));
        }
        else {
            b.append(el('span', '+', 'empty-plot'));
            if(render3d){const soil=el('div',undefined,'art soil-3d');mountStrawberry3D(soil,{mode:'soil'});b.prepend(soil);}
        }
        b.classList.toggle('plot-3d',render3d&&(!p||supportsGarden3D(p.species)));
        const mark = el('span', undefined, 'plot-mark');
        mark.innerHTML = gardenIcon('ready'); mark.setAttribute('aria-hidden', 'true');
        b.append(el('span', undefined, 'soil'), mark);
        sides[0].append(b);
    });
    const activePlot=state!.plots.findIndex(p=>p&&needsReveal(p)&&p.cultivation?.startedAt!==undefined);
    if(state!.cultivationVisit||activePlot>=0){
        const visit=state!.cultivationVisit,controls=el('div',undefined,'garden-controls cultivation-hint');
        const progress=el('progress');progress.max=1;progress.className='cultivation-hint-progress';progress.setAttribute('aria-label','培育进度');
        controls.dataset.cultivationPlot=String(visit?.plot??activePlot);
        const pause=button('暂停',()=>{if(visit)void api.cooperate(visit.owner,visit.plot,'leave').then(()=>refresh(true)).catch(e=>notice(String(e)));else void act({type:'pauseCultivation',plot:activePlot});},'cultivation-pause');
        pause.setAttribute('aria-label','暂停培育');
        controls.append(el('span','正在培育神秘果实','cultivation-hint-title'),pause,progress);
        cultivationHint=controls;
    }
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
    const handle = button('⠿', () => {}, 'strip-drag');
    handle.title = '拖动农场'; handle.setAttribute('aria-label', '拖动农场');
    const collapse = button('×', () => api.collapse(), 'strip-collapse');
    collapse.title = '收起农场'; collapse.setAttribute('aria-label', '收起农场');
    controls.append(handle, tools, harvest, sow, collapse);
    root.replaceChildren(...sides, controls, quest, ...(cultivationHint?[cultivationHint]:[]));
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
    } else if (parentId) {
        const candidates = breedingCandidates();
        if(state.v3)list.append(button('查看概率、精油与完整配对',()=>api.open('bag')));
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
        for (const { seed, count } of groupSeeds(state.seeds.filter(s=>!render3d||supportsGarden3D(s.species)))) {
            const row = button('', () => void act({ type: 'plant', plot: index, seed: seed.id }), 'quick-row');
            row.append(supplyArt('seed', seed.species), el('strong', `${SPECIES[seed.species].name} ×${count}`),el('small',growthLabel(seed.species,state),'growth-duration'));
            if (seed.genes.length) row.append(tags(seed.genes));
            list.append(row);
        }
        if (!state.seeds.length) list.append(el('small', '种子用完了'), button('去商店补货', () => api.open('shop')));
    } else if (p.readyAt <= Date.now()) {
        plantActions(list,p,index);
    } else {
        const status = el('small'); status.dataset.ready = String(p.readyAt); list.append(status);
        for (const f of Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]) {
            const used = p.fertilizers.length > 0 || !!p.batch?.settled;
            if (!state.fertilizers[f]) continue;
            const row = button('', () => void act({ type: 'fertilize', plot: index, fertilizer: f }), 'quick-row', used || !state.fertilizers[f]);
            row.append(supplyArt('fertilizer', f), el('strong', `${FERTILIZERS[f].name.replace('肥料','')} ×${state.fertilizers[f]}`), ...(used ? [el('small','✓')] : []));
            row.title = state.v3?fertilizerDescription(f):FERTILIZERS[f].description;
            list.append(row);
        }
        if(!state.online||state.rehearsal)list.append(button('测试：立即成熟', () => void act({ type: 'mature' }), 'test-button'));
        else list.append(el('small','联机作物按实际时间生长，立即成熟仅限本地花园或试演。','muted'));
    }
    if (p && !quickResult && !parentId) list.append(button(p.keep ? '✓ 留养中' : '留养', () => void act({type:'keep',plot:index}), 'keep-button'));
    menu.append(list);
    if (quickResult) resultActions(menu, quickResult, closeQuick);
    root.append(menu); positionQuick();
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
    if (draggingFruit || dragPointer!==null) return;
    if (page === 'feeding') page = 'bag';
    document.body.classList.toggle('weather-mode',page==='weather');
    if(page==='weather'&&state?.v3){v3WeatherHour=Math.floor(Date.now()/3600000);root.replaceChildren();renderV3Weather(root,state,()=>go('plots'));return;}
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
    const head = renderCharacterHeader({state, characters, busy, act, switchActor, feed:feedFruit, notice});
    const nav = el('nav', undefined, 'tabs');
    for (const [id, name] of [['bag', '背包'], ['shop', '商店'], ['book', '植物图鉴']]) {
        const tab = button('', () => go(id), page === id || (id === 'shop' && page==='daily') ? 'active' : '');
        tab.innerHTML = gardenIcon(id as 'bag'|'shop'|'book');
        tab.append(el('span', name)); nav.append(tab);
    }
    nav.append(button('天气',()=>go('weather')),button('世界旅行',()=>go('travel')),button('朋友圈',()=>go('moments')));
    nav.prepend(button('土地',()=>go('plots'),page==='plots'||page.startsWith('plot:')?'active':''));
    nav.append(button('朋友花园',()=>go('friends')));
    if(state.v3)nav.append(button('花园手册',()=>go('notebook')));
    const content = el('section', undefined, `content page-${page.split(':')[0]}`);
    const lifeContext={state,act,go,refresh:()=>refresh(true),notice,busy,plantArt};
    if(state.life?.pending&&page!=='sprays')content.append(button('继续处理喷雾结果',()=>go('sprays'),'primary'));
    if(page==='notebook'&&state.v3)renderNotebook(content,state,act,go);
    else if(page==='daily'||page==='shop'){
        const tabs=el('nav',undefined,'tabs shop-tabs');tabs.setAttribute('aria-label','商店分类');
        tabs.append(button('今日小店',()=>go('daily'),page==='daily'?'active':''),button('种植补给',()=>go('shop'),page==='shop'?'active':''));content.append(tabs);
        if(page==='daily')renderDaily(content,lifeContext);else renderShop(content);
    }
    else if(page==='sprays')renderSprays(content,lifeContext);
    else if(page==='friends')renderFriends(content,lifeContext);
    else if(page.startsWith('visit:'))renderVisit(content,lifeContext,page.slice(6));
    else if (page === 'sow')
        renderSowing(content);
    else if (page === 'book')
        renderBook(content);
    else if (page === 'plots' || page.startsWith('plot:'))
        renderPlots(content);
    else
        renderBag(content);
    const foot = el('footer');
    const display=button(render3d?'3D · 切回手绘':'手绘 · 试试3D',()=>{ void window.qbot.settings.set({gardenRenderMode:render3d?'2d':'3d'}).catch(()=>notice('画面切换失败，请重试')); },'garden-render-toggle');
    display.setAttribute('aria-label','切换种植画面'); foot.append(display);
    foot.append(el('span', state.rehearsal?'本地试演 · 全部为模拟资产 · 退出试演后恢复正式花园':state.online?'联机花园 · 由服务器保存':'本地花园 · 离线继续生长 · 成熟不枯萎'));
    if(!state.online||state.rehearsal)foot.append(button('测试：立即成熟', () => void act({ type: 'mature' }), 'test-button'));
    root.replaceChildren(head, questPill(), nav, content, foot);
    if (parentId)
        breeding(content);
    tick(false);
}
function seedCard(seed: Seed, plot?: number, count = 1): HTMLElement {
    const card = el('article', undefined, 'card seed-card');
    card.append(art(seed.species, seed.genes, 1, 'seed'), el('h3', `${SPECIES[seed.species].name}${seed.bred ? ' · 繁育种子' : '种子'} ×${count}`), el('p', growthLabel(seed.species,state), 'muted'));
    if (seed.genes.length || seed.bred) {
        card.append(tags(seed.genes));
        if (seed.parents)
            card.append(el('small', seed.parents.map(x => SPECIES[x].name).join(' × ')));
    }
    if(render3d&&!supportsGarden3D(seed.species)){card.append(el('small','切回 2D 后可播种','muted'));return card;}
    if (plot !== undefined)
        card.append(button('种在这里', () => void act({ type: 'plant', plot, seed: seed.id }), 'primary'));
    const countToPlant = Math.min(count, emptyPlots(state!));
    card.append(button(`批量播种 · ${countToPlant} 块`, () => void act({type:'plantMany',seed:seed.id}), 'primary batch-sow', !countToPlant));
    return card;
}
function renderSowing(host: HTMLElement): void {
    const empty = emptyPlots(state!);
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
    for (let i = 0; i < state!.plots.length; i++) if (visiblePlot(state!, i))
        plots.append(button(`${i + 1}号 ${state!.plots[i] ? SPECIES[state!.plots[i]!.species].name : '空地'}`, () => go(`plot:${i}`), page === `plot:${i}` ? 'active' : ''));
    host.append(plots, button(`一键采摘 · ${state!.plots.filter(p=>p && p.readyAt<=Date.now() && !p.keep && !needsReveal(p)).length}`, () => void act({type:'harvestMany'}), 'primary', !state!.plots.some(p=>p && p.readyAt<=Date.now() && !p.keep && !needsReveal(p))));
    const index = page.startsWith('plot:') ? Number(page.split(':')[1]) : 0;
    const p = state!.plots[index];
    if (!p && index >= unlockedPlots(state!)) { host.append(el('p', `这块土地在角色 Lv.${index - 1} 解锁。`)); return; }
    if (!p) {
        host.append(el('h2', `给 ${index + 1} 号土地选一粒种子`), el('p', state!.v3?'每轮幼苗期可施肥一次，再生后重新选择。':'每株只施肥一次，覆盖全部采摘。', 'muted'));
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
            const used = p.fertilizers.length > 0 || !!p.batch?.settled;
            if (!state!.fertilizers[f]) continue;
            info.append(button(`${FERTILIZERS[f].name} · ${used ? '本轮不能施肥' : `剩 ${state!.fertilizers[f]}`} — ${state!.v3?fertilizerDescription(f):FERTILIZERS[f].description}`, () => void act({ type: 'fertilize', plot: index, fertilizer: f }), 'fert-button', used || !state!.fertilizers[f]));
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
        card.append(applyDye(produceArt(p),p),el('h3',SPECIES[p.species].name),qualityBadge(p),tags(p.traits),el('p',`${p.kg.toFixed(3)} kg · ◉ ${p.value}`));
        card.dataset.produce = p.id;
        card.draggable = !busy && !!feedingWish(state!,p);
        card.ondragstart = e => {
            if (busy || !e.dataTransfer || !feedingWish(state!,p)) { e.preventDefault(); return; }
            draggingFruit = true; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData(FRUIT_DRAG_TYPE, JSON.stringify({id:p.id, actor:state!.activeActor}));
        };
        card.ondragend = () => { draggingFruit=false; document.querySelector('.feeding-over')?.classList.remove('feeding-over'); render(); };
        renderProvenance(card,p);renderAppraisal(card,p,state!,act);
        if (!sellMode && feedingWish(state!,p)) { const actor=state!.activeActor; card.append(button('投喂',()=>feedFruit(p.id,actor),'primary')); }
        card.append(button(p.locked?'★ 已收藏':'☆ 收藏',()=>void act({type:'lock',id:p.id}), 'collection'));
        if (sellMode) card.append(button(sellSelection.has(p.id)?'✓ 已选':'选择',()=>{sellSelection.has(p.id)?sellSelection.delete(p.id):sellSelection.add(p.id);render();},'select-check',!!p.locked));
        else card.append(button('繁育 ♡',()=>{parentId=p.id;render();},'',!canBreed(p)),button(`出售 · ${p.value}`,()=>void act({type:'sell',id:p.id}),'',!!p.locked));
        grid.append(card);
    }
    if (!state!.produce.length) grid.append(el('p','还没有收获','empty'));
    host.append(grid);
    if(state!.produce.length)host.append(el('small','把符合心愿的果实拖到上方角色处投喂。','muted'));
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
        const c=el('article',undefined,'card');c.append(fertilizerArt(f),el('h3',`${FERTILIZERS[f].name} ×${state!.fertilizers[f]}`),el('small',state!.v3?fertilizerDescription(f):FERTILIZERS[f].description));fertilizers.append(c);
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
        const quality=o.kind==='seed'?SPECIES[o.item as Species].rarity: FERTILIZERS[o.item as keyof typeof FERTILIZERS].grade===4?'rainbow':FERTILIZERS[o.item as keyof typeof FERTILIZERS].grade===3?'gold':FERTILIZERS[o.item as keyof typeof FERTILIZERS].grade===2?'blue':'normal';
        const card=el('article',undefined,`card shop-card border-${quality}${buySelection.has(o.id)?' selected':''}${!o.stock?' sold-out':''}`);
        const name=o.kind==='seed'?SPECIES[o.item as Species].name:FERTILIZERS[o.item as keyof typeof FERTILIZERS].name;
        card.append(o.kind==='seed'?art(o.item as Species,[],1,'seed'):fertilizerArt(o.item),el('h3',name),el('span',TIER_NAMES[quality],`tag ${quality}`),el('small',o.stock?`剩余 ${o.stock}`:'缺货','stock'));
        if (o.kind === 'seed') card.append(el('small', growthLabel(o.item as Species,state), 'growth-duration'));
        if (buyMode) {
            const selected=buySelection.has(o.id);
            card.append(button(selected?'✓':'选择',()=>{selected?buySelection.delete(o.id):buySelection.set(o.id,o.stock);render();},'select-check',!o.stock));
            if (selected) {
                const qty=el('div',undefined,'quantity');
                qty.append(button('−',()=>{buySelection.set(o.id,Math.max(1,buySelection.get(o.id)!-1));render();}),el('span',String(buySelection.get(o.id))),button('+',()=>{buySelection.set(o.id,Math.min(o.stock,buySelection.get(o.id)!+1));render();}));card.append(qty);
            }
            card.append(el('span',`◉ ${o.price}`,'unit-price'));
        } else card.append(button(o.stock?`◉ ${o.price}`:'缺货',()=>void act({type:'buy',offer:o.id}),'buy-price',!o.stock||state!.coins<o.price));
        if (o.kind==='fertilizer') card.title=state!.v3?fertilizerDescription(o.item as keyof typeof FERTILIZERS):FERTILIZERS[o.item as keyof typeof FERTILIZERS].description;
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
    const sp = selectedSpecies, lv = state!.v3?speciesLevel(state!.xp[sp]):level(state!.xp[sp]), thresholds=state!.v3?V3_XP:LEVEL_XP;
    const heading = el('div', undefined, 'book-heading');
    heading.append(art(sp), el('h2', `${SPECIES[sp].name} · Lv.${lv}`), el('p', `${state!.xp[sp]} 经验${lv < thresholds.length ? ` / 下一级 ${thresholds[lv]}` : ' · 已达最高等级'}`));
    const xpbar=el('progress');xpbar.max=lv<thresholds.length?thresholds[lv]-thresholds[lv-1]:1;xpbar.value=lv<thresholds.length?state!.xp[sp]-thresholds[lv-1]:1;
    heading.append(xpbar);
    const nextFactors=Object.entries(TRAITS).filter(([id,t])=>t.level===lv+1&&(!state!.v3||AFFINITIES[sp].includes(id as Trait))).map(([,t])=>t.name);
    if(nextFactors.length)heading.append(el('small','下一级解锁：'+nextFactors.join('、'),'muted'));
    host.append(heading);
    host.append(el('p', state!.v3?'长作物收获经验更多，每物种每日首次 +8，收获经验每天最多60。每级新批次生长缩短1%，亲和因子概率随等级提升；图鉴首次发现另有奖励。':'每次收获 +10 经验；首次图鉴奖励另加 20 经验和积分。每级生长时间缩短 3%、天气因子概率提高 6%；升级解锁新因子。', 'muted'));
    const grid = el('div', undefined, 'factor-grid');
    for (const t of ['base', ...Object.keys(TRAITS)] as ('base' | Trait)[]) {
        const key = `${sp}:${t}`, unlocked = state!.discovered.includes(key), required = t === 'base' ? 1 : TRAITS[t].level;
        const card = el('article', undefined, `factor ${unlocked ? 'unlocked' : ''}`);
        card.append(art(sp, t === 'base' ? [] : [t]), el('strong', t === 'base' ? '原生' : TRAITS[t].name, t === 'base'?'tag normal':`tag ${TRAITS[t].tier}`), el('span', unlocked ? (state!.claimed.includes(key) ? '✓ 已领取' : '+20 待领取') : lv < required ? `Lv.${required} 开放` : '尚未发现'));
        if (t !== 'base')
            card.append(el('small', `${SLOT_NAMES[traitSlot(t)]} · ${TIER_NAMES[TRAITS[t].tier]}`),el('small',traitSource(t),'muted'));
        grid.append(card);
    }
    const count = state!.discovered.filter(k => !state!.claimed.includes(k)).length;
    host.append(grid, button(`一键领取${state!.online?'花园币':'本次积分'} · ${count * 20}`, () => void act({ type: 'claim' }), 'primary claim', count === 0));
}
function breeding(host: HTMLElement): void {
    if(state!.v3){const parent=allParents().find(p=>p.id===parentId);if(parent)renderV3Breeding(host,state!,parent,breedingCandidates(),act,()=>{parentId=null;render();},p=>produceArt(p));return;}
    const drawer = el('aside', undefined, 'breed-drawer');
    drawer.append(button('× 取消', () => { parentId = null; render(); }, 'close-drawer'), el('h2', '选另一株亲本'), el('p', '可以跨物种。子代随一方，每个词条 50% 概率继承；亲本保留但各消耗一次繁育资格。', 'muted'));
    const candidates = breedingCandidates();
    for (const p of candidates) {
        const c = el('div', undefined, 'parent-row');
        const where = state!.produce.some(x => x.id === p.id) ? '背包' : '土地';
        c.append(produceArt(p), el('strong', `${SPECIES[p.species].name} · ${where}`), tags(p.traits), button('与它繁育', () => void act({ type: 'breed', first: parentId!, second: p.id }), 'primary'));
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
    const contents = el('div', undefined, 'quick-list result-body');
    resultContents(contents, r);
    card.append(contents);
    resultActions(card, r, close);
    document.body.append(card);
}
function resultActions(body:HTMLElement,r:GardenReveal,close:()=>void):void {
    const p=state?.produce.find(p=>p.id===r.produce?.id);
    // A cultivation reveal is still in the soil; a batch summary is not a single-fruit action.
    if(!p||(r.harvests?.length??0)>1){const area=el('div',undefined,'result-action-area'),done=button('收好',close,'primary');done.disabled=false;area.append(done);body.append(area);return;}
    const area=el('div',undefined,'result-action-area'),row=el('div',undefined,'result-actions');
    const pending=state!.life?.pending?.target===p.id||!!state!.v3?.appraisals[p.id]&&!state!.v3!.appraisals[p.id].done;
    const unavailable=!!p.locked||pending;
    const actor=state!.activeActor,growth=actor?state!.life?.characters[actor]:undefined;
    const wish=growth?.wishes.filter(w=>wishMatches(w,p)).sort((a,b)=>b.xp-a.xp)[0];
    const run=async(command:GardenCommand)=>{
        if(busy)return;
        row.querySelectorAll('button').forEach(b=>b.disabled=true);
        await act(command,close);
        // Keep a rejected result reviewable and refresh its eligibility for retry.
        if(area.isConnected){area.remove();resultActions(body,r,close);}
    };
    const sell=button('出售',()=>void run({type:'sell',id:p.id}));
    sell.disabled=unavailable||(strip&&busy);sell.title='出售这颗果实，获得 '+p.value+' 花园币';
    const feed=button('投喂',()=>{if(wish)void run({type:'feed',wish:wish.id,produce:p.id});},'primary');
    feed.disabled=unavailable||!wish||(strip&&busy);feed.title=wish?wishLabel(wish)+' · +'+wish.xp+' 角色经验':'不符合当前角色的食物心愿';
    row.append(sell,feed);area.append(row);
    if(unavailable)area.append(el('small',p.locked?'已收藏，取消收藏后可出售或投喂':'请先完成这颗果实的待处理操作','muted'));
    else if(!wish)area.append(el('small',!actor?'选择角色后可投喂':'不符合当前角色的食物心愿','muted'));
    body.append(area);
}
function resultContents(body: HTMLElement, r: GardenReveal): void {
    if (r.produce) {
        const p = r.produce;
        body.classList.add('harvest-reveal', `quality-${tier(p.traits)}`);
        body.append(produceArt(p), el('strong', SPECIES[p.species].name), tags(p.traits), el('div', `${p.kg.toFixed(3)} kg · ◉ ${p.value}`, 'result-stats'));
        body.querySelectorAll<HTMLElement>('.tag').forEach((tag, i) => tag.style.setProperty('--reveal-i', String(i)));
        if (p.traits.length) body.append(el('div', p.growthVersion===3?`综合 ${scoreOf(p).toFixed(1)} 分 · ${TIER_NAMES[fruitQuality(p.traits,p)]}品质`:`${p.traits.length} 重变异 · 词条售价 ×${(p.growthVersion===2?mutationMultiplier(p.traits):p.traits.reduce((m,t)=>m*TRAITS[t].multiplier,1)).toFixed(2)}`, 'harvest-multiplier'));
    }
    if (r.seed) {
        body.append(art(r.seed.species, r.seed.genes, 1, 'seed'), el('strong', `${SPECIES[r.seed.species].name} · 繁育种子 ×1`), tags(r.seed.genes), el('small', '重量待成熟后揭晓'));
    }
    if (r.harvests && r.harvests.length > 1) {
        const row=el('div',undefined,'harvest-summary');
        for (const p of r.harvests) { const item=el('div');item.append(produceArt(p),el('small',SPECIES[p.species].name));row.append(item); }
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
    const maturity = state.plots.map(p => p ? `${p.id}:${growth(p, now)>=.22}:${growth(p, now) >= .55}:${growth(p, now) >= .8}:${p.readyAt <= now}` : '-').join('|');
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
            const giant = ratio >= 1 && !needsReveal(p) && p.traits.includes('giant');
            const visualRatio = p.harvestIndex ? .8+ratio*.2 : ratio;
            const a = e.querySelector<HTMLElement>('.art')!;
            a.style.height = `${visualRatio < .55 ? 35 + visualRatio * 60 : (90 + visualRatio * 55) * (giant ? 1.8 : 1)}px`;
            const side = e.parentElement!;
            const width = giant ? 200 : 70;
            const center = Math.max(width / 2, Math.min(e.offsetLeft + e.clientWidth / 2, side.clientWidth - width / 2));
            a.style.width = `${width}px`;
            a.style.left = `${center - e.offsetLeft}px`;
            if(a.classList.contains('art-3d')){
                a.style.width=`${giant?150:112}px`;
                a.style.height=`${giant?172:135}px`;
                a.style.left='50%';
            }
        }
    });
    document.querySelectorAll<HTMLElement>('[data-ready]').forEach(e => e.textContent = Number(e.dataset.ready) <= now ? '成熟了！' : `距离成熟 ${time(Number(e.dataset.ready) - now)}`);
    document.querySelectorAll<HTMLProgressElement>('[data-growth]').forEach(e => { const p = state!.plots.find(p => p?.id === e.dataset.growth); if (p)
        e.value = growth(p); });
    document.querySelectorAll<HTMLProgressElement>('[data-cultivation]').forEach(e=>{const p=state!.plots.find(p=>p?.id===e.dataset.cultivation);if(p)e.value=e.max-cultivationRemaining(p,now);});
    document.querySelectorAll<HTMLElement>('[data-cultivation-label]').forEach(e=>{const p=state!.plots.find(p=>p?.id===e.dataset.cultivationLabel);if(p)e.textContent=(cultivationActive(p)?'正在培育 · ':'待培育 · ')+Math.ceil(cultivationRemaining(p,now)/1000)+' 秒';});
    const cultivation=root.querySelector<HTMLElement>('.cultivation-hint');
    if(cultivation){const p=state.plots[Number(cultivation.dataset.cultivationPlot)],bar=cultivation.querySelector('progress')!;
        const task=state.cooperations?.find(t=>t.plant===p?.id);
        bar.value=task?cultivationFraction(task,now):p?Math.max(0,Math.min(1,1-cultivationRemaining(p,now)/CULTIVATION_MS)):0;
        bar.setAttribute('aria-valuetext',`${Math.round(bar.value*100)}%`);
    }
    const clock = document.querySelector('#refresh-clock');
    if (strip) { positionQuick(); positionQuest(); }
    if (clock)
        clock.textContent = `下一批 ${time(state.shop.refreshAt - now)}`;
}
api.onAnchor(({ left, right, bottom, top, side, performer, farm }) => {
    performerBounds=performer;
    gardenDirection = side ?? (left >= innerWidth - right ? 'left' : 'right');
    petBounds = { left, right, top: top ?? bottom + 25 - (right - left), bottom: bottom + 25 };
    document.documentElement.style.setProperty('--pet-left', `${left}px`);
    document.documentElement.style.setProperty('--pet-right', `${right}px`);
    document.documentElement.style.setProperty('--baseline', `${farm?.baseline ?? bottom}px`);
    const lane = farm ? {left:farm.left,width:455,toolsLeft:farm.left} : gardenLane(left, right, innerWidth, gardenDirection);
    document.documentElement.style.setProperty('--garden-left', `${lane.left}px`);
    document.documentElement.style.setProperty('--garden-width', `${lane.width}px`);
    document.documentElement.style.setProperty('--tools-left', `${lane.toolsLeft}px`);
    tick(false);
    positionQuick();
});
api.onChanged(() => void refresh());
window.qbot.characters.onActivated(() => { actorRevision++; if(!switchingActor)void refresh(true); void loadCharacters(); });
void loadCharacters();
api.onPage(next => { go(next); void refresh(); });
let dragPointer: number | null = null;
if (strip) {
    document.addEventListener('pointerdown', e => {
        if(e.button!==0||!(e.target as Element).closest('.strip-drag'))return;
        e.preventDefault();dragPointer=e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        api.ignoreMouse(false);api.drag('start',e.screenX,e.screenY);
    });
    document.addEventListener('pointermove', e => {if(dragPointer===e.pointerId)api.drag('move',e.screenX,e.screenY);});
    const endDrag = () => {if(dragPointer===null)return;dragPointer=null;api.drag('end',0,0);render();syncStripMouse();};
    document.addEventListener('pointerup',endDrag);
    document.addEventListener('pointercancel',endDrag);
    document.addEventListener('lostpointercapture',endDrag);
    window.addEventListener('blur',endDrag);
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
    const next = dragPointer===null && !document.querySelector('dialog[open]') && !target?.closest('button,.quick-menu');
    if (next !== ignored) { ignored = next; api.ignoreMouse(next); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(true); else if (strip) closeQuick(); });
setInterval(() => { if (!document.hidden) {
    if(page==='weather'&&state?.v3){if(v3WeatherHour!==Math.floor(Date.now()/3600000))void refresh(true);return;}
    if(page==='weather'){if(weatherStatus){updateWeatherCountdown(root,weatherStatus,weatherStatus.now+Date.now()-weatherReceivedAt);}if(Date.now()-weatherReceivedAt>=5000)void refreshWeather();return;}
    tick();
    if (state && !page.startsWith('visit:') && (Date.now() >= state.shop.refreshAt || state.plots.some(p=>p?.batch&&!p.batch.settled&&Date.now()>=p.batch.seedlingEnd) || state.plots.some(p=>p?.cultivation?.startedAt!==undefined) || state.online&&state.plots.some(p=>p?.cultivation)))
        void refresh();
} }, 1000);
void refresh(true);

function positionQuest(): void {
    const quest=root.querySelector<HTMLElement>('.quest-pill'), controls=root.querySelector<HTMLElement>('.garden-controls');
    const hint=root.querySelector<HTMLElement>('.cultivation-hint');
    if(hint){
        const p=cultivationHintPosition(performerBounds??petBounds,hint.offsetWidth,hint.offsetHeight,innerWidth,innerHeight);
        hint.style.visibility=p?'visible':'hidden';if(p){hint.style.left=`${p.x}px`;hint.style.top=`${p.y}px`;}
    }
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

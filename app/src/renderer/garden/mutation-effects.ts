import './mutation-effects.css';
import type { Trait } from '../../shared/garden';

// Reuse the painted alpha and sparse vector ornaments; no new bitmap per combination.
const MATERIALS:Partial<Record<Trait,[string,string]>>={
    dew:['#bdebe5','#fffdf4'],striped:['#af845a','#fce1a5'],jade:['#79b69a','#ecffed'],crystal:['#c4e8f0','#ffffff'],amber:['#d79341','#ffda82'],prism:['#b1bcf5','#bff2d9'],
    velvet:['#d9e8e3','#f7f5e9'],celadon:['#8fc6b7','#e1f4de'],wax:['#d99e45','#ffe6a7'],pearl:['#e4c2d8','#f9f9e2'],nightdye:['#584d87','#c0bcf5'],redgold:['#c5784e','#ffe2b0'],silver:['#a7bcc9','#f7faff'],obsidian:['#434b63','#abb9d7'],iridescent:['#9ecfd2','#e6bcea'],daylight:['#fff2b1','#fffdf4'],
    sugar:['#f6b1b5','#fff1c8'],fragrant:['#c5d79e','#f4efbc'],juicy:['#f1ad84','#ffffff'],honey:['#dfaa57','#ffeab6'],nectar:['#df9746','#ffdc86'],milky:['#f3dfc4','#fffbed'],softcore:['#dfd6b7','#fff9e0'],delicate:['#d7c2eb','#fff4c3'],abundant:['#c3bd74','#fff0a4'],starcore:['#d8b768','#fff8bf'],nebula:['#aa9bd4','#e6bcdf'],glassheart:['#bad9e7','#f9e2ee'],galaxycore:['#9898d8','#d6e2fc'],
};
function ornament(trait:Trait,copy:number):HTMLElement {
    const node=layer(`botanical-accessory ornament-${trait}${copy?' twin-copy':''}`);
    const bell=['breezy','snowbell','goldbell'].includes(trait),butterfly=['butterfly','dreambutterfly'].includes(trait);
    const color=trait==='goldbell'?'#e7bb57':trait==='snowbell'?'#c7e3e7':trait==='dreambutterfly'?'#b7a2dc':'#dda9bf';
    const shape=bell?'<path d="M68 30v11m-8 0q8-13 16 0l4 12H56Z"/><circle cx="68" cy="55" r="3"/>'
      :butterfly?'<path d="M70 40q-23-25-20-4 1 13 20 7-14 18-2 13l3-12q18 15 18 2 0-9-16-6 18-21 3-18Z"/>'
      :trait==='leafwhistle'?'<path d="M66 55q-26-32 9-33 10 24-9 33Z"/><path d="m64 60 7-31" fill="none"/>'
      :trait==='moon'?'<path d="M82 22a19 19 0 1 0 0 35 20 20 0 0 1 0-35Z"/>'
      :trait==='halo'?'<path d="m27 22 7-14 15 13L63 7l9 15Z"/><circle cx="49" cy="17" r="3" fill="#fff7bf"/>'
      :'<path d="M50 70q-25-23-21-3 2 13 19 7-4 15 2 12 6 3 3-12 20 6 19-8-3-16-21 4Z"/><circle cx="50" cy="72" r="4" fill="#ffecc3"/>';
    node.innerHTML=`<svg viewBox="0 0 100 100"><g fill="${color}" stroke="#87715d" stroke-width="1.2" stroke-linejoin="round">${shape}</g></svg>`;
    return node;
}

const cracks = 'M0 35L22 29 31 43 50 36 65 51 89 39 100 44M22 29L26 9 18 0M31 43L28 67 43 81 39 100M65 51L61 73 76 88 73 100M89 39L78 18 89 0M28 67L0 79M61 73L100 64';
const crackImage = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${cracks}" fill="none" stroke="#429ad1" stroke-width="1.8"/><path d="${cracks}" fill="none" stroke="#e7fbff" stroke-width=".65"/></svg>`)}")`;
function layer(className: string): HTMLDivElement {
    const node = document.createElement('div');
    node.className = className;
    node.setAttribute('aria-hidden', 'true');
    return node;
}
function particles(host: HTMLElement, kind: string, count: number): void {
    count=Math.min(count,Math.max(0,8-host.querySelectorAll('.mutation-particles i').length));
    const group = layer(`mutation-particles particles-${kind}`);
    for (let i = 0; i < count; i++) {
        const p = document.createElement('i');
        p.style.setProperty('--i', String(i));
        // Deliberately scattered positions, with most of the silhouette left unobstructed.
        const positions = [[9,25],[84,14],[17,68],[88,63],[40,4],[67,88],[55,35],[4,86]];
        const [x,y] = positions[i % positions.length];
        p.style.left = x + '%'; p.style.top = y + '%';
        if (kind === 'note') p.textContent = i % 2 ? '♪' : '♫';
        group.append(p);
    }
    host.append(group);
}

// Small code-native jewellery follows the approved sheet; it is separate from the painted sprite.
function accessory(kind: 'punk' | 'classical', copy: number): HTMLElement {
    const node = layer(`botanical-accessory accessory-${kind}${copy ? ' twin-copy' : ''}`);
    node.innerHTML = kind === 'punk'
        ? '<svg viewBox="0 0 100 100"><g stroke="#654052" stroke-width="1.2" stroke-linejoin="round"><path d="M22 64Q50 73 78 64L77 73Q50 81 23 73Z" fill="#69475f"/><path d="M24 66Q50 74 76 66" fill="none" stroke="#b77a9c"/><path d="M31 67l-4 6 8-1Z M49 70l-4 6 8-1Z M68 68l-4 6 8-1Z" fill="#fff2d9"/><path d="M71 26q-3-5-6-1t1 6l8 9q4 3 6-1t-2-6Z" fill="none" stroke="#50394c" stroke-width="3.5"/><path d="M71 26q-3-5-6-1t1 6l8 9q4 3 6-1t-2-6Z" fill="none" stroke="#eddddc" stroke-width="1.8"/></g></svg>'
        : '<svg viewBox="0 0 100 100"><g stroke="#704267" stroke-width="1.2" stroke-linejoin="round"><path d="M47 76L36 88l-1-7-7 1 9-13M53 76l11 12 1-7 7 1-9-13" fill="#995394"/><path d="M49 70Q27 54 29 69Q28 80 49 74M51 70Q73 54 71 69Q72 80 51 74" fill="#b773b0"/><path d="M32 66l15 6-15 1M68 66l-15 6 15 1" fill="#d59bca" stroke="none"/><ellipse cx="50" cy="76" rx="8" ry="11" fill="#e5bb63" stroke="#a87942"/><ellipse cx="50" cy="76" rx="5.6" ry="8.4" fill="#fff1cf" stroke="#fff7d7"/><path d="M52 69v10q-5 4-5 0 0-2 4-2" fill="none" stroke="#aa7848"/></g></svg>';
    return node;
}

// One shared observer pauses off-screen art. Detached nodes are unregistered after renders.
const watched = new Set<HTMLElement>();
let observer: IntersectionObserver | undefined;
let cleanup: MutationObserver | undefined;
let sizing: ResizeObserver | undefined;
function fitEffects(box: HTMLElement): void {
    const image = box.querySelector('img');
    if (!image?.naturalWidth) return;
    const style = getComputedStyle(box);
    const availableWidth = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = box.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const width = Math.min(availableWidth, availableHeight * image.naturalWidth / image.naturalHeight);
    box.style.setProperty('--fx-width', `${width}px`);
    box.style.setProperty('--fx-height', `${width * image.naturalHeight / image.naturalWidth}px`);
    box.style.setProperty('--fx-bottom', style.paddingBottom);
}
function watch(box: HTMLElement): void {
    if (!observer) {
        observer = new IntersectionObserver(entries => {
            for (const e of entries) (e.target as HTMLElement).classList.toggle('fx-offscreen', !e.isIntersecting);
        });
        sizing = new ResizeObserver(entries => { for (const e of entries) fitEffects(e.target as HTMLElement); });
        const sync = () => document.documentElement.classList.toggle('garden-fx-paused', document.hidden);
        document.addEventListener('visibilitychange', sync);
        sync();
        cleanup = new MutationObserver(() => {
            for (const node of watched) if (!node.isConnected) { observer!.unobserve(node); sizing!.unobserve(node); watched.delete(node); }
        });
        cleanup.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('pagehide', () => {
            observer?.disconnect(); cleanup?.disconnect(); sizing?.disconnect(); watched.clear();
            document.removeEventListener('visibilitychange', sync);
        }, { once: true });
    }
    watched.add(box); observer.observe(box); sizing!.observe(box);
    const image = box.querySelector('img')!;
    if (image.complete) fitEffects(box); else image.addEventListener('load', () => fitEffects(box), { once: true });
}

/** Reuse the actual sprite alpha for every surface, including PNG, SVG and twins. */
export function attachMutationEffects(box: HTMLElement, src: string, traits: Trait[]): void {
    if (!traits.length) return;
    box.classList.add('mutation-art');
    box.style.setProperty('--plant-mask', `url(${JSON.stringify(src)})`);
    for (let copy = 0; copy < (traits.includes('twin') ? 2 : 1); copy++) {
        const surface = layer(`mutation-surface${copy ? ' twin-copy' : ''}`);
        for (const t of ['purple', 'mint', 'coral', 'rainbow', 'golden', 'punk', 'frost', 'thunder'] as const) {
            if (!traits.includes(t)) continue;
            const effect = layer(`surface-${t}`);
            if (t === 'frost') effect.style.setProperty('--ice-cracks', crackImage);
            if (t === 'rainbow') for (const region of ['a','b','c']) effect.append(layer(`prism-region prism-${region}`));
            surface.append(effect);
        }
        for(const t of traits){const material=MATERIALS[t];if(!material)continue;
            const effect=layer(`surface-life surface-life-${t}`);effect.style.setProperty('--material-a',material[0]);effect.style.setProperty('--material-b',material[1]);surface.append(effect);
        }
        if (surface.childElementCount) box.append(surface);
        for (const t of ['punk', 'classical'] as const) if (traits.includes(t)) box.append(accessory(t, copy));
        for(const t of ['breezy','snowbell','goldbell','butterfly','dreambutterfly','leafwhistle','moon','halo','flowerknot'] as const)if(traits.includes(t))box.append(ornament(t,copy));
    }
    if (traits.includes('frost')) {
        box.append(layer('frost-mist'));
        particles(box, 'ice', 6);
    }
    if (traits.includes('thunder')) {
        const arcs = layer('thunder-arcs');
        // Geometry, not a lightning glyph: branched arcs have a wide blue halo and white core.
        arcs.innerHTML = '<svg viewBox="0 0 100 120" preserveAspectRatio="none"><g class="arc arc-a"><path d="M28 13L13 28 23 33 9 49 19 54 13 74M13 28L5 22M19 54L31 48"/></g><g class="arc arc-b"><path d="M77 35L91 47 80 55 96 69 85 77 91 99M91 47L98 40M85 77L71 85"/></g><g class="arc arc-c"><path d="M25 94L42 100 49 90 59 107 77 102"/></g></svg>';
        for (const g of arcs.querySelectorAll('g')) {
            const glow = g.firstElementChild!;
            glow.classList.add('arc-glow');
            const core = glow.cloneNode() as SVGPathElement;
            core.setAttribute('class', 'arc-core'); g.append(core);
        }
        box.append(arcs); particles(box, 'charge', 5);
    }
    if (traits.includes('shiny')) particles(box, 'star', 7);
    if (traits.includes('firefly')) particles(box, 'firefly', 5);
    if (traits.includes('petals')) particles(box, 'petal', 7);
    if (traits.includes('classical')) particles(box, 'note', 3);
    if(traits.includes('mist'))box.append(layer('frost-mist'));
    if(traits.includes('raindrop'))particles(box,'droplet',3);
    if(traits.includes('stardust'))particles(box,'star',4);
    if(traits.includes('glowring')){particles(box,'firefly',5);box.append(layer('life-orbit orbit-glow'));}
    if(traits.includes('meteorRing')){particles(box,'star',3);box.append(layer('life-orbit orbit-meteor'));}
    watch(box);
}

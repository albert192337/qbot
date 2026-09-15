import './mutation-effects.css';
import type { Trait } from '../../shared/garden';

const cracks = 'M0 35L22 29 31 43 50 36 65 51 89 39 100 44M22 29L26 9 18 0M31 43L28 67 43 81 39 100M65 51L61 73 76 88 73 100M89 39L78 18 89 0M28 67L0 79M61 73L100 64';
const crackImage = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${cracks}" fill="none" stroke="#429ad1" stroke-width="1.8"/><path d="${cracks}" fill="none" stroke="#e7fbff" stroke-width=".65"/></svg>`)}")`;
function layer(className: string): HTMLDivElement {
    const node = document.createElement('div');
    node.className = className;
    node.setAttribute('aria-hidden', 'true');
    return node;
}
function particles(host: HTMLElement, kind: string, count: number): void {
    const group = layer(`mutation-particles particles-${kind}`);
    for (let i = 0; i < count; i++) {
        const p = document.createElement('i');
        p.style.setProperty('--i', String(i));
        group.append(p);
    }
    host.append(group);
}

// One shared observer pauses off-screen art. Detached nodes are unregistered after renders.
const watched = new Set<HTMLElement>();
let observer: IntersectionObserver | undefined;
let cleanup: MutationObserver | undefined;
let sizing: ResizeObserver | undefined;
function fitEffects(box: HTMLElement): void {
    const image = box.querySelector('img');
    if (!image?.naturalWidth) return;
    const width = Math.min(box.clientWidth, box.clientHeight * image.naturalWidth / image.naturalHeight);
    box.style.setProperty('--fx-width', `${width}px`);
    box.style.setProperty('--fx-height', `${width * image.naturalHeight / image.naturalWidth}px`);
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
    if (!traits.some(t => ['rainbow', 'golden', 'frost', 'thunder', 'shiny'].includes(t))) return;
    box.classList.add('mutation-art');
    box.style.setProperty('--plant-mask', `url(${JSON.stringify(src)})`);
    for (let copy = 0; copy < (traits.includes('twin') ? 2 : 1); copy++) {
        const surface = layer(`mutation-surface${copy ? ' twin-copy' : ''}`);
        for (const t of ['rainbow', 'golden', 'frost', 'thunder'] as const) {
            if (!traits.includes(t)) continue;
            const effect = layer(`surface-${t}`);
            if (t === 'frost') effect.style.setProperty('--ice-cracks', crackImage);
            surface.append(effect);
        }
        if (surface.childElementCount) box.append(surface);
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
    watch(box);
}

import type { Species } from '../../shared/garden';
const atlas = new URL('./assets/juvenile-plants.png', import.meta.url).href;
const species: Species[] = ['strawberry','lotus','sunflower','carrot','tomato','blueberry','apple','tulip','pineapple'];
let sequence = 0;
/** One cell of the transparent hand-painted juvenile atlas, without mature fruit. */
export function juvenileArt(sp: Species): SVGSVGElement {
    const index = species.indexOf(sp), cell = 1254 / 3;
    // Generated rows have unequal padding; crop in the transparent gaps, not through leaves.
    const row = Math.floor(index / 3), top = [0,410,790][row], height = [410,380,464][row];
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`${index % 3 * cell} ${top} ${cell} ${height}`);
    svg.setAttribute('preserveAspectRatio','xMidYMax meet');
    svg.setAttribute('aria-label',`${sp} juvenile plant`);
    svg.classList.add('juvenile-art');
    const image = document.createElementNS(svg.namespaceURI,'image');
    image.setAttribute('href',atlas);image.setAttribute('width','1254');image.setAttribute('height','1254');
    const clip = document.createElementNS(svg.namespaceURI,'clipPath');
    clip.id = `juvenile-cell-${++sequence}`;
    const rect = document.createElementNS(svg.namespaceURI,'rect');
    rect.setAttribute('x',String(index % 3 * cell));rect.setAttribute('y',String(top));
    rect.setAttribute('width',String(cell));rect.setAttribute('height',String(height));
    clip.append(rect);image.setAttribute('clip-path',`url(#${clip.id})`);
    const defs=document.createElementNS(svg.namespaceURI,'defs');defs.append(clip);
    svg.append(defs,image);return svg;
}

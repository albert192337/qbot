import { SPECIES, type Species } from '../../shared/garden';

// Shared vector cutouts: the same fruit appears on the plant, in the bag and on seed packets.
const leaf = '<path d="M0 0Q-32-30-37-9Q-30 9 0 0Q32-30 37-9Q30 9 0 0" fill="#86aa58"/>';
const fruit: Partial<Record<Species, string>> = {
  lotus: '<path d="M0 55V9" fill="none" stroke="#789554" stroke-width="6"/><path d="M0 40q-40-28-38-4Q-27 53 0 40" fill="#93b871"/><path d="M0 6Q-41 5-43-30Q-16-28 0 6Q41 5 43-30Q16-28 0 6" fill="#ef98ba"/><path d="M0 9Q-29-17 0-48Q29-17 0 9Z" fill="#f4b1cd"/>',
  sunflower: '<path d="M0 58V7" fill="none" stroke="#789554" stroke-width="6"/><path d="M0 42q33-31 35-12Q26 48 0 42" fill="#93b871"/><g fill="#e7bb51"><ellipse cy="-35" rx="10" ry="20"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(45 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(90 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(135 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(180 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(225 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(270 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(315 0 -7)"/></g><circle cy="-7" r="22" fill="#a58258"/>',
  strawberry: '<path d="M-32-19Q-52 5-13 44Q0 56 13 44Q52 5 32-19Q15-33 0-23Q-15-33-32-19Z" fill="#ed6573"/><path d="M0-20l-26-14 13 22-21 2 25 8 9-14 10 14 24-8-21-2 13-22Z" fill="#82a85b"/><g fill="#ffe7a0" stroke="none"><ellipse cx="-20" cy="3" rx="2" ry="4"/><ellipse cx="4" cy="5" rx="2" ry="4"/><ellipse cx="22" cy="2" rx="2" ry="4"/><ellipse cx="-10" cy="25" rx="2" ry="4"/><ellipse cx="12" cy="25" rx="2" ry="4"/></g>',
  apple: '<path d="M0-22C-48-48-53 14-25 40Q-12 50 0 42Q17 51 30 36C55 5 44-42 0-22Z" fill="#df7160"/><path d="M0-24q-2-17 8-23" fill="none"/><path d="M5-32q16-29 34-11Q29-23 5-32" fill="#88a95d"/><path d="M-25-12q-9 8-8 18" fill="none" stroke="#ffd9b3" stroke-width="5"/>',
  pineapple: '<path d="M-29-15Q0-35 29-15L35 28Q32 50 0 52Q-32 50-35 28Z" fill="#edbc58"/><path d="M-26-12l54 48m-59-27 44 40M26-12l-54 48m59-27-44 40" stroke="#c89449" stroke-width="2"/><path d="M0-19l-30-30 22 10-5-27 16 22 13-28 2 31 21-12-14 28Z" fill="#79a567"/>',
  tomato: '<path d="M0-24C-58-41-57 45 0 45C57 45 58-41 0-24Z" fill="#e97b58"/><path d="M0-24l-22-17 10 21-23 2 28 10 7-13 13 15 21-14-23-1 7-20Z" fill="#7a9d56"/>',
  blueberry: '<g fill="#839ac9"><circle cx="-20" cy="4" r="23"/><circle cx="20" cy="4" r="23"/><circle cy="30" r="23"/></g><g fill="#586982" stroke="none"><path d="M-20-7l4 7 8 2-8 3-4 7-3-8-8-2 8-3Z"/><path d="M20-7l4 7 8 2-8 3-4 7-3-8-8-2 8-3Z"/><path d="M0 19l4 7 8 2-8 3-4 7-3-8-8-2 8-3Z"/></g><path d="M0-20q10-30 28-19Q20-17 0-20" fill="#86aa58"/>',
  carrot: '<path d="M-23-17Q0-33 23-17Q16 24-3 55Q-17 29-23-17Z" fill="#ed9b58"/><path d="M0-21q-34-34-19-43Q-4-62 0-21q0-53 15-43Q25-54 0-21q35-38 36-16Q26-22 0-21" fill="#83a960"/><path d="M-18-3l17 5m-13 16 15 4" fill="none" stroke="#c47743"/>',
  tulip: '<path d="M0 55V0" fill="none" stroke="#6f9454" stroke-width="7"/><path d="M0 40q-37-9-27-33Q-8 13 0 40q33-9 27-27Q11 16 0 40" fill="#8aad65"/><path d="M-30-43l21 13L0-51l13 22 20-13Q38 3 0 7Q-36 3-30-43Z" fill="#e9a0b3"/>',
};
const legacy: Partial<Record<Species,string>> = {
  lotus: new URL('./assets/lotus.png', import.meta.url).href,
  sunflower: new URL('./assets/sunflower.png', import.meta.url).href,
};
// Approved painted pineapple: keep the full foliage on the plant, only the crown on harvested fruit.
const pineappleArt = {
  plant: new URL('./assets/pineapple-plant.png', import.meta.url).href,
  fruit: new URL('./assets/pineapple-fruit.png', import.meta.url).href,
};
// The same painted item is reused in inventory, collection and packet emblems.
const painted: Record<Species, { plant: string; fruit: string }> = {
    strawberry: { plant: new URL('./assets/botanical/strawberry-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/strawberry-fruit.png', import.meta.url).href },
    lotus: { plant: new URL('./assets/botanical/lotus-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/lotus-fruit.png', import.meta.url).href },
    sunflower: { plant: new URL('./assets/botanical/sunflower-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/sunflower-fruit.png', import.meta.url).href },
    carrot: { plant: new URL('./assets/botanical/carrot-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/carrot-fruit.png', import.meta.url).href },
    tomato: { plant: new URL('./assets/botanical/tomato-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/tomato-fruit.png', import.meta.url).href },
    blueberry: { plant: new URL('./assets/botanical/blueberry-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/blueberry-fruit.png', import.meta.url).href },
    apple: { plant: new URL('./assets/botanical/apple-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/apple-fruit.png', import.meta.url).href },
    tulip: { plant: new URL('./assets/botanical/tulip-plant.png', import.meta.url).href, fruit: new URL('./assets/botanical/tulip-fruit.png', import.meta.url).href },
    pineapple: pineappleArt,
};
function svg(content: string, box = '0 0 160 200'): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"><g stroke="#56533c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>`);
}
export function botanicalArt(sp: Species, mode: 'fruit'|'plant'|'seed' = 'fruit', ripe = true): string {
  if (mode === 'seed') {
    return svg('<path d="M47 18h66l-8 22q23 40 20 125-45 22-90 0-3-85 20-125Z" fill="#f3dfae"/><path d="M51 40h58" stroke="#b38c60" stroke-width="6"/><path d="M42 61q-7 56-3 91m76-91q7 56 3 91" fill="none" stroke="#dcc496"/><ellipse cx="80" cy="107" rx="35" ry="43" fill="#fff8e6" stroke="#d8bd89"/>');
  }
  if (mode === 'fruit' || ripe) return painted[sp][mode];
  if (legacy[sp]) return legacy[sp]!;
  const f = fruit[sp]!;
  if (sp === 'tulip') return svg(`<g transform="translate(80 96) scale(1.25)">${f}</g>`);
  const woody = sp === 'apple';
  const pineapple = sp === 'pineapple';
  let body = woody
    ? '<path d="M74 189l2-94h12l5 94Z" fill="#b09267"/><path d="M80 137l-29-36m34 18 25-39" fill="none" stroke-width="7" stroke="#8e7855"/><path d="M23 105C-8 66 31 50 37 47C31 8 90-5 110 31C153 13 172 72 146 97Q123 133 92 115Q47 137 23 105Z" fill="#88aa62"/>'
    : pineapple ? '<path d="M80 188Q10 171 7 107Q52 121 80 180Q16 85 42 67Q66 100 80 171Q72 63 95 67Q107 114 86 175Q130 87 153 109Q138 171 80 188Z" fill="#85a967"/>'
    : `<path d="M80 189Q62 147 80 65M78 149L42 114M79 127L117 85" fill="none" stroke="#789555" stroke-width="6"/><g transform="translate(77 170)">${leaf}</g><g transform="translate(71 129) rotate(-20)">${leaf}</g><g transform="translate(84 94) scale(.8)">${leaf}</g>`;
  if (ripe) body += pineapple ? `<g transform="translate(80 90) scale(.7)">${f}</g>`
    : `<g transform="translate(47 90) scale(.42)">${f}</g><g transform="translate(106 70) scale(.46)">${f}</g><g transform="translate(102 127) scale(.4)">${f}</g>`;
  else body += '<g fill="#f7e4bd" stroke="none"><circle cx="47" cy="85" r="4"/><circle cx="105" cy="69" r="4"/></g>';
  return svg(body);
}

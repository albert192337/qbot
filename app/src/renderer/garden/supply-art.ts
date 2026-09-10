import type { GardenRewardItem } from '../../shared/garden';
const plants: Record<string,string> = {
  lotus: new URL('./assets/lotus.png', import.meta.url).href,
  strawberry: new URL('./assets/strawberry.png', import.meta.url).href,
  sunflower: new URL('./assets/sunflower.png', import.meta.url).href,
};
export function supplyArt(kind: GardenRewardItem['kind'], id: string): HTMLElement {
  const art = document.createElement('span'); art.className = 'supply-art';
  if (kind === 'seed' && plants[id]) {
    const img = document.createElement('img'); img.src = plants[id]; img.alt = ''; art.append(img);
  } else {
    const color = ({speed:'#e8b36e',mutation:'#bb9ed2',weight:'#8bb7cc'} as Record<string,string>)[id] ?? '#a8bd8c';
    art.innerHTML = `<svg viewBox="0 0 64 72" aria-hidden="true"><path d="M19 7h26l-3 10 10 43q-20 10-40 0l10-43Z" fill="${color}" stroke="#697552" stroke-width="2.5"/><path d="M21 17h22" stroke="#697552" stroke-width="3"/><ellipse cx="32" cy="42" rx="12" ry="14" fill="#fff7de"/><path d="M32 51V34q14-6 8 5-3 5-8 4m0-1q-14-2-8-8 6 0 8 8" fill="#87a56d"/></svg>`;
  }
  return art;
}

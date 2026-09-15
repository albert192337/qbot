/** Authored activity postcards. Missing entries keep the existing map view. */
const parisGarden=[
 new URL('./assets/travel/paris-garden-walk.png',import.meta.url).href,
 new URL('./assets/travel/paris-garden-picnic.png',import.meta.url).href,
 new URL('./assets/travel/paris-garden-flowers.png',import.meta.url).href,
];
export function experienceArt(city:number,project:number,step:number):string|undefined {
 return city===1&&project===4?parisGarden[Math.min(2,Math.max(0,step))]:undefined;
}

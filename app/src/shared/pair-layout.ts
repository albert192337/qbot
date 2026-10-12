/** Space for five speech lines plus the rehearsal controls, in desktop DIP. */
export const PAIR_HEADROOM = 240;
export const pairHeadroom = (height:number) => Math.min(PAIR_HEADROOM, height * .6);

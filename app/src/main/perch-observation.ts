export interface PerchObservation { title: string; at: number; summary: string }
let observation: PerchObservation | null = null;
export function getPerchObservation(): PerchObservation | null { return observation; }
export function setPerchObservation(value: PerchObservation | null): void { observation=value; }

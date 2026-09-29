export interface FarmPlot { index: number; species?: string; stage: 'empty'|'sprout'|'young'|'ripe'|'hidden'; traits: string[]; fallback?: string; label: string; }
export interface FarmScene {
  element: HTMLElement;
  update(plots: FarmPlot[], buttons: HTMLButtonElement[], selected: number | null): void;
  place(left: number, baseline: number): void;
  rotate(direction: number): void;
  zoom(direction: number): void;
  reset(): void;
  hitTest(x: number, y: number): number | null;
  dispose(): void;
}
export function createFarmScene(onLayout: (placement: import('../../shared/garden-scene-layout').GardenScenePlacement) => void, onError: (message: string) => void): FarmScene;

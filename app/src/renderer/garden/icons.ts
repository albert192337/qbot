/** Small UI icons share the pet HUD's black outlined, flat-color vocabulary. */
const paths = {
  bag: '<path d="M12 9V6q6-5 12 0v3" fill="none"/><path d="M9 10q9-3 18 0l3 19q-12 5-24 0Z" fill="#dca760"/><path d="M10 10q8-3 16 0v9q-8 5-16 0Z" fill="#93b487"/><path d="M13 24h10v6H13Z" fill="#ffe1a0"/><path d="M17 17h3v5h-3Z" fill="#fff5d6"/>',
  shop: '<path d="M7 17h23v15H7Z" fill="#f3d59d"/><path d="M4 16 9 5h18l5 11" fill="#f8eee0"/><path d="m9 5-2 11h6l2-11m6 0 2 11h7L27 5" fill="#e88978"/><path d="M4 16q3 6 7 0 4 6 8 0 4 6 8 0 3 5 5 0" fill="#efaa86"/><path d="M12 23h6v9h-6Z" fill="#92b394"/><path d="M22 22h5v5h-5Z" fill="#b8dce2"/>',
  book: '<path d="M5 6q7-3 13 1 7-4 13-1v24q-7-3-13 1-7-4-13-1Z" fill="#a6c9d2"/><path d="M8 8q5-1 10 2 5-3 10-2v19q-6-2-10 1-5-3-10-1Z" fill="#fff4d8"/><path d="M18 10v18" fill="none"/><path d="M22 24V15q8 0 3 6h-3M14 22l-4-2m1-6h3" fill="#8bb589"/>',
  close: '<path d="M9 9q9-4 18 0l1 17q-10 5-20 0Z" fill="#eddfc0"/><path d="m14 14 9 9m0-9-9 9" fill="none"/>',
  ready: '<path d="m18 3 4 10 11 5-11 4-4 11-5-11L3 18l10-5Z" fill="#e8c46e"/>',
} as const;
export function gardenIcon(name: keyof typeof paths): string {
  return `<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false" fill="none" stroke="#414335" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

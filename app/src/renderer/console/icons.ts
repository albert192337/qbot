export type ConsoleIcon =
  | 'home'
  | 'characters'
  | 'create'
  | 'persona'
  | 'actions'
  | 'stickers'
  | 'prompts'
  | 'market'
  | 'connection'
  | 'settings'
  | 'developer'
  | 'room'
  | 'task';

const PATHS: Record<ConsoleIcon, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',
  characters: '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><circle cx="5" cy="14" r="2"/><circle cx="19" cy="14" r="2"/><path d="M8 19c0-3 1.8-5 4-5s4 2 4 5c0 1.2-.9 2-2.1 2H10c-1.2 0-2-.8-2-2Z"/>',
  create: '<path d="M12 3c4.4 0 8 3.2 8 7.2 0 5.3-4.6 9.5-8 10.8-3.4-1.3-8-5.5-8-10.8C4 6.2 7.6 3 12 3Z"/><path d="M9 10h6M12 7v6"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.2 3.2-6.5 7.5-6.5s6.8 2.3 7.5 6.5"/><path d="M17.5 4.5 20 2m-2 5h3"/>',
  actions: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
  stickers: '<path d="M5 3h10l4 4v10a4 4 0 0 1-4 4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15 3v5h5"/><path d="M7 13h.01M11 13h.01M7.5 17c1.2 1 3.8 1 5 0"/>',
  prompts: '<path d="M6 3h9l3 3v15H6Z"/><path d="M14 3v4h4M9 11h6M9 15h6"/>',
  market: '<path d="M4 9h16l-1 12H5L4 9Z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',
  connection: '<path d="M8 12a4 4 0 0 1 4-4h3"/><path d="M16 5h3v3M16 19h3v-3"/><path d="M16 12a4 4 0 0 1-4 4H9"/><path d="M8 19H5v-3M8 5H5v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6v.2h-4V21a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H2.8v-4H3a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V2.8h4V3a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21 10h.2v4H21a1.8 1.8 0 0 0-1.6 1Z"/>',
  developer: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>',
  room: '<path d="M4 21V8l8-5 8 5v13"/><path d="M8 21v-7h8v7M8 10h.01M16 10h.01"/>',
  task: '<path d="M9 5h10v16H5V5h4"/><path d="M9 3h6v4H9ZM8 12l2 2 4-4M8 18h7"/>',
};

export function icon(name: ConsoleIcon, label?: string): string {
  const aria = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${aria}>${PATHS[name]}</svg>`;
}

import { icon as oldIcon, type ConsoleIcon } from '../console/icons';
const paths: Record<string,string> = {
 phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M10 19h4"/><path d="M9 8h6v7H9Z" fill="#b7cec0" stroke="none"/>',
 menu:'<path d="M3 5h18M3 12h18M3 19h18"/>',
 friends:'<circle cx="8" cy="7" r="3"/><circle cx="18" cy="8" r="2.5"/><path d="M2 21v-5c0-5 12-5 12 0v5Z" fill="#b7cec0"/><path d="M17 13c4 0 5 3 5 7h-5"/>',
 heart:'<path d="M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z" fill="#edc7ba"/>',
 eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>',
 sound:'<path d="M3 9h4l5-5v16l-5-5H3ZM16 7q7 5 0 10M19 4q10 8 0 16"/>',
 mute:'<path d="M3 9h4l5-5v16l-5-5H3ZM17 9l5 6M22 9l-5 6"/>',
 close:'<path d="m5 5 14 14M19 5 5 19"/>',
 back:'<path d="m14 4-8 8 8 8"/>',
 arrow:'<path d="M3 12h17m-6-6 6 6-6 6"/>',
 bag:'<rect x="4" y="7" width="16" height="15" rx="3" fill="#f0e0c6"/><path d="M8 7V5a4 4 0 0 1 8 0v2M4 12h16M10 11v4h4v-4"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v17c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-1-7-2-10 1v16M5 8h3M16 8h3M5 12h3M16 12h3"/>',
 travel:'<circle cx="12" cy="12" r="10" fill="#c5d9c2"/><path d="m15 6-2 7-7 5 3-8Z"/>',
 moments:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2" fill="#e6c989"/><path d="m4 18 6-7 4 5 3-3 4 5" fill="#b7cec0"/>',
 capsule:'<circle cx="12" cy="8" r="6" fill="#e6d2b0"/><path d="m7 13-2 8h14l-2-8M9 17h6M12 15v4"/>',
 history:'<path d="M4 7A9 9 0 1 1 3 14M4 2v5h5M12 6v7l4 2"/>',
 smile:'<circle cx="12" cy="12" r="10"/><path d="M7 14q5 6 10 0M8 8v1M16 8v1"/>',
 plant:'<path d="M12 22V10C3 12 2 5 3 3c8 0 10 4 9 9 0-9 5-11 10-10 0 8-5 10-10 10M4 22h16" fill="#a6c399"/>',
};
export function uiIcon(name:string):string {
 return paths[name]?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`:oldIcon(name as ConsoleIcon);
}

(() => {
 'use strict';
 const brown='#594235',cream='#FFF9EF',sand='#F0E0C6',green='#A6C6A0',blue='#B7D4CA',pink='#ECC3B5',gold='#E5C77B';
 const shapes={
 phone:`<rect x="6" y="2" width="12" height="20" rx="3" fill="${cream}"/><path d="M10 5h4M10 19h4"/><rect x="8" y="8" width="8" height="8" rx="1" fill="${blue}" stroke="none"/>`,
 home:`<path d="m3 10 9-7 9 7v11H3z" fill="${cream}"/><path d="m2 10 10-8 10 8"/><path d="M9 21v-8h6v8" fill="${sand}"/><path d="M16 5V2h3v5"/>`,
 moments:`<rect x="3" y="2" width="18" height="20" rx="3" fill="${cream}"/><path d="M6 6h12v10H6z" fill="${blue}"/><path d="m6 16 4-6 3 4 2-2 3 4" fill="${green}"/><path d="M8 19h8"/>`,
 image:`<rect x="3" y="3" width="18" height="18" rx="3" fill="${cream}"/><circle cx="16" cy="8" r="2" fill="${gold}"/><path d="m4 18 6-8 5 6 3-3 3 5" fill="${green}"/>`,
 travel:`<circle cx="12" cy="12" r="10" fill="${blue}"/><path d="m5 5 7-2 2 6-4 4 4 5-4 3-5-8Z" fill="${green}" stroke-width="1"/>`,
 heart:`<path d="M12 21 3 13C-2 5 6 0 12 7c6-7 14-2 9 6Z" fill="${pink}"/>`,
 capsule:`<circle cx="12" cy="8" r="6" fill="${cream}"/><circle cx="9" cy="8" r="2" fill="${pink}"/><circle cx="15" cy="9" r="2" fill="${blue}"/><path d="M6 13h12l2 9H4Z" fill="${sand}"/><circle cx="12" cy="16" r="2" fill="${cream}"/><path d="M9 20h6"/>`,
 bag:`<path d="M7 7V5c0-4 10-4 10 0v2"/><rect x="4" y="7" width="16" height="15" rx="3" fill="${sand}"/><path d="M4 11h16M9 10v4h6v-4" fill="${gold}"/>`,
 book:`<path d="M2 4c5-2 8-1 10 1 3-2 6-3 10-1v16c-4-2-7-1-10 1-2-2-5-3-10-1Z" fill="${cream}"/><path d="M12 5v16M5 8h4m-4 4h4m7-4h3m-3 4h3"/>`,
 shop:`<path d="M4 10h16v12H4Z" fill="${cream}"/><path d="M3 3h18l2 7c-1 3-4 3-6 0-1 3-4 3-5 0-1 3-4 3-5 0-2 3-5 3-6 0Z" fill="${pink}"/><path d="M9 22v-8h6v8" fill="${sand}"/>`,
 users:`<circle cx="8" cy="7" r="4" fill="${cream}"/><circle cx="18" cy="8" r="3" fill="${sand}"/><path d="M1 22v-4c0-7 14-7 14 0v4Z" fill="${blue}"/><path d="M17 14c6 0 6 4 6 8h-6" fill="${sand}"/>`,
 pet:`<path d="m5 7-2-5 6 2c2-1 4-1 6 0l6-2-2 5c6 17-20 17-14 0Z" fill="${cream}"/><path d="M8 11v2m8-2v2m-6 3q2 2 4 0"/>`,
 tasks:`<rect x="4" y="4" width="16" height="18" rx="2" fill="${cream}"/><rect x="8" y="2" width="8" height="4" rx="2" fill="${sand}"/><path d="m8 13 3 3 6-7" stroke="#739970" stroke-width="2.2"/>`,
 coin:`<circle cx="12" cy="12" r="9" fill="${gold}"/><circle cx="12" cy="12" r="6" stroke-width="1"/><path d="M12 7v10m-3-8h6m-6 6h6"/>`,
 star:`<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z" fill="${gold}"/>`,
 sofa:`<rect x="4" y="4" width="16" height="13" rx="4" fill="${green}"/><path d="M2 12h5v5h10v-5h5v9H2Z" fill="${blue}"/><path d="M5 21v2m14-2v2"/>`,
 table:`<path d="M2 8h20v5H2Z" fill="${sand}"/><path d="M5 13v9m14-9v9M12 2v5"/><path d="M8 2h8l-1 4H9Z" fill="${green}"/>`,
 lamp:`<path d="M7 3h10l4 10H3Z" fill="${gold}"/><path d="M12 13v8M7 22h10"/>`,
 gift:`<rect x="3" y="9" width="18" height="13" rx="2" fill="${sand}"/><path d="M12 9v13M3 12h18"/><path d="M12 9C0 8 4-2 12 9Zm0 0c12-1 8-11 0 0Z" fill="${pink}"/>`,
 smile:`<circle cx="12" cy="12" r="10" fill="${cream}"/><path d="M8 8v1m8-1v1m-9 5q5 6 10 0"/>`,
 clock:`<circle cx="12" cy="12" r="10" fill="${cream}"/><path d="M12 5v7l5 3"/>`,
 lock:`<rect x="5" y="10" width="14" height="12" rx="2" fill="${sand}"/><path d="M8 10V6c0-6 8-6 8 0v4M12 15v3"/>`,
 cloud:`<path d="M5 19c-7 0-6-10 0-10-1-9 13-10 14-1 7 0 7 11 0 11Z" fill="${blue}"/>`
 };
 window.QBOT_UI_ICON=(key,cls='')=>{
  let n;
  if(window.QBOT_EXISTING_ICONS[key]){const p=document.createElement('div');p.innerHTML=window.QBOT_EXISTING_ICONS[key];n=p.firstElementChild;}
  else{n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('fill','none');n.setAttribute('stroke',brown);n.setAttribute('stroke-width','1.7');n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');n.innerHTML=shapes[key]||window.QBOT_ICONS[key]||window.QBOT_ICONS.star;}
  n.setAttribute('aria-hidden','true');n.setAttribute('class','unified-icon'+(cls?' '+cls:''));return n;
 };
})();

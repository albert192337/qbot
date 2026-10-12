(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const icon=key=>window.QBOT_UI_ICON(key).outerHTML;
 const art=(content,cls='')=>`<svg class="c-illustration ${cls}" viewBox="0 0 160 120" fill="none" stroke="#594235" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
 const house=()=>art('<path d="M15 106c32-9 95-8 132 0" stroke="#BDCAA8"/><path d="M46 55h71v49H46z" fill="#FFF9EF"/><path d="m36 57 45-35 46 35" fill="#E8C9B2"/><path d="M44 57 81 29l37 28"/><path d="M89 33V19h13v24" fill="#E6CBB1"/><path d="M63 104V78q0-13 12-13t12 13v26" fill="#ADC5B5"/><circle cx="79" cy="86" r="1.5" fill="#594235" stroke="none"/><path d="M96 66h13v16H96z" fill="#E8D397"/><path d="M96 73h13m-6-7v16" stroke-width="1.3"/><path d="M59 109h34m-29 5h25" stroke="#AD997C"/><path d="M129 103V82m0 11c-12 0-14-11-14-11 13-1 14 11 14 11Zm0-7c13 0 13-15 13-15-13 1-13 15-13 15Z" fill="#AFC4A0"/><path d="M19 64h13m-6-6v12" stroke="#C6AA73"/>','c-house');
 const strawberry=()=>art('<ellipse cx="81" cy="103" rx="35" ry="6" fill="#C8B28F" stroke="none" opacity=".4"/><path d="M46 62c0-16 22-25 35-19 16-7 38 5 34 23-4 22-23 39-34 40-15-1-34-22-35-44Z" fill="#D8917E"/><path d="m80 51-24-9 16-5-2-12 14 12 16-11-2 13 14 6-24 7-8 12Z" fill="#91B48D"/><path d="M81 35q-2-14 9-18"/><path d="m59 64 2 3m16-3 1 4m18-4-1 4m-25 12 1 4m19-5-1 4m-9 8v3" stroke="#FFF4D6" stroke-width="3"/>');
 const plant=young=>art(young?'<ellipse cx="80" cy="103" rx="31" ry="6" fill="#C8B28F" stroke="none" opacity=".4"/><path d="M80 101V56"/><path d="M80 72C56 76 44 59 47 49c20-2 32 5 33 23Zm0-14c-1-23 17-34 36-29 0 21-13 32-36 29Z" fill="#AEC9A1"/><path d="m60 60 20 12m0-14 20-16" stroke-width="1.2"/>':'<ellipse cx="80" cy="103" rx="31" ry="6" fill="#C8B28F" stroke="none" opacity=".4"/><path d="M80 101V42"/><path d="M80 88C55 88 47 72 50 62c22 0 30 13 30 26Zm0-21c22 3 35-13 33-25-21-3-35 8-33 25Z" fill="#ADC7A0"/><path d="M80 43c-15-4-24-16-20-27 16-1 25 11 20 27Z" fill="#C5D3AA"/><path d="m64 75 16 13m0-21 19-13" stroke-width="1.2"/>');
 window.QBOT_DECORATE_PANEL=(panel,s)=>{
  if(!document.body.classList.contains('direction-c'))return;
  panel.dataset.cScreen=s.id;
  if(s.id==='M0'||s.id==='M0H'){
   const rows=panel.querySelectorAll('.body>.row');
   rows[0]?.classList.add('c-friends');rows[1]?.classList.add('c-room');rows[2]?.classList.add('c-local');
   if(rows[0]){const avatars=document.createElement('span');avatars.className='c-avatars';avatars.setAttribute('aria-hidden','true');avatars.innerHTML=`<i>${icon('pet')}</i><i>${icon('pet')}</i>`;rows[0].querySelector('.copy').after(avatars);}
   if(rows[1]){const drawing=document.createElement('span');drawing.className='c-room-art';drawing.innerHTML=house();rows[1].append(drawing);}
  }
  if(s.id==='G0'){
   const scene=panel.querySelector('.scene');scene.classList.add('c-garden-scene');
   panel.querySelectorAll('.plot').forEach((plot,i)=>{plot.setAttribute('aria-label',['收获草莓','查看幼苗','查看生长状态','播种'][i]);if(i<3){plot.querySelector('svg').outerHTML=i===0?strawberry():plant(i===1);plot.classList.add(i===0?'c-ripe':'c-growing');}else plot.classList.add('c-empty');});
   panel.querySelector('.body>.buttons button')?.classList.add('c-primary');
  }
  if(s.id==='P0'||s.id==='P0W')panel.classList.add('c-phone-home');
  document.querySelectorAll('[data-c-screen]').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.cScreen===s.id));});
 };
 window.QBOT_AFTER_RENDER=s=>{const paired=document.getElementById('stage').classList.contains('space-open');const detail=document.querySelector('#cReview [data-c-view=detail]');if(detail)detail.disabled=paired;document.querySelectorAll('#cReview [data-c-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cScreen===s.id)));if(!document.body.classList.contains('direction-c'))return;if(s.kind==='desktop'||s.id.startsWith('C'))document.body.classList.remove('c-detail');$('cReview').querySelectorAll('[data-c-view]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.cView==='detail')===document.body.classList.contains('c-detail'))));};
 function openC(){window.QBOT_SHOW_VIEW('workspace');document.body.classList.add('direction-c','c-detail');$('cReview').hidden=false;document.querySelectorAll('.review>button').forEach(b=>b.classList.toggle('review-active',b.id==='artCTab'));window.QBOT_NAV('M0');}
 $('artCTab').onclick=openC;
 $('cReview').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.cScreen)window.QBOT_NAV(b.dataset.cScreen);if(b.dataset.cView){document.body.classList.toggle('c-detail',b.dataset.cView==='detail');$('cReview').querySelectorAll('[data-c-view]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));}});
 if(location.hash==='#direction-c')openC();
 window.addEventListener('hashchange',()=>{if(location.hash==='#direction-c')openC();});
})();

import { APPEARANCES, appearance } from '../../shared/appearances';
import type {GardenState,GardenCommand} from '../../shared/garden';
import './appearance-shop.css';
const el=(tag:string,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const button=(label:string,run:()=>unknown,disabled=false)=>{const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=()=>void run();return b;};
export function appearanceThumbnail(id:string){const a=el('div','',`appearance-art ${id}`);a.setAttribute('role','img');a.setAttribute('aria-label',appearance(id)?.name??'角色外观');for(let i=0;i<3;i++)a.append(el('i'));return a;}
export function renderAppearanceShop(host:HTMLElement,s:GardenState,act:(c:GardenCommand)=>Promise<void>){
  if(!s.economy)return;
  const section=el('section','','appearance-shop');section.append(el('p','CHARACTER ATELIER','appearance-eyebrow'),el('h2','角色外观'),el('p','永久收藏，可在商城购买或扭蛋获得。同一件外观同时只供一位角色使用，换人会自动转交。'));
  if(!s.economy.appearances){section.append(el('p','当前花园服务尚未开放外观收藏，更新后可购买、抽取和装配。'));host.append(section);return;}
  const grid=el('div','','appearance-grid');section.append(grid);host.append(section);
  for(const item of APPEARANCES){
    const inventory=s.economy.appearances,owned=!!inventory?.owned[item.id],actor=inventory?.equipped[item.id];
    const card=el('article','','appearance-card');card.dataset.appearance=item.id;
    card.append(appearanceThumbnail(item.id),el('small',`${item.tier==='epic'?'史诗':'稀有'} · ${item.slot==='entrance'?'入场动画':'行走足迹'}`),el('h3',item.name),el('p',item.description));
    card.append(button('试穿效果',()=>window.qbot.appearances.preview(item.id)));
    const status=el('p',owned?(actor?'已装配，正在读取角色…':'已收藏 · 尚未装配'):`${item.price} 花园币`,'appearance-status');card.append(status);
    if(!owned)card.append(button(`购买 ${item.name} · ${item.price} 花园币`,()=>act({type:'buyAppearance',item:item.id}),s.coins<item.price));
    else {
      const select=document.createElement('select');select.setAttribute('aria-label',`${item.name}装配角色`);select.disabled=true;card.append(select);
      const equip=button('装配给所选角色',()=>act({type:'equipAppearance',item:item.id,actor:select.value}),true);card.append(equip);
      if(actor)card.append(button('卸下外观',()=>act({type:'equipAppearance',item:item.id,actor:null})));
      void window.qbot.characters.list().then(chars=>{
        if(!section.isConnected)return;
        for(const c of chars){const option=document.createElement('option');option.value=c.dirId;option.textContent=c.manifest.name;select.append(option);}
        if(actor&&chars.some(c=>c.dirId===actor))select.value=actor;
        select.disabled=!chars.length;equip.disabled=!chars.length;
        status.textContent=actor?`正在使用：${chars.find(c=>c.dirId===actor)?.manifest.name??'已移除的角色'} · 换人会自动卸下原角色`:'已收藏 · 尚未装配';
      }).catch(()=>{status.textContent='角色列表暂时无法读取，请重新打开';});
    }
    card.append(el('small',`重复抽到返还 ${item.duplicateTokens} 代币`));grid.append(card);
  }
}

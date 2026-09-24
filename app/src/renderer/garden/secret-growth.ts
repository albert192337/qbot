import { TIER_NAMES, type Tier } from '../../shared/garden';
import './secret-growth.css';

// Deliberately contains no final fruit asset, silhouette, dye or trait accessory.
export function secretGrowth(quality: Tier, sealed = false, active = false): HTMLElement {
    const box = document.createElement('div');
    box.className = `art secret-growth secret-${quality}${sealed ? ' secret-sealed' : ''}${active ? ' secret-active' : ''}`;
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', sealed ? `${TIER_NAMES[quality]}灵果，${active ? '正在培育' : '等待培育揭晓'}` : `${TIER_NAMES[quality]}品质，果实仍在孕育`);
    box.innerHTML = `<svg viewBox="0 0 160 200" aria-hidden="true">
      <ellipse class="secret-shadow" cx="80" cy="182" rx="40" ry="7"/>
      <path d="M80 180V132M80 166Q44 174 37 144Q65 141 80 166M80 155Q105 128 124 137Q120 161 80 166" fill="#92ae70" stroke="#647b51" stroke-width="3" stroke-linejoin="round"/>
      <g class="secret-aura"><ellipse cx="80" cy="102" rx="55" ry="62"/></g>
      ${sealed ? '<g class="secret-lotus" fill="#ecb2b7" stroke="#be7e93" stroke-width="2"><path d="M80 147Q24 155 20 119Q58 111 80 147Q101 110 140 119Q133 155 80 147Z"/><path d="M80 152Q45 128 80 107Q114 130 80 152Z" fill="#f5d3b3"/></g>' : ''}
      <g class="secret-core"><path d="M80 49C40 49 39 79 43 106Q45 137 80 145Q115 137 117 106C121 79 120 49 80 49Z" fill="${sealed ? '#6b527d' : '#9ea98d'}" stroke="${sealed ? '#f7d89a' : '#dbe4c1'}" stroke-width="3"/>
      <ellipse cx="80" cy="95" rx="25" ry="29" fill="${sealed ? '#d3aac8' : '#d4d8ba'}" opacity=".28"/>
      <path d="M47 79Q80 58 113 79M44 104Q81 82 116 105M52 124Q81 103 109 124" fill="none" stroke="#fff4d6" stroke-width="9" opacity=".22"/>
      ${sealed ? '<path d="M71 67h18l-3 62-6-5-6 5Z" fill="#f8d995"/><path d="m77 80 7 7-7 7 7 7-7 7" fill="none" stroke="#b97060" stroke-width="2.5"/>' : '<path d="M80 53Q63 33 52 49Q57 64 80 59Q99 39 109 51Q104 66 80 59" fill="#89a56e"/>'}</g>
      ${sealed ? '<g class="secret-ribbons" fill="none" stroke="#ee9c9b" stroke-width="5" stroke-linecap="round"><path d="M41 94Q16 66 20 110Q22 135 42 125M119 94Q146 66 140 110Q139 135 118 125"/></g><ellipse class="secret-orbit" cx="80" cy="106" rx="63" ry="20" transform="rotate(-22 80 106)"/>' : ''}
      <g class="secret-sparks"><path d="m32 63 3-8 3 8 8 3-8 3-3 8-3-8-8-3ZM124 47l3-7 3 7 7 3-7 3-3 7-3-7-7-3Z"/><circle cx="133" cy="92" r="3"/><circle cx="29" cy="118" r="2"/></g>
    </svg>`;
    return box;
}

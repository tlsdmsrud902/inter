// eppum(K-뷰티) → inter(북유럽풍 인테리어) 일괄 치환. 저장소 루트에서 node docs/tools/rebrand-inter.js
const fs = require('fs'), path = require('path');
function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    if (f === '.git' || f === '_deploy') continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk('.').filter(f => /\.(html|css|js|json|txt|xml|svg|md|py)$/i.test(f) && !/rebrand-inter\.js$/.test(f));

const img = { // eppum 이미지 → inter 이미지
  'scene-glow': 'scene-bookshelf', 'scene-botanical': 'scene-table', 'scene-palette': 'scene-bed', 'scene-serum': 'scene-wallshelf',
  'scene-cream': 'scene-chair', 'scene-mask': 'scene-table', 'scene-vanity': 'scene-bookshelf', 'scene-powder': 'scene-wallshelf',
  'scene-base': 'scene-chair', 'scene-hair': 'scene-wallshelf', 'scene-nail': 'scene-chair', 'scene-sun': 'scene-bed',
  'scene-oil': 'scene-wallshelf', 'scene-lip': 'scene-table', 'scene-mascara': 'scene-chair', 'scene-model': 'scene-bed', 'scene-liner': 'scene-bookshelf',
  'sq-serum': 'sq-bookshelf', 'sq-cream': 'sq-chair', 'sq-mask': 'sq-table', 'sq-sun': 'sq-bed', 'sq-base': 'sq-wallshelf',
  'sq-lip': 'sq-vases', 'sq-eye': 'sq-pillow', 'sq-nail': 'sq-candle', 'sq-powder': 'sq-box', 'sq-hair': 'sq-plant',
  'sq-oil': 'sq-bowl', 'sq-mascara': 'sq-stool', 'sq-brush': 'sq-books', 'sq-red': 'sq-rug', 'sq-botanical': 'sq-sidetable',
  'sq-liner': 'sq-frame', 'sq-model': 'sq-dining-chair', 'sq-glow': 'sq-plate',
  'card-skincare': 'card-living', 'card-makeup': 'card-bedroom', 'portrait-vanity': 'portrait-shelf', 'portrait-glow': 'portrait-bed',
  'logo-eppum': 'logo-inter', 'wordmark-eppum': 'wordmark-inter'
};
const names = Object.keys(img).sort((a, b) => b.length - a.length).join('|');
const rules = [
  [/tlsdmsrud902\/k_eppum@[0-9a-z]+\//g, 'tlsdmsrud902/inter@main/'],
  [/eppum902_s2_260925195134_d_skin1_E/g, 'inter902_s2_260925195134_d_skin1_E'],
  [/pg3424b68273970037/g, 'PG_NUMBER'],
  [new RegExp('(?<![a-z-])(' + names + ')(?![a-z-])', 'g'), (m, n) => img[n]],
  [/k_eppum/g, 'inter'], [/eppum902/g, 'inter902'],
  [/EPPUM_/g, 'INTER_'], [/EPPUM/g, 'INTER'], [/Eppum/g, 'Inter'], [/eppum/g, 'inter'],
  [/(?<![A-Za-z])beauty(?![a-z])/g, 'inter'], [/(?<=[a-z])Beauty(?![a-z])/g, 'Inter'], [/(?<![A-Za-z])Beauty(?![a-z])/g, 'Inter'], [/(?<![A-Za-z])BEAUTY(?![A-Za-z])/g, 'INTER'],
  [/(?<![A-Za-z])routines(?![a-z])/g, 'rooms'],
  [/(?<![A-Za-z])skincare(?![a-z])/g, 'living'], [/(?<![A-Za-z])makeup(?![a-z])/g, 'bedroom']
];
let changed = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let out = src;
  for (const [re, to] of rules) out = out.replace(re, to);
  if (out !== src) { fs.writeFileSync(f, out); changed++; }
}
console.log(changed, 'files changed');

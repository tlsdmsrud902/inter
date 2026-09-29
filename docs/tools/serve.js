// 로컬 미리보기 서버 : node docs/tools/serve.js  →  http://localhost:8765
// <!--@layout--> · <!--@import--> · <!--@css--> · <!--@js--> 를 풀어서 보여 주고,
// 상품 카드는 cafe24-assets/products/products.json 으로 채운다. (로그인 · 장바구니 · 게시판은 동작하지 않음)
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const REPO = path.resolve(__dirname, '..', '..');
const root = path.resolve(REPO, fs.readdirSync(REPO).find(d => /_s2_260925195134_d_skin1_E$/.test(d)), 'skin1');
const PRD = path.resolve(REPO, 'cafe24-assets/products');
const products = JSON.parse(fs.readFileSync(path.join(PRD, 'products.json'), 'utf8'));
let CTX = {};
const read = p => { try { return fs.readFileSync(path.join(root, p.replace(/^\//, '')), 'utf8'); } catch (e) { return ''; } };
const won = n => n.toLocaleString('ko-KR') + '원';
function cards() {
  let list = products;
  if (CTX.group) list = list.filter(p => p.group === CTX.group);
  else if (CTX.cate && CTX.cate !== '28') list = list.filter(p => p.cates.includes(+CTX.cate));
  if (CTX.keyword) list = list.filter(p => p.name.includes(CTX.keyword));
  return list.map(p => `<li class="xans-record-"><div class="thumbnail"><div class="prdImg"><a href="/product/detail.html?product_no=${p.product_no_temp}"><img src="/__prd/${p.img}" alt="${p.name}"></a></div></div>
<div class="description"><strong class="name"><a href="#"><span>${p.name}</span></a></strong><ul class="xans-product-listitem spec"><li><strong class="title displaynone">판매가</strong> <span>${won(p.price)}</span></li>${p.retail ? `<li><span style="text-decoration:line-through">${won(p.retail)}</span></li>` : ''}</ul></div></li>`).join('');
}
function expand(s, depth = 0) {
  if (depth > 12) return '';
  s = s.replace(/module="product_listmain_(\d)"([\s\S]*?)<!--@import\(\/product\/list_product\.html\)-->/g, (m, n, mid) => {
    const keep = CTX.group; CTX.group = ({ 1: 'rec', 2: 'new', 3: 'best' })[n];
    const out = 'module="product_listmain_' + n + '"' + mid + cards(); CTX.group = keep; return out;
  });
  return s.replace(/<!--@import\(([^)]+)\)-->/g, (_, p) => p === '/product/list_product.html' ? cards() : expand(read(p), depth + 1))
    .replace(/<!--@css\(([^)]+)\)-->/g, '<link rel="stylesheet" href="$1">')
    .replace(/<!--@js\(([^)]+)\)-->/g, '<script src="$1"></script>');
}
function page(p) {
  let body = read(p);
  const m = body.match(/<!--@layout\(([^)]+)\)-->/);
  body = expand(body.replace(/<!--@layout\([^)]*\)-->/, ''));
  if (!m) return fillVars(body);
  let layout = read(m[1]);
  return fillVars(expand(layout.replace(/<!--@contents-->/, () => body)));
}

// ---------- 카페24 변수 {$…} 채우기 ----------
// 실제 쇼핑몰에서는 카페24 서버가 채우는 값. 미리보기에서는 예시 값을 넣고, 모르는 변수는 빈칸으로 지운다.
const CATES = { 28: '전체 상품', 24: '거실 · 수납', 25: '침실 · 패브릭', 26: '다이닝 · 소품', 27: 'SALE' };
const SHOP = {
  mall_name: 'inter', company_name: 'inter', president_name: '대표자명', phone: '000-0000-0000', inquiry_email: 'help@inter902.cafe24.com',
  runtime: '평일 10:00 - 17:00 (점심 12:00 - 13:00)', mall_zipcode: '00000', mall_addr1: '서울특별시 ○○구 ○○로 00', mall_addr2: '',
  company_regno: '000-00-00000', network_regno: '제0000-서울○○-0000호', cpo_name: '담당자명', cpo_email: 'help@inter902.cafe24.com',
  basket_count: '0', basket_cnt: '0', basket_price: '0원', coupon_cnt: '0', interest_prd_cnt: '0', mileage: '0원', mileage_name: '적립금',
  deposit: '0원', deposit_name: '예치금', current_language: 'KO', locale_language: 'ko_KR', country_name: 'KOREA', shop_language_name: 'KOREAN'
};
function fillVars(html) {
  const cate = CATES[CTX.cate] || '';
  const list = CTX.cate ? products.filter(x => CTX.cate === '28' || x.cates.includes(+CTX.cate)) : products;
  const prd = products.find(x => String(x.product_no_temp) === String(CTX.product_no)) || products[0];
  const V = Object.assign({}, SHOP, {
    title_text_or_image: cate || (CTX.keyword ? '"' + CTX.keyword + '" 검색 결과' : '전체 상품'), category_name: cate, name_1: cate,
    product_count: String(list.length), search_count: String(list.length),
    big_img: '/__prd/' + prd.img, product_name: prd.name, seo_alt_tag: prd.name, name: prd.name,
    product_price: won(prd.retail || prd.price), product_sale_price: won(prd.price), product_custom: prd.retail ? won(prd.retail) : '',
    summary_desc: '', product_no: String(prd.product_no_temp), review_count: '0', qna_count: '0'
  });
  // 상품 상세 : 작은 사진 칸도 상품 사진으로
  html = html.replace(/\{\$(tiny_img|small_img|image_small|image_medium|image_big|image_tiny|add_img)\}/g, '/__prd/' + prd.img);
  html = html.replace(/\{\$([A-Za-z0-9_]+)\|(display|numberformat)\}/g, '');     // |display → 보이기(빈칸)
  html = html.replace(/\{\$([A-Za-z0-9_]+)\}/g, (m, k) => V[k] != null ? V[k] : '');
  // 로컬에서는 카페24 스크립트가 없어 해외배송 선택 창이 그대로 떠 있다 → 숨김
  return html.replace('</head>', '<style>[module=Layout_multishopShipping]{display:none!important}</style></head>');
}
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  CTX = { cate: u.query.cate_no, keyword: u.query.keyword, product_no: u.query.product_no };
  let p = decodeURIComponent(u.pathname);
  if (p.startsWith('/__prd/')) {
    const f = path.resolve(PRD, p.slice(7));
    if (!f.startsWith(PRD)) { res.writeHead(403); return res.end(); }
    return fs.readFile(f, (e, d) => { res.writeHead(e ? 404 : 200, { 'Content-Type': 'image/jpeg' }); res.end(d); });
  }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.resolve(root, p.replace(/^\//, ''));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (p.endsWith('.html')) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page(p)); }
  fs.readFile(f, (e, d) => { res.writeHead(e ? 404 : 200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(8765, () => console.log('http://localhost:8765  (' + root + ')'));

/* inter 화면 관리 — 게시판 글로 메인 화면의 사진·글자를 바꾼다                          BUYER EDITABLE(설정만)
   ----------------------------------------------------------------------------------------------
   · 설정 : store-content.js 의 cms.boardNo (기본 2 = 카페24 기본 게시판 '뉴스/이벤트', 관리자만 글쓰기)
   · 메인의 [data-cms="이름"] 영역마다 게시판 글 하나. 글 제목에 영역 이름이 들어 있으면 그 영역에 쓰인다.
   · 글 본문 규칙
       라벨: 값          → 그 라벨이 붙은 글자·링크를 바꾼다 (다음 줄에 이어 쓰면 줄바꿈)
       사진              → 본문에 넣은 사진이 순서대로 그 칸의 사진이 된다
       ── 1번 ──         → 여기부터 1번 칸 (카드·장면처럼 여러 개인 영역)
       ※ 로 시작하는 줄   → 안내문, 무시
       *글자*            → 기울임(강조)
   · 편집 모드 : 메인 주소 뒤에 ?edit=1 → 영역마다 [고치기] 버튼 (지금 내용이 채워진 글쓰기 창이 열린다)
   · 디자인·애니메이션은 코드에 있고, 게시판 글이 없거나 비어 있으면 HTML 기본값이 그대로 보인다. */
(function () {
  'use strict';
  var SC = window.STORE_CONTENT || {};
  var CFG = SC.cms || {};
  var BOARD = CFG.boardNo === 0 ? 0 : (Number(CFG.boardNo) || 2);
  var TTL = (CFG.cacheMinutes != null ? Number(CFG.cacheMinutes) : 10) * 60000;
  var PREFIX = CFG.titlePrefix || '[메인 화면]';
  // 페이지마다 영역이 달라 기억도 페이지별로 (메인 / 세일 / 그 밖의 경로)
  var PAGE_KEY = /\/product\/list\.html/.test(location.pathname) ? 'list' + ((location.search.match(/[?&]cate_no=(\d+)/) || [])[1] || '') : (location.pathname.replace(/\/index\.html$/, '/') || '/');
  var CACHE_KEY = 'inter-cms-v2-' + BOARD + '-' + PAGE_KEY, DRAFT_KEY = 'inter-cms-draft';
  var html = document.documentElement;
  var qs = location.search;
  var EDIT = /[?&]edit=1\b/.test(qs);

  function norm(s) { return String(s == null ? '' : s).replace(/[\s\[\]()<>「」『』【】·,.'"`~!?]/g, '').toLowerCase(); }
  function trim(s) { return String(s == null ? '' : s).replace(/[ \t\u00a0\u200b]+/g, ' ').trim(); }
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function lsGet(k) { try { return JSON.parse(store('localStorage').getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { store('localStorage').setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- 1. 게시판 읽기 ---------- */
  function articleNo(href) { var m = String(href || '').match(/\/article\/[^/]+\/\d+\/(\d+)/) || String(href || '').match(/[?&]no=(\d+)/); return m ? m[1] : ''; }
  function parseList(text) {
    var doc = new DOMParser().parseFromString(text, 'text/html'), out = [], seen = {};
    doc.querySelectorAll('a[href*="/article/"], a[href*="read.html"]').forEach(function (a) {
      var no = articleNo(a.getAttribute('href')), subject = trim(a.textContent);
      if (!no || !subject || seen[no]) return;
      seen[no] = 1; out.push({ no: no, subject: subject, href: a.getAttribute('href') });
    });
    return out;
  }
  // 글 본문 : 손님도 보는 공개 글 페이지(스킨의 board/free/read.html 의 [data-inter-content])에서 읽는다.
  //          못 읽으면 카페24 기본 스킨이 쓰는 글 읽기 주소로 한 번 더 시도한다.
  function getPost(p) {
    if (!p.href) return getJSON(p.no);
    return fetch(p.href, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var box = t && new DOMParser().parseFromString(t, 'text/html').querySelector('[data-inter-content], [module^="board_read"] .detail');
      return box && box.innerHTML.trim() ? { content: box.innerHTML } : getJSON(p.no);
    }).catch(function () { return getJSON(p.no); });
  }
  function getJSON(no) {
    return fetch('/exec/front/board/product/' + BOARD + '?no=' + no + '&board_no=' + BOARD + '&pass_check=F', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d && d.read ? { subject: trim(d.read.subject), content: String(d.read.content || '') } : null; })
      .catch(function () { return null; });
  }
  /* 목록 → 제목이 영역 이름과 맞는 글만 본문을 읽는다 (같은 영역 글이 여럿이면 최신 글) */
  // 카페24는 짧은 시간에 요청이 몰리면 접속을 잠시 막는다 → 목록은 필요한 만큼만, 본문은 2개씩 차례로, 바뀐 글만 읽는다
  function getList(p) {
    return fetch('/board/free/list.html?board_no=' + BOARD + '&page=' + p, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; });
  }
  function load(names, prev, fresh) {
    return getList(1).then(function (t1) {
      // 게시판이 '사용 안함·표시 안함'이거나 없으면 카페24가 목록 대신 경고만 돌려준다
      state.blocked = /사용할 수 없습니다|존재하지 않는 게시판/.test(t1);
      var first = parseList(t1);
      return (first.length >= 10 ? getList(2) : Promise.resolve('')).then(function (t2) { return first.concat(parseList(t2)); });
    }).then(function (list) {
      var posts = [], seen = {};
      list.forEach(function (p) { if (!seen[p.no]) { seen[p.no] = 1; posts.push(p); } });
      posts.sort(function (a, b) { return b.no - a.no; });
      var pick = {};
      posts.forEach(function (p) { var n = match(p.subject, names); if (n && !pick[n]) pick[n] = p; });
      var keys = Object.keys(pick), map = {}, todo = [];
      keys.forEach(function (k) {
        var old = prev && prev[k];
        if (!fresh && old && old.no === pick[k].no) map[k] = old; else todo.push(k);
      });
      var i = 0;
      function worker() {
        if (i >= todo.length) return Promise.resolve();
        var k = todo[i++];
        return getPost(pick[k]).then(function (b) { if (b) map[k] = { no: pick[k].no, content: b.content }; return worker(); });
      }
      return Promise.all([worker(), worker()]).then(function () { return map; });
    });
  }
  // 글 제목 "[페이지] 영역 이름" 의 영역 이름이 정확히 같아야 한다 (세일 「카테고리 3칸」이 메인 「카테고리」에 섞이지 않게)
  function match(subject, names) {
    var s = norm(String(subject).replace(/^\s*\[[^\]]*\]/, ''));
    for (var i = 0; i < names.length; i++) if (s === norm(names[i])) return names[i];
    return '';
  }

  /* ---------- 2. 글 본문 → { fields, imgs, items } ---------- */
  var BLOCK = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE|TR|TABLE|TBODY|SECTION|ARTICLE|FIGURE|PRE)$/;
  function tokens(content) {
    var doc = new DOMParser().parseFromString(content, 'text/html'), out = [], line = '';
    function flush() { out.push({ t: line }); line = ''; }
    (function walk(node) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) { line += n.nodeValue.replace(/\s+/g, ' '); return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName;
        if (tag === 'BR') { flush(); return; }
        if (tag === 'IMG') { flush(); var src = n.getAttribute('src') || ''; if (src) out.push({ img: src }); return; }
        if (tag === 'SCRIPT' || tag === 'STYLE') return;
        var block = BLOCK.test(tag);
        if (block) flush();
        var mark = /^(EM|I)$/.test(tag) ? '*' : /^(STRONG|B)$/.test(tag) ? '**' : '';
        if (mark && trim(n.textContent)) { line += mark; walk(n); line += mark; } else walk(n);
        if (block) flush();
      });
    }(doc.body));
    flush();
    return out;
  }
  var LABEL = /^([^:：\/]{1,24}?)\s*[:：]\s?(.*)$/;
  // ── 1번 ──  또는  ── 1번 · 거실 ── (번호 뒤 설명은 무시)
  var MARK = /^[\s─━—\-=_~·*#]*(\d{1,2})\s*번(?:\s*[·:\-(][^─━—=]*)?[\s─━—\-=_~·*#)]*$/;
  function parse(content, known) {
    var root = { fields: {}, imgs: [], items: [] }, cur = root, last = null;
    tokens(content).forEach(function (tk) {
      if (tk.img) { cur.imgs.push(tk.img); last = null; return; }
      var t = trim(tk.t.replace(/\*\*\s*\*\*|\*\s*\*/g, ''));
      if (!t) { last = null; return; }
      if (/^※/.test(t)) return;
      var m = t.match(MARK);
      if (m) { cur = root.items[m[1] - 1] = { fields: {}, imgs: [] }; last = null; return; }
      var l = t.match(LABEL);
      if (l && !/^https?$/i.test(l[1]) && (!last || known[norm(l[1])])) {
        last = norm(l[1]); cur.fields[last] = unstar(l[2]); return;
      }
      if (last) cur.fields[last] = (cur.fields[last] ? cur.fields[last] + '\n' : '') + t;
    });
    // 번호는 그대로 둔다 (칸 수가 정해진 영역은 "2번"만 써도 2번 칸에 들어가야 한다)
    return root;
  }
  // **굵게** 는 라벨 줄 전체가 굵게 쓰인 경우가 많아 값 양끝의 ** 만 벗긴다
  function unstar(v) { return trim(v).replace(/^\*\*(.*)\*\*$/, '$1'); }

  /* ---------- 3. 화면에 넣기 ---------- */
  var FIELD_SEL = '[data-cms-text],[data-cms-href],[data-cms-src],[data-cms-video],[data-cms-links],[data-cms-lines],[data-cms-spots],[data-cms-list]';
  function owned(el, sec) { return el.closest('[data-cms]') === sec; }
  function fieldsIn(scope, sec) {
    var all = Array.from(scope.querySelectorAll(FIELD_SEL));
    if (scope.matches(FIELD_SEL)) all.unshift(scope); // 영역·칸 자체가 링크인 경우 (세일 큰 화면 등)
    return all.filter(function (el) {
      if (el !== sec && !owned(el, sec)) return false;
      var item = el.closest('[data-cms-item]');
      return scope === sec ? !item : item === scope;
    });
  }
  function groups(sec) {
    var g = {}, order = [];
    sec.querySelectorAll('[data-cms-item]').forEach(function (el) {
      if (!owned(el, sec)) return;
      var k = el.getAttribute('data-cms-item') || '_';
      if (!g[k]) { g[k] = []; order.push(k); }
      g[k].push(el);
    });
    return order.map(function (k) { return g[k]; });
  }
  function safeUrl(v) {
    v = trim(v).split(/\s+/)[0] || '';
    if (/^www\./i.test(v)) v = 'https://' + v;
    return /^(https?:\/\/|\/|#|\?|mailto:|tel:)/i.test(v) ? v : '';
  }
  /* 사진 권장 크기 : data-cms-size="가로x세로" 가 있으면 그것, 없으면 기본 사진의 width/height */
  function sizeOf(el) {
    var m = String(el.getAttribute('data-cms-size') || '').match(/(\d+)\s*[x×]\s*(\d+)/);
    if (m) return [+m[1], +m[2]];
    var w = +el.getAttribute('width'), h = +el.getAttribute('height');
    return w && h ? [w, h] : null;
  }
  function sizeNote(sz) { return sz ? '<p>※ 사진 크기: 가로 ' + sz[0] + ' × 세로 ' + sz[1] + ' px (비율이 다르면 가장자리가 잘려요)</p>' : ''; }
  // 올린 사진(w×h)이 권장 크기와 맞는지 : 맞으면 '' , 아니면 경고 문구
  function sizeWarn(w, h, sz) {
    if (!sz || !w || !h) return '';
    var r = w / h, R = sz[0] / sz[1];
    if (Math.abs(r - R) / R > 0.08) return '비율이 달라요 — 올린 사진 ' + w + '×' + h + ', 권장 ' + sz[0] + '×' + sz[1] + ' (가장자리가 잘려 보여요)';
    if (w < sz[0] * 0.6) return '사진이 작아요 — 올린 사진 ' + w + '×' + h + ', 권장 ' + sz[0] + '×' + sz[1] + ' (흐릿하게 보일 수 있어요)';
    return '';
  }

  /* 장면 속 상품 : "상품 점" 한 줄 = 상품번호 가로% 세로%  (상품번호 대신 주소를 쓰면 그 주소로 가는 점) */
  var PRODUCTS = window.INTER_PRODUCTS = window.INTER_PRODUCTS || {};
  function lookData() { try { return JSON.parse(document.getElementById('cz-looks-data').textContent); } catch (e) { return {}; } }
  function product(no) {
    var known = lookData()[no];
    if (known) return Promise.resolve(known);
    if (PRODUCTS[no]) return Promise.resolve(PRODUCTS[no]);
    return fetch('/product/detail.html?product_no=' + no, { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/html');
      var meta = function (p) { var m = doc.querySelector('meta[property="' + p + '"]'); return m ? m.getAttribute('content') : ''; };
      var name = meta('og:title').replace(/\s*-\s*[^-]*$/, '');
      if (!name) return null;
      var price = Number(meta('product:sale_price:amount') || meta('product:price:amount')) || 0, list = Number(meta('product:price:amount')) || 0;
      return (PRODUCTS[no] = { name: name, price: price, retail: list > price ? list : 0, img: meta('og:image'), cat: '', desc: meta('og:description') || '' });
    }).catch(function () { return null; });
  }
  function parseSpots(value) {
    return String(value).split('\n').map(trim).filter(Boolean).map(function (line) {
      var url = (line.match(/(https?:\/\/\S+|\/\S+)/) || [])[1] || '';
      var nums = line.replace(url, ' ').match(/\d+(?:\.\d+)?/g) || [];
      if (url) return nums.length >= 2 ? { url: safeUrl(url), x: +nums[0], y: +nums[1] } : null;
      return nums.length >= 3 ? { no: nums[0], x: +nums[1], y: +nums[2] } : null;
    }).filter(Boolean);
  }
  function setSpots(item, value) {
    var fig = item.querySelector('.cz-look__media'), list = item.querySelector('.cz-look__list');
    if (!fig) return;
    var spots = parseSpots(value), won = function (n) { return Number(n).toLocaleString('ko-KR') + '원'; };
    fig.querySelectorAll('.cz-look__spot').forEach(function (b) { b.remove(); });
    var liTpl = list && list.firstElementChild ? list.firstElementChild.cloneNode(true) : null;
    if (list && spots.some(function (s) { return s.no; })) list.innerHTML = '';
    spots.forEach(function (s) {
      var pos = '--x:' + Math.min(100, s.x) + '%;--y:' + Math.min(100, s.y) + '%';
      var spot;
      if (s.url) { spot = document.createElement('a'); spot.href = s.url; spot.setAttribute('aria-label', '연결된 페이지 보기'); }
      else { spot = document.createElement('button'); spot.type = 'button'; spot.setAttribute('data-prd', s.no); spot.setAttribute('aria-label', '상품 ' + s.no + ' 보기'); }
      spot.className = 'cz-look__spot'; spot.setAttribute('style', pos);
      fig.appendChild(spot);
      if (!s.no || !list || !liTpl) return;
      var li = liTpl.cloneNode(true), btn = li.querySelector('button') || li;
      btn.setAttribute('data-prd', s.no);
      var nameEl = btn.querySelector('span'), priceEl = btn.querySelector('b');
      if (nameEl) nameEl.textContent = '상품 ' + s.no;
      if (priceEl) priceEl.textContent = '';
      list.appendChild(li);
      product(s.no).then(function (p) {
        if (!p) { if (nameEl) nameEl.textContent = '상품 ' + s.no + ' (번호 확인)'; return; }
        if (nameEl) nameEl.textContent = p.name;
        if (priceEl) priceEl.textContent = p.price ? won(p.price) : '';
        spot.setAttribute('aria-label', p.name + ' 보기');
      });
    });
  }

  var KEEP = /^(SVG|I|SPAN|IMG|VIDEO|PICTURE)$/;
  // store-content.js 값을 채우는 기존 스크립트(seraphin.js, data-st-*)가 게시판 내용을 다시 덮어쓰지 않게 '이미 채움' 표시
  function lock(el) { el.__stDone = { text: 1, html: 1, lead: 1, href: 1, src: 1, srcset: 1, attr: 1 }; }
  function setText(el, value) {
    lock(el);
    if (!trim(value)) { el.hidden = true; el.setAttribute('data-cms-hid', ''); return; }
    if (el.hasAttribute('data-cms-hid')) { el.hidden = false; el.removeAttribute('data-cms-hid'); }
    // 아이콘·화살표·코드가 채우는 조각(data-*)은 두고, 글자만 원래 자리에서 바꾼다
    var marker = null, removed = '';
    Array.from(el.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && (KEEP.test(n.tagName.toUpperCase()) || Array.from(n.attributes).some(function (a) { return /^data-/.test(a.name); }))) return;
      if (!marker) { marker = document.createComment(''); el.insertBefore(marker, n); }
      removed += n.textContent;
      el.removeChild(n);
    });
    var frag = document.createDocumentFragment();
    if (/^\s/.test(removed) && marker && marker.previousSibling) frag.appendChild(document.createTextNode(' '));
    String(value).split('\n').forEach(function (line, i) {
      if (i) frag.appendChild(document.createElement('br'));
      line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach(function (part) {
        if (!part) return;
        var m = part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^\*([^*]+)\*$/);
        if (m) { var e = document.createElement(part.indexOf('**') === 0 ? 'b' : 'em'); e.textContent = m[1]; frag.appendChild(e); }
        else frag.appendChild(document.createTextNode(part));
      });
    });
    if (/\s$/.test(removed) && marker && marker.nextSibling) frag.appendChild(document.createTextNode(' '));
    if (marker) el.replaceChild(frag, marker); else el.appendChild(frag);
  }
  function setSrc(el, url) {
    if (!url) return el;
    lock(el);
    if (el.tagName === 'VIDEO') {
      var img = document.createElement('img');
      Array.from(el.attributes).forEach(function (a) { if (/^(class|data-|style|width|height)/.test(a.name)) img.setAttribute(a.name, a.value); });
      img.classList.remove('pe-world-video');
      img.alt = el.getAttribute('aria-label') || '';
      el.replaceWith(img); el = img;
    }
    if (el.getAttribute('src') === url) return el;
    el.removeAttribute('srcset');
    if (el.hasAttribute('data-cms-reset')) el.removeAttribute('style');
    el.setAttribute('src', url);
    el.setAttribute('data-cms-replaced', '');
    if (el.tagName === 'IMG' && el.closest('[data-cms-item]') && !el.hasAttribute('data-cms-keep-alt')) el.alt = '';
    // 장면 속 상품처럼 사진 비율로 칸 모양을 정하는 곳은 새 사진 비율을 따른다 (점 위치 % 가 사진에 맞게)
    var arBox = el.closest('[data-cms-ar]');
    if (arBox && el.tagName === 'IMG') {
      var fit = function () { if (el.naturalWidth) { arBox.style.setProperty('--ar', (el.naturalWidth / el.naturalHeight).toFixed(3)); window.dispatchEvent(new Event('resize')); } };
      if (el.complete) fit(); else el.addEventListener('load', fit, { once: true });
    }
    return el;
  }
  function setVideo(el, url) {
    if (!url || el.tagName !== 'VIDEO' || el.getAttribute('src') === url) return;
    el.setAttribute('src', url);
    try { el.load(); var p = el.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function setLinks(ul, value) {
    var tpl = ul.firstElementChild;
    if (!tpl) return;
    var lines = String(value).split('\n').map(trim).filter(Boolean);
    if (!lines.length) { ul.hidden = true; return; }
    ul.hidden = false;
    tpl = tpl.cloneNode(true);
    ul.innerHTML = '';
    lines.forEach(function (line) {
      var parts = line.split(/\s+/), url = safeUrl(parts[parts.length - 1]);
      var label = url ? parts.slice(0, -1).join(' ') : line;
      var li = tpl.cloneNode(true), a = li.querySelector('a') || li;
      a.textContent = label;
      if (a.tagName === 'A') a.setAttribute('href', url || '/product/search.html?keyword=' + encodeURIComponent(label));
      ul.appendChild(li);
    });
  }
  // 글머리 목록(<ul><li>) : 한 줄 = 한 항목
  function setList(ul, value) {
    var tpl = ul.querySelector('li');
    var lines = String(value).split('\n').map(trim).filter(Boolean);
    if (!tpl) return;
    tpl = tpl.cloneNode(false);
    ul.innerHTML = '';
    lines.forEach(function (line) { var li = tpl.cloneNode(false); li.textContent = line; ul.appendChild(li); });
    ul.hidden = !lines.length;
  }
  function applyScope(scope, sec, data) {
    var imgLabels = [], urls = {};
    var els = fieldsIn(scope, sec);
    els.forEach(function (el) {
      var l = el.getAttribute('data-cms-src');
      if (l && imgLabels.indexOf(norm(l)) < 0) imgLabels.push(norm(l));
    });
    imgLabels.forEach(function (l, i) { urls[l] = data.imgs[i] || safeUrl(data.fields[l] || ''); });
    els.forEach(function (el) {
      var f = data.fields, a;
      var video = el.getAttribute('data-cms-video');
      if (video && f[norm(video)] != null && safeUrl(f[norm(video)])) { setVideo(el, safeUrl(f[norm(video)])); return; }
      if ((a = el.getAttribute('data-cms-src')) && urls[norm(a)]) el = setSrc(el, urls[norm(a)]);
      if ((a = el.getAttribute('data-cms-text')) && f[norm(a)] != null) setText(el, f[norm(a)]);
      if ((a = el.getAttribute('data-cms-href')) && f[norm(a)] != null && safeUrl(f[norm(a)])) { lock(el); el.setAttribute('href', safeUrl(f[norm(a)])); }
      if ((a = el.getAttribute('data-cms-links')) && f[norm(a)] != null) setLinks(el, f[norm(a)]);
      if ((a = el.getAttribute('data-cms-lines')) && f[norm(a)] != null) el.textContent = String(f[norm(a)]).split('\n').map(trim).filter(Boolean).join('\n');
      if ((a = el.getAttribute('data-cms-spots')) && f[norm(a)] != null) setSpots(el, f[norm(a)]);
      if ((a = el.getAttribute('data-cms-list')) && f[norm(a)] != null) setList(el, f[norm(a)]);
    });
  }
  function isOff(v) { return /^(아니|아니오|아니요|숨김|숨기기|끔|끄기|no|off|x|false)$/i.test(trim(v)); }
  function applySection(sec, data) {
    var off = data.fields[norm('보이기')];
    sec.classList.toggle('cms-off', off != null && isOff(off));
    applyScope(sec, sec, data);
    if (!data.items.length) return;
    // 칸을 늘리고 줄이는 영역은 빠진 번호를 당겨 채우고, 칸 수가 정해진 영역은 번호 그대로
    var grow = sec.hasAttribute('data-cms-grow'), items = grow ? data.items.filter(Boolean) : data.items, n = items.length;
    groups(sec).forEach(function (list) {
      if (grow) {
        while (list.length < n) { var c = list[list.length - 1].cloneNode(true); list[list.length - 1].after(c); list.push(c); }
        while (list.length > n) list.pop().remove();
      }
      list.forEach(function (el, i) { if (items[i]) applyScope(el, sec, items[i]); });
    });
  }

  /* 코드가 그리는 영역(팝업·세일 타이머·쿠폰) : store-content 설정을 게시판 내용으로 덮어쓴다
     configAdapter(설정 위치, [[라벨, 설정 이름, 종류], …], 안내) — 종류 : 'text'(기본) | 'bool'(보이기) | 'lines'(여러 줄 목록) */
  function configAdapter(getObj, rows, note) {
    return {
      labels: rows.map(function (r) { return r[0]; }),
      draft: function () {
        var o = getObj() || {};
        return {
          note: note,
          fields: rows.map(function (r) {
            var v = o[r[1]];
            if (r[2] === 'bool') v = v === false ? '아니오' : '예';
            else if (r[2] === 'lines') v = (v || []).join('\n');
            return [r[0], v == null ? '' : String(v)];
          }),
          items: []
        };
      },
      apply: function (data) {
        var o = getObj();
        if (!o) return;
        rows.forEach(function (r) {
          var v = data.fields[norm(r[0])];
          if (v == null) return;
          if (r[2] === 'bool') o[r[1]] = !isOff(v);
          else if (r[2] === 'lines') o[r[1]] = String(v).split('\n').map(trim).filter(Boolean);
          else o[r[1]] = String(v).replace(/\n/g, ' ');
        });
      }
    };
  }
  function saleObj(key) { return function () { var s = SC.sale = SC.sale || {}; return (s[key] = s[key] || {}); }; }
  /* 상품 목록·검색·게시판 맨 위 큰 배너 (inter/submenu-hero.html 의 window.INTER_MENU_HERO) */
  var HERO_KEYS = [['all', '전체상품'], ['living', '거실·수납 분류'], ['bedroom', '침실·패브릭 분류'], ['dining', '다이닝·소품 분류'], ['review', '리뷰 게시판'], ['notice', '공지사항 게시판'], ['faq', '자주묻는질문 게시판'], ['qna', '상품문의 게시판']];
  var HERO_FIELDS = [['작은 제목', 2], ['제목', 3], ['설명', 4], ['사진 설명', 1]];
  function htmlToText(h) { return String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); }
  function heroImg(v) {
    if (!v || /^(https?:)?\/\/|^\//.test(v)) return v;
    var im = document.querySelector('.inter-menu-hero img'), src = im ? (im.currentSrc || im.src) : '';
    return (src ? src.replace(/[^\/]+(\?.*)?$/, '') : '/SkinImg/inter/') + v;
  }
  var ADAPTERS = {
    menuHero: {
      labels: HERO_FIELDS.map(function (f) { return f[0]; }),
      draft: function () {
        var m = window.INTER_MENU_HERO || {};
        return {
          note: '이 배너는 상품 목록·검색·게시판 맨 위에 나와요. 1~4번은 상품 분류, 5~8번은 게시판 배너예요. 어느 분류·게시판에 어느 배너가 나올지는 코드(inter/submenu-hero.html)에서 정해요.',
          fields: [],
          items: HERO_KEYS.map(function (k) {
            var d = m[k[0]] || [];
            return { label: k[1], img: heroImg(d[0]), size: [1600, 900], fields: HERO_FIELDS.map(function (f) { return [f[0], htmlToText(d[f[1]])]; }) };
          })
        };
      },
      apply: function (data) {
        var m = window.INTER_MENU_HERO = window.INTER_MENU_HERO || {};
        data.items.forEach(function (it, i) {
          if (!it || !HERO_KEYS[i]) return;
          var key = HERO_KEYS[i][0], d = (m[key] || ['', '', '', '', '']).slice();
          if (it.imgs[0]) d[0] = it.imgs[0];
          HERO_FIELDS.forEach(function (f) {
            var v = it.fields[norm(f[0])];
            if (v != null) d[f[1]] = f[1] >= 3 ? esc(v).replace(/\n/g, '<br>') : String(v).replace(/\n/g, ' ');
          });
          m[key] = d;
        });
      }
    },
    saleTimer: configAdapter(saleObj('timer'), [
      ['보이기', 'enabled', 'bool'], ['문구', 'label'], ['마감 시각', 'endAt'], ['끝났을 때 문구', 'endedText'], ['배경색', 'bg'], ['글자색', 'fg']
    ], '마감 시각은 한국시간 「2026-10-31 23:59」처럼 써요. 색은 #색코드(예: #e11d48)이고, 비우면 기본 색이에요.'),
    saleCoupon: configAdapter(saleObj('coupon'), [
      ['보이기', 'enabled', 'bool'], ['영문 작은 글', 'eyebrow'], ['제목', 'title'], ['제목 강조 단어', 'titleHl'], ['리본 문구', 'kicker'],
      ['말풍선', 'bubble'], ['말풍선 강조 단어', 'bubbleEm'], ['남은 쿠폰 제목', 'stockTitle'], ['남은 쿠폰 안내', 'stockNote'],
      ['유의사항 제목', 'notesTitle'], ['유의사항', 'notes', 'lines']
    ], '쿠폰 번호·수량·할인율은 관리자 › 프로모션 › 쿠폰과 store-content.js 의 sale.coupon 에서 정해요. 여기서는 화면 글자만 바꿔요. 유의사항은 한 줄에 하나씩, {period}·{usecon} 은 쿠폰의 사용기간·사용조건으로 자동으로 바뀌어요.'),
    popup: {
      draft: function () {
        var c = SC.popup || {}, s = c.slides || [];
        return {
          fields: [['보이기', c.enabled === false ? '아니오' : '예'], ['넘김 간격(초)', String(c.interval != null ? c.interval : 4)]],
          items: s.map(function (x) {
            return { img: x.image, fields: [['배지', x.badge], ['작은 글', x.kicker], ['제목', x.title], ['설명', x.text], ['버튼', x.button], ['링크', x.link], ['마감 시각', x.type === 'timer' ? (x.endAt || (SC.sale && SC.sale.timer && SC.sale.timer.endAt) || '') : '']] };
          })
        };
      },
      apply: function (data) {
        var c = SC.popup = SC.popup || {}, f = data.fields;
        if (f[norm('보이기')] != null) c.enabled = !isOff(f[norm('보이기')]);
        if (f[norm('넘김 간격(초)')] != null && !isNaN(parseFloat(f[norm('넘김 간격(초)')]))) c.interval = parseFloat(f[norm('넘김 간격(초)')]);
        var list = data.items.filter(Boolean);
        if (!list.length) return;
        var old = c.slides || [];
        c.slides = list.map(function (it, i) {
          var b = old[i] || old[old.length - 1] || {}, s = {}, g = function (l) { return it.fields[norm(l)]; };
          for (var k in b) s[k] = b[k];
          if (it.imgs[0]) { s.image = it.imgs[0]; s.imagePosition = '50% 50%'; s.imageAlt = ''; }
          [['badge', '배지'], ['kicker', '작은 글'], ['title', '제목'], ['text', '설명'], ['button', '버튼']].forEach(function (p) { if (g(p[1]) != null) s[p[0]] = g(p[1]).replace(/\n/g, ' '); });
          if (g('링크') != null && safeUrl(g('링크'))) s.link = safeUrl(g('링크'));
          if (g('마감 시각') != null) { var e = trim(g('마감 시각')); s.type = e ? 'timer' : 'normal'; s.endAt = e; }
          return s;
        });
      }
    }
  };

  /* 섹션 순서 : [data-cms-sortable="글 이름"] 바로 아래의 section[data-cms]·section[data-cms-order] 를 게시판 글 「순서」 줄 순서대로 놓는다
     (첫 화면·팝업처럼 section 이 아닌 것은 제자리. 글에 없는 섹션은 원래 앞 섹션 뒤에 붙는다) */
  function sortBox() { return document.querySelector('[data-cms-sortable]'); }
  function orderName() { var b = sortBox(); return b ? b.getAttribute('data-cms-sortable') : ''; }
  function units() {
    var box = sortBox();
    return box ? Array.from(box.children).filter(function (n) { return n.tagName === 'SECTION' && (n.hasAttribute('data-cms') || n.hasAttribute('data-cms-order')); }) : [];
  }
  function unitName(n) { return n.getAttribute('data-cms-order') || n.getAttribute('data-cms'); }
  function placeUnits(list) {
    var box = sortBox(), cur = units();
    if (!box || !cur.length || list.every(function (u, i) { return cur[i] === u; })) return;
    var anchor = cur[cur.length - 1].nextSibling;
    list.forEach(function (u) { box.insertBefore(u, anchor); });
    // 고정 섹션·등장 효과가 위치를 다시 재도록
    window.dispatchEvent(new Event('resize'));
    try { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); } catch (e) {}
  }
  function applyOrder(value) {
    var cur = units(), byName = {}, want = [];
    cur.forEach(function (u) { byName[norm(unitName(u))] = u; });
    String(value || '').split('\n').map(trim).forEach(function (l) { var u = byName[norm(l)]; if (u && want.indexOf(u) < 0) want.push(u); });
    if (!want.length) return;
    cur.forEach(function (u, i) { if (want.indexOf(u) < 0) want.splice(i ? want.indexOf(cur[i - 1]) + 1 : 0, 0, u); });
    placeUnits(want);
  }

  var state = { map: null, applied: false, waiters: [], orderMoved: false };
  function sections() { return Array.from(document.querySelectorAll('[data-cms]')); }
  function names() { return sections().map(function (s) { return s.getAttribute('data-cms'); }).concat(orderName() ? [orderName()] : []).sort(function (a, b) { return norm(b).length - norm(a).length; }); }
  function knownLabels(sec) {
    var k = { '보이기': 1 };
    k[norm('보이기')] = 1;
    [sec].concat(Array.from(sec.querySelectorAll(FIELD_SEL))).forEach(function (el) {
      ['text', 'href', 'src', 'video', 'links', 'lines', 'spots', 'list'].forEach(function (t) { var v = el.getAttribute('data-cms-' + t); if (v) k[norm(v)] = 1; });
    });
    if (sec.getAttribute('data-cms-adapter') === 'popup') ['배지', '작은 글', '제목', '설명', '버튼', '링크', '마감 시각', '넘김 간격(초)'].forEach(function (l) { k[norm(l)] = 1; });
    var ad = ADAPTERS[sec.getAttribute('data-cms-adapter')];
    if (ad && ad.labels) ad.labels.forEach(function (l) { k[norm(l)] = 1; });
    return k;
  }
  function applyAll(map) {
    state.map = map;
    sections().forEach(function (sec) {
      var post = map[sec.getAttribute('data-cms')];
      sec.classList.toggle('cms-has-post', !!post);
      if (!post) return;
      var data = parse(post.content, knownLabels(sec)), ad = ADAPTERS[sec.getAttribute('data-cms-adapter')];
      try { if (ad) ad.apply(data); else applySection(sec, data); } catch (e) { if (window.console) console.warn('[inter 화면 관리]', sec.getAttribute('data-cms'), e); }
    });
    // 편집 모드에서 ↑↓ 로 옮기는 중이면 게시판 순서로 되돌리지 않는다
    var on = orderName();
    if (on && map[on] && !state.orderMoved) {
      try { applyOrder(parse(map[on].content, { 순서: 1 }).fields[norm('순서')]); } catch (e) {}
    }
    state.applied = true;
    html.classList.remove('cms-wait');
    var w = state.waiters; state.waiters = [];
    w.forEach(function (fn) { try { fn(); } catch (e) {} });
    document.dispatchEvent(new CustomEvent('inter:cms', { detail: map }));
  }

  /* ---------- 4. 편집 모드 : 지금 내용으로 글 초안 만들기 ---------- */
  function getText(el) {
    var out = '';
    (function walk(node) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) { out += n.nodeValue; return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toUpperCase();
        if (tag === 'BR') { out += '\n'; return; }
        if (KEEP.test(tag) || Array.from(n.attributes).some(function (a) { return /^data-/.test(a.name); })) return;
        if (/^(EM|I)$/.test(tag)) { out += '*' + trim(n.textContent) + '*'; return; }
        if (/^(B|STRONG)$/.test(tag) && el.tagName !== 'B') { out += '**' + trim(n.textContent) + '**'; return; }
        walk(n);
      });
    }(el));
    return out.split('\n').map(trim).filter(function (l, i, a) { return l || (i && i < a.length - 1); }).join('\n');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function line(label, value) { return '<p>' + esc(label) + ': ' + esc(value).replace(/\n/g, '<br>') + '</p>'; }
  function absUrl(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  // 사진 → 글자 → 링크 순서로 적는다 (화면에서 보이는 순서와 비슷하게)
  function draftScope(scope, sec) {
    var media = [], texts = [], links = [], done = {};
    fieldsIn(scope, sec).forEach(function (el) {
      var a;
      if ((a = el.getAttribute('data-cms-src')) && !done['s' + a]) {
        done['s' + a] = 1;
        // 영상 자리도 사진 칸을 만든다 (data-cms-poster 가 기본 사진). 영상 주소가 비면 이 사진이 나온다
        var src = el.tagName === 'VIDEO' ? el.getAttribute('data-cms-poster') : (el.currentSrc || el.getAttribute('src'));
        if (src) media.push(sizeNote(sizeOf(el)) + '<p><img src="' + esc(absUrl(src)) + '" alt=""></p>');
      }
      if ((a = el.getAttribute('data-cms-video')) && !done['v' + a]) { done['v' + a] = 1; media.push(line(a, el.tagName === 'VIDEO' ? absUrl(el.currentSrc || el.getAttribute('src') || '') : '')); }
      if ((a = el.getAttribute('data-cms-text')) && !done['t' + a]) { done['t' + a] = 1; texts.push(line(a, el.hasAttribute('data-cms-hid') ? '' : getText(el))); }
      if ((a = el.getAttribute('data-cms-href')) && !done['h' + a]) { done['h' + a] = 1; links.push(line(a, el.getAttribute('href') || '')); }
      if ((a = el.getAttribute('data-cms-links')) && !done['l' + a]) {
        done['l' + a] = 1;
        texts.push('<p>' + esc(a) + ':<br>' + Array.from(el.querySelectorAll('a')).map(function (x) { return esc(trim(x.textContent) + ' ' + (x.getAttribute('href') || '')); }).join('<br>') + '</p>');
      }
      if ((a = el.getAttribute('data-cms-lines')) && !done['n' + a]) { done['n' + a] = 1; texts.push('<p>' + esc(a) + ':<br>' + el.textContent.split('\n').map(trim).filter(Boolean).map(esc).join('<br>') + '</p>'); }
      if ((a = el.getAttribute('data-cms-list')) && !done['u' + a]) { done['u' + a] = 1; texts.push('<p>' + esc(a) + ':<br>' + Array.from(el.querySelectorAll('li')).map(function (li) { return esc(trim(li.textContent)); }).join('<br>') + '</p>'); }
      if ((a = el.getAttribute('data-cms-spots')) && !done['p' + a]) {
        done['p' + a] = 1;
        var rows = Array.from(el.querySelectorAll('.cz-look__spot')).map(function (b) {
          var st = b.getAttribute('style') || '', x = (st.match(/--x:\s*([\d.]+)/) || [])[1] || '50', y = (st.match(/--y:\s*([\d.]+)/) || [])[1] || '50';
          return esc((b.getAttribute('data-prd') || b.getAttribute('href') || '') + ' ' + x + ' ' + y);
        });
        links.push('<p>' + esc(a) + ':<br>' + rows.join('<br>') + '</p>');
      }
    });
    return media.concat(texts, links);
  }
  // 어느 페이지의 영역인지 : 글 제목 앞머리와 안내문에 쓴다
  function pageLabel(sec) {
    var own = sec && sec.closest('[data-cms-page]');
    if (own) return own.getAttribute('data-cms-page');
    return html.classList.contains('st-sale-on') ? '세일 페이지' : PREFIX.replace(/[\[\]]/g, '');
  }
  function draft(sec) {
    var name = sec.getAttribute('data-cms'), help = sec.getAttribute('data-cms-help') || '', page = pageLabel(sec);
    var head = ['<p>※ ' + esc(page) + ' 「' + esc(name) + '」 영역에 나오는 글이에요. 제목은 그대로 두세요.</p>',
      '<p>※ 사진은 눌러서 [바꾸기], 글자는 쌍점(:) 뒤만 고치면 돼요. 줄을 바꾸면 화면에서도 줄이 바뀌어요.</p>'];
    if (help) head.push('<p>※ ' + esc(help) + '</p>');
    var body = [line('보이기', sec.classList.contains('cms-off') ? '아니오' : '예')];
    var ad = ADAPTERS[sec.getAttribute('data-cms-adapter')];
    if (ad) {
      var d = ad.draft();
      body = d.fields.map(function (f) { return line(f[0], f[1]); });
      d.items.forEach(function (it, i) {
        body.push('<p>── ' + (i + 1) + '번' + (it.label ? ' · ' + esc(it.label) : '') + ' ──</p>');
        if (it.img) body.push(sizeNote(it.size || [1000, 1000]) + '<p><img src="' + esc(absUrl(it.img)) + '" alt=""></p>');
        it.fields.forEach(function (f) { body.push(line(f[0], f[1] || '')); });
      });
      if (d.note) head.push('<p>※ ' + esc(d.note) + '</p>');
      else if (d.items.length) body.push('<p>※ 마감 시각을 적으면(예: 2026-10-31 23:59) 그 장에 남은 시간 타이머가 붙어요. 비우면 타이머 없는 팝업이에요.</p>');
    } else {
      body = body.concat(draftScope(sec, sec));
      var gs = groups(sec), n = gs.reduce(function (m, g) { return Math.max(m, g.length); }, 0);
      for (var i = 0; i < n; i++) {
        var tag = gs.map(function (g) { return g[i] && g[i].getAttribute('data-cms-item-label'); }).filter(Boolean)[0];
        body.push('<p>── ' + (i + 1) + '번' + (tag ? ' · ' + esc(tag) : '') + ' ──</p>');
        gs.forEach(function (g) { if (g[i]) body = body.concat(draftScope(g[i], sec)); });
      }
      if (n && sec.hasAttribute('data-cms-grow')) body.push('<p>※ 칸을 늘리려면 마지막 번호 묶음을 복사해 번호만 바꿔 붙이고, 줄이려면 그 번호 묶음을 통째로 지우세요.</p>');
      else if (n) body.push('<p>※ 이 영역은 칸 수가 정해져 있어요. 번호 묶음 안의 사진과 글자만 바꿔 주세요.</p>');
    }
    var text = body.join('');
    if (/: [^<]*\*[^*<]+\*/.test(text)) head.push('<p>※ *별표*로 감싼 글자는 기울어진 강조 글씨로 나와요.</p>');
    if (/바로가기:/.test(text)) head.push('<p>※ 여러 줄 항목은 한 줄에 하나씩 써요. 바로가기는 "이름 한 칸 띄고 주소" 예) 책장 /product/search.html?keyword=책장</p>');
    return { subject: '[' + page + '] ' + name, html: head.concat(body).join('') };
  }

  var EDIT_CSS = '.cms-edit [data-cms]{outline:2px dashed #ff5a36;outline-offset:-2px;position:relative}'
    // 숨긴 영역 : 편집 모드에서는 원래 모양 그대로 두고 위에 흐린 막 + 「숨김」 표시 (투명도를 쓰면 등장 효과 규칙과 부딪힌다)
    + '.cms-off-veil{position:absolute;inset:0;z-index:55;pointer-events:none;background:repeating-linear-gradient(135deg,rgba(255,255,255,.62) 0 14px,rgba(255,255,255,.78) 14px 28px)}'
    + '.cms-edit [data-cms-order]{position:relative;outline:2px dashed #8a6d5d;outline-offset:-2px}'
    + '.cms-order{position:absolute;z-index:62;top:10px;right:10px;display:flex;align-items:center;gap:4px;padding:4px;border-radius:999px;background:#1f1d1a;color:#fff;font:600 13px/1 Pretendard,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)}'
    + '.cms-order span{padding:0 6px 0 8px}.cms-order button{width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font:700 17px/1 system-ui,sans-serif;cursor:pointer}.cms-order button:disabled{opacity:.3;cursor:default}'
    + '.cms-bar .cms-order-save.is-dirty{background:#ff5a36;font-weight:700}'
    + '.cms-bar__go{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.15);font-size:13px;color:#e9e2dc}.cms-bar__go a{background:rgba(255,90,54,.28)!important}'
    + '.cms-order .cms-order__save{width:auto;padding:0 14px;border-radius:999px;background:#ff5a36;font:700 14px/1 Pretendard,system-ui,sans-serif}'
    + '.cms-order-float{position:fixed;z-index:10002;left:50%;top:110px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:10px 10px 10px 20px;border-radius:999px;background:#1f1d1a;color:#fff;font:700 15px/1.3 Pretendard,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);white-space:nowrap}'
    + '.cms-order-float button{height:44px;padding:0 22px;border:0;border-radius:999px;background:#ff5a36;color:#fff;font:800 16px/1 Pretendard,system-ui,sans-serif;cursor:pointer;animation:cmsPulse 1.6s ease-in-out infinite}'
    + '@keyframes cmsPulse{50%{box-shadow:0 0 0 8px rgba(255,90,54,.25)}}'
    + '.cms-off-tag{position:absolute;z-index:61;top:58px;right:10px;padding:8px 14px;border-radius:999px;background:#1f1d1a;color:#fff;font:700 14px/1.2 Pretendard,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none}'
    + '.cms-btn{position:absolute;z-index:60;top:10px;left:10px;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:0;border-radius:999px;background:#ff5a36;color:#fff;font:700 14px/1.2 Pretendard,system-ui,sans-serif;font-style:normal;letter-spacing:0;text-transform:none;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}'
    // 버튼이 놓인 영역의 글꼴 규칙(예: 배너의 small 기울임체)이 스며들지 않게
    + '.cms-btn small{display:inline;margin:0;font:500 12px/1.2 Pretendard,system-ui,sans-serif;font-style:normal;letter-spacing:0;text-transform:none;color:inherit;opacity:.9}'
    + '.pe-hero-track>.cms-btn{top:96px}.cms-bar .cms-btn{position:static;box-shadow:none}'
    + '.cms-bar{position:fixed;z-index:10000;left:50%;bottom:16px;transform:translateX(-50%);width:min(760px,calc(100% - 32px));box-sizing:border-box;padding:14px 16px;border-radius:16px;background:#1f1d1a;color:#fff;font:14px/1.5 Pretendard,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}'
    + '.cms-bar b{color:#ffb199}.cms-bar a,.cms-bar button{color:#fff;background:rgba(255,255,255,.14);border:0;border-radius:999px;padding:6px 12px;margin:6px 6px 0 0;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}'
    + '.cms-bar .cms-btn{background:#ff5a36}.cms-bar__sub{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.15);font-size:13px;color:#e9e2dc}'
    + '.cms-bar__warn{margin-top:8px;padding:8px 10px;border-radius:10px;background:#5b1a1a;font-size:13px;max-height:120px;overflow:auto}.cms-bar__warn li{margin:2px 0 2px 16px}'
    + '.cms-bar.is-min>div:not(:first-child){display:none}.cms-bar__min{float:right;margin:0!important}'
    + '.cms-pop-btn{position:absolute;z-index:5;left:12px;top:12px}'
    + '.cms-img-warn{outline:4px solid #e5484d!important;outline-offset:-4px}'
    + '.cms-edit [data-cms-spots] .cz-look__media{cursor:crosshair}'
    + '.cms-toast{position:fixed;z-index:10001;left:50%;top:18px;transform:translateX(-50%);padding:10px 16px;border-radius:12px;background:#1f1d1a;color:#fff;font:600 14px/1.4 Pretendard,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)}';
  function toast(msg) {
    var t = document.querySelector('.cms-toast') || document.body.appendChild(document.createElement('div'));
    t.className = 'cms-toast'; t.textContent = msg; clearTimeout(t.__t); t.__t = setTimeout(function () { t.remove(); }, 3500);
  }
  function copyText(s) { try { navigator.clipboard.writeText(s); } catch (e) {} }
  function startEdit() {
    var st = document.createElement('style'); st.textContent = EDIT_CSS; document.head.appendChild(st);
    html.classList.add('cms-edit');
    var bar = document.createElement('div'); bar.className = 'cms-bar';
    bar.innerHTML = '<div><button type="button" class="cms-bar__min">접기</button><b>화면 편집 모드</b> · 바꾸고 싶은 영역의 주황 버튼을 누르면 편집 창이 열려요. 저장한 뒤 이 화면을 <b>새로고침</b>하면 바로 보여요.</div>'
      + '<div class="cms-bar__sub">화면에 바로 안 보이는 영역 <span class="cms-bar__hidden"></span></div><div class="cms-bar__warnbox"></div>'
      + '<div class="cms-bar__go">다른 페이지 고치기 <a href="/?edit=1">메인</a><a href="/product/list.html?cate_no=' + ((SC.sale || {}).categoryNo || 27) + '&edit=1">세일 페이지</a><a href="/product/list.html?cate_no=28&edit=1">상품 목록</a><a href="/board/product/list.html?board_no=4&edit=1">게시판</a><a href="/inter/guide.html?edit=1">가이드</a></div>'
      + '<div><a href="/board/free/list.html?board_no=' + BOARD + '" target="_blank" rel="noopener">화면 관리 게시판 열기</a><a data-cms-exit href="' + esc(location.pathname + location.search.replace(/([?&])edit=1(&|$)/, function (m, a, b) { return b ? a : ''; }) + location.hash) + '">편집 모드 끄기</a></div>';
    // 편집 모드에서 쇼핑몰 안 링크(메뉴 등)를 누르면 다음 페이지도 편집 모드로 연다
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'), h = a && a.getAttribute('href');
      if (!a || a.hasAttribute('data-cms-exit') || a.target === '_blank' || !h || /^(#|javascript:|mailto:|tel:)/i.test(h)) return;
      var u; try { u = new URL(h, location.href); } catch (er) { return; }
      if (u.origin !== location.origin || /[?&]edit=1(&|$)/.test(u.search) || /\/(write|modify)\.html$/.test(u.pathname)) return;
      if (u.pathname === location.pathname && u.search === location.search && u.hash) return; // 같은 페이지 안 이동
      u.searchParams.set('edit', '1');
      a.setAttribute('href', u.pathname + u.search + u.hash);
    }, true);
    // 페이지마다 게시판 글로 못 바꾸는 부분은 어디서 바꾸는지 알려 준다
    var tip = /^\/board\//.test(location.pathname)
      ? '💡 게시판 위 이동 탭(공지사항·자주묻는질문·상품문의)의 이름·순서는 <b>store-content.js 의 community.items</b>에서, 게시판 글은 <b>관리자 › 게시판 › 게시물 관리</b>에서 바꿔요.'
      : salePage ? '💡 세일 상품은 <b>관리자 › 상품 › 상품 진열</b>에서 세일 분류에 넣고 빼요. 쿠폰 번호·수량·할인율은 <b>관리자 › 프로모션 › 쿠폰</b>과 store-content.js 의 sale.coupon 에서 정해요.'
      : /^\/product\/(list|search)\.html/.test(location.pathname) ? '💡 목록의 상품은 <b>관리자 › 상품 › 상품 진열</b>에서, 분류 이름은 <b>관리자 › 상품 › 상품 분류 관리</b>에서 바꿔요.' : '';
    if (tip) { var tipBox = document.createElement('div'); tipBox.className = 'cms-bar__sub'; tipBox.innerHTML = tip; bar.insertBefore(tipBox, bar.lastChild); }
    bar.querySelector('.cms-bar__min').addEventListener('click', function () { var m = bar.classList.toggle('is-min'); this.textContent = m ? '펼치기' : '접기'; });
    document.body.appendChild(bar);
    if (!BOARD) { bar.firstChild.innerHTML = '<b>화면 관리가 꺼져 있어요.</b> store-content.js 의 cms.boardNo 를 확인하세요.'; return; }
    function open(sec) { openPost(sec.getAttribute('data-cms'), draft(sec)); }
    // 지금 화면 내용을 초안으로 넘긴다 (새 글이면 그대로 채우고, 저장된 글이 비어 있을 때도 이것으로 다시 채운다)
    // d.use : 저장된 글보다 이 초안을 먼저 쓴다 (섹션 순서처럼 편집 모드에서 바꾼 내용을 넘길 때)
    function openPost(name, d) {
      var post = state.map && state.map[name], cms = '&cms=' + encodeURIComponent(name), all = lsGet(DRAFT_KEY) || {};
      all[name] = { subject: d.subject, html: d.html, t: Date.now(), use: !!d.use, autosave: !!d.autosave };
      lsSet(DRAFT_KEY, all);
      if (post) window.open('/board/free/modify.html?board_act=edit&no=' + post.no + '&board_no=' + BOARD + cms, '_blank');
      else window.open('/board/free/write.html?board_no=' + BOARD + cms, '_blank');
    }
    /* 섹션 순서 : 섹션마다 ↑↓, 막대의 [섹션 순서 저장] → 「[메인 화면] 섹션 순서」 글 */
    function orderDraft() {
      var name = orderName(), page = pageLabel(sortBox());
      return {
        use: true, autosave: true, // 편집 창이 열리면 바로 저장한다 (한 번 누르면 끝)
        subject: '[' + page + '] ' + name,
        html: '<p>※ ' + esc(page) + ' 섹션이 위에서부터 이 순서로 나와요. 한 줄에 영역 이름 하나예요. 이름은 그대로 두고 줄 순서만 바꾸세요.</p>'
          + '<p>※ 편집 모드에서 섹션마다 있는 ↑ ↓ 로 옮긴 뒤 [순서 저장하기]를 눌러도 돼요.</p>'
          + '<p>순서:<br>' + units().map(function (u) { return esc(unitName(u)); }).join('<br>') + '</p>'
      };
    }
    function orderControls() {
      var list = units();
      list.forEach(function (u, i) {
        var box = u.__cmsOrder;
        if (!box) {
          box = u.__cmsOrder = document.createElement('div'); box.className = 'cms-order';
          box.innerHTML = '<span>순서</span><button type="button" data-dir="-1" aria-label="위로 옮기기">↑</button><button type="button" data-dir="1" aria-label="아래로 옮기기">↓</button><button type="button" class="cms-order__save" data-save hidden>저장</button>';
          box.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return;
            e.preventDefault(); e.stopPropagation();
            if (b.hasAttribute('data-save')) { saveOrder(); return; }
            var cur = units(), k = cur.indexOf(u), j = k + Number(b.getAttribute('data-dir'));
            if (j < 0 || j >= cur.length) return;
            cur[k] = cur[j]; cur[j] = u;
            state.orderMoved = true;
            placeUnits(cur); orderControls();
            u.scrollIntoView({ block: 'start', behavior: 'smooth' });
            orderDirty();
            toast('「' + unitName(u) + '」 을(를) ' + (j < k ? '위로' : '아래로') + ' 옮겼어요. 다 옮기면 위의 [순서 저장하기]를 눌러 주세요.');
          });
        }
        if (box.parentNode !== u) u.appendChild(box);
        box.querySelector('[data-dir="-1"]').disabled = i === 0;
        box.querySelector('[data-dir="1"]').disabled = i === list.length - 1;
      });
    }
    // 순서를 옮기면 저장 버튼이 눈앞에 나온다 : 화면 위 가운데 떠 있는 버튼 + 각 섹션의 [순서] 옆 [저장] + 아래 막대
    function saveOrder() {
      openPost(orderName(), orderDraft());
      toast('새 창에서 순서를 저장하고 있어요. 저장이 끝나면 이 화면을 새로고침하세요.');
    }
    var saveBtn = document.createElement('button'); saveBtn.type = 'button'; saveBtn.className = 'cms-order-save'; saveBtn.textContent = '↕ 섹션 순서 저장';
    saveBtn.addEventListener('click', saveOrder);
    if (orderName()) bar.lastChild.insertBefore(saveBtn, bar.lastChild.firstChild);
    var floatBox = null;
    function orderDirty() {
      saveBtn.classList.add('is-dirty'); saveBtn.textContent = '↕ 순서 저장하기 (바뀜)';
      units().forEach(function (u) { var s = u.__cmsOrder && u.__cmsOrder.querySelector('[data-save]'); if (s) s.hidden = false; });
      if (!floatBox) {
        floatBox = document.createElement('div'); floatBox.className = 'cms-order-float';
        floatBox.innerHTML = '<span>섹션 순서가 바뀌었어요</span><button type="button">순서 저장하기</button>';
        floatBox.querySelector('button').addEventListener('click', saveOrder);
        document.body.appendChild(floatBox);
      }
    }
    function label(sec) { return '✏️ ' + sec.getAttribute('data-cms') + ' 고치기 <small>' + (sec.classList.contains('cms-has-post') ? '· 게시판 글 수정' : '· 새 글') + '</small>'; }
    function paint() {
      if (state.blocked) {
        bar.firstChild.innerHTML = '<b>화면 관리 게시판(' + BOARD + '번)을 쓸 수 없는 상태예요.</b> 관리자 › 게시판 › 게시판 관리에서 이 게시판의 <b>사용여부 "사용"</b>, <b>표시여부 "표시"</b>, <b>쓰기 권한 "관리자"</b>로 바꾼 뒤 새로고침하세요.';
      }
      var hiddenBox = bar.querySelector('.cms-bar__hidden'); hiddenBox.innerHTML = '';
      sections().forEach(function (sec) {
        // 세일 전용 영역은 세일 분류 페이지에서만 (다른 분류 목록에는 숨어 있는 틀일 뿐)
        if (sec.closest('#stSaleEvent, [data-st-sale]') && !html.classList.contains('st-sale-on')) return;
        var b = sec.__cmsBtn, floating = sec.id === 'cz-pop';
        if (!b) {
          b = sec.__cmsBtn = document.createElement('button'); b.type = 'button'; b.className = 'cms-btn';
          b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(sec); });
        }
        b.innerHTML = label(sec);
        if (floating) {
          // 팝업 : 막대에 [고치기]·[열어 보기], 떠 있는 팝업 안에도 [고치기]
          b.style.position = 'static'; hiddenBox.appendChild(b);
          var show = document.createElement('button'); show.type = 'button'; show.textContent = '팝업 열어 보기';
          show.addEventListener('click', function () { sec.hidden = false; });
          hiddenBox.appendChild(show);
          var box = sec.querySelector('.cz-pop__box');
          if (box && !box.querySelector('.cms-pop-btn')) {
            var inner = document.createElement('button'); inner.type = 'button'; inner.className = 'cms-btn cms-pop-btn';
            inner.innerHTML = '✏️ 이 팝업 고치기';
            inner.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(sec); });
            box.appendChild(inner);
          }
          return;
        }
        veil(sec);
        var visible = sec.getClientRects().length && getComputedStyle(sec).visibility !== 'hidden' && !sec.hidden;
        if (visible) { if (b.parentNode !== sec) sec.appendChild(b); b.style.position = ''; }
        else { hiddenBox.appendChild(b); b.style.position = 'static'; }
      });
      bar.querySelector('.cms-bar__sub').hidden = !hiddenBox.children.length;
      if (orderName()) orderControls();
      checkImages();
    }
    // "보이기: 아니오" 로 숨긴 영역 표시
    function veil(sec) {
      var off = sec.classList.contains('cms-off'), v = sec.querySelector(':scope > .cms-off-veil'), t = sec.querySelector(':scope > .cms-off-tag');
      if (!off) { if (v) v.remove(); if (t) t.remove(); return; }
      if (!v) { v = document.createElement('div'); v.className = 'cms-off-veil'; sec.appendChild(v); }
      if (!t) { t = document.createElement('div'); t.className = 'cms-off-tag'; t.textContent = '숨김 · 방문자에게 안 보여요'; sec.appendChild(t); }
    }
    // 바꾼 사진이 권장 크기와 다르면 빨간 테두리 + 막대에 목록
    function checkImages() {
      var warns = [];
      document.querySelectorAll('[data-cms] img[data-cms-replaced]').forEach(function (im) {
        if (!im.complete) { im.addEventListener('load', checkImages, { once: true }); return; }
        var w = sizeWarn(im.naturalWidth, im.naturalHeight, sizeOf(im));
        im.classList.toggle('cms-img-warn', !!w);
        if (w) { im.title = w; warns.push((im.closest('[data-cms]').getAttribute('data-cms')) + ' : ' + w); }
      });
      var box = bar.querySelector('.cms-bar__warnbox');
      box.innerHTML = warns.length ? '<div class="cms-bar__warn">⚠ 사진 크기를 확인해 주세요<ul>' + warns.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>' : '';
    }
    // 장면 속 상품 : 사진을 누르면 그 자리의 가로·세로 % 를 복사 (상품 점 위치 잡기)
    document.addEventListener('click', function (e) {
      var fig = e.target.closest && e.target.closest('[data-cms-spots] .cz-look__media');
      if (!fig || e.target.closest('.cz-look__spot')) return;
      e.preventDefault(); e.stopPropagation();
      var r = fig.getBoundingClientRect(), x = Math.round((e.clientX - r.left) / r.width * 100), y = Math.round((e.clientY - r.top) / r.height * 100);
      copyText(x + ' ' + y);
      toast('이 자리 : 가로 ' + x + '% · 세로 ' + y + '%  → "' + x + ' ' + y + '" 복사됨 (상품번호 뒤에 붙여 넣으세요)');
    }, true);
    paint();
    document.addEventListener('inter:cms', paint);
  }

  /* ---------- 5. 글쓰기·수정 창 : 전용 편집 화면(inter-cms-editor.js)을 띄운다 ---------- */
  var BOARD_PAGE = /\/board\/[^/]+\/(write|modify)\.html/.test(location.pathname) && BOARD && (qs.match(/[?&]board_no=(\d+)/) || [])[1] === String(BOARD);
  if (BOARD_PAGE) {
    // 카페24 자동 저장의 "작성중이던 글이 있습니다. 불러오시겠습니까?" 를 묻지 않는다 (항상 '아니오')
    var nativeConfirm = window.confirm;
    window.confirm = function (msg) { return /작성\s*중|임시\s*저장|불러오/.test(String(msg)) ? false : nativeConfirm.apply(window, arguments); };
  }
  function loadEditor() {
    var s = document.createElement('script');
    s.src = '/layout/basic/js/inter-cms-editor.js?v=' + (CFG.editorVersion || '20260929b');
    document.body.appendChild(s);
  }

  /* ---------- 6. 시작 ---------- */
  var api = window.INTER_CMS = {
    board: BOARD,
    // 코드가 그리는 영역(팝업 등)은 게시판 내용이 들어온 뒤(최대 wait ms) 그린다
    ready: function (fn, wait) {
      if (state.applied || !BOARD || !document.querySelector('[data-cms]')) { fn(); return; }
      var done = false, run = function () { if (!done) { done = true; fn(); } };
      state.waiters.push(run); setTimeout(run, wait || 800);
    },
    applyCached: function () {
      if (state.applied || !BOARD || EDIT) return;
      var c = lsGet(CACHE_KEY);
      if (c && c.map) applyAll(c.map);
    },
    parse: parse, draft: draft, applyAll: applyAll,
    prefix: PREFIX, draftKey: DRAFT_KEY, sizeWarn: sizeWarn, lsGet: lsGet, lsSet: lsSet, esc: esc, product: product
  };

  function boot() {
    var home = !!document.querySelector('[data-cms]');
    if (home && BOARD) {
      api.applyCached();
      // 목록은 TTL(기본 10분)마다, 글 본문은 새 글이 생겼거나 30분이 지났을 때만 다시 읽는다 (편집 모드는 항상 새로)
      var c = lsGet(CACHE_KEY), fresh = c && Date.now() - c.t < TTL;
      var reread = EDIT || !c || !c.tb || Date.now() - c.tb > 30 * 60000;
      if (!fresh || EDIT) {
        load(names(), c && c.map, reread).then(function (map) {
          var same = c && JSON.stringify(c.map) === JSON.stringify(map);
          lsSet(CACHE_KEY, { t: Date.now(), tb: reread ? Date.now() : c.tb, map: map });
          if (!same || !state.applied || EDIT) { state.applied = false; applyAll(map); }
        }).catch(function () { html.classList.remove('cms-wait'); });
      }
    }
    if (EDIT && home) startEdit();
    if (BOARD_PAGE) loadEditor();
  }
  // 캐시가 없는 첫 방문에는 바꿀 글자·사진을 잠깐(최대 1.2초) 가려 기본값이 번쩍이지 않게 한다
  // 편집 모드는 캐시를 무시하고 글을 늘 다시 읽으므로, 캐시가 있어도 가려야 한다.
  // (안 가리면 고치기 전 사진이 몇 초 보이다가 고친 사진으로 바뀐다)
  var salePage = /\/product\/list\.html/.test(location.pathname) && (qs.match(/[?&]cate_no=(\d+)/) || [])[1] === String((SC.sale || {}).categoryNo || 27);
  if (BOARD && (/^\/(index\.html)?$/.test(location.pathname) || salePage) && (EDIT || !(lsGet(CACHE_KEY) || {}).map)) {
    html.classList.add('cms-wait');
    // 가림막은 applyAll 이 끝나면 바로 걷힌다. 아래 시간은 글을 못 읽었을 때를 위한 최대 대기.
    setTimeout(function () { html.classList.remove('cms-wait'); }, EDIT ? 4000 : 1200);
  }
  // 영역 숨기기·첫 방문 가림 규칙 (메인·세일 등 어느 페이지에서나)
  if (BOARD && document.head) {
    var cmsStyle = document.createElement('style');
    cmsStyle.textContent = 'html:not(.cms-edit) .cms-off{display:none!important}.cms-wait [data-cms] [data-cms-text],.cms-wait [data-cms] [data-cms-src],.cms-wait [data-cms] [data-cms-links],.cms-wait [data-cms][data-cms-text]{visibility:hidden}';
    document.head.appendChild(cmsStyle);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}());

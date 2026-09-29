/* inter 포토리뷰 — 모든 페이지 공통
   상품 사용후기 게시판(board_no=4)의 최신 글을 읽어서
     1) 메인 [data-inter-photoreviews] 영역에 최신 포토리뷰 8개
     2) 모든 상품 카드(.prdList > li[id^=anchorBoxId_])에 "★ 평점 · 리뷰 N" 과 포토리뷰 2개(사진 + 글)
   를 그린다. 목록·본문은 카페24 기본 주소(목록 HTML, /exec/front/board/product/4 JSON)에서 읽고,
   한 번 읽은 결과는 10분 동안 sessionStorage 에 저장해 페이지마다 다시 요청하지 않는다. */
(function () {
  'use strict';
  var BOARD = 4, PAGES = 4, MAX_DETAIL = 40, POOL = 3, CACHE_KEY = 'inter-reviews-v3', TTL = 30 * 60 * 1000;
  var NOTE = /※\s*inter가 만든[^\n]*교체됩니다\.?/;

  function trim(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function lastNum(href) { var m = String(href || '').match(/[?&](?:no|product_no)=(\d+)/) || String(href || '').match(/\/(\d+)\/?(?:[?#].*)?$/); return m ? m[1] : ''; }
  // 글 번호 : /article/게시판명/4/<글번호>/page/1/ 또는 read.html?no=<글번호> (끝의 page 번호를 잡지 않도록)
  function articleNo(href) { var m = String(href || '').match(/\/article\/[^/]+\/\d+\/(\d+)/) || String(href || '').match(/[?&]no=(\d+)/); return m ? m[1] : ''; }
  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= Math.round(n) ? '★' : '☆'; return s; }
  function pickImages(html) {
    var out = [];
    if (!html) return out;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('img').forEach(function (im) {
      var src = im.getAttribute('src') || '';
      if (!src || /emoticon|ico_|icon|btn_|blank\.|file_data\/\/|echosting\.cafe24\.com\/(skin|design)/i.test(src)) return;
      if (src.indexOf('//') === 0) src = location.protocol + src;
      if (out.indexOf(src) < 0) out.push(src);
    });
    return out;
  }
  function pickText(html) {
    if (!html) return '';
    var doc = new DOMParser().parseFromString(String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n'), 'text/html');
    return trim((doc.body.textContent || '').replace(NOTE, ''));
  }

  function readCache() {
    try { var c = JSON.parse(sessionStorage.getItem(CACHE_KEY)); if (c && Date.now() - c.t < TTL && Array.isArray(c.items)) return c.items; } catch (e) {}
    return null;
  }
  function writeCache(items) { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), items: items })); } catch (e) {} }

  function parseList(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html'), out = [];
    doc.querySelectorAll('tbody tr').forEach(function (tr) {
      var a = tr.querySelector('td.subject a[href*="/article/"], td.subject a[href*="read.html"]');
      if (!a) return;
      var no = (tr.querySelector('.boardChk') || {}).value || articleNo(a.getAttribute('href'));
      if (!no) return;
      var pa = tr.querySelector('a[href*="/product/"]');
      var cells = tr.querySelectorAll('td');
      var texts = Array.prototype.map.call(cells, function (td) { return trim(td.textContent); });
      var date = texts.filter(function (t) { return /^\d{4}-\d{2}-\d{2}/.test(t); })[0] || '';
      var writer = '';
      for (var i = cells.length - 1; i >= 0; i--) { if (texts[i] && texts[i] !== date && !/^조회|^\d+$/.test(texts[i]) && !cells[i].classList.contains('subject') && !cells[i].classList.contains('displaynone')) { writer = texts[i]; break; } }
      out.push({
        no: String(no), title: trim(a.textContent), href: a.getAttribute('href'),
        productNo: pa ? lastNum(pa.getAttribute('href')) : '', productName: trim((tr.querySelector('.product') || {}).textContent),
        productHref: pa ? pa.getAttribute('href') : '', writer: writer.replace(/\(.*\)$/, ''), date: date.slice(0, 10),
        secret: !!tr.querySelector('img[alt*="비밀"], [class*="lock"]'), point: 0, imgs: [], text: ''
      });
    });
    return out;
  }
  // 본문 읽기 : 실패하면 조금 쉬었다가 두 번까지 다시 시도한다 (true = 읽음)
  function loadDetail(it, tries) {
    tries = tries || 0;
    return fetch('/exec/front/board/product/' + BOARD + '?no=' + it.no + '&board_no=' + BOARD + '&pass_check=F', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.is_secret === true || d.read_auth === false) { it.secret = true; return true; }
        if (!d.read) throw new Error('empty');
        it.imgs = pickImages((d.read.content_image || '') + ' ' + (d.read.content || ''));
        it.text = pickText(d.read.content);
        it.point = Number(d.read.point_count) || 0;
        return true;
      })
      .catch(function () {
        if (tries >= 2) return false;
        return new Promise(function (res) { setTimeout(res, 500 * (tries + 1)); }).then(function () { return loadDetail(it, tries + 1); });
      });
  }
  function loadAll() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);
    var pages = [];
    for (var p = 1; p <= PAGES; p++) pages.push(fetch('/board/product/list.html?board_no=' + BOARD + '&page=' + p, { credentials: 'same-origin' }).then(function (r) { return r.text(); }).catch(function () { return ''; }));
    return Promise.all(pages).then(function (htmls) {
      var seen = {}, items = [];
      htmls.forEach(function (h) { parseList(h).forEach(function (it) { if (!seen[it.no]) { seen[it.no] = 1; items.push(it); } }); });
      items = items.filter(function (it) { return !it.secret; });
      var todo = items.slice(0, MAX_DETAIL), i = 0, failed = 0;
      function worker() { if (i >= todo.length) return Promise.resolve(); var it = todo[i++]; return loadDetail(it).then(function (ok) { if (!ok) failed++; return worker(); }); }
      var workers = []; for (var w = 0; w < POOL; w++) workers.push(worker());
      return Promise.all(workers).then(function () {
        items = items.filter(function (it) { return !it.secret; });
        if (!failed) writeCache(items); // 일부라도 못 읽었으면 저장하지 않고 다음 페이지에서 다시 읽는다
        return items;
      });
    });
  }

  /* 1. 메인 최신 포토리뷰 8개 */
  function renderMain(items) {
    var box = document.querySelector('[data-inter-photoreviews]');
    if (!box) return;
    var photos = items.filter(function (it) { return it.imgs.length; }).slice(0, 8);
    box.innerHTML = '';
    if (!photos.length) { box.parentNode.classList.add('is-empty'); return; }
    photos.forEach(function (it) {
      var a = el('a', 'pr-card'); a.href = it.href;
      var fig = el('figure', 'pr-card__photo'); var img = el('img'); img.src = it.imgs[0]; img.alt = ''; img.loading = 'lazy'; fig.appendChild(img);
      if (/\[연출 예시\]/.test(it.title)) fig.appendChild(el('span', 'pr-card__tag', '연출 예시'));
      a.appendChild(fig);
      var body = el('div', 'pr-card__body');
      if (it.point) { var s = el('p', 'pr-stars', stars(it.point)); s.setAttribute('aria-label', '평점 ' + it.point + '점'); body.appendChild(s); }
      body.appendChild(el('strong', 'pr-card__title', it.title.replace(/\[연출 예시\]\s*/, '')));
      if (it.text) body.appendChild(el('p', 'pr-card__text', it.text));
      var meta = el('p', 'pr-card__meta'); meta.appendChild(el('span', 'pr-card__product', it.productName)); meta.appendChild(el('span', '', (it.writer || '') + (it.date ? ' · ' + it.date : ''))); body.appendChild(meta);
      a.appendChild(body); box.appendChild(a);
    });
  }

  /* 2. 모든 상품 카드에 리뷰 요약 + 포토리뷰 2개 */
  var byProduct = {};
  function index(items) {
    byProduct = {};
    items.forEach(function (it) { if (!it.productNo) return; (byProduct[it.productNo] = byProduct[it.productNo] || []).push(it); });
  }
  function decorate(scope) {
    (scope || document).querySelectorAll('.prdList > li[id^="anchorBoxId_"]').forEach(function (li) {
      if (li.querySelector('.pr-mini')) return;
      var no = li.id.replace('anchorBoxId_', ''), list = byProduct[no];
      if (!list || !list.length) return;
      var desc = li.querySelector('.description') || li;
      var scored = list.filter(function (it) { return it.point; });
      var avg = scored.length ? scored.reduce(function (s, it) { return s + it.point; }, 0) / scored.length : 0;
      var box = el('div', 'pr-mini');
      var sum = el('p', 'pr-mini__sum');
      if (avg) sum.appendChild(el('b', 'pr-stars', '★ ' + avg.toFixed(1)));
      sum.appendChild(el('span', '', '리뷰 ' + list.length));
      box.appendChild(sum);
      var photos = list.filter(function (it) { return it.imgs.length; }).slice(0, 2);
      if (photos.length) {
        var ul = el('ul', 'pr-mini__list');
        photos.forEach(function (it) {
          var li2 = el('li'); var a = el('a'); a.href = it.href;
          var im = el('img'); im.src = it.imgs[0]; im.alt = ''; im.loading = 'lazy'; a.appendChild(im);
          a.appendChild(el('span', '', (it.text || it.title).replace(/\[연출 예시\]\s*/, '')));
          li2.appendChild(a); ul.appendChild(li2);
        });
        box.appendChild(ul);
      }
      desc.appendChild(el('div', 'pr-gap')); // 가격 줄 수가 달라도 리뷰는 카드 맨 아래 같은 위치에
      desc.appendChild(box);
    });
  }

  function init() {
    var needMain = !!document.querySelector('[data-inter-photoreviews]');
    var needCards = !!document.querySelector('.prdList > li[id^="anchorBoxId_"]');
    if (!needMain && !needCards) return;
    loadAll().then(function (items) {
      renderMain(items);
      index(items);
      decorate(document);
      if ('MutationObserver' in window) {
        var t = null;
        new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { decorate(document); }, 150); })
          .observe(document.body, { childList: true, subtree: true });
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());

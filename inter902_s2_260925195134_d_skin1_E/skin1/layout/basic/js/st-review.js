/* --------------------------------------------------------------------------
   상품 상세 후기 — 표를 카드형 화면으로 다시 그린다
   --------------------------------------------------------------------------
   카페24 product_review 모듈이 그려 준 표(번호·제목·작성자·작성일·조회·평점)를 읽어서
     1) 상세 하단 REVIEW 영역 (만족도 요약 · 이미지뷰/리스트뷰)
     2) 상품 썸네일 아래 "베스트 포토리뷰" 띠
   를 만든다. 표는 그대로 남겨 두고 CSS 로만 숨기므로, 이 스크립트가 막혀도 원래 후기 표가 보인다.

   후기 본문·사진은 표에 없다. 카페24 기본 스크립트(js/module/product/review.js)가
   행을 눌렀을 때 쓰는 JSON 주소를 똑같이 불러 가져온다.
     /exec/front/board/product/4?<후기 링크의 쿼리>&pass_check=F
   ------------------------------------------------------------------------ */
(function () {
	'use strict';

	// 스크립트가 <head> 에서 먼저 실행될 수 있어서, 화면 요소는 init() 에서 찾는다.
	var root = null, bp = null, listBox = null, gridBox = null;

	var MAX_PAGES = 8;		// 통계용으로 더 읽어 올 후기 목록 페이지 수
	var MAX_DETAIL = 24;	// 본문·사진을 불러올 후기 수 (요청 폭주 방지)
	var POOL = 4;			// 동시 요청 수
	var BEST_MAX = 6;
	var BEST_TEXT_MAX = 4;
	var EXCERPT = 100;

	var items = [];			// 지금까지 읽은 후기 전부
	var byNo = {};
	var pageItems = [];		// 이 페이지에 실제로 뜬 후기 (리스트뷰에 그린다)
	var pending = 0;		// 본문 요청 대기 수
	var queue = [];
	var running = 0;
	var modal = null;

	/* ---------- 작은 도구 ---------- */
	function $(sel, scope) { return (scope || document).querySelector(sel); }
	function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
	function trim(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) { n.className = cls; }
		if (text != null) { n.textContent = text; }
		return n;
	}
	function num(s) { var n = parseInt(String(s).replace(/[^\d]/g, ''), 10); return isNaN(n) ? 0 : n; }
	function stars(value, size) {
		var s = el('span', 'st-stars');
		s.style.setProperty('--v', value);
		if (size) { s.style.setProperty('--s', size + 'px'); }
		s.setAttribute('role', 'img');
		s.setAttribute('aria-label', '별점 5점 만점에 ' + value + '점');
		return s;
	}
	function safeSrc(u) {
		u = trim(u);
		if (!u || /^(javascript|data):/i.test(u)) { return ''; }
		return u;
	}
	function debounce(fn, ms) {
		var t = 0;
		return function () { clearTimeout(t); t = setTimeout(fn, ms); };
	}

	/* ---------- 1. 표 읽기 ---------- */
	var ROW_SEL = '.xans-product-review tbody tr, [module="product_review"] tbody tr';

	function parseRow(tr) {
		var sub = tr.querySelector('td.subject');
		var a = sub && sub.querySelector('a[href]');
		if (!a) { return null; }
		var href = a.getAttribute('href') || '';
		var m = href.match(/[?&]no=(\d+)/);
		if (!m) { return null; }

		var cells = tr.children;
		var si = Array.prototype.indexOf.call(cells, sub);
		var img = tr.querySelector('img[src*="icon-star-rating"]');
		var point = 0;
		if (img) {
			var pm = (img.getAttribute('alt') || '').match(/(\d+)/) || (img.getAttribute('src') || '').match(/rating(\d+)/);
			point = pm ? Math.min(5, num(pm[1])) : 0;
		}
		var q = href.split('#')[0].split('?')[1] || '';

		return {
			no: m[1],
			href: href,
			q: q,
			title: trim(a.textContent) || '후기',
			writer: trim(cells[si + 1] && cells[si + 1].textContent),
			date: trim(cells[si + 2] && cells[si + 2].textContent),
			hit: num(cells[si + 3] && cells[si + 3].textContent),
			point: point,
			secret: !!sub.querySelector('img[alt*="비밀"], [class*="lock"]'),
			loaded: false,
			failed: false,
			text: '',
			imgs: [],
			open: false,
			node: null
		};
	}
	function parseRows(scope) {
		var out = [];
		$$(ROW_SEL, scope).forEach(function (tr) {
			var it = parseRow(tr);
			if (it) { out.push(it); }
		});
		return out;
	}
	function add(list, isPage) {
		var added = [];
		list.forEach(function (it) {
			if (byNo[it.no]) { return; }
			byNo[it.no] = it;
			items.push(it);
			if (isPage) { pageItems.push(it); }
			added.push(it);
		});
		return added;
	}

	/* ---------- 2. 본문·사진 ---------- */
	function pickImages(html) {
		var out = [];
		if (!html) { return out; }
		var doc = new DOMParser().parseFromString(html, 'text/html');
		$$('img', doc).forEach(function (im) {
			var src = safeSrc(im.getAttribute('src') || im.getAttribute('data-src'));
			if (!src || /emoticon|ico_|icon|btn_|blank\.|echosting\.cafe24\.com\/skin/i.test(src)) { return; }
			if (out.indexOf(src) < 0) { out.push(src); }
		});
		return out;
	}
	function pickText(html) {
		if (!html) { return ''; }
		var doc = new DOMParser().parseFromString(String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n'), 'text/html');
		return (doc.body.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
	}

	function loadDetail(it) {
		var url = '/exec/front/board/product/4?' + it.q + '&pass_check=F';
		return fetch(url, { credentials: 'same-origin' })
			.then(function (r) { return r.json(); })
			.then(function (d) {
				if (d && d.is_secret === true) { it.secret = true; }
				else if (d && d.read && d.read_auth !== false) {
					var ci = d.read.content_image, c = d.read.content;
					it.imgs = pickImages((ci || '') + ' ' + (c || ''));
					it.text = pickText(c);
				}
				it.loaded = true;
			})
			.catch(function () { it.failed = true; it.loaded = true; });
	}
	function enqueue(list) {
		list.forEach(function (it) {
			if (it._queued) { return; }
			it._queued = true;
			pending++;
			queue.push(it);
		});
		pump();
	}
	function pump() {
		while (running < POOL && queue.length) {
			(function (it) {
				running++;
				loadDetail(it).then(function () {
					running--;
					pending--;
					onDetail(it);
					pump();
				});
			})(queue.shift());
		}
	}
	function onDetail(it) {
		if (it.node && it.node.parentNode) {
			var n = buildItem(it);
			it.node.parentNode.replaceChild(n, it.node);
			it.node = n;
		}
		scheduleRender();
	}

	/* ---------- 3. 요약 ---------- */
	function renderSummary() {
		if (!root) { return; }
		var scored = items.filter(function (i) { return i.point > 0; });
		root.classList.toggle('st-rv--nopoint', items.length > 0 && scored.length === 0);

		var avg = 0, count = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
		scored.forEach(function (i) { avg += i.point; count[i.point]++; });
		avg = scored.length ? Math.round(avg / scored.length * 10) / 10 : 0;

		var avgEl = $('[data-st-rv-avg]', root);
		if (avgEl) { avgEl.textContent = String(avg); }
		root.classList.add('st-rv--ready');   // 평균을 계산한 뒤에만 숫자·별을 보인다 (처음 0 이 보였다 바뀌는 깜빡임 방지)
		var starBox = $('[data-st-rv-stars]', root);
		if (starBox) {
			starBox.textContent = '';
			starBox.appendChild(stars(avg, 22));
		}
		var cnt = $('[data-st-rv-count]', root);
		if (cnt && !num(cnt.textContent)) { cnt.textContent = String(items.length); }

		$$('[data-st-rv-dist] li', root).forEach(function (li) {
			var s = num(li.getAttribute('data-score'));
			var w = scored.length ? Math.round(count[s] / scored.length * 100) : 0;
			$('i', li).style.width = w + '%';
			li.classList.toggle('is-top', s === 5 && w > 0);
		});
	}

	/* ---------- 4. 리스트뷰 ---------- */
	function buildItem(it) {
		var li = el('article', 'st-rv-item' + (it.open ? ' is-open' : ''));
		var main = el('div', 'st-rv-item__main');
		var side = el('div', 'st-rv-item__side');

		if (it.imgs.length) {
			var th = el('button', 'st-rv-item__thumb');
			th.type = 'button';
			th.setAttribute('aria-label', '사진 크게 보기');
			var im = el('img');
			im.src = it.imgs[0];
			im.alt = '';
			im.loading = 'lazy';
			th.appendChild(im);
			th.addEventListener('click', function () { openModal(it); });
			main.appendChild(th);
		}

		main.appendChild(el('h3', 'st-rv-item__title', (it.secret ? '🔒 ' : '') + it.title));

		if (it.secret) {
			main.appendChild(el('p', 'st-rv-item__text is-mute', '비밀글입니다.'));
		} else if (!it.loaded) {
			main.appendChild(el('p', 'st-rv-item__text is-mute', '불러오는 중…'));
		} else if (it.text) {
			var flat = it.text.replace(/\s+/g, ' ');
			var long = flat.length > EXCERPT;
			var p = el('p', 'st-rv-item__text');
			if (it.open || !long) {
				p.textContent = it.text;
				p.classList.add('is-full');
			} else {
				p.textContent = flat.slice(0, EXCERPT) + ' … ';
			}
			if (long) {
				var more = el('button', 'st-rv-item__more', it.open ? '접기' : '더보기');
				more.type = 'button';
				more.addEventListener('click', function () {
					it.open = !it.open;
					var n = buildItem(it);
					it.node.parentNode.replaceChild(n, it.node);
					it.node = n;
				});
				p.appendChild(more);
			}
			main.appendChild(p);
		}

		if (it.open) {
			if (it.imgs.length) {
				var gal = el('div', 'st-rv-item__gallery');
				it.imgs.forEach(function (src) {
					var b = el('button', 'st-rv-item__photo');
					b.type = 'button';
					var g = el('img');
					g.src = src;
					g.alt = '';
					g.loading = 'lazy';
					b.appendChild(g);
					b.addEventListener('click', function () { openModal(it, src); });
					gal.appendChild(b);
				});
				main.appendChild(gal);
			}
			var link = el('a', 'st-rv-item__link', '후기 상세 · 댓글');
			link.href = it.href;
			main.appendChild(link);
		}

		if (it.point) { side.appendChild(stars(it.point, 14)); }
		side.appendChild(el('span', 'st-rv-item__writer', it.writer));
		side.appendChild(el('span', 'st-rv-item__date', it.date));
		side.appendChild(el('span', 'st-rv-item__hit', '조회 ' + it.hit));

		li.appendChild(main);
		li.appendChild(side);
		return li;
	}

	function renderList() {
		if (!listBox) { return; }
		listBox.textContent = '';
		if (!pageItems.length) {
			var deny = $('.st-rv__src .noAccess:not(.displaynone), .st-rv__src .minor:not(.displaynone)', root);
			if (!deny) {
				var e = el('div', 'st-rv__empty');
				e.appendChild(el('p', null, '아직 등록된 후기가 없습니다.'));
				e.appendChild(el('span', null, '첫 번째 후기를 남겨 주세요.'));
				listBox.appendChild(e);
			}
			return;
		}
		pageItems.forEach(function (it) {
			var n = buildItem(it);
			it.node = n;
			listBox.appendChild(n);
		});
	}

	/* ---------- 5. 이미지뷰 ---------- */
	function renderGrid() {
		if (!gridBox) { return; }
		gridBox.textContent = '';
		var photos = pageItems.filter(function (i) { return i.imgs.length; });
		photos.forEach(function (it) {
			var b = el('button', 'st-rv-tile');
			b.type = 'button';
			var im = el('img');
			im.src = it.imgs[0];
			im.alt = it.title;
			im.loading = 'lazy';
			b.appendChild(im);
			var cap = el('span', 'st-rv-tile__cap');
			if (it.point) { cap.appendChild(stars(it.point, 12)); }
			cap.appendChild(el('strong', null, it.title));
			b.appendChild(cap);
			b.addEventListener('click', function () { openModal(it); });
			gridBox.appendChild(b);
		});
		if (!photos.length) {
			var msg = pending > 0 ? '사진을 불러오는 중…' : '포토 후기가 없습니다.';
			gridBox.appendChild(el('p', 'st-rv__empty st-rv__empty--grid', msg));
		}
	}

	/* ---------- 6. 베스트 포토리뷰 띠 ---------- */
	function rank(a, b) {
		return (b.point - a.point) || (b.hit - a.hit) || (num(b.no) - num(a.no));
	}
	function renderBest() {
		if (!bp) { return; }
		var pool = items.filter(function (i) { return i.loaded && !i.secret && !i.failed; });
		var photos = pool.filter(function (i) { return i.imgs.length; }).sort(rank).slice(0, BEST_MAX);
		var list = photos;
		var isPhoto = photos.length > 0;
		if (!isPhoto) {
			list = pool.filter(function (i) { return i.text; }).sort(rank).slice(0, BEST_TEXT_MAX);
		}
		var track = $('[data-st-bp-track]', bp);
		track.textContent = '';
		if (!list.length) { bp.hidden = true; return; }

		$('[data-st-bp-title]', bp).textContent = isPhoto ? '베스트 포토리뷰' : '베스트 리뷰';
		list.forEach(function (it) {
			var c = el('button', 'st-bp__card' + (it.imgs.length ? '' : ' is-text'));
			c.type = 'button';
			if (it.imgs.length) {
				var im = el('img');
				im.src = it.imgs[0];
				im.alt = '';
				im.loading = 'lazy';
				c.appendChild(im);
			}
			var body = el('span', 'st-bp__body');
			if (it.point) { body.appendChild(stars(it.point, 13)); }
			body.appendChild(el('strong', 'st-bp__title', it.title));
			body.appendChild(el('span', 'st-bp__text', it.text.replace(/\s+/g, ' ')));
			body.appendChild(el('span', 'st-bp__writer', it.writer));
			c.appendChild(body);
			c.addEventListener('click', function () { openModal(it); });
			track.appendChild(c);
		});
		bp.hidden = false;
		syncNav();
	}
	function syncNav() {
		if (!bp) { return; }
		var track = $('[data-st-bp-track]', bp);
		var nav = $('.st-bp__nav', bp);
		nav.hidden = track.scrollWidth <= track.clientWidth + 2;
	}
	function bindBest() {
		$$('[data-dir]', bp).forEach(function (b) {
			b.addEventListener('click', function () {
				var track = $('[data-st-bp-track]', bp);
				var dir = b.getAttribute('data-dir') === '-1' ? -1 : 1;
				track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' });
			});
		});
		window.addEventListener('resize', debounce(syncNav, 150));
	}

	/* ---------- 7. 크게 보기 ---------- */
	function getModal() {
		if (modal) { return modal; }
		modal = el('div', 'st-rvm');
		modal.hidden = true;
		modal.setAttribute('role', 'dialog');
		modal.setAttribute('aria-modal', 'true');
		modal.setAttribute('aria-label', '후기 크게 보기');
		modal.setAttribute('data-lenis-prevent', '');
		modal.innerHTML = '<div class="st-rvm__dim"></div><div class="st-rvm__box"><button type="button" class="st-rvm__close" aria-label="닫기">&times;</button><div class="st-rvm__fig"></div><div class="st-rvm__body"></div></div>';
		document.body.appendChild(modal);
		modal.addEventListener('click', function (e) {
			if (e.target.classList.contains('st-rvm__dim') || e.target.classList.contains('st-rvm__close')) { closeModal(); }
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !modal.hidden) { closeModal(); }
		});
		return modal;
	}
	function openModal(it, startSrc) {
		var m = getModal();
		var fig = $('.st-rvm__fig', m), body = $('.st-rvm__body', m);
		fig.textContent = '';
		body.textContent = '';

		fig.hidden = !it.imgs.length;
		if (it.imgs.length) {
			var big = el('img', 'st-rvm__big');
			big.alt = '';
			big.src = startSrc || it.imgs[0];
			fig.appendChild(big);
			if (it.imgs.length > 1) {
				var thumbs = el('div', 'st-rvm__thumbs');
				it.imgs.forEach(function (src) {
					var t = el('button', 'st-rvm__thumb' + (src === big.getAttribute('src') ? ' is-on' : ''));
					t.type = 'button';
					var ti = el('img');
					ti.src = src;
					ti.alt = '';
					t.appendChild(ti);
					t.addEventListener('click', function () {
						big.src = src;
						$$('.st-rvm__thumb', thumbs).forEach(function (x) { x.classList.remove('is-on'); });
						t.classList.add('is-on');
					});
					thumbs.appendChild(t);
				});
				fig.appendChild(thumbs);
			}
		}

		if (it.point) { body.appendChild(stars(it.point, 16)); }
		body.appendChild(el('h3', 'st-rvm__title', it.title));
		body.appendChild(el('p', 'st-rvm__meta', [it.writer, it.date].filter(Boolean).join(' · ')));
		if (it.text) { body.appendChild(el('p', 'st-rvm__text', it.text)); }
		var link = el('a', 'st-rvm__link', '후기 상세 · 댓글');
		link.href = it.href;
		body.appendChild(link);

		m.hidden = false;
		document.documentElement.classList.add('st-rvm-lock');
		if (window.stLenis && window.stLenis.stop) { window.stLenis.stop(); }
		$('.st-rvm__close', m).focus();
	}
	function closeModal() {
		if (!modal) { return; }
		modal.hidden = true;
		document.documentElement.classList.remove('st-rvm-lock');
		if (window.stLenis && window.stLenis.start) { window.stLenis.start(); }
	}

	/* ---------- 8. 보기 전환 ---------- */
	function bindViews() {
		$$('[data-st-rv-view]', root).forEach(function (b) {
			b.addEventListener('click', function () {
				var v = b.getAttribute('data-st-rv-view');
				root.classList.toggle('st-rv--image', v === 'image');
				$$('[data-st-rv-view]', root).forEach(function (x) {
					var on = x === b;
					x.classList.toggle('is-on', on);
					x.setAttribute('aria-pressed', on ? 'true' : 'false');
				});
			});
		});
	}

	/* ---------- 실행 ---------- */
	var scheduleRender = debounce(function () {
		renderSummary();
		renderGrid();
		renderBest();
	}, 120);

	function pageLinks() {
		var here = location.href.split('#')[0];
		var seen = {}, out = [];
		$$('.xans-product-reviewpaging ol a[href], [module="product_reviewpaging"] ol a[href]').forEach(function (a) {
			var h = a.getAttribute('href') || '';
			if (!h || h.charAt(0) === '#' || /^javascript:/i.test(h)) { return; }
			var u;
			try { u = new URL(h, location.href); } catch (e) { return; }
			if (u.origin !== location.origin) { return; }
			u.hash = '';
			if (u.href === here || seen[u.href]) { return; }
			seen[u.href] = 1;
			out.push(u.href);
		});
		return out.slice(0, MAX_PAGES);
	}

	function init() {
		root = document.getElementById('stReview');
		bp = document.querySelector('[data-st-bp]');
		if (!root && !bp) { return; }
		listBox = root && root.querySelector('[data-st-rv-list]');
		gridBox = root && root.querySelector('[data-st-rv-grid]');
		if (bp) { bindBest(); }
		if (root) { bindViews(); }

		var first = add(parseRows(document), true);
		root && root.classList.add('st-rv-on');
		enqueue(first);
		renderList();
		renderSummary();
		renderGrid();

		// 통계·베스트는 이 페이지 한 장만으로는 모자란다. 나머지 목록 페이지도 읽는다.
		pageLinks().forEach(function (url) {
			fetch(url, { credentials: 'same-origin' })
				.then(function (r) { return r.text(); })
				.then(function (html) {
					var rest = add(parseRows(new DOMParser().parseFromString(html, 'text/html')), false);
					rest.sort(rank);
					var room = Math.max(0, MAX_DETAIL - (items.length - rest.length));
					enqueue(rest.slice(0, room));
					scheduleRender();
				})
				.catch(function () {});
		});
		if (!first.length) { scheduleRender(); }
	}

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
	else { init(); }
})();

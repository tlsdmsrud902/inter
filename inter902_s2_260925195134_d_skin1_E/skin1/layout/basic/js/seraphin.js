/* ==========================================================================
   DO NOT EDIT - DESIGN SYSTEM
   구매자는 이 파일을 수정하지 않는다. 문구·이미지·링크는 /layout/basic/js/store-content.js 에서 바꾼다.
   ========================================================================== */
/* ==========================================================================
   SERAPHIN STYLE — 스크롤 엔진 / 로딩 / 등장 모션
   --------------------------------------------------------------------------
   설계 원칙
   1) 외부 라이브러리(Lenis, GSAP)가 차단되어도 콘텐츠는 항상 보인다.
      → 등장 모션은 IntersectionObserver(내장)로 처리, 핀/스크럽만 GSAP 사용.
   2) 모바일은 NEW ARRIVALS 가로 스크럽만 허용하고 기본 터치 스크롤을 유지한다.
   3) 카페24 스마트디자인 에디터(EZ) 안에서는 모션을 끈다. 편집 방해 방지.
   ========================================================================== */
(function () {
	'use strict';

	var doc = document;
	if (window.__seraphinBooted) { return; }
	window.__seraphinBooted = true;
	var html = doc.documentElement;

	/* ----------------------------------------------------------------------
	   환경 판별
	   ---------------------------------------------------------------------- */
	var ST = {
		// 스마트디자인 편집창 안에서 뜨는 경우
		// 주의: "iframe 이면 편집창" 으로 판단하지 않는다.
		//       미리보기/외부 임베드에서도 iframe 이라 실제 디자인이 죽어버린다.
		isEditor: (function () {
			try {
				return html.classList.contains('ez-edit-mode') ||
					   html.classList.contains('ez-view-type-edit') ||
					   /[?&]ezedit|smartdesign\.cafe24/i.test(location.href);
			} catch (e) { return false; }
		})(),
		isMobile: window.matchMedia('(max-width:1024px)').matches,
		reduceMotion: window.matchMedia('(prefers-reduced-motion:reduce)').matches
	};
	// ?stmotion=off — 모션 전체 비활성 (레이아웃 점검 / 문제 진단용)
	// ?stmotion=light — 관성 스크롤과 핀/스크럽만 끄고 등장 모션은 유지
	var motionParam = (location.search.match(/[?&]stmotion=(off|light)/) || [])[1];

	ST.useMotion = !ST.isEditor && !ST.reduceMotion && motionParam !== 'off';
	ST.useHeavy  = ST.useMotion && !ST.isMobile && motionParam !== 'light';	// 핀 / 가로 스크럽
	// 가로 진열은 모바일도 활성화하되 추가 관성 없이 스크롤 위치에 바로 맞춘다.
	ST.useHorizontal = ST.useMotion && motionParam !== 'light';

	// layout.html 의 <head> 인라인 스크립트가 같은 조건으로 미리 붙여 둔다(첫 페인트 레이아웃 고정용).
	// 편집창처럼 그 시점엔 판별되지 않던 경우는 여기서 되돌린다.
	if (ST.useMotion) { html.classList.add('st-motion'); }
	else { html.classList.remove('st-motion'); }
	window.ST = ST;
	window.SERAPHIN_SCROLL_VERSION = '2026-09-21-store-content-1';

	/* ----------------------------------------------------------------------
	   구매자 콘텐츠 적용                                   DO NOT EDIT - DESIGN SYSTEM
	   --------------------------------------------------------------------------
	   /layout/basic/js/store-content.js (window.STORE_CONTENT) 의 값을 HTML 에 채운다.
	   HTML 에는 샘플 값이 그대로 들어 있고, 여기서는 "값이 있을 때만" 덮어쓴다.
	   → 설정 파일이 없거나 항목이 빠져도 화면은 샘플 그대로 정상 표시된다.
	   구매자는 이 함수를 고치지 않는다. 콘텐츠는 store-content.js 에서만 바꾼다.

	   HTML 쪽 연결 속성 (값은 store-content.js 안의 점(.) 경로)
	     data-st-text="hero.title"        글자를 바꾼다 ('' 이면 그 요소를 숨긴다)
	     data-st-html="hero.tagHtml"      <br> <em> 이 든 글자를 바꾼다
	     data-st-lead="x.title"           요소 안 "첫 글자 덩어리"만 바꾼다 (뒤에 붙은 <span> 은 그대로)
	     data-st-href="hero.buttonLink"   링크 주소
	     data-st-src="x.image"            <img> 사진 (data-st-src-mobile 이 있으면 모바일에서 그쪽)
	     data-st-srcset="x.image"         <picture><source> 사진
	     data-st-attr="alt:x.alt;data-…:x.y"   임의의 속성 여러 개 (비어 있으면 기본값 유지)
	     data-st-media="data-video:x.video"    영상 주소 속성 (비어 있으면 그 속성을 지워 영상 없이 표시)
	     data-st-video="x.video"          <video> 미리보기 영상 (비어 있으면 <video> 를 지움)
	   ---------------------------------------------------------------------- */
	function initStoreConfig() {
		var content = window.STORE_CONTENT;
		if (!content) { return; }
		var brand = content.brand || {};
		var brandName = typeof brand.name === 'string' ? brand.name : '';

		function get(path) {
			var value = content;
			var parts = String(path || '').split('.');
			for (var i = 0; i < parts.length; i++) {
				if (value === null || value === undefined) { return undefined; }
				value = value[parts[i]];
			}
			return value;
		}
		function fill(value) { return typeof value === 'string' ? value.replace(/\{brand\}/g, brandName) : value; }
		function usable(value) { return typeof value === 'string' && value !== ''; }
		function each(selector, fn) { Array.prototype.forEach.call(doc.querySelectorAll(selector), fn); }
		// 같은 요소를 두 번 채우지 않는다 (본문 끝 즉시 적용 + 부팅 시 재적용).
		function once(el, kind) {
			var done = el.__stDone || (el.__stDone = {});
			if (done[kind]) { return false; }
			done[kind] = true;
			return true;
		}
		function pairs(el, name, fn) {
			el.getAttribute(name).split(';').forEach(function (pair) {
				var cut = pair.indexOf(':');
				if (cut < 1) { return; }
				fn(pair.slice(0, cut).replace(/^\s+|\s+$/g, ''), fill(get(pair.slice(cut + 1).replace(/^\s+|\s+$/g, ''))));
			});
		}

		each('[data-st-logo]', function (logo) {
			if (!once(logo, 'logo')) { return; }
			if (usable(brand.logo)) { logo.setAttribute('src', brand.logo); }
			if (usable(brandName)) { logo.setAttribute('alt', brandName); }
		});
		each('[data-st-text]', function (el) {
			if (!once(el, 'text')) { return; }
			var value = fill(get(el.getAttribute('data-st-text')));
			if (typeof value !== 'string') { return; }
			if (value === '') { el.style.display = 'none'; } else { el.textContent = value; }
		});
		each('[data-st-html]', function (el) {
			if (!once(el, 'html')) { return; }
			var value = fill(get(el.getAttribute('data-st-html')));
			if (typeof value !== 'string') { return; }
			if (value === '') { el.style.display = 'none'; } else { el.innerHTML = value; }
		});
		each('[data-st-lead]', function (el) {
			if (!once(el, 'lead')) { return; }
			var value = fill(get(el.getAttribute('data-st-lead')));
			if (typeof value !== 'string') { return; }
			var node = el.firstChild;
			while (node && node.nodeType !== 3) { node = node.nextSibling; }
			if (node) { node.nodeValue = value; } else { el.insertBefore(doc.createTextNode(value), el.firstChild); }
		});
		each('[data-st-href]', function (el) {
			if (!once(el, 'href')) { return; }
			var value = fill(get(el.getAttribute('data-st-href')));
			if (usable(value)) { el.setAttribute('href', value); }
		});
		each('[data-st-src]', function (el) {
			if (!once(el, 'src')) { return; }
			var value = get(el.getAttribute('data-st-src'));
			var mobilePath = el.getAttribute('data-st-src-mobile');
			if (ST.isMobile && mobilePath && usable(get(mobilePath))) { value = get(mobilePath); }
			if (usable(value) && el.getAttribute('src') !== value) { el.setAttribute('src', value); }
		});
		each('[data-st-srcset]', function (el) {
			if (!once(el, 'srcset')) { return; }
			var value = get(el.getAttribute('data-st-srcset'));
			if (usable(value)) { el.setAttribute('srcset', value); }
		});
		each('[data-st-attr]', function (el) {
			if (!once(el, 'attr')) { return; }
			pairs(el, 'data-st-attr', function (name, value) { if (usable(value)) { el.setAttribute(name, value); } });
		});
		each('[data-st-media]', function (el) {
			if (!once(el, 'media')) { return; }
			pairs(el, 'data-st-media', function (name, value) {
				if (typeof value !== 'string') { return; }
				if (value === '') { el.removeAttribute(name); } else { el.setAttribute(name, value); }
			});
		});
		each('video[data-st-video]', function (video) {
			if (!once(video, 'video')) { return; }
			var value = get(video.getAttribute('data-st-video'));
			if (typeof value !== 'string') { return; }
			if (value === '') { video.parentNode.removeChild(video); return; }
			video.setAttribute('data-src', value);
			video.removeAttribute('src');
		});

		// ON STORE 배너의 마우스오버 두 번째 컷 (CSS 변수 --st-hover-N 으로 전달)
		var hover = get('onStore.hoverImages');
		var gallery = doc.querySelector('.main_image_text_gallery .main_3dan_banner');
		if (gallery && hover && hover.length && once(gallery, 'hover')) {
			for (var i = 0; i < hover.length; i++) {
				if (typeof hover[i] !== 'string') { continue; }
				gallery.style.setProperty('--st-hover-' + (i + 1), hover[i] ? 'url("' + hover[i].replace(/["\\\n]/g, '') + '")' : 'none');
			}
		}

		// SPECIAL EVENT 의 큰 글자 모양(브랜드 워드마크). 비어 있으면 CSS 의 기본 모양(SERAPHIN)을 쓴다.
		var mask = get('specialEvent.mask');
		var maskWidth = mask ? Number(mask.width) : 0;
		var maskHeight = mask ? Number(mask.height) : 0;
		if (mask && usable(mask.path) && maskWidth > 0 && maskHeight > 0) {
			var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + maskWidth + "' height='" + maskHeight + "' viewBox='0 0 " + maskWidth + ' ' + maskHeight + "'><path fill='#fff' d='" + mask.path.replace(/'/g, '') + "'/></svg>";
			var image = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '"), linear-gradient(#fff, #fff)';
			each('.st-type__mask', function (el) {
				if (!once(el, 'mask')) { return; }
				el.style.setProperty('-webkit-mask-image', image);
				el.style.setProperty('mask-image', image);
				el.setAttribute('data-st-mask-w', maskWidth);
				el.setAttribute('data-st-mask-h', maskHeight);
			});
		}
	}
	// 카페24 스킨은 본문 뒤(layout.html)에서 이 함수를 한 번 더 불러, 첫 화면이 그려지기 전에 값을 채운다.
	window.STORE_CONTENT_APPLY = initStoreConfig;

	// Passive scroll events share one animation-frame update.
	var tickers = [];
	var frameWrites = null;
	function writeScrollFrame(fn) { if (frameWrites) { frameWrites.push(fn); } else { fn(); } }
	function onSectionFrame(element, fn) {
		var visible = true;
		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				visible = entries[0].isIntersecting;
				fn(); // Update boundary values on entry and exit, including fast scroll jumps.
			}, { rootMargin: '120px 0px' }).observe(element);
		}
		onScrollFrame(function () { if (visible && !doc.hidden) { fn(); } });
	}
	function onScrollFrame(fn) { tickers.push(fn); }

	(function tickLoop() {
		var lastY = -1;
		var lastW = -1;

		function run() {
			var y = window.pageYOffset || doc.documentElement.scrollTop || 0;
			var w = window.innerWidth;
			if (y === lastY && w === lastW) { return; }
			lastY = y;
			lastW = w;
			frameWrites = [];
			for (var i = 0; i < tickers.length; i++) {
				try { tickers[i](y); } catch (e) {}
			}
			var writes = frameWrites; frameWrites = null;
			writes.forEach(function (fn) { fn(); });
		}

		var scheduled = false;
		function schedule() {
			if (scheduled) { return; }
			scheduled = true;
			requestAnimationFrame(function () { scheduled = false; run(); });
		}
		schedule();

		// Scroll work is scheduled only when the native viewport changes.
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', function () { lastW = -1; schedule(); });
		window.addEventListener('load', function () { lastY = -1; schedule(); });
	})();

	/* ----------------------------------------------------------------------
	   입력 안전망 — 히어로 제목(한 줄 고정)이 화면 폭보다 길어지면 그 폭에 맞춰 줄인다.
	   기본 문구(SERAPHIN)처럼 폭 안에 들어오면 아무것도 하지 않는다. (디자인 값 불변)
	   store-content.js 에 아주 긴 브랜드명이 들어와도 글자가 잘리지 않게 하려는 장치.
	   ---------------------------------------------------------------------- */
	function initFitTitle() {
		Array.prototype.forEach.call(doc.querySelectorAll('.st-hero__title'), function (el) {
			function fit() {
				el.style.fontSize = '';
				var room = el.clientWidth;
				var need = el.scrollWidth;
				if (room > 0 && need > room + 1) {
					var size = parseFloat(window.getComputedStyle(el).fontSize);
					el.style.fontSize = (Math.floor(size * room / need * 100) / 100) + 'px';
				}
			}
			fit();
			window.addEventListener('load', fit);
			window.addEventListener('resize', fit);
			if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(fit); }
		});
	}

	/* ----------------------------------------------------------------------
	   2. Lenis 관성 스크롤 (있을 때만)
	   ---------------------------------------------------------------------- */
	var lenis = null;
	function initLenis() {
		// Native wheel/touch scrolling avoids a second inertia loop on direction changes.
		window.stLenis = null;
	}

	/* ----------------------------------------------------------------------
	   3. 등장 모션 — IntersectionObserver (라이브러리 의존 없음)
	   ---------------------------------------------------------------------- */
	function initReveal() {
		if (!ST.useMotion) { return; }

		// 대형 문구는 자동으로 단어 분리 대상에 넣는다
		// (히어로 워드마크 / 캠페인 비트 / FILM 캡션 / 대형 텍스트 섹션)
		Array.prototype.forEach.call(
			doc.querySelectorAll('.st-hero__title, .st-world__line, #contents .main_text_title'),
			function (el) {
				// PC 첫 화면의 워드마크는 처음부터 완성된 위치에 표시한다.
				if (el.classList.contains('st-hero__title') && window.matchMedia('(min-width:1025px)').matches) { return; }
				el.classList.add('st-split');
			}
		);

		// 섹션 제목은 줄 단위로 훑고 올라오게 한다
		Array.prototype.forEach.call(
			doc.querySelectorAll('#contents .st-num .main_title'),
			function (el) { el.classList.add('st-reveal-title'); }
		);

		// 텍스트 단어 분리
		Array.prototype.forEach.call(doc.querySelectorAll('.st-split'), splitWords);

		// Reveal once with IntersectionObserver; use the scroll fallback only on older browsers.
		var pending = Array.prototype.slice.call(
			doc.querySelectorAll('.st-reveal, .st-reveal-img, .st-split, .st-reveal-title')
		);

		var revealedAny = false;
		if ('IntersectionObserver' in window) {
			var observer = new IntersectionObserver(function (entries) {
				entries.forEach(function (entry) {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-in');
						observer.unobserve(entry.target);
					}
				});
			}, { rootMargin: '0px 0px -5% 0px' });
			pending.forEach(function (el) { observer.observe(el); });
			return;
		}

		function sweep() {
			if (!pending.length) { return; }
			var limit = window.innerHeight * 0.88;
			var rest = [];
			for (var i = 0; i < pending.length; i++) {
				var el = pending[i];
				if (el.getBoundingClientRect().top < limit) {
					el.classList.add('is-in');
					revealedAny = true;
				} else {
					rest.push(el);
				}
			}
			pending = rest;
		}

		onScrollFrame(sweep);
		sweep();						// 첫 화면에 이미 보이는 것들
		window.addEventListener('resize', sweep);
		window.addEventListener('load', sweep);

		// 최후의 안전장치 — 판정이 아예 한 번도 돌지 않았다면 전부 보여준다.
		// 모션을 잃는 것보다 내용이 안 보이는 쪽이 훨씬 나쁘다.
		// 한 개라도 등장했다면 기구는 정상이므로 나머지는 스크롤에 맡긴다.
		setTimeout(function () {
			if (revealedAny) { return; }
			pending.forEach(function (el) { el.classList.add('is-in'); });
			pending = [];
		}, 4000);
	}

	/* ----------------------------------------------------------------------
	   3-2. 커스텀 커서 — 영상 섹션 위에서 라벨로 바뀐다
	   ---------------------------------------------------------------------- */
	function initCursor() {
		// 터치 기기·모션 OFF 에서는 만들지 않는다 (커서 자체가 없다)
		if (!ST.useMotion || ST.isMobile) { return; }
		if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) { return; }

		var zones = doc.querySelectorAll('[data-st-cursor]');
		if (!zones.length) { return; }

		var el = doc.createElement('div');
		el.className = 'st-cursor';
		el.setAttribute('aria-hidden', 'true');
		// 원형 링 + 우하단 플러스 배지. 라벨은 링 안쪽 중앙에 앉힌다.
		el.innerHTML =
			'<span class="st-cursor__inner">' +
				'<span class="st-cursor__label"></span>' +
				'<span class="st-cursor__plus">+</span>' +
			'</span>';
		doc.body.appendChild(el);

		var label = el.querySelector('.st-cursor__label');
		var x = 0, y = 0, tx = 0, ty = 0, active = false, raf = 0;

		function loop() {
			raf = 0;
			if (!active || doc.hidden) { return; }
			// 살짝 따라오게 해서 붙어다니는 느낌을 준다
			tx += (x - tx) * 0.18;
			ty += (y - ty) * 0.18;
			el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) translate(-50%,-50%)';
			if (Math.abs(x - tx) + Math.abs(y - ty) > 0.2) { raf = requestAnimationFrame(loop); }
		}

		doc.addEventListener('mousemove', function (e) {
			x = e.clientX; y = e.clientY;
			if (active && !raf) { raf = requestAnimationFrame(loop); }
		}, { passive: true });

		Array.prototype.forEach.call(zones, function (zone) {
			zone.addEventListener('mouseenter', function () {
				label.textContent = zone.dataset.stCursor || 'VIEW';
				el.classList.add('is-on');
				active = true;
				if (!raf) { tx = x; ty = y; raf = requestAnimationFrame(loop); }
			});
			zone.addEventListener('mouseleave', function () {
				el.classList.remove('is-on');
				active = false;
			});
		});

		// 창을 벗어나면 숨긴다
		doc.addEventListener('mouseleave', function () { el.classList.remove('is-on'); });
	}

	// 텍스트를 줄 → 단어로 쪼개 스태거 인덱스를 부여한다.
	// <br> 로 나뉜 줄 구조를 유지해야 대형 문구(두 줄짜리)가 깨지지 않는다.
	function splitWords(el) {
		if (el.dataset.stSplit === 'done') { return; }

		// <br> 기준으로 줄을 나눈다. innerHTML 을 쓰지만 태그는 <br> 만 허용하고
		// 나머지는 textContent 로만 다루므로 마크업이 그대로 주입되지 않는다.
		var lines = el.innerHTML.split(/<br\s*\/?>/i).map(function (chunk) {
			var probe = doc.createElement('div');
			probe.innerHTML = chunk;
			return (probe.textContent || '').trim();
		}).filter(function (t) { return t.length; });

		if (!lines.length) { return; }

		var frag = doc.createDocumentFragment();
		var idx = 0;

		lines.forEach(function (line, li) {
			if (li > 0) { frag.appendChild(doc.createElement('br')); }
			line.split(/\s+/).forEach(function (w, wi, arr) {
				var outer = doc.createElement('span');
				outer.className = 'st-word';
				outer.style.setProperty('--st-i', idx++);
				var inner = doc.createElement('span');
				inner.textContent = w;
				outer.appendChild(inner);
				frag.appendChild(outer);
				if (wi < arr.length - 1) { frag.appendChild(doc.createTextNode(' ')); }
			});
		});

		el.textContent = '';
		el.appendChild(frag);
		el.dataset.stSplit = 'done';
	}

	/* ----------------------------------------------------------------------
	   4. 마퀴 — 트랙을 복제해 끊김 없이 순환
	   ---------------------------------------------------------------------- */
	function initMarquee() {
		Array.prototype.forEach.call(doc.querySelectorAll('.st-marquee'), function (mq) {
			var track = mq.querySelector('.st-marquee__track');
			if (!track || track.dataset.stMarquee === 'done') { return; }

			// 트랙이 화면 폭보다 좁으면 내용을 반복해 채운다.
			// 복제본을 하나 더 붙여 -100% 로 순환시키므로 화면 폭만 넘으면 충분하다.
			// (여기서 *2 로 잡으면 타일 영상이 수십 개로 불어나 성능이 무너진다)
			var guard = 0;
			while (track.scrollWidth < mq.offsetWidth && guard < 6) {
				track.innerHTML += track.innerHTML;
				guard++;
			}

			// 복제본을 하나 더 붙여 -100% 이동 시 이어지게 한다
			var clone = track.cloneNode(true);
			clone.setAttribute('aria-hidden', 'true');
			mq.appendChild(clone);

			// 원본은 페이지 로드 시점부터 움직이고 복제본은 지금 생성된다.
			// 둘을 그대로 두면 시작 시점 차이만큼 반복 경계의 타일 간격이 흔들린다.
			// 두 레일을 같은 렌더링 프레임에 재시작해 모든 반복 구간을 같은 간격으로 맞춘다.
			track.style.animation = 'none';
			clone.style.animation = 'none';
			void mq.offsetWidth;
			track.style.animation = '';
			clone.style.animation = '';

			// 속도 일정하게 — 픽셀당 시간 고정
			var speed = parseFloat(mq.dataset.speed || '80');	// px/sec
			var dur = track.scrollWidth / speed;
			mq.style.setProperty('--st-marquee-dur', dur.toFixed(2) + 's');

			track.dataset.stMarquee = 'done';
			clone.dataset.stMarquee = 'done';
			function pause(paused) {
				track.style.animationPlayState = clone.style.animationPlayState = paused ? 'paused' : 'running';
			}
			var visible = false;
			function sync() { pause(!visible || doc.hidden || !ST.useMotion); }
			if ('IntersectionObserver' in window) {
				new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }).observe(mq);
			} else { visible = true; }
			doc.addEventListener('visibilitychange', sync);
			sync();
		});
	}

	/* ----------------------------------------------------------------------
	   5. GSAP ScrollTrigger — 가로 스크럽 (PC/모바일), 기타 효과는 PC 전용
	   ---------------------------------------------------------------------- */
	function initScrollTrigger() {
		if (!ST.useHorizontal || !window.gsap || !window.ScrollTrigger) { return; }
		window.gsap.registerPlugin(window.ScrollTrigger);
		window.ScrollTrigger.config({ ignoreMobileResize: true });

		// GSAP 이 실제로 붙었을 때만 핀/스크럽용 레이아웃으로 전환한다.
		// 이 클래스가 없으면 가로 섹션은 네이티브 가로 스크롤로 동작한다.
		html.classList.add('st-heavy');

		// 가로 스크롤 섹션: [data-st-horizontal] 안의 [data-st-track]
		Array.prototype.forEach.call(doc.querySelectorAll('[data-st-horizontal]'), function (sec) {
			var track = sec.querySelector('[data-st-track]');
			if (!track) { return; }

			var holder = sec.querySelector('[data-ez-holder]') || sec;
			var distance = function () { return Math.max(0, track.scrollWidth - holder.clientWidth); };
			if (distance() <= 0) { return; }

			window.gsap.to(track, {
				x: function () { return -distance(); },
				ease: 'none',
				scrollTrigger: {
					trigger: sec,
					start: 'top top',
					end: function () { return '+=' + distance(); },
					pin: true,
					scrub: true,
					anticipatePin: 1,
					invalidateOnRefresh: true
				}
			});
		});

		// 이미지 로딩 후 모바일도 최종 상품 폭/높이로 한 번만 보정한다.
		window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });

		// 핀 고정 섹션 / 패럴랙스는 PC 에서만 — 모바일에서는 가로 진열만 쓴다
		if (!ST.useHeavy) { return; }

		// 핀 고정 섹션: [data-st-pin]
		Array.prototype.forEach.call(doc.querySelectorAll('[data-st-pin]'), function (sec) {
			window.ScrollTrigger.create({
				trigger: sec,
				start: 'top top',
				end: '+=' + (sec.dataset.stPin || '100%'),
				pin: true,
				pinSpacing: true,
				anticipatePin: 1
			});
		});

		// 패럴랙스: [data-st-parallax="0.2"]
		Array.prototype.forEach.call(doc.querySelectorAll('[data-st-parallax]'), function (el) {
			var amount = parseFloat(el.dataset.stParallax || '0.15');
			window.gsap.to(el, {
				yPercent: amount * 100,
				ease: 'none',
				scrollTrigger: {
					trigger: el.parentNode,
					start: 'top bottom',
					end: 'bottom top',
					scrub: true
				}
			});
		});

	}

	/* ----------------------------------------------------------------------
	   6. 헤더 — 메인 판별 + 스크롤 시 배경 채우기
	   ---------------------------------------------------------------------- */
	function initHeader() {
		// 메인 페이지 판별 (고정 헤더 여백 처리에 사용)
		var isMain = doc.querySelector('.main_image_text_gallery, .main_product_category') !== null &&
					 /^\/(index\.html)?$/.test(location.pathname);
		if (isMain) { doc.body.classList.add('st-main'); }

		var header = doc.getElementById('header');
		if (!header) { return; }

		// 헤더는 배경이 없다. 대신 헤더 바로 아래에 어두운 영역이 있으면
		// 글자/아이콘을 흰색으로 뒤집는다. (히어로 영상, 캠페인 스테이지 등)
		var darkZones = doc.querySelectorAll('[data-st-dark], .st-world__stage, .st-reel__frame, .st-tear__stage');
		var wasDark = null;
		function update() {
			var hr = header.getBoundingClientRect();
			var probeY = hr.top + hr.height / 2;
			var dark = false;

			for (var i = 0; i < darkZones.length; i++) {
				var zr = darkZones[i].getBoundingClientRect();
				if (zr.height > 0 && zr.top <= probeY && zr.bottom >= probeY) { dark = true; break; }
			}
			// 두 클래스를 함께 토글한다.
			// is-over-light 는 "밝은 영역 위" 를 CSS 에 명시적으로 알리는 신호다.
			// (히어로가 있는 페이지는 CSS 기본이 흰 글자라, 되돌리려면 명시가 필요하다)
			if (wasDark === dark) { return; }
			wasDark = dark;
			writeScrollFrame(function () {
				header.classList.toggle('is-over-dark', dark);
				header.classList.toggle('is-over-light', !dark);
			});
		}

		// 프로모션 바도 fixed 라 흐름에서 빠진다. 그 높이를 CSS 변수로 넘겨
		// 헤더 top 과 본문 상단 여백을 맞춘다. 닫으면 0 이 되어 헤더가 올라붙는다.
		var topbar = doc.querySelector('.main_top_banner');
		// 쿠키로 숨겨진 첫 방문과 지연 실행되는 slideDown/slideUp 모두 실제 높이에 맞춘다.
		function syncTopbar() {
			var h = (topbar && topbar.isConnected && topbar.getAttribute('data-ez-display') !== 'hidden') ? topbar.offsetHeight : 0;
			doc.documentElement.style.setProperty('--st-topbar-h', h + 'px');
			syncHeroOffset();
		}
		syncTopbar();

		// 히어로가 화면을 정확히 채우도록 위쪽 점유 높이(프로모션 바 등)를 보정.
		// 프로모션 바는 사용자가 닫을 수 있으므로 값을 고정하지 않는다.
		var hero = doc.querySelector('.st-hero');
		function syncHeroOffset() {
			if (!hero) { return; }
			var top = hero.getBoundingClientRect().top + window.scrollY;
			doc.documentElement.style.setProperty('--st-hero-offset', Math.max(0, Math.round(top)) + 'px');
		}
		syncHeroOffset();
		window.addEventListener('resize', syncTopbar);
		window.addEventListener('load', syncTopbar);
		if (topbar) {
			if (window.ResizeObserver) {
				new ResizeObserver(syncTopbar).observe(topbar);
			}
			new MutationObserver(syncTopbar).observe(topbar, {
				attributes:true, attributeFilter:['style', 'class', 'data-ez-display', 'hidden']
			});
		}

		onScrollFrame(update);
		window.addEventListener('resize', update);
		update();
	}

	/* ----------------------------------------------------------------------
	   7. SCROLL WORLD — 스크롤이 카메라를 움직인다
	   --------------------------------------------------------------------------
	   영상을 "재생"하지 않고 스크롤 위치로 currentTime 을 직접 지정한다.
	   구현상 반드시 지켜야 하는 것 3가지:
	   1) 원본 스트리밍을 우선 사용하고 실제 오류/시크 정체에만 Blob 폴백을 쓴다.
	   2) 시크를 큐에 쌓지 않는다. 디코더가 시크 중일 때 또 시크를 걸면
	      빠르게 스크롤할 때 영상이 멈춘 것처럼 보인다.
	   3) 첫 프레임이 그려지기 전까지 포스터 이미지를 유지한다.
	      iOS 사파리는 한 번도 재생 안 한 muted 영상의 시크 프레임을 그리지 않는다.
	   ---------------------------------------------------------------------- */
	function initScrollWorld() {
		var tracks = doc.querySelectorAll('[data-st-world]');
		if (!tracks.length) { return; }

		Array.prototype.forEach.call(tracks, function (track) {
			var stage = track.querySelector('.st-world__stage');
			var media = track.querySelector('.st-world__media');
			var poster = track.querySelector('.st-world__poster');
			var beats = track.querySelectorAll('.st-world__beat');
			var idxEl = track.querySelector('.st-world__index i');
			var barEl = track.querySelector('.st-world__bar i');
			if (!stage || !media) { return; }

			// 트랙 높이 = 카메라 이동 거리. 모바일은 짧게.
			var scrollVh = parseInt(track.dataset.scroll || '300', 10);
			if (ST.isMobile) { scrollVh = Math.round(scrollVh * 0.7); }

			// data-hold — 영상이 끝난 뒤 마지막 프레임을 붙잡아 두는 구간(vh).
			// 없으면 마지막 프레임에 닿는 순간 곧바로 다음 섹션으로 밀려 올라가
			// 마무리 장면을 볼 틈이 없다. 이 높이만큼은 진행도가 1 에 머문다.
			var holdVh = parseInt(track.dataset.hold || '0', 10);
			if (ST.isMobile) { holdVh = Math.round(holdVh * 0.7); }

			// 영상이 차지하는 비율. 트랙을 hold 만큼 늘려 붙이므로,
			// 영상 자체의 진행 속도는 hold 를 넣기 전과 같다.
			var videoSpan = (scrollVh + holdVh) > 0 ? scrollVh / (scrollVh + holdVh) : 1;
			var src = (ST.isMobile && track.dataset.videoMobile) || track.dataset.video;
			// 영상 주소가 비어 있으면(store-content.js) 스크롤 구간 없이 포스터 한 장짜리 첫 화면으로 둔다.
			track.style.setProperty('--st-world-scroll', src ? (scrollVh + holdVh) + 'svh' : '100svh');
			if (!src) { return; }

			// Load the opening poster eagerly; failed images never show a broken-image icon.
			if (poster) {
				poster.loading = 'eager';
				poster.setAttribute('fetchpriority', 'high');
				var posterSources = [ST.isMobile && track.dataset.posterMobile, track.dataset.poster, poster.getAttribute('src')].filter(function (url, index, all) { return url && all.indexOf(url) === index; });
				var posterIndex = 0;
				function showPoster() { poster.style.visibility = poster.naturalWidth > 0 ? '' : 'hidden'; }
				function nextPoster() {
					poster.style.visibility = 'hidden';
					var pictureSource = poster.parentElement.querySelector('source');
					if (pictureSource) { pictureSource.remove(); }
					posterIndex++;
					if (posterIndex < posterSources.length) { poster.src = posterSources[posterIndex]; }
				}
				poster.addEventListener('load', showPoster);
				poster.addEventListener('error', nextPoster);
				poster.style.visibility = 'hidden';
				if (posterSources.length && poster.getAttribute('src') !== posterSources[0]) { poster.src = posterSources[0]; }
				else if (poster.complete) {
					if (poster.naturalWidth) { showPoster(); }
					else { nextPoster(); }
				}
			}

			var video = doc.createElement('video');
			video.muted = true;
			video.defaultMuted = true;
			video.setAttribute('muted', '');
			video.playsInline = true;
			video.setAttribute('playsinline', '');
			video.setAttribute('webkit-playsinline', '');
			video.setAttribute('preload', 'auto');
			video.setAttribute('aria-hidden', 'true');
			video.className = 'st-world__video';
			media.appendChild(video);

			var ready = false;
			var duration = 0;
			var painted = false;
			// Only the hero opts into autoplay. After the first scroll it stays in scrub mode.
			var automatic = track.dataset.autoplay === 'true' && ST.useMotion && window.scrollY < 2;
			// Poster selection never changes the playback start: the video starts at zero.
			var introHasPlayed = false;
			var autoplayPending = false;
			var anchorTime = null;
			var anchorProgress = 0;
			var previousY = window.scrollY;
			var previousProgress = 0;
			var scrubDirection = 0;
			video.loop = automatic;
			video.autoplay = automatic;

			function playIntro() {
				// On mobile, play() must start loading; waiting for loadeddata can deadlock.
				if (!automatic || autoplayPending || doc.hidden || !fetchStarted || !video.paused) { return; }
				autoplayPending = true;
				var attempt;
				try { attempt = video.play(); } catch (e) { autoplayPending = false; return; }
				function complete() {
					autoplayPending = false;
					primed = true;
					if (!automatic || doc.hidden) { video.pause(); resumeChase(); }
				}
				if (attempt && attempt.then) {
					attempt.then(complete).catch(function () { autoplayPending = false; resumeChase(); });
				} else { complete(); }
			}
			function takeOver(p) {
				if (!automatic) { return; }
				anchorTime = introHasPlayed ? video.currentTime : 0;
				anchorProgress = Math.min(0.9999, Math.max(0, p));
				automatic = false;
				video.loop = false;
				video.autoplay = false;
				video.pause();
				apply(progress());
			}
			// Catch wheel/touch intent before the browser changes the scroll position.
			if (track.dataset.autoplay === 'true') {
				window.addEventListener('wheel', function (event) {
					if (!event.ctrlKey && event.deltaY) { takeOver(progress()); }
				}, { passive:true });
				window.addEventListener('touchmove', function () { takeOver(progress()); }, { passive:true });
				window.addEventListener('keydown', function (event) {
					if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) { return; }
					if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(event.key) >= 0) { takeOver(progress()); }
				});
			}

			// 블롭 폴백을 한 번만 시도하기 위한 표식
			var blobTried = false;

			function syncReady() {
				duration = Number.isFinite(video.duration) ? video.duration : 0;
				ready = duration > 0;
				// Empty seekable ranges at metadata time are normal during loading.
				// Keep streaming; only use the full-file fallback on an actual failure.
				if (ready) {
					apply(progress());
					playIntro();
				}
			}
			['loadedmetadata', 'durationchange', 'loadeddata', 'canplay', 'progress'].forEach(function (event) {
				video.addEventListener(event, syncReady);
			});
			video.addEventListener('emptied', function () {
				ready = false; primed = false;
			});

			// 블롭 소스를 아예 못 읽는 경우(사파리가 MIME 없는 blob 을 거부하는 등)도
			// 포스터만 남지 않도록 원본 URL 로 한 번 되돌린다.
			video.addEventListener('error', function () {
				// 원본 URL 이 실패하면 Blob 으로, Blob 이 실패하면 원본으로 한 번씩만
				// 되돌린다. 둘 다 안 되면 포스터가 남는다.
				if (!blobTried) { loadViaBlob(); }
				else if (video.src.indexOf('blob:') === 0) { video.src = src; }
			});

			function loadViaBlob() {
				if (blobTried) { return; }
				blobTried = true;
				fetch(src, { credentials: 'same-origin' })
					.then(function (r) { return r.ok ? r.blob() : Promise.reject(r.status); })
					.then(function (blob) {
						// 사파리는 type 이 빈 Blob 을 재생하지 않는다. 확실히 붙여준다.
						if (!/^video\//.test(blob.type)) { blob = new Blob([blob], { type: 'video/mp4' }); }
						video.src = URL.createObjectURL(blob);
					})
					.catch(function () { syncReady(); resumeChase(); });
			}

			// 1차는 원본 URL 직접 스트리밍.
			// 예전에는 무조건 Blob 으로 통째로 받았는데, 모바일에서 7MB 를 다 받을
			// 때까지 히어로가 포스터로 멈춰 있었고 웹킷에서는 blob 재생이 실패했다.
			// 지금 CDN(jsDelivr)은 Accept-Ranges 를 주므로 직접 재생이 더 빠르고
			// 시크도 된다. Range 가 없는 호스팅으로 바뀌면 위에서 Blob 으로 넘어간다.
			var fetchStarted = false;
			function loadVideo() {
				if (fetchStarted) { return; }
				fetchStarted = true;
				video.src = src;
				playIntro();
			}

			// 첫 화면(히어로)만 즉시 받고, 아래쪽 섹션 영상은 가까워질 때 받는다.
			// 전부 한꺼번에 받으면 첫 화면이 그만큼 늦게 뜬다.
			var isFirst = track === tracks[0];
			if (isFirst || !('IntersectionObserver' in window)) {
				loadVideo();
			} else {
				new IntersectionObserver(function (entries, obs) {
					if (entries.some(function (e) { return e.isIntersecting; })) {
						obs.disconnect();
						loadVideo();
					}
				}, { rootMargin: '150% 0px' }).observe(track);
			}

			// iOS: 첫 터치에 한 번 재생을 찔러줘야 시크 프레임이 그려진다 (위 3번)
			var primed = false;
			var priming = false;
			function prime() {
				if (automatic) { playIntro(); return; }
				if (primed || priming || !fetchStarted || doc.hidden) { return; }
				priming = true;
				var attempt;
				try { attempt = video.play(); } catch (e) { priming = false; return; }
				function complete() {
					priming = false;
					primed = true;
					video.pause();
					syncReady();
					resumeChase();
				}
				if (attempt && attempt.then) {
					attempt.then(complete).catch(function () {
						// A denied/aborted attempt must remain retryable on the next gesture.
						priming = false;
						resumeChase();
					});
				} else { complete(); }
			}
			doc.addEventListener('touchstart', prime, { passive: true });
			doc.addEventListener('touchend', prime, { passive: true });
			if (track.dataset.autoplay === 'true') { doc.addEventListener('pointerup', prime, { passive:true }); }
			video.addEventListener('loadeddata', prime);

			// 스크롤 진행도 0~1
			function progress() {
				var rect = track.getBoundingClientRect();
				// 무대는 sticky top 만큼 내려붙는다(히어로는 프로모션 띠 높이).
				// 그 값을 빼지 않으면 실제로 굴러가는 거리보다 분모가 커져,
				// 끝까지 스크롤해도 진행도가 1 에 못 미친다 —
				// 영상 마지막 구간(정면 마무리)이 끝내 안 나온다.
				var stickyTop = parseFloat(window.getComputedStyle(stage).top) || 0;
				var total = track.offsetHeight - stage.offsetHeight - stickyTop;
				if (total <= 0) { return 0; }
				var raw = Math.min(1, Math.max(0, -rect.top / total));
				// 트랙 뒤쪽 hold 구간에서는 1 을 넘으므로 잘라낸다 —
				// 그 사이 마지막 프레임과 마지막 문구가 그대로 붙어 있는다.
				return Math.min(1, raw / videoSpan);
			}

			/* 포스터를 걷는 시점 = 영상이 실제로 한 프레임을 그린 뒤.
			   통째로 받아두던 예전 방식과 달리 지금은 스트리밍이라, seeked 가
			   와도 아직 그릴 데이터가 없을 수 있다. 그때 포스터를 걷으면
			   화면이 까맣게 남는다(실제로 모바일에서 그렇게 나왔다). */
			function markPainted() {
				if (painted) { return; }
				if (!automatic && anchorTime !== null && Math.abs(video.currentTime - targetT) > 0.1) { return; }
				painted = true;
				media.classList.add('is-painted');
			}
			if (typeof video.requestVideoFrameCallback === 'function') {
				// 프레임이 화면에 올라간 순간에만 불린다 — 가장 정확하다
				video.requestVideoFrameCallback(markPainted);
			}
			video.addEventListener('playing', function () {
				if (automatic) { introHasPlayed = true; }
				if (video.readyState >= 2) { markPainted(); }
			});
			video.addEventListener('seeked', function () {
				// HAVE_CURRENT_DATA(2) 미만이면 아직 그릴 프레임이 없다
				if (video.readyState >= 2) { markPainted(); }
			});
			// Compare against the decoder's actual position, never an assumed seek result.
			var targetT = 0;
			// Native decoders may settle one or two frames after the requested timestamp.
			var seekTolerance = track.dataset.autoplay === 'true' ? 0.08 : 0.012;
			var chasing = false;
			var seekTimer = 0;
			var seekStarted = 0;
			var requestedTime = 0;
			var missedSeeks = 0;
			function watchSeek() {
				clearTimeout(seekTimer);
				seekTimer = setTimeout(function () {
					if (doc.hidden) { return; }
					if (video.seeking) {
						if (Date.now() - seekStarted > 4000 && !blobTried) { loadViaBlob(); }
						else if (Date.now() - seekStarted <= 4000) { watchSeek(); }
						return;
					}
					resumeChase();
				}, 750);
			}
			function chaseLoop() {
				chasing = false;
				if (automatic || !ready || doc.hidden || priming || autoplayPending || video.readyState < 2 || video.seeking) { return; }
				var delta = targetT - video.currentTime;
				if (Math.abs(delta) < seekTolerance) { return; }
				// Mobile decodes the latest target directly instead of decoding many tiny steps.
				var next = anchorTime !== null || !painted || ST.isMobile || Math.abs(delta) < 0.08 ? targetT : video.currentTime + delta * 0.35;
				try {
					requestedTime = next;
					video.currentTime = next;
					seekStarted = Date.now();
					watchSeek();
				} catch (e) { watchSeek(); }
			}
			function resumeChase() {
				if (!automatic && !autoplayPending && !chasing && missedSeeks < 3 && ready && !doc.hidden && !priming && video.readyState >= 2 && !video.seeking && Math.abs(targetT - video.currentTime) >= seekTolerance) {
					chasing = true;
					requestAnimationFrame(chaseLoop);
				}
			}
			video.addEventListener('seeked', function () {
				clearTimeout(seekTimer);
				if (automatic) { return; }
				missedSeeks = Math.abs(video.currentTime - requestedTime) > 0.08 ? missedSeeks + 1 : 0;
				if (missedSeeks >= 3) {
					// Some hosts silently clamp unsupported seeks back to frame zero.
					if (!blobTried) { loadViaBlob(); }
					return;
				}
				resumeChase();
			});
			video.addEventListener('loadeddata', function () { missedSeeks = 0; resumeChase(); });
			doc.addEventListener('visibilitychange', function () {
				if (doc.hidden) { video.pause(); clearTimeout(seekTimer); }
				else { syncReady(); prime(); resumeChase(); if (video.seeking) { seekStarted = Date.now(); watchSeek(); } }
			});
			window.addEventListener('pageshow', function () { syncReady(); prime(); resumeChase(); });
			window.addEventListener('pagehide', function () { video.pause(); clearTimeout(seekTimer); });

			function apply(p) {
				if (ready && !automatic) {
					var endTime = Math.max(0, duration - 0.04);
					var mappedTime = p * duration;
					if (anchorTime !== null) {
						var startTime = Math.min(anchorTime, endTime);
						mappedTime = p >= anchorProgress
							? startTime + (endTime - startTime) * (p - anchorProgress) / (1 - anchorProgress)
							: startTime * p / anchorProgress;
					}
					targetT = Math.max(0, Math.min(endTime, mappedTime));
					resumeChase();
				}
				if (barEl) { barEl.style.transform = 'scaleX(' + p.toFixed(4) + ')'; }

				// 진행도를 CSS 변수로도 넘겨 카피/타이포를 스크롤에 물린다
				track.style.setProperty('--st-p', p.toFixed(4));

				if (beats.length) {
					var n = beats.length;
					// 마지막 비트는 끝까지 남겨 CTA 가 사라지지 않게 한다
					var active = Math.min(n - 1, Math.floor(p * n));
					for (var i = 0; i < n; i++) {
						beats[i].classList.toggle('is-active', i === active);
					}
					if (idxEl) { idxEl.textContent = (active + 1 < 10 ? '0' : '') + (active + 1); }
				}
			}

			// 스크롤 진행도 반영 — 공용 rAF 틱에 등록
			var last = -1;
			function onScroll() {
				var p = progress();
				if (automatic && Math.abs(window.scrollY - previousY) > 1) { takeOver(previousProgress); }
				// On the first backward movement, map the visible frame back to time zero.
				// The original autoplay handoff can be at p=0, so retaining that anchor
				// would otherwise make its timestamp the earliest reachable frame forever.
				var direction = window.scrollY > previousY ? 1 : (window.scrollY < previousY ? -1 : 0);
				if (!automatic && anchorTime !== null && direction === -1 && scrubDirection !== -1 && last > 0 && p < last) {
					anchorTime = video.currentTime;
					anchorProgress = Math.min(0.9999, last);
				}
				if (direction && Math.abs(p - last) >= 0.0009) { scrubDirection = direction; }
				previousY = window.scrollY;
				previousProgress = p;
				if (Math.abs(p - last) < 0.0009) { return; }
				last = p;
				apply(p);
			}
			onSectionFrame(track, onScroll);
			// Scrollbar drags can skip the entire section between two frames.
			if (track.dataset.autoplay === 'true') { window.addEventListener('scroll', onScroll, { passive:true }); }
			window.addEventListener('resize', onScroll);
			onScroll();

			// 포스터는 첫 프레임이 그려질 때까지 유지 (위 3번)
			if (poster) { media.classList.add('has-poster'); }
		});
	}

	/* ----------------------------------------------------------------------
	   8. 카테고리 타일 — 마우스를 올리면 영상 재생, 벗어나면 정지
	   ---------------------------------------------------------------------- */
	var videoPlayback = (function () {
		var records = [];
		var queued = false;
		function load(record) {
			if (record.loaded || !record.src || !ST.useMotion) { return; }
			record.loaded = true;
			record.video.preload = 'metadata';
			record.video.src = record.src;
		}
		function stop(record) {
			record.wanted = false;
			if (!record.video.paused || record.pending) { record.video.pause(); }
		}
		function play(record) {
			var video = record.video;
			if (record.pending || !video.paused) { return; }
			load(record);
			if (!record.loaded) { return; }
			record.pending = true;
			var promise = video.play();
			function complete() {
				record.pending = false;
				if (!record.wanted || doc.hidden) { video.pause(); return; }
				var panel = video.closest('.st-tear__panel');
				if (panel) { panel.classList.add('is-playing'); }
			}
			if (promise && promise.then) { promise.then(complete).catch(function (error) { record.pending = false; if (record.wanted && error.name === 'AbortError') { schedule(); } }); }
			else { complete(); }
		}
		function sync() {
			queued = false;
			var candidates = records.filter(function (r) { return !doc.hidden && ST.useMotion && r.visible && (!r.hover || r.engaged); });
			candidates.sort(function (a, b) { return (b.hover ? 2 : b.ratio) - (a.hover ? 2 : a.ratio); });
			var selected = candidates.slice(0, window.matchMedia('(max-width:1024px), (pointer:coarse)').matches ? 1 : 2);
			// Pause old videos before allowing the new selection to decode.
			records.forEach(function (r) { if (selected.indexOf(r) < 0) { stop(r); } });
			selected.forEach(function (r) { r.wanted = true; play(r); });
		}
		function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
		function register(video, hover) {
			var src = video.dataset.stLazyvideo || video.dataset.src || video.getAttribute('src');
			if (ST.isMobile && video.dataset.stLazyvideoMobile) { src = video.dataset.stLazyvideoMobile; }
			var r = { video: video, src: src, hover: hover, engaged: false, visible: false, ratio: 0, wanted: false, pending: false, loaded: false };
			records.push(r);
			video.muted = true; video.playsInline = true; video.loop = true;
			video.removeAttribute('autoplay');
			if (ST.isMobile && video.dataset.stPosterMobile) { video.poster = video.dataset.stPosterMobile; }
			if ('IntersectionObserver' in window) {
				new IntersectionObserver(function (entries) {
					var e = entries[0]; r.ratio = e.intersectionRatio;
					r.visible = e.isIntersecting && e.intersectionRect.height >= Math.min(80, e.boundingClientRect.height * 0.15);
					schedule();
				}, { threshold: [0, 0.1, 0.15, 0.25, 0.5, 0.75, 1] }).observe(video);
				if (!hover) {
					new IntersectionObserver(function (entries, observer) {
						if (entries[0].isIntersecting) { load(r); observer.disconnect(); }
					}, { rootMargin: ST.isMobile ? '300px 0px' : '600px 0px' }).observe(video);
				}
			} else {
				onScrollFrame(function () {
					var box = video.getBoundingClientRect(); r.visible = box.height > 0 && box.top < innerHeight && box.bottom > 0;
					r.ratio = r.visible ? 1 : 0; if (r.visible && !hover) { load(r); } schedule();
				});
			}
			['loadeddata', 'canplay'].forEach(function (event) { video.addEventListener(event, schedule); });
			return function (engaged) { r.engaged = engaged; schedule(); };
		}
		doc.addEventListener('visibilitychange', function () { if (doc.hidden) { records.forEach(stop); } else { schedule(); } });
		window.addEventListener('pagehide', function () { records.forEach(stop); });
		window.addEventListener('pageshow', schedule);
		doc.addEventListener('touchend', schedule, { passive: true });
		return { register: register };
	})();

	function initTiles() {
		Array.prototype.forEach.call(doc.querySelectorAll('[data-st-tile]'), function (tile) {
			var video = tile.querySelector('video');
			if (!video) { return; }
			// Touch devices already show stills: do not keep unused/cloned media players.
			if (ST.isMobile || !window.matchMedia('(hover:hover) and (pointer:fine)').matches || !ST.useMotion) { video.remove(); return; }
			var engage = videoPlayback.register(video, true);
			var hovered = false, focused = false;
			tile.addEventListener('mouseenter', function () { hovered = true; engage(true); });
			tile.addEventListener('mouseleave', function () { hovered = false; engage(focused); });
			tile.addEventListener('focusin', function () { focused = true; engage(true); });
			tile.addEventListener('focusout', function () { focused = false; engage(hovered); });
		});
	}

	function initLazyVideos() {
		Array.prototype.forEach.call(doc.querySelectorAll('video[data-st-lazyvideo], [data-st-tear] video'), function (video) {
			videoPlayback.register(video, false);
		});
	}

	/* ----------------------------------------------------------------------
	   8-3. 찢어진 2분할 — 스크롤에 따라 찢긴 선이 좌우로 밀린다
	   --------------------------------------------------------------------------
	   움직이는 건 --st-tear-x 하나뿐이다. CSS 쪽에서 오른쪽 패널을 그만큼 밀고
	   안쪽 사진을 같은 양만큼 되밀기 때문에, 사진은 제자리에 있고 찢긴 결만
	   좌우로 왕복한다. 영상은 화면에 들어올 때만 재생한다.
	   ---------------------------------------------------------------------- */
	/* ----------------------------------------------------------------------
	   8-5. 플래시 점등 — 카메라 플래시처럼 한 장씩 터지며 드러난다
	   --------------------------------------------------------------------------
	   [data-st-flash] 안의 [data-st-flash-item] 들을, 화면에 들어온 순서대로
	   시차를 두고 켠다. 켜질 때 흰 판이 한 번 번쩍이고(::after) 사진은
	   과노출에서 제 밝기로 내려앉는다.
	   한 번 켜지면 다시 끄지 않는다 — 스크롤을 오르내릴 때마다 번쩍이면
	   눈이 피로하고 파티 사진이 싸구려로 보인다.
	   ---------------------------------------------------------------------- */
	function initFlash() {
		var groups = doc.querySelectorAll('[data-st-flash]');
		if (!groups.length) { return; }

		Array.prototype.forEach.call(groups, function (group) {
			var items = Array.prototype.slice.call(group.querySelectorAll('[data-st-flash-item]'));
			if (!items.length) { return; }

			// 모션을 끈 경우엔 그냥 다 보여준다
			if (!ST.useMotion) {
				items.forEach(function (el) { el.classList.add('is-lit'); });
				return;
			}

			var pending = items.slice();
			var fired = 0;

			function sweep() {
				if (!pending.length) { return; }
				// 화면 아래 끝에서 켜면 눈에 들어오기 전에 점등이 끝나 버린다.
				// 사진 윗변이 화면 중간을 넘어설 때 터뜨려야 보인다.
				var limit = window.innerHeight * 0.45;
				var rest = [];
				for (var i = 0; i < pending.length; i++) {
					var el = pending[i];
					if (el.getBoundingClientRect().top < limit) {
						// 순서대로 터지게 약간씩 늦춘다
						(function (node, delay) {
							setTimeout(function () { node.classList.add('is-lit'); }, delay);
						})(el, (fired % 5) * 110);
						fired++;
					} else { rest.push(el); }
				}
				pending = rest;
			}

			// 안전장치는 이 구간이 화면에 들어온 뒤에만 건다.
			// 무조건 몇 초 뒤에 켜면, 사용자가 여기까지 내려오기도 전에
			// 전부 켜져 버려서 정작 플래시를 볼 수 없다.
			var armed = false;
			function arm() {
				if (armed || !pending.length) { return; }
				var gr = group.getBoundingClientRect();
				if (gr.top > window.innerHeight || gr.bottom < 0) { return; }
				armed = true;
				setTimeout(function () {
					pending.forEach(function (el) { el.classList.add('is-lit'); });
					pending = [];
				}, 4000);
			}

			function tick() { sweep(); arm(); }
			onSectionFrame(group, tick);
			window.addEventListener('resize', tick);
			window.addEventListener('load', tick);
			tick();
		});
	}

	function initTear() {
		Array.prototype.forEach.call(doc.querySelectorAll('[data-st-tear]'), function (stage) {
			var last = '';
			var promoted = false;
			var panel = stage.querySelector('.st-tear__panel--b');
			var media = panel && panel.querySelector('.st-tear__media');
			var label = panel && panel.querySelector('.st-tear__label');
			var seam = stage.querySelector('.st-tear__seam');
			function update() {
				if (!ST.useMotion) { return; }
				var r = stage.getBoundingClientRect(), vh = window.innerHeight;
				var visible = r.bottom >= 0 && r.top <= vh;
				if (promoted !== visible) {
					promoted = visible;
					writeScrollFrame(function () {
						if (panel) { panel.style.willChange = visible ? 'transform' : ''; }
						if (media) { media.style.willChange = visible ? 'transform' : ''; }
					});
				}
				if (!visible) { return; }
				var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
				var amp = Math.min(window.innerWidth * 0.055, 78);
				var value = ((p - 0.5) * 2 * amp).toFixed(1);
				var vertical = window.innerWidth <= 767;
				var key = value + ':' + vertical;
				if (last === key) { return; } last = key;
				writeScrollFrame(function () {
					if (panel) { panel.style.transform = vertical ? 'translate3d(0,' + value + 'px,0)' : 'translate3d(' + value + 'px,0,0)'; }
					var inverse = vertical ? 'translate3d(0,' + (-value) + 'px,0)' : 'translate3d(' + (-value) + 'px,0,0)';
					if (media) { media.style.transform = inverse; }
					if (label) { label.style.transform = inverse; }
					if (seam) { seam.style.transform = vertical ? 'none' : 'translate3d(calc(-50% + ' + value + 'px),0,0)'; }
				});
			}
			onSectionFrame(stage, update);
			window.addEventListener('resize', update);
			update();
		});
	}

	/* ----------------------------------------------------------------------
	   8-4. MOTION — 스크롤이 유기적 마스크를 키운다
	   --------------------------------------------------------------------------
	   움직이는 값은 --st-type-p (0~1) 하나뿐이고, 크기 계산은 CSS 가 맡는다.
	   트랙 높이는 data-scroll(%) 로 정한다 — 이 높이가 곧 여는 데 드는 스크롤 양.
	   ---------------------------------------------------------------------- */
	function initType() {
		var tracks = doc.querySelectorAll('[data-st-type]');
		if (!tracks.length) { return; }

		Array.prototype.forEach.call(tracks, function (track) {
			var stage = track.querySelector('.st-type__stage');
			if (!stage) { return; }
			var unusedDefs = track.querySelector('.st-type__defs');
			if (unusedDefs) { unusedDefs.remove(); }
			var last = '';
			var cover = null;
			var coverPath = null;
			var letterPath = '';
			var shade = null;
			var lead = track.querySelector('.st-type__lead');
			var stageWidth = 0, stageHeight = 0;
			var masked = track.querySelector('.st-type__mask');
			// 글자 마스크의 원본 크기. 기본은 SERAPHIN(3402.17 x 875), store-content.js 에서 다른 마스크를 넣으면 그 크기.
			var maskW = parseFloat(masked && masked.getAttribute('data-st-mask-w')) || 3402.17;
			var maskH = parseFloat(masked && masked.getAttribute('data-st-mask-h')) || 875;
			// Rasterize a still cut-out once. Transform its overlay instead of remasking
			// every decoded video frame with a continuously changing mask-size.
			if (ST.useMotion && masked) {
				var maskImage = getComputedStyle(masked).maskImage || getComputedStyle(masked).webkitMaskImage;
				var match = maskImage && maskImage.match(/url\("(data:image\/svg\+xml,[^"]+)"\)/);
				if (match) {
					try {
						var sourceSvg = new DOMParser().parseFromString(decodeURIComponent(match[1].split(',').slice(1).join(',')), 'image/svg+xml');
						var sourcePath = sourceSvg.querySelector('path');
						if (sourcePath) {
							var ns = 'http://www.w3.org/2000/svg';
							function svgNode(name, attrs) { var node = doc.createElementNS(ns, name); Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); }); return node; }
							cover = svgNode('svg', { 'class': 'st-type__cover', 'aria-hidden': 'true', 'focusable': 'false' });
							letterPath = sourcePath.getAttribute('d');
							// An even-odd path cuts out the letters without any SVG filter/mask surface.
							coverPath = svgNode('path', { fill: 'var(--st-bg, #fff9f7)', 'fill-rule': 'evenodd' });
							cover.appendChild(coverPath);
							stage.insertBefore(cover, stage.firstChild);
							shade = doc.createElement('div');
							shade.className = 'st-type__shade'; shade.setAttribute('aria-hidden', 'true'); stage.appendChild(shade);
							track.classList.add('st-type-composited');
						}
					} catch (e) { cover = null; }
				}
			}

			function layout() {
				var pct = parseFloat(track.dataset.scroll || '160');
				track.style.height = (100 + pct) + 'svh';
				stageWidth = stage.clientWidth; stageHeight = stage.clientHeight;
				if (cover) {
					var base = window.innerWidth <= 1024 ? 0.76 : 0.65;
					var scale = window.innerWidth * base / maskW;
					cover.setAttribute('viewBox', '0 0 ' + stageWidth + ' ' + stageHeight);
					var x = (stageWidth - maskW * scale) / 2, y = (stageHeight - maskH * scale) / 2;
					var left = -x / scale - 2, top = -y / scale - 2, right = (stageWidth - x) / scale + 2, bottom = (stageHeight - y) / scale + 2;
					coverPath.setAttribute('d', 'M' + left + ' ' + top + 'H' + right + 'V' + bottom + 'H' + left + 'Z ' + letterPath);
					coverPath.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + scale + ')');
				}
				last = '';
			}

			function update() {
				var r = track.getBoundingClientRect();
				var travel = r.height - stage.offsetHeight;
				if (travel <= 0) { track.style.setProperty('--st-type-p', 1); return; }
				var p = -r.top / travel;
				p = Math.max(0, Math.min(1, p));
				var value = p.toFixed(4);
				if (value === last) { return; } last = value;
				writeScrollFrame(function () {
					if (!cover) { track.style.setProperty('--st-type-p', value); }
					if (cover) {
						if (lead) { lead.style.opacity = Math.max(0, 1 - p * 2.6).toFixed(4); lead.style.transform = 'translate3d(0,' + (-18 * p).toFixed(2) + 'px,0)'; }
						shade.style.opacity = Math.min(1, p * 1.6).toFixed(4);
						var ratio = window.innerWidth <= 1024 ? 540 / 76 : 445 / 65;
						cover.style.transform = 'scale(' + (1 + p * ratio).toFixed(4) + ')';
						cover.style.opacity = Math.max(0, Math.min(1, (0.96 - p) / 0.24)).toFixed(4);
					}
				});
			}

			layout();
			onSectionFrame(track, update);
			window.addEventListener('resize', function () { layout(); update(); });
			update();
		});
	}

	/* ----------------------------------------------------------------------
	   9. 스크롤 진행 레일 — 우측에 현재 섹션 표시
	   ---------------------------------------------------------------------- */
	function initRail() {
		if (ST.isMobile) { return; }
		var sections = doc.querySelectorAll('#contents .st-num');
		if (sections.length < 3) { return; }

		var rail = doc.createElement('nav');
		rail.className = 'st-rail';
		rail.setAttribute('aria-label', '섹션 바로가기');

		Array.prototype.forEach.call(sections, function (sec, i) {
			var label = sec.querySelector('.main_title_txt01');
			var dot = doc.createElement('button');
			dot.type = 'button';
			dot.className = 'st-rail__dot';
			dot.innerHTML = '<i></i><span>' + (i + 1 < 10 ? '0' : '') + (i + 1) +
				(label ? '. ' + label.textContent.trim() : '') + '</span>';
			dot.addEventListener('click', function () {
				var top = sec.getBoundingClientRect().top + window.scrollY - 80;
				if (window.stLenis) { window.stLenis.scrollTo(top); }
				else { window.scrollTo({ top: top, behavior: 'smooth' }); }
			});
			rail.appendChild(dot);
		});
		doc.body.appendChild(rail);

		var dots = rail.querySelectorAll('.st-rail__dot');
		var tops = [], previous = -1;
		function measure() {
			tops = Array.prototype.map.call(sections, function (sec) { return sec.getBoundingClientRect().top + window.scrollY; });
			update();
		}
		function update() {
			var mid = window.scrollY + window.innerHeight * 0.4, active = 0;
			for (var i = 0; i < tops.length; i++) { if (tops[i] <= mid) { active = i; } }
			if (active === previous) { return; } previous = active;
			writeScrollFrame(function () { for (var j = 0; j < dots.length; j++) { dots[j].classList.toggle('is-active', j === active); } });
		}
		onScrollFrame(update);
		window.addEventListener('load', measure);
		window.addEventListener('resize', measure);
		if (window.ScrollTrigger) { window.ScrollTrigger.addEventListener('refresh', measure); }
		if ('ResizeObserver' in window) { new ResizeObserver(measure).observe(doc.getElementById('contents')); }
		measure();
	}

	/* ----------------------------------------------------------------------
	   10. 상품 추가 이미지 — 목록 API가 추가 이미지를 내리지 않는 경우의 보완
	   ---------------------------------------------------------------------- */
	function initProductHoverImages() {
		if (ST.isMobile || !window.fetch || !window.DOMParser) { return; }
		var cards = doc.querySelectorAll('#contents .ec-base-product .prdList > li');
		var cache = {};

		function attach(card) {
			if (card.dataset.stHoverState) { return; }
			var link = card.querySelector('.thumbnail > a[href]');
			if (!link) { return; }
			var existing = card.querySelector('.thumbnail .prdList__hover img');
			if (existing) { card.dataset.stHoverState = 'ready'; return; }
			card.dataset.stHoverState = 'loading';

			function getImageUrl() {
				if (cache[link.href]) { return Promise.resolve(cache[link.href]); }
				return fetch(link.href, { credentials:'same-origin' })
					.then(function (response) { return response.text(); })
					.then(function (html) {
						var page = new DOMParser().parseFromString(html, 'text/html');
						var image = page.querySelector('img[src*="/product/extra/"]');
						var url = image ? image.getAttribute('src') : '';
						if (!url) { throw new Error('No additional image'); }
						url = new URL(url, link.href).href;
						cache[link.href] = url;
						return url;
					});
			}

			getImageUrl().then(function (url) {
				var image = new Image();
				image.alt = '';
				image.onload = function () {
					var wrap = card.querySelector('.thumbnail .prdList__hover');
					if (!wrap) {
						wrap = doc.createElement('span');
						wrap.className = 'prdList__hover';
						link.appendChild(wrap);
					}
					wrap.style.opacity = '0';
					wrap.appendChild(image);
					window.requestAnimationFrame(function () {
						window.requestAnimationFrame(function () { wrap.style.opacity = ''; });
					});
					card.dataset.stHoverState = 'ready';
				};
				image.onerror = function () { card.dataset.stHoverState = 'failed'; };
				image.src = url;
			}).catch(function () { card.dataset.stHoverState = 'failed'; });
		}

		Array.prototype.forEach.call(cards, function (card) {
			card.addEventListener('mouseenter', function () { attach(card); }, { once:true });
			card.addEventListener('focusin', function () { attach(card); }, { once:true });
		});
	}

	/* ----------------------------------------------------------------------
	   상품 목록 할인율                                DO NOT EDIT - DESIGN SYSTEM
	   ----------------------------------------------------------------------
	   카페24가 상품 카드의 .description 에 소비자가(ec-data-custom)와
	   판매가(ec-data-price)를 숫자로 그대로 실어 준다. 화면의 글자를 긁지 않고
	   이 두 값으로 할인율을 계산해, 취소선이 그어진 소비자가 바로 뒤에 붙인다.

	   소비자가가 판매가보다 높을 때만 붙는다 — 두 값이 같은(=할인 없는) 상품은
	   아무것도 그리지 않는다. 메인·카테고리·검색 등 카페24 상품 목록이면
	   모두 같은 구조라 한 군데서 처리된다.
	   ---------------------------------------------------------------------- */
	function initDiscountRate() {
		var RATE_CLASS = 'st-rate';

		function num(value) {
			var digits = String(value == null ? '' : value).replace(/[^0-9]/g, '');
			return digits ? parseInt(digits, 10) : 0;
		}

		// 취소선이 그어진 소비자가 <span> 을 찾는다. 인라인 style 문자열에
		// 기대지 않고 실제로 계산된 값을 본다(관리자가 서체 설정을 바꿔도 견딘다).
		function findStruck(box) {
			var spans = box.querySelectorAll('.spec li span');
			for (var i = 0; i < spans.length; i++) {
				var style = window.getComputedStyle(spans[i]);
				var line = style.textDecorationLine || style.textDecoration || '';
				if (line.indexOf('line-through') > -1) { return spans[i]; }
			}
			return null;
		}

		function mark(box) {
			if (box.querySelector('.' + RATE_CLASS)) { return; }

			var custom = num(box.getAttribute('ec-data-custom'));	// 소비자가
			var price  = num(box.getAttribute('ec-data-price'));	// 판매가
			if (!custom || !price || custom <= price) { return; }

			var rate = Math.round((custom - price) / custom * 100);
			if (rate < 1) { return; }

			var struck = findStruck(box);
			if (!struck) { return; }

			var tag = doc.createElement('span');
			tag.className = RATE_CLASS;
			tag.textContent = rate + '%';
			struck.parentNode.insertBefore(tag, struck.nextSibling);
		}

		function scan(root) {
			var boxes = (root || doc).querySelectorAll('.description[ec-data-custom][ec-data-price]');
			Array.prototype.forEach.call(boxes, mark);
		}

		scan(doc);

		// 메인의 카테고리 탭 전환, 목록의 더보기처럼 카페24가 카드를 다시 그리는
		// 경우가 있다. 그때마다 새로 들어온 카드만 다시 훑는다.
		if (!window.MutationObserver) { return; }
		var contents = doc.getElementById('contents');
		if (!contents) { return; }
		var pending = null;
		new MutationObserver(function () {
			if (pending) { return; }
			pending = window.setTimeout(function () {
				pending = null;
				scan(contents);
			}, 120);
		}).observe(contents, { childList:true, subtree:true });
	}

	/* ----------------------------------------------------------------------
	   상품 상세 — 가격 블록 재조립                    DO NOT EDIT - DESIGN SYSTEM
	   ----------------------------------------------------------------------
	   카페24는 상품명·소비자가·판매가·배송정보를 한 표에 같은 굵기로 늘어놓는다.
	   읽는 순서가 없어 가격이 안 보인다. 표에서 가격 두 줄만 꺼내 제목 바로 아래
	   블록으로 다시 쌓는다 — 취소선 소비자가 / 빨강 할인율 + 큰 판매가.

	   핵심: 값을 복사하지 않고 원본 노드를 그대로 "옮긴다". 카페24가 옵션 선택 때
	   #span_product_price_text 의 내용을 갈아끼우는데, 같은 노드를 쓰므로 그 갱신이
	   그대로 살아 있다. 복사해 두면 옵션을 골라도 가격이 안 바뀐다.
	   ---------------------------------------------------------------------- */
	function initProductDetail() {
		var info = doc.querySelector('.xans-product-detail .infoArea');
		if (!info || info.querySelector('.st-pd__price')) { return; }

		var heading = info.querySelector('.headingArea');
		var custom  = doc.getElementById('span_product_price_custom');	// 소비자가
		var now     = doc.getElementById('span_product_price_text');	// 판매가
		if (!heading || !now) { return; }

		function hideRow(node) {
			var row = node && node.closest ? node.closest('tr') : null;
			if (row) { row.classList.add('st-pd-hide'); }
		}

		// 제목이 바로 위에 크게 있는데 표의 '상품명' 행이 같은 글자를 한 번 더 찍는다.
		var title = heading.querySelector('h1');
		if (title) {
			var label = title.textContent.trim();
			var rows = info.querySelectorAll('.xans-product-detaildesign tr');
			for (var i = 0; i < rows.length; i++) {
				var cell = rows[i].querySelector('td');
				if (cell && cell.textContent.trim() === label) { rows[i].classList.add('st-pd-hide'); break; }
			}
		}

		// 옮기기 전에 원래 행부터 감춘다. 먼저 옮기면 closest('tr') 가 못 찾아
		// 빈 행이 남는다.
		hideRow(now);
		if (custom) { hideRow(custom); }

		var block = doc.createElement('div');
		block.className = 'st-pd__price';

		if (custom) {
			var was = doc.createElement('div');
			was.className = 'st-pd__was';
			was.appendChild(custom);				// 복사가 아니라 이동
			block.appendChild(was);
		}

		var line = doc.createElement('div');
		line.className = 'st-pd__now';
		var rate = doc.createElement('span');
		rate.className = 'st-pd__rate';
		rate.hidden = true;
		line.appendChild(rate);

		line.appendChild(now);
		block.appendChild(line);

		heading.parentNode.insertBefore(block, heading.nextSibling);

		function digits(node) {
			if (!node) { return 0; }
			var only = node.textContent.replace(/[^0-9]/g, '');
			return only ? parseInt(only, 10) : 0;
		}

		function sync() {
			var before = digits(custom);
			var after  = digits(now);
			if (!before || !after || before <= after) { rate.hidden = true; return; }
			var percent = Math.round((before - after) / before * 100);
			if (percent < 1) { rate.hidden = true; return; }
			rate.textContent = percent + '%';
			rate.hidden = false;
		}

		sync();

		// 옵션을 고르면 카페24가 판매가를 다시 쓴다. 그때 할인율도 따라 바뀐다.
		if (window.MutationObserver) {
			new MutationObserver(sync).observe(now, { childList:true, characterData:true, subtree:true });
		}
	}

	/* ----------------------------------------------------------------------
	   게시판 상단 이동 탭 — 공지사항·자주묻는질문·포토리뷰·상품문의
	   ----------------------------------------------------------------------
	   [data-st-board-tabs] 마운트는 board/free·product·gallery 의 list.html 에
	   있다. store-content.js 의 community.items 를 읽어 pill 탭으로 채우고,
	   현재 board_no 와 같은 항목에 selected 를 붙인다. */
	function initBoardTabs() {
		var mounts = doc.querySelectorAll('[data-st-board-tabs]');
		if (!mounts.length) { return; }

		var config = window.STORE_CONTENT || {};
		var items = (config.community && config.community.items) || [];
		if (!items.length) { return; }

		function boardNo(link) {
			var match = /[?&]board_no=([0-9]+)/.exec(link || '');
			return match ? match[1] : '';
		}
		var currentNo = boardNo(window.location.search);

		Array.prototype.forEach.call(mounts, function (mount) {
			var list = mount.querySelector('ul') || mount;
			items.forEach(function (entry) {
				var li = doc.createElement('li');
				var a = doc.createElement('a');
				a.className = 'button';
				a.href = entry.link;
				a.textContent = entry.label;
				if (currentNo && boardNo(entry.link) === currentNo) { li.className = 'selected'; }
				li.appendChild(a);
				list.appendChild(li);
			});
		});
	}

	/* ----------------------------------------------------------------------
	   부트스트랩
	   ---------------------------------------------------------------------- */
	function boot() {
		initStoreConfig();
		initHeader();
		initLenis();
		initReveal();
		initFitTitle();
		initMarquee();
		initScrollTrigger();
		initScrollWorld();
		initTiles();
		initLazyVideos();
		initTear();
		initFlash();
		initType();
		initCursor();
		initRail();
		initProductHoverImages();
		initDiscountRate();
		initProductDetail();
		initBoardTabs();
	}

	if (doc.readyState === 'loading') {
		doc.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}

	// 창 크기 변경 시 마퀴 속도 재계산
	var rt;
	var refreshWidth = window.innerWidth;
	window.addEventListener('resize', function () {
		// Mobile browser toolbar changes height during a swipe; never refresh pins for that.
		if (window.innerWidth === refreshWidth) { return; }
		refreshWidth = window.innerWidth;
		clearTimeout(rt);
		rt = setTimeout(function () {
			ST.isMobile = window.matchMedia('(max-width:1024px)').matches;
			if (window.ScrollTrigger) { window.ScrollTrigger.refresh(); }
		}, 200);
	});
})();
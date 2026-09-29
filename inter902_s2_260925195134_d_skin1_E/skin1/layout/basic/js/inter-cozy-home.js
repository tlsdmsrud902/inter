/* inter cozy home. 실제 카페24 상품·게시판 모듈이 우선이고, 비어 있을 때만 연출 카드를 채운다. */
(function () {
  var photos = ['sq-bookshelf', 'sq-chair', 'sq-bed', 'sq-vases', 'sq-box', 'sq-pillow', 'sq-table', 'sq-wallshelf', 'sq-candle', 'sq-plant'];
  var names = ['오크 2단 오픈 책장', '부클 라운지 체어', '오크 퀸 침대 프레임', '세라믹 화병 3종', '오크 수납 박스', '워시드 리넨 베개 커버', '오크 원형 식탁', '오크 벽 선반', '오크 캔들 홀더', '필레아 화분'];

  function fillPlaceholders(root) {
    root.querySelectorAll('.cz-products').forEach(function (section) {
      var list = section.querySelector('.prdList');
      var fallback = section.querySelector('[data-cz-placeholder]');
      if (!fallback) return;
      if (list && list.querySelector('li')) { fallback.remove(); return; }
      if (list) list.closest('.ec-base-product').hidden = true;
      var count = 10;
      var offset = section.classList.contains('cz-products--best') ? 3 : 0;
      fallback.hidden = false;
      fallback.innerHTML = Array.from({ length: count }, function (_, i) {
        var k = (i + offset) % photos.length;
        return '<a class="cz-ph" href="/product/search.html"><figure><img src="/SkinImg/inter/' + photos[k] +
          '.webp" alt="" loading="lazy"><span>준비 중</span></figure><strong>' + names[k] + '</strong><small>상품 준비 중 · 연출 이미지</small></a>';
      }).join('');
    });
  }

  function initFinder(root) {
    var form = root.querySelector('.cz-finder__form');
    if (!form) return;
    // 공간(거실 · 침실) × 필요한 것(수납 · 휴식 · 분위기) → 검색어
    var keywords = {
      living: { storage: '책장', rest: '체어', mood: '화병' },
      bedroom: { storage: '사이드 테이블', rest: '침대', mood: '캔들' }
    };
    var labels = { storage: '깔끔한 수납을', rest: '편안한 휴식을', mood: '따뜻한 분위기를' };
    var rooms = { living: '거실', bedroom: '침실' };
    function update() {
      var room = form.querySelector('[name=inter]:checked').value === 'bedroom' ? 'bedroom' : 'living';
      var moment = form.querySelector('[name=moment]:checked').value;
      var word = keywords[room][moment] || '책장';
      form.querySelector('[name=keyword]').value = word;
      var out = form.querySelector('[data-finder-result]');
      out.textContent = '';
      out.append(rooms[room] + '에서 ' + (labels[moment] || '') + ' 위한 ');
      var last = word.charCodeAt(word.length - 1) - 0xac00;
      var b = document.createElement('b'); b.textContent = word; out.append(b, (last >= 0 && last % 28 ? '을' : '를') + ' 추천해요.');
    }
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); update();
      location.href = '/product/search.html?keyword=' + encodeURIComponent(form.querySelector('[name=keyword]').value);
    });
    update();
  }

  function initHotspots(root) {
    var spots = Array.from(root.querySelectorAll('.cz-hotspot'));
    function closeAll(except) {
      spots.forEach(function (b) {
        if (b === except) return;
        b.setAttribute('aria-expanded', 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = true;
      });
    }
    spots.forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        closeAll(b);
        b.setAttribute('aria-expanded', String(open));
        document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  }

  function initStarter(root) {
    var list = root.querySelector('[data-starter-list]');
    if (!list) return;
    var status = root.querySelector('[data-starter-status]');
    var bar = root.querySelector('[data-starter-bar]');
    var inter = 'living', saved = { living: [], bedroom: [] }, persisted = true;
    try { var data = JSON.parse(localStorage.getItem('inter-starter-v1')); if (data && Array.isArray(data.living) && Array.isArray(data.bedroom)) saved = data; } catch (e) {}
    // 준비물 목록은 HTML 의 [data-starter-items] (게시판 화면 관리로 바꿀 수 있다)
    var items = {
      living: ['소파 또는 라운지 체어', '책장 · 수납장', '러그', '사이드 테이블', '조명', '커튼'],
      bedroom: ['침대 프레임', '매트리스', '리넨 침구', '베개 · 베개 커버', '협탁', '암막 커튼']
    };
    function readItems() {
      root.querySelectorAll('[data-starter-items]').forEach(function (el) {
        var list = el.textContent.split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
        if (list.length) items[el.getAttribute('data-starter-items')] = list;
      });
      ['living', 'bedroom'].forEach(function (k) { saved[k] = saved[k].filter(function (n) { return n < items[k].length; }); });
    }
    readItems();
    function update() {
      var done = saved[inter].length, total = items[inter].length;
      try { localStorage.setItem('inter-starter-v1', JSON.stringify(saved)); } catch (e) { persisted = false; }
      status.textContent = done + ' / ' + total + ' 준비 완료' + (done === total ? ' · 새 집 준비가 끝났어요!' : persisted ? ' · 이 기기에 저장돼요' : ' · 지금 화면에서만 유지돼요');
      if (bar) bar.style.width = (done / total * 100) + '%';
    }
    function render() {
      list.innerHTML = '';
      items[inter].forEach(function (name, i) {
        var row = document.createElement('label'), input = document.createElement('input'), mark = document.createElement('i'), text = document.createElement('span'), link = document.createElement('a');
        input.type = 'checkbox'; input.checked = saved[inter].indexOf(i) > -1;
        text.textContent = name; link.textContent = '보러 가기'; link.href = '/product/search.html?keyword=' + encodeURIComponent(name);
        input.addEventListener('change', function () {
          saved[inter] = saved[inter].filter(function (n) { return n !== i; });
          if (input.checked) saved[inter].push(i);
          update();
        });
        row.append(input, mark, text, link); list.appendChild(row);
      });
      update();
    }
    root.querySelectorAll('[data-starter-inter]').forEach(function (button) {
      button.addEventListener('click', function () {
        inter = button.dataset.starterInter;
        root.querySelectorAll('[data-starter-inter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
        render();
      });
    });
    root.querySelector('[data-starter-reset]').addEventListener('click', function () { saved[inter] = []; render(); });
    document.addEventListener('inter:cms', function () { readItems(); render(); });
    render();
  }

  function initRails(root) {
    root.querySelectorAll('.cz-products--rail').forEach(function (section) {
      section.querySelectorAll('[data-rail]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var track = section.querySelector('.ec-base-product:not([hidden]) .prdList') || section.querySelector('.cz-placeholder:not([hidden])');
          if (!track) return;
          var card = track.firstElementChild;
          var step = card ? card.getBoundingClientRect().width + 20 : 300;
          if (section.classList.contains('is-pinned')) window.scrollBy({ top: step * 2 * Number(btn.dataset.rail), behavior: 'smooth' });
          else track.scrollBy({ left: step * 2 * Number(btn.dataset.rail), behavior: 'smooth' });
        });
      });
    });
  }

  /* 스크롤 히어로 : 스크롤 위치에 따라 영상(또는 사진) → 3장의 사진으로 넘어간다 */
  // 스크롤 연동 공통 : 아이폰 관성 스크롤에서 떨리지 않게
  //  1) 위치(시작점·거리)는 처음 · 폭이 바뀔 때만 재고, 스크롤 중에는 scrollY 만 읽는다 (매 프레임 레이아웃 계산 없음)
  //  2) 화면 값은 목표값을 부드럽게 따라간다(lerp) : 스크롤 값이 띄엄띄엄 들어와도 움직임이 끊기지 않는다
  function scrollFollower(measure, target, draw) {
    var cur = null, drawn = null, running = false, lastW = window.innerWidth, t = null;
    function loop() {
      var goal = target();
      if (cur === null) cur = goal;
      cur += (goal - cur) * 0.2;
      if (Math.abs(goal - cur) < 0.0004) cur = goal;
      // 값이 그대로면 아무것도 쓰지 않는다 : 화면 밖 섹션은 스크롤해도 스타일을 건드리지 않는다
      if (cur !== drawn) { drawn = cur; draw(cur); }
      if (cur !== goal) requestAnimationFrame(loop); else running = false;
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function remeasure() { clearTimeout(t); t = setTimeout(function () { measure(); drawn = null; kick(); }, 120); }
    measure();
    window.addEventListener('scroll', kick, { passive: true });
    // 아이폰 주소창이 접히며 생기는 세로 크기 변화는 무시하고, 폭이 바뀔 때만 다시 잰다
    window.addEventListener('resize', function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; remeasure(); } else kick(); });
    window.addEventListener('load', remeasure);
    window.addEventListener('cz:head', remeasure);   // 띠배너를 닫아 헤더 위치가 바뀌면 다시 잰다
    return { kick: kick, remeasure: remeasure, jump: function (v) { cur = drawn = v; draw(v); } };
  }

  function initWorldHero(root) {
    var track = root.querySelector('[data-scroll-hero]');
    if (!track) return;
    var hero = track.querySelector('.pe-hero');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var images = Array.from(track.querySelectorAll('[data-world-image]'));
    var copies = Array.from(track.querySelectorAll('[data-world-copy]'));
    var route = Array.from(track.querySelectorAll('[data-world-jump]'));
    var label = track.querySelector('.pe-image-label');
    var labels = ['inter HOME / 01', 'THE DINING COLLECTION / 02', 'THE BEDROOM COLLECTION / 03'];
    var video = track.querySelector('.pe-world-video');
    if (video) {
      video.muted = true; video.defaultMuted = true; video.setAttribute('muted', '');
      var play = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
      video.addEventListener('canplay', play, { once: true }); play();
    }
    var clamp = function (n) { return Math.max(0, Math.min(1, n)); };
    var smooth = function (n) { n = clamp(n); return n * n * (3 - 2 * n); };
    var last = images.length - 1, active = -1;
    // --hero-progress 는 쓰는 곳(사진 위 덮개, 진행 막대)에만 넣는다. 히어로 전체에 넣으면 영상·사진까지 매 프레임 스타일을 다시 계산해 아이폰에서 떨린다
    var progressEls = [track.querySelector('.pe-hero__visual'), track.querySelector('.pe-hero-scroll i')].filter(Boolean);
    function drawScene(position) {
      var index = Math.min(last, Math.floor(position + .5));
      var prog = (position / Math.max(1, last)).toFixed(4);
      progressEls.forEach(function (el) { el.style.setProperty('--hero-progress', prog); });
      images.forEach(function (img, i) {
        img.style.opacity = (1 - smooth((Math.abs(position - i) - .28) / .44)).toFixed(3);
        img.style.transform = reduce.matches ? 'none' : 'translate3d(0,0,0) scale(' + (1.02 + clamp(position - i + .5) * .09).toFixed(4) + ')';
      });
      copies.forEach(function (copy, i) {
        copy.style.opacity = (1 - smooth((Math.abs(position - i) - .22) / .35)).toFixed(3);
        copy.style.transform = reduce.matches ? 'none' : 'translate3d(0,' + ((i - position) * 24).toFixed(2) + 'px,0)';
      });
      if (index !== active) {
        active = index;
        images.forEach(function (img, i) {
          img.setAttribute('aria-hidden', String(i !== index));
          if (img.tagName === 'VIDEO') { if (i === index) { var p = img.play(); if (p && p.catch) p.catch(function () {}); } else img.pause(); }
        });
        copies.forEach(function (copy, i) {
          copy.style.pointerEvents = i === index ? 'auto' : 'none';
          copy.inert = i !== index;
          copy.setAttribute('aria-hidden', String(i !== index));
        });
        route.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === index)); });
        if (label) label.textContent = labels[index];
      }
    }
    var m = { start: 0, dist: 1 };
    var follow = scrollFollower(function () {
      var top = parseFloat(getComputedStyle(hero).top) || 0;
      m.start = track.getBoundingClientRect().top + window.scrollY - top;
      m.dist = Math.max(1, track.offsetHeight - hero.offsetHeight);
    }, function () {
      return reduce.matches ? 0 : clamp((window.scrollY - m.start) / m.dist) * Math.max(1, last);
    }, drawScene);
    route.forEach(function (button, i) {
      button.addEventListener('click', function () {
        if (reduce.matches) { follow.jump(i); return; }
        window.scrollTo({ top: Math.max(0, m.start + m.dist * i / Math.max(1, route.length - 1)), behavior: 'smooth' });
      });
    });
    if ('ResizeObserver' in window) new ResizeObserver(follow.remeasure).observe(track);
    reduce.addEventListener('change', function () { follow.jump(0); follow.kick(); });
  }

  /* Scroll World (이미지 전용) : 섹션을 스크롤하는 동안 장면마다 카메라가 날아 들어갔다가(가까워짐) 지나간다.
     레이어의 data-depth 가 클수록 더 빠르게 커지고 바깥으로 밀려나며, 마우스를 따라 더 크게 움직인다. */
  function initWorld(root) {
    var sec = root.querySelector('.cz-world');
    if (!sec) return;
    var stage = sec.querySelector('.cz-world__stage');
    var scenes = Array.from(sec.querySelectorAll('.cz-world__scene'));
    var copies = Array.from(sec.querySelectorAll('.cz-world__copy'));
    var route = Array.from(sec.querySelectorAll('[data-world-go]'));
    var N = scenes.length, SPAN = N - 0.35;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    sec.style.setProperty('--cz-world-n', N);
    var layers = scenes.map(function (scene) {
      return Array.from(scene.children).map(function (el, k) {
        return { el: el, d: parseFloat(el.dataset.depth || '1'), r: parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0, seed: k * 1.7, ox: 0, oy: 0 };
      });
    });
    var mx = 0, my = 0, tx = 0, ty = 0, visible = false, active = -1, raf = 0;
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

    function measure() {
      var head = document.getElementById('header');
      var h = head ? Math.max(0, Math.round(head.getBoundingClientRect().bottom)) : 0;
      root.style.setProperty('--cz-head', h + 'px');
      var w = stage.clientWidth, hh = stage.clientHeight;
      layers.forEach(function (list) {
        list.forEach(function (L) {
          var cs = getComputedStyle(L.el);
          L.ox = (parseFloat(cs.left) || w / 2) - w / 2;
          L.oy = (parseFloat(cs.top) || hh / 2) - hh / 2;
        });
      });
    }
    function scaleFor(z, d) {
      if (z < 0) return Math.max(0.3, 1 + z * 0.95 * Math.min(d, 1.4));
      if (z < 0.62) return 1 + z * 0.18 * d;
      return 1 + 0.1116 * d + (z - 0.62) * 2.6 * d;
    }
    function draw(time) {
      raf = 0;
      var rect = sec.getBoundingClientRect();
      var travel = Math.max(1, sec.offsetHeight - stage.offsetHeight);
      var head = parseFloat(getComputedStyle(root).getPropertyValue('--cz-head')) || 0;
      var P = clamp((head - rect.top) / travel, 0, 1);
      sec.style.setProperty('--cz-world-p', P.toFixed(4));
      tx += (mx - tx) * 0.08; ty += (my - ty) * 0.08;
      var pos = P * SPAN, now = time || 0;
      scenes.forEach(function (scene, i) {
        var z = pos - i, last = i === N - 1;
        scene.style.opacity = clamp((z + 0.3) / 0.3, 0, 1).toFixed(3);
        var on = z > -0.3 && (last || z < 1);
        scene.classList.toggle('is-on', on);
        scene.setAttribute('aria-hidden', String(!(z > -0.2 && (last || z < 0.8))));
        if (!on) return;
        layers[i].forEach(function (L) {
          var zz = last ? Math.min(z, 0.62) : z;
          var s = scaleFor(zz, L.d);
          var o = zz < -0.45 ? 0 : zz < 0 ? (zz + 0.45) / 0.45 : zz < 0.72 ? 1 : Math.max(0, 1 - (zz - 0.72) / 0.28);
          var push = (s - 1) * 0.55;
          var bob = L.d > 1 ? Math.sin(now * 0.0012 + L.seed) * 5 * L.d : 0;
          var dx = L.ox * push + tx * L.d * 16, dy = L.oy * push + ty * L.d * 10 + bob;
          L.el.style.opacity = o.toFixed(3);
          L.el.style.transform = 'translate(-50%,-50%) translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + s.toFixed(4) + ') rotate(' + L.r + 'deg)';
        });
      });
      copies.forEach(function (copy, i) {
        var z = pos - i, last = i === N - 1;
        var o = clamp((z + 0.12) / 0.2, 0, 1) * (last ? 1 : clamp((0.72 - z) / 0.16, 0, 1));
        copy.style.opacity = o.toFixed(3);
        copy.style.setProperty('--cz-copy-y', ((1 - o) * 24).toFixed(1) + 'px');
        copy.classList.toggle('is-on', o > 0.5);
        copy.inert = o < 0.5;
        copy.setAttribute('aria-hidden', String(o < 0.5));
      });
      var idx = clamp(Math.round(pos - 0.2), 0, N - 1);
      if (idx !== active) { active = idx; route.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === idx)); }); }
      if (visible && (fine || Math.abs(mx - tx) > 0.001)) raf = requestAnimationFrame(draw);
    }
    function request() { if (!raf) raf = requestAnimationFrame(draw); }

    if (reduce.matches) return;
    measure();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', function () { measure(); request(); }, { passive: true });
    if (fine) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2; request();
      });
      stage.addEventListener('pointerleave', function () { mx = 0; my = 0; request(); });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { measure(); request(); } }).observe(sec);
    } else { visible = true; }
    route.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        var head = parseFloat(getComputedStyle(root).getPropertyValue('--cz-head')) || 0;
        var top = sec.getBoundingClientRect().top + window.scrollY - head;
        var travel = sec.offsetHeight - stage.offsetHeight;
        window.scrollTo({ top: top + travel * Math.min(1, (i + 0.2) / SPAN), behavior: 'smooth' });
      });
    });
    request();
  }

  /* 이벤트 레이어 팝업 : 4초마다 다음 장으로, 오늘 하루 닫기는 자정까지 localStorage 에 기억 */
  function initPopup() {
    var pop = document.getElementById('cz-pop');
    if (!pop) return;
    var KEY = 'inter-pop-hide-until';
    var editing = /[?&]edit=1/.test(location.search); // 편집 모드에서는 '오늘 하루 닫기'와 상관없이 띄운다
    try { if (!editing && Number(localStorage.getItem(KEY)) > Date.now()) return; } catch (e) {}
    // 게시판 화면 관리(inter-cms.js)의 '이벤트 팝업' 글이 들어온 뒤에 그린다
    if (window.INTER_CMS && !pop.__cmsWaited) { pop.__cmsWaited = true; window.INTER_CMS.ready(initPopup, 900); return; }
    var SC = window.STORE_CONTENT || {}, cfg = SC.popup;
    if (cfg && cfg.enabled === false) return;
    var track = pop.querySelector('.cz-pop__track');
    // store-content.js 의 popup.slides 로 팝업 장을 다시 그린다 (없으면 HTML 기본값 그대로)
    if (cfg && cfg.slides && cfg.slides.length) {
      var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
      var saleEnd = (SC.sale && SC.sale.timer && SC.sale.timer.endAt) || '';
      track.innerHTML = cfg.slides.map(function (s) {
        var timed = s.type === 'timer';
        return '<a class="cz-pop__slide' + (timed ? ' cz-pop__slide--timer' : '') + '" href="' + esc(s.link || '#') + '">'
          + '<div class="cz-pop__img"><img src="' + esc(s.image) + '" alt="' + esc(s.imageAlt) + '"' + (s.imagePosition ? ' style="object-position:' + esc(s.imagePosition) + '"' : '') + '>'
          + (s.badge ? '<span class="cz-pop__badge">' + esc(s.badge) + '</span>' : '')
          + (timed ? '<div class="cz-pop__timer" data-end="' + esc(s.endAt || saleEnd) + '" data-ended="' + esc(s.endedText || '이벤트가 종료되었습니다') + '"><span class="cz-pop__tlab"><i></i>' + esc(s.timerLabel || '이벤트 마감까지') + '</span><span class="cz-pop__tval"></span></div>' : '')
          + '</div><div class="cz-pop__txt">'
          + (s.kicker ? '<small>' + esc(s.kicker) + '</small>' : '') + (s.title ? '<strong>' + esc(s.title) + '</strong>' : '')
          + (s.text ? '<p>' + esc(s.text) + '</p>' : '') + (s.button ? '<em>' + esc(s.button) + '</em>' : '')
          + '</div></a>';
      }).join('');
      var dotBox = pop.querySelector('.cz-pop__dots');
      if (dotBox) dotBox.innerHTML = cfg.slides.map(function (s, k) { return '<button type="button" aria-label="' + (k + 1) + '번 이벤트" aria-current="' + (k === 0) + '"></button>'; }).join('');
    }
    // 타이머 팝업 : 남은 시간을 1초마다 갱신
    var clocks = Array.from(pop.querySelectorAll('.cz-pop__timer'));
    function parseEnd(s) { var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], (m[4] || 23) - 9, m[5] || 59) : NaN; }
    function tick() {
      var now = Date.now();
      clocks.forEach(function (el) {
        var end = parseEnd(el.getAttribute('data-end')), out = el.querySelector('.cz-pop__tval');
        if (isNaN(end)) { el.hidden = true; return; }
        var left = Math.max(0, Math.floor((end - now) / 1000));
        if (!left) { el.classList.add('is-ended'); out.textContent = el.getAttribute('data-ended'); return; }
        var d = Math.floor(left / 86400), p = function (v) { return (v < 10 ? '0' : '') + v; };
        out.innerHTML = '<b>' + d + '</b><small>일</small><b>' + p(Math.floor(left % 86400 / 3600)) + '</b>:<b>' + p(Math.floor(left % 3600 / 60)) + '</b>:<b>' + p(left % 60) + '</b>';
      });
    }
    if (clocks.length) { tick(); setInterval(tick, 1000); }
    var dots = Array.from(pop.querySelectorAll('.cz-pop__dots button'));
    var n = pop.querySelectorAll('.cz-pop__slide').length, cur = 0, timer = null;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var gap = cfg && cfg.interval != null ? Number(cfg.interval) * 1000 : 4000;
    function go(i) {
      cur = (i + n) % n;
      track.style.transform = 'translateX(' + (-100 * cur) + '%)';
      dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === cur)); });
    }
    function play() { stop(); if (!reduce && n > 1 && gap > 0) timer = setInterval(function () { go(cur + 1); }, gap); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    function close() { stop(); pop.hidden = true; document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); play(); }); });
    pop.querySelector('[data-pop-close]').addEventListener('click', close);
    pop.querySelector('[data-pop-today]').addEventListener('click', function () {
      var end = new Date(); end.setHours(24, 0, 0, 0);
      try { localStorage.setItem(KEY, String(end.getTime())); } catch (e) {}
      close();
    });
    pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
    pop.addEventListener('mouseenter', stop); pop.addEventListener('mouseleave', play);
    document.addEventListener('keydown', onKey);
    function open() {
      // 첫 방문 인트로(로고 화면)가 끝난 뒤에 띄운다
      if (document.documentElement.classList.contains('st-intro-on')) { setTimeout(open, 800); return; }
      pop.hidden = false; go(0); play();
    }
    setTimeout(open, cfg && cfg.delay != null ? Number(cfg.delay) * 1000 : 1200);
  }

  function initMisc(root) {
    var free = root.querySelector('[data-free-over]'), ship = (window.STORE_CONTENT || {}).shipping;
    if (free && ship && ship.freeBar !== false && ship.freeOver > 0) {
      free.textContent = (ship.freeOver % 10000 === 0 ? ship.freeOver / 10000 + '만원' : ship.freeOver.toLocaleString('ko-KR') + '원') + ' 이상 무료배송 · ';
      free.hidden = false;
    } else if (free) free.hidden = true;   // 무료배송 안내를 끄면 HTML 기본 문구도 숨긴다
  }

  // 신상품 : 섹션을 화면에 고정하고, 고정된 동안 내린 거리만큼 상품 줄을 가로로 민다
  //  · 무대(stage)는 콘텐츠 높이만큼만 차지하고 화면 세로 가운데에 멈춘다 → 섹션 위아래에 빈 공간이 생기지 않는다
  function initRailPin(root) {
    var pin = root.querySelector('[data-rail-pin]');
    if (!pin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var section = pin.closest('.cz-products--pin'), stage = pin.querySelector('.cz-pin__stage');
    var now = pin.querySelector('[data-rail-now]'), total = pin.querySelector('[data-rail-total]');
    var bar = pin.querySelector('.cz-pin__bar i');
    var track = null, items = [], lead = -1;
    // 위치는 상품 줄(track)과 진행 막대에만 직접 넣는다. 섹션 전체에 CSS 변수를 넣으면 카드 10장을 매 프레임 다시 계산해 아이폰에서 떨린다
    function setX(x) { if (track) track.style.setProperty('transform', 'translate3d(' + (-x).toFixed(1) + 'px,0,0)', 'important'); }
    function setP(p) { if (bar) bar.style.setProperty('transform', 'scaleX(' + Math.max(0.04, p).toFixed(3) + ')'); }
    var m = { start: 0, dist: 0 };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    function measure() {
      track = section.querySelector('.ec-base-product:not([hidden]) .prdList') || section.querySelector('.cz-placeholder:not([hidden])');
      if (!track) return;
      section.classList.add('is-pinned');
      setX(0);
      items = Array.from(track.children);
      m.dist = Math.max(0, track.scrollWidth - track.clientWidth);
      if (m.dist < 8) { section.classList.remove('is-pinned'); pin.style.height = ''; m.dist = 0; track.style.removeProperty('transform'); return; }
      var hd = document.getElementById('header'), head = hd ? Math.round(hd.getBoundingClientRect().bottom) : 90;
      var vh = document.documentElement.clientHeight;
      var top = Math.max(head, Math.round(head + (vh - head - stage.offsetHeight) / 2));
      section.style.setProperty('--cz-stage-top', top + 'px');
      pin.style.height = (stage.offsetHeight + m.dist) + 'px';
      m.start = pin.getBoundingClientRect().top + window.scrollY - top;
      if (total) total.textContent = pad(items.length);
    }
    function target() { return m.dist ? Math.min(1, Math.max(0, (window.scrollY - m.start) / m.dist)) : 0; }
    function draw(p) {
      if (!m.dist) return;
      setX(p * m.dist);
      setP(p);
      var i = Math.round(p * (items.length - 1));
      if (i !== lead) {
        if (now) now.textContent = pad(i + 1);
        if (items[lead]) items[lead].classList.remove('is-lead');
        if (items[i]) items[i].classList.add('is-lead');
        lead = i;
      }
    }
    var follow = scrollFollower(measure, target, draw);
    if ('ResizeObserver' in window && track) new ResizeObserver(follow.remeasure).observe(track);
  }

  // 9. 장면 속 상품 : PC 에서는 무대를 고정하고 스크롤한 만큼 장면을 한 장씩 옆으로 넘긴다(장면마다 잠깐 머묾).
  //    사진 속 + 나 상품 줄을 누르면 구매 레이어가 열린다. 상품 정보는 index.html 의 #cz-looks-data.
  function initLooks(root) {
    var sec = root.querySelector('.cz-looks');
    if (!sec) return;
    var data = {};
    try { data = JSON.parse(document.getElementById('cz-looks-data').textContent); } catch (e) {}
    var IMG = 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/inter@main/cafe24-assets/products/';
    var html = document.documentElement;

    /* 구매 레이어 */
    var qv = document.getElementById('cz-qv'), lastBtn = null;
    var won = function (n) { return Number(n).toLocaleString('ko-KR') + '원'; };
    function reviewOf(no) {
      try {
        var c = JSON.parse(sessionStorage.getItem('inter-reviews-v3'));
        var list = (c && c.items || []).filter(function (it) { return String(it.productNo) === String(no); });
        if (!list.length) return '';
        var pts = list.filter(function (it) { return it.point; });
        var avg = pts.length ? pts.reduce(function (s, it) { return s + it.point; }, 0) / pts.length : 0;
        return (avg ? '<b>★ ' + avg.toFixed(1) + '</b> · ' : '') + '리뷰 ' + list.length;
      } catch (e) { return ''; }
    }
    // 상품 사진 : 목록 데이터는 파일 이름, 게시판 화면 관리로 추가한 상품(inter-cms.js 가 채움)은 전체 주소
    var imgUrl = function (p) { return /^(https?:)?\/\//.test(p.img) ? p.img : IMG + p.img + '.jpg'; };
    function openQV(no, from) {
      var p = data[no] || (window.INTER_PRODUCTS || {})[no];
      if (!p || !qv) { if (no) location.href = '/product/detail.html?product_no=' + no; return; }
      lastBtn = from || null;
      var img = qv.querySelector('.cz-qv__img img');
      img.src = imgUrl(p); img.alt = p.name;
      qv.querySelector('.cz-qv__cat').textContent = p.cat || '';
      qv.querySelector('#cz-qv-name').textContent = p.name;
      qv.querySelector('.cz-qv__price').innerHTML = p.retail
        ? '<em>' + Math.round((1 - p.price / p.retail) * 100) + '%</em><b>' + won(p.price) + '</b><s>' + won(p.retail) + '</s>'
        : '<b>' + won(p.price) + '</b>';
      qv.querySelector('.cz-qv__desc').textContent = p.desc || '';
      var rv = qv.querySelector('.cz-qv__review'), r = reviewOf(no);
      rv.innerHTML = r; rv.hidden = !r;
      var url = '/product/detail.html?product_no=' + no;
      qv.querySelector('[data-qv-buy]').href = url;
      qv.querySelector('[data-qv-more]').href = url;
      qv.hidden = false;
      html.classList.add('cz-qv-open');
      qv.querySelector('[data-qv-close]').focus({ preventScroll: true });
    }
    function closeQV() {
      if (!qv || qv.hidden) return;
      qv.hidden = true;
      html.classList.remove('cz-qv-open');
      if (lastBtn) lastBtn.focus({ preventScroll: true });
    }
    // 점·목록은 게시판 화면 관리로 다시 그려질 수 있어 섹션에서 한 번에 받는다
    sec.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-prd]');
      if (b && sec.contains(b) && !document.documentElement.classList.contains('cms-edit')) openQV(b.dataset.prd, b);
    });
    // 섹션에 가까워지면 레이어에 쓸 상품 사진을 미리 받아 둔다 (처음 열 때 빈 칸 방지)
    var preload = function () { Object.keys(data).forEach(function (k) { new Image().src = imgUrl(data[k]); }); };
    if ('IntersectionObserver' in window) {
      var pio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { pio.disconnect(); preload(); } }, { rootMargin: '800px 0px' });
      pio.observe(sec);
    } else preload();
    if (qv) {
      qv.querySelector('[data-qv-close]').addEventListener('click', closeQV);
      qv.addEventListener('click', function (e) { if (e.target === qv) closeQV(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeQV(); });
    }

    /* 고정 무대 + 장면 넘김 */
    var pin = sec.querySelector('[data-looks-pin]'), stage = sec.querySelector('.cz-looks__stage');
    var track = sec.querySelector('[data-looks-track]'), looks = Array.from(sec.querySelectorAll('.cz-look'));
    var now = sec.querySelector('[data-looks-now]');
    var wide = window.matchMedia('(min-width:1024px)'), reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var xs = [], dist = 0, active = -1, raf = 0;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    // 장면 사이 구간에서 앞 25%·뒤 25% 는 머물고 가운데에서만 움직인다
    var ease = function (t) { t = Math.min(1, Math.max(0, (t - 0.25) / 0.5)); return t * t * (3 - 2 * t); };
    function setActive(i) {
      if (i === active) return;
      active = i;
      looks.forEach(function (l, k) { l.classList.toggle('is-active', k === i); });
      if (now) now.textContent = pad(i + 1);
    }
    function measure() {
      if (!wide.matches || reduce.matches || looks.length < 2) {
        sec.classList.remove('is-pinned'); pin.style.height = ''; track.style.transform = ''; dist = 0;
        looks.forEach(function (l) { l.classList.add('is-active'); });
        return;
      }
      sec.classList.add('is-pinned');
      track.style.transform = 'none';
      var sw = stage.clientWidth;
      xs = looks.map(function (l) { return l.offsetLeft - (sw - l.offsetWidth) / 2; });
      dist = Math.round(window.innerHeight * 0.85) * (looks.length - 1);
      pin.style.height = (stage.offsetHeight + dist) + 'px';
      active = -1;
      update();
    }
    function update() {
      raf = 0;
      if (!dist) return;
      var top = parseFloat(getComputedStyle(stage).top) || 0;
      var p = Math.min(1, Math.max(0, (top - pin.getBoundingClientRect().top) / dist));
      var f = p * (looks.length - 1), i = Math.min(looks.length - 2, Math.floor(f)), e = ease(f - i);
      var x = xs[i] + (xs[i + 1] - xs[i]) * e;
      track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
      setActive(Math.round(i + e));
    }
    var t = null;
    function remeasure() { clearTimeout(t); t = setTimeout(measure, 150); }
    measure();
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', measure);
    wide.addEventListener('change', measure);
    looks.forEach(function (l) { var im = l.querySelector('img'); if (im && !im.complete) im.addEventListener('load', remeasure, { once: true }); });
  }

  // 8. 사이즈 가이드 3D 보기 : 화면에 가까워지면 three.js 와 3D 모델(GLB)을 불러온다. (PETPIA 사이즈 가이드 3D 기능 그대로)
  //    끌어서 돌려 볼 수 있고, 번호 자리(1 · 2 · 3)가 모델 위에 입체로 표시된다.
  //    오른쪽 설명에 마우스를 올리면 그 자리가 강조된다. WebGL · 모델을 못 불러오면 원래 SVG 그림이 그대로 남는다.
  //    모델 주소 : index.html 의 [data-size-3d] 에 data-size-3d-model="https://…glb" 로 넣는다. 비어 있으면 SVG 그림만 보인다.
  //    (길이 X · 높이 Y 방향 모델 기준, 번호 자리 위치는 아래 build() 의 G 값)
  function initSize3D(root) {
    var art = root.querySelector('.cz-size__art'), mount = art && art.querySelector('[data-size-3d]');
    if (!mount) return;
    var MODEL = (mount.getAttribute('data-size-3d-model') || '').trim();
    if (!MODEL) return;
    var steps = Array.from(root.querySelectorAll('.cz-size__steps li'));
    var pins = Array.from(art.querySelectorAll('[data-pin]'));
    var started = false;
    // WebGL 이 되면 처음부터 SVG 그림을 숨기고(is-3d-wait) 3D 모델만 보이게 한다. 못 불러오면 SVG 로 되돌린다.
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    art.classList.add('is-3d-wait');
    function fail() { art.classList.remove('is-3d-wait'); }
    function start() {
      if (started) return;
      started = true;
      // 동적 import 를 문자열로 감싸 카페24 스크립트 압축기가 문법을 건드리지 않게 한다 (+esm : 같은 three 를 함께 쓰는 판)
      var load = new Function('u', 'return import(u)');
      Promise.all([
        load('https://cdn.jsdelivr.net/npm/three@0.160.0/+esm'),
        load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm')
      ]).then(function (mods) {
        new mods[1].GLTFLoader().load(MODEL, function (gltf) { try { build(mods[0], gltf.scene); } catch (e) { fail(); } }, undefined, fail);
      }).catch(fail);
    }
    // 스크롤로 닿기 훨씬 전에 미리 받아 둔다 : 페이지가 다 열린 뒤 쉬는 틈, 또는 섹션이 2 화면 앞에 오면
    if ('IntersectionObserver' in window) {
      var sio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { sio.disconnect(); start(); } }, { rootMargin: '2000px 0px' });
      sio.observe(art);
    }
    var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 1500); };
    if (document.readyState === 'complete') idle(start); else window.addEventListener('load', function () { idle(start); });

    function build(THREE, model) {
      var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(28, 1.3, 0.1, 100);
      scene.add(new THREE.HemisphereLight(0xfffaf2, 0xe2d2c0, 2.5));
      var sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(-3, 5, 5); scene.add(sun);
      var rim = new THREE.DirectionalLight(0xffe6d6, 0.7); rim.position.set(4, 2.5, -4); scene.add(rim);

      // 모델 크기 맞추기 : 몸 길이 3, 발끝을 y = -1 에
      var dog = new THREE.Group(); scene.add(dog);
      // 원본 모델은 머리가 +X 쪽이라 180° 돌려 머리를 -X(왼쪽)로 둔다
      model.rotation.y = Math.PI;
      model.updateMatrixWorld(true);
      var box = new THREE.Box3().setFromObject(model), size = box.getSize(V(0, 0, 0)), center = box.getCenter(V(0, 0, 0));
      var s = 3 / size.x;
      model.scale.setScalar(s);
      model.position.set(-center.x * s, -1 - box.min.y * s, -center.z * s);
      // 금속 재질로 들어와 어둡게 보이므로 부드러운 털 느낌(비금속 · 거친 면)으로 바꾼다
      model.traverse(function (o) {
        if (o.isMesh && o.material) { o.material.metalness = 0; o.material.roughness = 0.9; o.material.side = THREE.FrontSide; o.material.needsUpdate = true; }
      });
      dog.add(model);
      var L = 3, Ht = size.y * s, Wd = size.z * s, top = -1 + Ht;   // 길이 · 높이 · 폭 · 등 높이
      function X(f) { return -L / 2 + L * f; }                      // 머리(0) → 꼬리(1)
      function Y(f) { return -1 + Ht * f; }                          // 발(0) → 꼭대기(1)

      var guideMat = [0xe8866a, 0xe8866a, 0xe8866a].map(function (hex) {
        return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, emissive: hex, emissiveIntensity: 0.12 });
      });
      function add(geo, m, x, y, z, parent) { var mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); (parent || dog).add(mesh); return mesh; }
      function orient(obj, dir) { obj.quaternion.setFromUnitVectors(V(0, 0, 1), dir.clone().normalize()); }
      function dashRing(parent, r, n, m) {
        for (var i = 0; i < n; i++) { var d = add(new THREE.TorusGeometry(r, 0.028, 8, 6, (Math.PI * 2 / n) * 0.55), m, 0, 0, 0, parent); d.rotation.z = i * Math.PI * 2 / n; }
      }
      // 1 목둘레 : 목걸이 자리 점선 고리 · 2 가슴둘레 : 앞다리 뒤 점선 고리 · 3 등길이 : 목 뒤 ~ 꼬리 시작 점선
      var G = { neck: { x: X(0.27), y: Y(0.63), r: Wd * 0.52, dir: V(-0.5, 0.87, 0) }, chest: { x: X(0.44), y: Y(0.5), r: Wd * 0.7 }, back: { x0: X(0.36), x1: X(0.8), y: Y(0.76) } };
      var neck = new THREE.Group(); neck.position.set(G.neck.x, G.neck.y, 0); orient(neck, G.neck.dir); dog.add(neck); dashRing(neck, G.neck.r, 18, guideMat[0]);
      var chest = new THREE.Group(); chest.position.set(G.chest.x, G.chest.y, 0); orient(chest, V(1, 0, 0)); dog.add(chest); dashRing(chest, G.chest.r, 20, guideMat[1]);
      var back = new THREE.Group(); back.position.set(0, G.back.y, 0); dog.add(back);
      var segs = 9, span = G.back.x1 - G.back.x0;
      for (var k = 0; k < segs; k++) {
        var seg = add(new THREE.CapsuleGeometry(0.026, span / segs * 0.45, 4, 8), guideMat[2], G.back.x0 + span * (k + 0.5) / segs, 0, 0, back);
        seg.rotation.z = Math.PI / 2;
      }
      [G.back.x0, G.back.x1].forEach(function (x) { add(new THREE.CylinderGeometry(0.026, 0.026, 0.24, 10), guideMat[2], x, 0, 0, back); });

      // 바닥 그림자 (부드러운 원)
      var cv = document.createElement('canvas'); cv.width = cv.height = 128;
      var g2 = cv.getContext('2d'), grd = g2.createRadialGradient(64, 64, 4, 64, 64, 62);
      grd.addColorStop(0, 'rgba(150,196,164,.75)'); grd.addColorStop(1, 'rgba(150,196,164,0)');
      g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
      var shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.005; scene.add(shadow);

      /* 크기 */
      var W = 1, H = 1;
      function resize() {
        W = mount.clientWidth || 1; H = mount.clientHeight || 1;
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.position.set(0.3, 1.2, camera.aspect < 1.15 ? 8.2 : 6.6);
        camera.lookAt(0, 0.05, 0);
        camera.updateProjectionMatrix();
      }
      resize();
      if ('ResizeObserver' in window) new ResizeObserver(resize).observe(mount); else window.addEventListener('resize', resize);

      var clock = new THREE.Clock();

      /* 강조 : 설명 줄 · 번호에 올리면 그 자리만 밝게. 가만히 있으면 1 → 2 → 3 차례로 */
      var focus = -1, hovering = false, cycleAt = 0;
      function setFocus(n) {
        focus = n;
        pins.forEach(function (p, j) { p.classList.toggle('is-on', j === n); });
        steps.forEach(function (st, j) { st.classList.toggle('is-on', j === n); });
      }
      function hoverOn(j) { hovering = true; setFocus(j); }
      function hoverOff() { hovering = false; cycleAt = clock.getElapsedTime() + 2; }
      steps.forEach(function (st, j) { st.addEventListener('mouseenter', function () { hoverOn(j); }); st.addEventListener('mouseleave', hoverOff); });
      pins.forEach(function (p, j) {
        p.addEventListener('mouseenter', function () { hoverOn(j); });
        p.addEventListener('mouseleave', hoverOff);
        p.addEventListener('click', function () { setFocus(j); });
      });

      /* 끌어서 돌리기 : 몸은 가만히 두고, 돌린 뒤에는 제자리로 천천히 돌아온다 */
      var base = 0.25, rotY = base, rotX = 0, dragging = false, lastX = 0, lastY = 0, idleAt = 0;
      var cvs = renderer.domElement;
      cvs.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; cvs.setPointerCapture(e.pointerId); art.classList.add('is-grab'); });
      cvs.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        rotY += (e.clientX - lastX) * 0.012;
        rotX = Math.max(-0.35, Math.min(0.35, rotX + (e.clientY - lastY) * 0.006));
        lastX = e.clientX; lastY = e.clientY;
      });
      function endDrag() { if (!dragging) return; dragging = false; idleAt = clock.getElapsedTime() + 2.5; art.classList.remove('is-grab'); art.classList.add('is-played'); }
      cvs.addEventListener('pointerup', endDrag);
      cvs.addEventListener('pointercancel', endDrag);

      /* 번호 자리 : 1·2 는 고리에서 보는 사람 쪽으로 가장 가까운 점, 3 은 등 점선 가운데 */
      var ringPt = new THREE.Vector3(), best = new THREE.Vector3(), v3 = new THREE.Vector3();
      var rings = [[neck, G.neck.r], [chest, G.chest.r]], backMid = V((G.back.x0 + G.back.x1) / 2, 0, 0);
      function ringFront(obj, r, out) {
        var bz = -1e9;
        for (var a = 0; a < 24; a++) {
          ringPt.set(Math.cos(a / 24 * Math.PI * 2) * r, Math.sin(a / 24 * Math.PI * 2) * r, 0);
          obj.localToWorld(ringPt);
          if (ringPt.z > bz) { bz = ringPt.z; best.copy(ringPt); }
        }
        return out.copy(best);
      }

      /* 그리기 : 화면에 보일 때만 */
      var visible = true, raf = 0;
      function frame() {
        var t = clock.getElapsedTime();
        if (!reduce) {
          if (!dragging && t > idleAt) { rotY += (base - rotY) * 0.05; rotX += (0 - rotX) * 0.05; }
          if (!hovering && t > cycleAt) { setFocus((focus + 1) % 3); cycleAt = t + 2.6; }
          var br = 1 + Math.sin(t * 2.2) * 0.006; model.scale.set(s, s * br, s);   // 숨쉬기 (아주 살짝)
        }
        dog.rotation.y = rotY; dog.rotation.x = rotX;
        guideMat.forEach(function (m, j) { m.emissiveIntensity = focus === j ? 0.55 + Math.sin(t * 6) * 0.25 : (focus < 0 ? 0.12 : 0.04); });
        renderer.render(scene, camera);
        dog.updateMatrixWorld(true);
        for (var j = 0; j < 3; j++) {
          if (j < 2) ringFront(rings[j][0], rings[j][1], v3); else { v3.copy(backMid); back.localToWorld(v3); }
          v3.project(camera);
          // transform 대신 translate 속성 : 강조할 때 쓰는 scale 이 위치값까지 키우지 않게
          if (pins[j]) pins[j].style.translate = ((v3.x + 1) / 2 * W).toFixed(1) + 'px ' + ((1 - v3.y) / 2 * H).toFixed(1) + 'px';
        }
      }
      function loop() {
        if (raf) return;
        var tick = function () { raf = 0; if (!visible) return; frame(); raf = requestAnimationFrame(tick); };
        tick();
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) loop(); }).observe(art);
      }
      frame();
      art.classList.add('is-3d');
      loop();
    }
  }

  function initReveal(root) {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    root.querySelectorAll('.cz-sec, .cz-finder, .cz-size, .cz-story, .cz-duo, .cz-starter, .cz-reviews, .cz-help').forEach(function (el) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('cz-reveal'); io.observe(el); }
    });
  }

  // 헤더 아래 끝(띠배너 + 헤더)을 --cz-head 로 넘긴다. 고정(sticky) 섹션들이 이 선에 멈춘다.
  // 띠배너를 닫거나 화면 폭이 바뀌어 헤더 높이가 달라지면 바로 갱신해 빈 공간이 생기지 않게 한다.
  function initHeadLine() {
    var header = document.getElementById('header'), last = -1;
    if (!header) return;
    function sync() {
      var h = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
      if (h === last) return;
      last = h;
      document.documentElement.style.setProperty('--cz-head', h + 'px');
      window.dispatchEvent(new Event('cz:head'));
    }
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(header);
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function () { requestAnimationFrame(sync); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
      mo.observe(header, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  }

  function init() {
    var root = document.querySelector('.inter-cozy');
    if (!root) return;
    if (window.INTER_CMS) window.INTER_CMS.applyCached(); // 게시판으로 바꾼 사진·글자를 인터랙션보다 먼저 넣는다
    initHeadLine();
    initWorldHero(root);
    initWorld(root);
    initPopup();
    fillPlaceholders(root);
    initFinder(root);
    initHotspots(root);
    initLooks(root);
    initSize3D(root);
    initStarter(root);
    initRails(root);
    initRailPin(root);
    initMisc(root);
    initReveal(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());

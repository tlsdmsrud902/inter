/* inter 화면 관리 — 게시판 글쓰기·수정 화면 위에 띄우는 전용 편집 화면
   inter-cms.js 가 화면 관리 게시판(store-content.js 의 cms.boardNo)의 write/modify 페이지에서만 불러온다.
   · 글 본문("라벨: 값" 줄, 사진, ── 1번 ── 구분)을 칸별 입력란으로 풀어 보여 주고, 고치면 다시 본문으로 써 넣는다.
   · 실행 취소/다시 실행, 칸별 되돌리기, 처음 상태로, 이전 저장본 불러오기
   · 사진은 [사진 바꾸기] → 카페24 편집기의 사진 올리기를 그대로 써서 올린다. 권장 크기와 다르면 경고
   · 카페24 원래 편집기는 [고급: 원래 편집기] 로 언제든 열 수 있다. */
(function () {
  'use strict';
  var C = window.INTER_CMS;
  if (!C) return;
  var PREFIX = C.prefix, esc = C.esc;
  var qs = location.search, isWrite = /write\.html/.test(location.pathname);
  var BACKUP_KEY = 'inter-cms-backup';

  function trim(s) { return String(s == null ? '' : s).replace(/[ \t ​]+/g, ' ').trim(); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  /* ---------- 카페24 편집기(Froala) 연결 ---------- */
  function findEditor() {
    try {
      var F = window.FroalaEditor;
      if (F && F.INSTANCES && F.INSTANCES.length) {
        // 본문 칸의 편집기 (원래 textarea 가 content 이거나 글쓰기 표 안에 있는 것) — 여러 개일 수 있다
        var ed = Array.prototype.filter.call(F.INSTANCES, function (x) {
          var o = x.$oel && (x.$oel[0] || x.$oel);
          return (o && (o.id === 'content' || o.name === 'content')) || (x.el && x.el.closest && x.el.closest('.typeWrite, form'));
        })[0] || F.INSTANCES[0];
        // 편집기가 다 켜지기 전에 넣은 내용은 켜지면서 지워진다 → 편집 칸이 살아 있을 때만 '준비됨'
        if (!ed.el || !ed.html || ed.el.getAttribute('contenteditable') !== 'true') return null;
        var area = document.querySelector('textarea[name="content"], textarea#content');
        return {
          get: function () { return ed.html.get(); },
          set: function (h) { ed.html.set(h); if (area) area.value = h; try { ed.events.trigger('contentChanged'); } catch (e) {} },
          box: ed.$box && (ed.$box[0] || ed.$box) || $('.fr-box'),
          upload: function (file) {
            return new Promise(function (res, rej) {
              if (!ed.image || typeof ed.image.upload !== 'function') { rej(new Error('noupload')); return; }
              var done = false;
              // 올리기가 끝나면 서버가 돌려준 주소만 받고, 편집기 안에 끼워 넣지는 않는다 (본문은 편집 화면이 다시 쓴다)
              ed.events.on('image.uploaded', function (response) {
                if (done) return;
                var url = '';
                try { var j = JSON.parse(response); url = j.link || j.url || (j.data && (j.data.link || j.data.url)) || ''; } catch (e) { url = (String(response).match(/https?:\/\/[^"'\s]+|\/web\/upload\/[^"'\s]+/) || [])[0] || ''; }
                if (!url) return;
                done = true; res(url);
                return false;
              }, true);
              ed.events.on('image.inserted', function (img) { if (done) return; done = true; var node = img && (img[0] || img); res(node && node.getAttribute ? node.getAttribute('src') : ''); }, true);
              ed.events.on('image.error', function (err) { if (done) return; done = true; rej(new Error((err && err.message) || 'upload')); }, true);
              try { ed.selection.setAtEnd(ed.el); ed.selection.restore(); } catch (e) {}
              ed.image.upload([file]);
              setTimeout(function () { if (!done) { done = true; rej(new Error('timeout')); } }, 60000);
            });
          }
        };
      }
      var jq = window.jQuery, box = jq && jq('[name="content"], #content').filter(function () { return jq(this).data('froala.editor'); });
      if (box && box.length) {
        return {
          get: function () { return box.froalaEditor('html.get'); },
          set: function (h) { box.froalaEditor('html.set', h); },
          box: box.siblings('.fr-box')[0] || $('.fr-box'),
          upload: function (file) {
            return new Promise(function (res, rej) {
              var done = false;
              box.one('froalaEditor.image.inserted', function (e, ed, img) { done = true; res(img && img.attr('src')); });
              box.one('froalaEditor.image.error', function () { done = true; rej(new Error('upload')); });
              box.froalaEditor('image.upload', [file]);
              setTimeout(function () { if (!done) rej(new Error('timeout')); }, 60000);
            });
          }
        };
      }
    } catch (e) {}
    return null;
  }

  /* ---------- 본문 ↔ 칸 목록 ---------- */
  var BLOCK = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE|TR|TABLE|TBODY|SECTION|ARTICLE|FIGURE|PRE)$/;
  var LABEL = /^([^:：\/]{1,24}?)\s*[:：]\s?(.*)$/;
  var MARK = /^[\s─━—\-=_~·*#]*(\d{1,2})\s*번(?:\s*[·:\-(]\s*([^─━—=)]*))?[\s─━—\-=_~·*#)]*$/;
  var SIZE = /^※\s*사진 크기\s*:\s*가로\s*(\d+)\s*[×x]\s*세로\s*(\d+)/;
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
  var uid = 0;
  function parseDoc(html) {
    var blocks = [], last = null, size = null;
    tokens(html).forEach(function (tk) {
      if (tk.img) { blocks.push({ id: 'b' + (++uid), type: 'img', src: tk.img, size: size }); size = null; last = null; return; }
      var t = trim(tk.t.replace(/\*\*\s*\*\*|\*\s*\*/g, ''));
      if (!t) { last = null; return; }
      var m;
      if ((m = t.match(SIZE))) { size = [+m[1], +m[2]]; return; }
      if (/^※/.test(t)) { blocks.push({ id: 'b' + (++uid), type: 'note', text: t.replace(/^※\s*/, '') }); last = null; return; }
      if ((m = t.match(MARK))) { blocks.push({ id: 'b' + (++uid), type: 'marker', label: trim(m[2] || '') }); last = null; return; }
      if ((m = t.match(LABEL)) && !/^https?$/i.test(m[1])) {
        last = { id: 'b' + (++uid), type: 'field', label: trim(m[1]), value: trim(m[2]).replace(/^\*\*(.*)\*\*$/, '$1') };
        blocks.push(last); return;
      }
      if (last) last.value = (last.value ? last.value + '\n' : '') + t;
    });
    return blocks;
  }
  function serialize(blocks) {
    var n = 0;
    return blocks.map(function (b) {
      if (b.type === 'note') return '<p>※ ' + esc(b.text) + '</p>';
      if (b.type === 'marker') { n++; return '<p>── ' + n + '번' + (b.label ? ' · ' + esc(b.label) : '') + ' ──</p>'; }
      if (b.type === 'img') return (b.size ? '<p>※ 사진 크기: 가로 ' + b.size[0] + ' × 세로 ' + b.size[1] + ' px (비율이 다르면 가장자리가 잘려요)</p>' : '') + '<p><img src="' + esc(b.src) + '" alt=""></p>';
      return '<p>' + esc(b.label) + ': ' + esc(b.value).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function clone(blocks) { return JSON.parse(JSON.stringify(blocks)); }

  /* ---------- 라벨별 안내 ---------- */
  var HINT = [
    [/^보이기$/, 'toggle', '이 영역을 화면에 보일지 정해요.'],
    [/^순서$/, 'lines', '한 줄에 영역 이름 하나. 위에서부터 이 순서로 보여요. 이름은 그대로 두고 줄 순서만 바꾸세요.\n메인 편집 모드에서 섹션의 ↑ ↓ 로 옮기고 [섹션 순서 저장]을 누르면 여기가 자동으로 채워져요.'],
    [/링크|주소/, 'url', '누르면 이동할 주소예요. 예) /product/list.html?cate_no=28  또는  https://…'],
    [/^상품 점$/, 'lines', '한 줄에 하나씩 「상품번호 가로% 세로%」 예) 29 56 55\n메인 편집 모드에서 사진을 누르면 가로·세로 %가 복사돼요. 상품번호 대신 주소를 쓰면 그 주소로 가는 점이 돼요.'],
    [/바로가기/, 'lines', '한 줄에 하나씩 「이름 한 칸 띄고 주소」 예) 책장 /product/search.html?keyword=책장'],
    [/준비물/, 'lines', '한 줄에 하나씩 써요. 줄 수만큼 체크 항목이 생겨요.'],
    [/마감 시각/, 'text', '예) 2026-10-31 23:59  비우면 타이머 없는 팝업이에요.'],
    [/간격/, 'text', '몇 초마다 다음 장으로 넘길지 (0 이면 넘기지 않음)'],
    [/^제목$/, 'area', '가장 크게 보이는 제목이에요. 줄을 바꾸면 화면에서도 줄이 바뀌어요.'],
    [/작은 제목|작은 글|영문/, 'area', '제목 위(또는 옆)의 작은 글씨예요.'],
    [/설명|답변|재는 법/, 'area', '제목 아래 설명 글이에요.'],
    [/버튼|글자/, 'text', '버튼(링크)에 보이는 글자예요.'],
    [/질문/, 'text', '눌러서 펼치는 질문 줄이에요.']
  ];
  function hintOf(label) {
    for (var i = 0; i < HINT.length; i++) if (HINT[i][0].test(label)) return { kind: HINT[i][1], text: HINT[i][2] };
    return { kind: 'area', text: '' };
  }

  var CSS = ''
    + '.pcms{margin:0 0 28px;font:15px/1.6 Pretendard,"Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;color:#2b2320;text-align:left}'
    + '.pcms *{box-sizing:border-box}'
    + '.pcms__head{padding:22px 22px 18px;border-radius:18px 18px 0 0;background:#2b2320;color:#fff}'
    + '.pcms__head h2{margin:0 0 6px;font-size:22px;letter-spacing:-.02em;color:#fff}.pcms__head p{margin:0;color:#e9dfd8;font-size:14px}'
    + '.pcms__bar{position:sticky;top:var(--pcms-top,0px);z-index:50;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px;background:#fff7f2;border:1px solid #f1d9cc;border-top:0;box-shadow:0 6px 14px -12px rgba(0,0,0,.4)}'
    + '.pcms__bar button,.pcms__bar select{height:40px;padding:0 14px;border:1px solid #d9c7bb;border-radius:10px;background:#fff;color:#2b2320;font:600 14px/1 inherit;cursor:pointer}'
    + '.pcms__bar button:disabled{opacity:.35;cursor:default}.pcms__bar .pcms__save{margin-left:auto;background:#ff5a36;border-color:#ff5a36;color:#fff;padding:0 22px;font-size:15px}'
    + '.pcms__status{font-size:13px;color:#8a6d5d}'
    + '.pcms__notes{margin:14px 0 0;padding:12px 16px;border-radius:12px;background:#f6f1ec;color:#5e4a3f;font-size:14px}.pcms__notes li{margin:3px 0 3px 18px}'
    + '.pcms__card{margin-top:16px;border:1px solid #eadfd6;border-radius:16px;background:#fff;overflow:hidden}'
    + '.pcms__card-h{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#faf6f2;border-bottom:1px solid #eadfd6;font-weight:800;font-size:16px}'
    + '.pcms__card-h span{flex:1}.pcms__card-h button{height:32px;padding:0 10px;border:1px solid #d9c7bb;border-radius:8px;background:#fff;font:600 13px/1 inherit;cursor:pointer}'
    + '.pcms__field{position:relative;padding:14px 16px 16px;border-top:1px solid #f3ece6}.pcms__field:first-of-type{border-top:0}'
    + '.pcms__field.is-changed{background:#fffaf5;box-shadow:inset 4px 0 0 #ff5a36}'
    + '.pcms__label{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-weight:800;font-size:15px}'
    + '.pcms__label small{font-weight:500;color:#9a8375;font-size:12px}'
    + '.pcms__undo{margin-left:auto;height:28px;padding:0 10px;border:1px solid #ffc3b1;border-radius:8px;background:#fff;color:#e2471f;font:600 12px/1 inherit;cursor:pointer}'
    + '.pcms textarea,.pcms input[type=text]{display:block;width:100%;padding:12px 14px;border:1.5px solid #d9c7bb;border-radius:12px;background:#fff;font:16px/1.55 inherit;color:#2b2320;resize:vertical}'
    + '.pcms textarea:focus,.pcms input[type=text]:focus{outline:0;border-color:#ff5a36;box-shadow:0 0 0 4px rgba(255,90,54,.15)}'
    + '.pcms__hint{margin-top:6px;color:#8a7568;font-size:13px;white-space:pre-line}'
    + '.pcms__toggle{display:inline-flex;border:1.5px solid #d9c7bb;border-radius:12px;overflow:hidden}.pcms__toggle button{height:40px;padding:0 20px;border:0;background:#fff;font:700 14px/1 inherit;cursor:pointer}.pcms__toggle button.on{background:#2b2320;color:#fff}'
    + '.pcms__img{display:grid;grid-template-columns:minmax(0,240px) 1fr;gap:16px;align-items:start}'
    + '.pcms__img figure{margin:0;border-radius:12px;overflow:hidden;background:repeating-conic-gradient(#f1ebe6 0 25%,#fff 0 50%) 0 0/16px 16px;border:1px solid #eadfd6}'
    + '.pcms__img img{display:block;width:100%;max-height:220px;object-fit:contain}'
    + '.pcms__img .pcms__btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}'
    + '.pcms__img button{height:40px;padding:0 14px;border:1px solid #d9c7bb;border-radius:10px;background:#fff;font:700 14px/1 inherit;cursor:pointer}.pcms__img .pcms__pick{background:#2b2320;color:#fff;border-color:#2b2320}'
    + '.pcms__size{font-size:14px}.pcms__size b{color:#2b2320}.pcms__warn{margin-top:8px;padding:8px 12px;border-radius:10px;background:#fdecec;color:#b42318;font-weight:700;font-size:14px}.pcms__ok{margin-top:8px;color:#1a7f37;font-weight:700;font-size:14px}'
    + '.pcms__native-hidden{display:none!important}'
    + '.pcms__adv{margin-top:16px;padding:12px 16px;border-radius:12px;background:#fff4e5;color:#7a4b00;font-size:14px}'
    + '.pcms__spot-box{margin:10px 0 0;padding:10px;border-radius:14px;background:repeating-conic-gradient(#f1ebe6 0 25%,#fff 0 50%) 0 0/16px 16px;border:1px solid #eadfd6;text-align:center}'
    + '.pcms__spot-stage{position:relative;display:inline-block;max-width:100%;line-height:0;cursor:crosshair;user-select:none;-webkit-user-select:none}'
    + '.pcms__spot-stage img{display:block;width:auto;height:auto;max-width:100%;max-height:72vh;border-radius:8px;pointer-events:none}'
    + '.pcms__dot{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:3px solid #fff;border-radius:50%;background:#ff5a36;color:#fff;font:800 14px/1 inherit;box-shadow:0 3px 10px rgba(0,0,0,.35)}'
    + '.pcms__spot-stage .pcms__dot{position:absolute;transform:translate(-50%,-50%);cursor:grab;touch-action:none;transition:transform .12s}'
    + '.pcms__spot-stage .pcms__dot.is-drag{cursor:grabbing;transform:translate(-50%,-50%) scale(1.25);transition:none}'
    + '.pcms__spot-stage .pcms__dot.is-on{background:#2b2320;transform:translate(-50%,-50%) scale(1.2)}'
    + '.pcms__spot-rows{margin:12px 0 0;padding:0;list-style:none}'
    + '.pcms__spot-row{display:grid;grid-template-columns:32px minmax(0,150px) 1fr auto;gap:10px;align-items:center;padding:8px 0;border-top:1px dashed #eadfd6}.pcms__spot-row:first-child{border-top:0}'
    + '.pcms__dot--num{width:30px;height:30px;border-width:2px;box-shadow:none}'
    + '.pcms__spot-info{display:flex;flex-direction:column;min-width:0;font-size:14px}.pcms__spot-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pcms__spot-name.is-ok{color:#1a7f37}.pcms__spot-name.is-bad{color:#b42318}'
    + '.pcms__spot-xy{color:#9a8375;font-size:12px}'
    + '.pcms__spot-del{height:36px;padding:0 12px;white-space:nowrap;border:1px solid #d9c7bb;border-radius:8px;background:#fff;font:600 13px/1 inherit;cursor:pointer}'
    + '.pcms__spot-empty{padding:10px 0;color:#8a7568;font-size:14px}'
    + '.pcms__spot-raw{margin-top:10px;font-size:13px;color:#8a7568}.pcms__spot-raw summary{cursor:pointer}.pcms__spot-raw textarea{margin-top:8px}'
    + '@media (max-width:640px){.pcms__img{grid-template-columns:1fr}.pcms__bar .pcms__save{margin-left:0;width:100%}.pcms__spot-row{grid-template-columns:32px 1fr auto;row-gap:4px}.pcms__spot-row>b{grid-area:1/1}.pcms__spot-row>input{grid-area:1/2}.pcms__spot-del{grid-area:1/3}.pcms__spot-info{grid-area:2/2/3/4}}';

  /* ---------- 편집 화면 ---------- */
  function start(ed) {
    var subject = $('input[name="subject"], #subject');
    var name = (subject && subject.value || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim() || '화면';
    var m = qs.match(/[?&]cms=([^&]+)/), d = null;
    if (m) {
      var cmsName = decodeURIComponent(m[1].replace(/\+/g, ' '));
      d = (C.lsGet(C.draftKey) || {})[cmsName];
      if (d) name = cmsName;
    }
    var hasFields = function (list) { return list.some(function (b) { return b.type === 'field' || b.type === 'img'; }); };
    var original = parseDoc(ed.get());
    // 새 글이거나, 저장된 글이 비어 있거나, 편집 모드에서 바꾼 내용(섹션 순서 등, 10분 안)이면 초안으로 시작한다
    var fromEdit = !isWrite && d && d.use && hasFields(original);
    if ((isWrite || !hasFields(original) || (d && d.use && Date.now() - d.t < 600000)) && d) {
      original = parseDoc(d.html);
      if (subject && isWrite) subject.value = d.subject;
    }
    if (!hasFields(original)) return; // 화면 관리 형식의 글이 아니면 원래 편집기 그대로
    if (subject) { subject.readOnly = true; subject.title = '이 제목으로 메인 화면의 영역을 찾아요. 바꾸지 마세요.'; }
    backup(name, serialize(original));

    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    var model = clone(original), orig = {}, history = [clone(model)], pos = 0, native = false, syncT = null, pushT = null;
    original.forEach(function (b) { orig[b.id] = b.type === 'img' ? b.src : b.value; });
    var grow = original.some(function (b) { return b.type === 'note' && /칸을 늘리려면/.test(b.text); });
    var notice = {}; // 사진 칸 아래에 잠깐 보여 줄 안내 (칸 id → 문구)

    var root = el('div', 'pcms');
    root.innerHTML = '<div class="pcms__head"><h2>「' + esc(name) + '」 편집</h2><p>아래 칸에서 글자와 사진을 바꾸고 <b>저장하기</b>를 누르세요. 저장한 뒤 메인 화면을 새로고침하면 바로 보여요.</p>'
      + (fromEdit && Date.now() - d.t < 600000 ? '<p style="margin-top:8px;color:#ffb199;font-weight:700">편집 모드에서 바꾼 내용을 가져왔어요. [저장하기]를 눌러야 화면에 적용돼요.</p>' : '') + '</div>'
      + '<div class="pcms__bar"><button type="button" data-a="undo">↶ 실행 취소</button><button type="button" data-a="redo">↷ 다시 실행</button>'
      + '<button type="button" data-a="reset">⟲ 처음 상태로</button><select data-a="backup"><option value="">🕘 이전 저장본 불러오기</option></select>'
      + '<button type="button" data-a="native">고급: 원래 편집기</button><span class="pcms__status"></span><button type="button" class="pcms__save" data-a="save">저장하기</button></div>'
      + '<div class="pcms__body"></div>';
    var body = $('.pcms__body', root), status = $('.pcms__status', root);
    var table = $('.ec-base-table.typeWrite') || $('.typeWrite');
    (table ? table.parentNode : document.body).insertBefore(root, table || document.body.firstChild);
    // 쇼핑몰 상단에 고정된 머리글 아래에 도구 막대가 붙도록
    function headerBottom() {
      var max = 0;
      document.querySelectorAll('body *').forEach(function (n) {
        if (n.closest('.pcms')) return;
        var cs = getComputedStyle(n);
        if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
        var r = n.getBoundingClientRect();
        if (r.top <= 1 && r.height > 0 && r.height < 220 && r.width > window.innerWidth * 0.6) max = Math.max(max, r.bottom);
      });
      root.style.setProperty('--pcms-top', Math.round(max) + 'px');
    }
    headerBottom(); window.addEventListener('resize', headerBottom); window.addEventListener('scroll', function () { clearTimeout(headerBottom.t); headerBottom.t = setTimeout(headerBottom, 120); }, { passive: true });
    var nativeRow = ed.box && (ed.box.closest('tr') || ed.box);
    if (nativeRow) nativeRow.classList.add('pcms__native-hidden');

    function sync() { clearTimeout(syncT); syncT = setTimeout(function () { if (!native) ed.set(serialize(model)); }, 250); }
    function flush() { clearTimeout(syncT); if (!native) ed.set(serialize(model)); }
    function push(now) {
      clearTimeout(pushT);
      var go = function () { history = history.slice(0, pos + 1); history.push(clone(model)); if (history.length > 100) history.shift(); pos = history.length - 1; buttons(); };
      if (now) go(); else pushT = setTimeout(go, 500);
    }
    function changes() { return model.filter(function (b) { return b.id in orig ? orig[b.id] !== (b.type === 'img' ? b.src : b.value) : b.type !== 'note'; }).length; }
    function buttons() {
      $('[data-a=undo]', root).disabled = pos <= 0;
      $('[data-a=redo]', root).disabled = pos >= history.length - 1;
      var n = changes(); status.textContent = n ? '바뀐 곳 ' + n + '군데' : '아직 바꾼 곳이 없어요';
    }
    function changed(now) { sync(); push(now); buttons(); }

    function fieldUI(b) {
      var h = hintOf(b.label), wrap = el('div', 'pcms__field'), lab = el('div', 'pcms__label');
      lab.appendChild(el('span', '', b.label));
      if (h.text && h.kind !== 'lines') lab.appendChild(el('small', '', h.kind === 'url' ? '링크' : ''));
      var undo = el('button', 'pcms__undo', '↺ 되돌리기'); undo.type = 'button';
      lab.appendChild(undo); wrap.appendChild(lab);
      var input;
      if (h.kind === 'toggle') {
        input = el('div', 'pcms__toggle');
        ['예', '아니오'].forEach(function (v) {
          var bt = el('button', /^(아니|숨|끔|no|off)/i.test(b.value) === (v === '아니오') ? 'on' : '', v === '예' ? '보이기' : '숨기기'); bt.type = 'button';
          bt.addEventListener('click', function () { b.value = v; render(); changed(true); });
          input.appendChild(bt);
        });
      } else {
        input = el(h.kind === 'url' || h.kind === 'text' ? 'input' : 'textarea');
        if (input.tagName === 'INPUT') input.type = 'text'; else input.rows = h.kind === 'lines' ? Math.max(4, b.value.split('\n').length + 1) : Math.max(2, b.value.split('\n').length);
        input.value = b.value;
        input.addEventListener('input', function () { b.value = input.value; mark(); sync(); push(false); buttons(); });
      }
      wrap.appendChild(input);
      if (h.text) wrap.appendChild(el('div', 'pcms__hint', h.text));
      if (h.kind === 'url') {
        var go = el('a', 'pcms__hint', '→ 이 주소 열어 보기'); go.target = '_blank'; go.rel = 'noopener';
        go.addEventListener('mouseenter', function () { go.href = b.value || '#'; });
        wrap.appendChild(go);
      }
      function mark() { var diff = b.id in orig && orig[b.id] !== b.value; wrap.classList.toggle('is-changed', diff); undo.hidden = !diff; }
      undo.addEventListener('click', function () { b.value = orig[b.id]; render(); changed(true); });
      mark();
      return wrap;
    }
    function imgUI(b) {
      var wrap = el('div', 'pcms__field'), lab = el('div', 'pcms__label');
      lab.appendChild(el('span', '', '사진'));
      var undo = el('button', 'pcms__undo', '↺ 원래 사진'); undo.type = 'button'; lab.appendChild(undo);
      wrap.appendChild(lab);
      var grid = el('div', 'pcms__img'), fig = el('figure'), im = el('img'), info = el('div');
      im.src = b.src; im.alt = ''; fig.appendChild(im); grid.appendChild(fig);
      var size = el('div', 'pcms__size'), warn = el('div');
      size.innerHTML = b.size ? '권장 크기 <b>가로 ' + b.size[0] + ' × 세로 ' + b.size[1] + ' px</b>' : '권장 크기 정보가 없어요';
      info.appendChild(size); info.appendChild(warn);
      var btns = el('div', 'pcms__btns'), pick = el('button', 'pcms__pick', '사진 바꾸기'), file = el('input');
      pick.type = 'button'; file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
      btns.appendChild(pick); btns.appendChild(file); info.appendChild(btns);
      info.appendChild(el('div', 'pcms__hint', '내 컴퓨터의 사진을 고르면 카페24에 올라가고 여기 바로 바뀌어요.'));
      if (notice[b.id]) info.appendChild(el('div', 'pcms__ok', '✓ ' + notice[b.id]));
      grid.appendChild(info); wrap.appendChild(grid);
      function check() {
        if (!im.naturalWidth) return;
        var w = C.sizeWarn(im.naturalWidth, im.naturalHeight, b.size);
        // 처음부터 있던 사진(디자인 기본 사진)은 빨간 경고 대신 회색 안내 — 아무것도 안 했는데 오류처럼 보이지 않게
        if (w && b.id in orig && orig[b.id] === b.src) { warn.className = 'pcms__hint'; warn.textContent = '지금 사진 ' + im.naturalWidth + '×' + im.naturalHeight + ' · 새 사진은 권장 크기로 올리면 잘리지 않아요.'; return; }
        warn.className = w ? 'pcms__warn' : 'pcms__ok';
        warn.textContent = w ? '⚠ ' + w : (b.size ? '✓ 크기가 잘 맞아요 (' + im.naturalWidth + '×' + im.naturalHeight + ')' : '올린 사진 ' + im.naturalWidth + '×' + im.naturalHeight);
      }
      im.addEventListener('load', check); if (im.complete) check();
      pick.addEventListener('click', function () { file.click(); });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        pick.disabled = true; pick.textContent = '올리는 중…';
        ed.upload(f).then(function (url) {
          if (!url) throw new Error('empty');
          b.src = url;
          // 같은 칸에 영상 주소가 있으면 비운다 (영상 주소가 있으면 영상이 먼저 나오므로, 사진을 올렸으면 사진이 보이게)
          var parts = split(), grp = parts.items.filter(function (it) { return it.blocks.indexOf(b) >= 0; })[0], list = grp ? grp.blocks : parts.head;
          list.forEach(function (x) { if (x.type === 'field' && /^영상 주소$/.test(x.label) && trim(x.value)) { x.value = ''; notice[b.id] = '영상 대신 이 사진이 나오도록 「영상 주소」 칸을 비웠어요.'; } });
          render(); changed(true); flush();
        }).catch(function (e) {
          pick.disabled = false; pick.textContent = '사진 바꾸기';
          alert(e && e.message === 'noupload' ? '이 편집기에서는 여기서 바로 사진을 올릴 수 없어요. [고급: 원래 편집기]를 열어 사진을 눌러 바꿔 주세요.' : '사진을 올리지 못했어요. 파일 크기(10MB 이하)와 형식(jpg·png·webp)을 확인하고 다시 시도해 주세요.');
          if (!native) ed.set(serialize(model)); // 올리다 끼어든 사진 정리
        });
        file.value = '';
      });
      var diff = b.id in orig && orig[b.id] !== b.src;
      wrap.classList.toggle('is-changed', diff); undo.hidden = !diff;
      undo.addEventListener('click', function () { b.src = orig[b.id]; render(); changed(true); });
      return wrap;
    }
    function card(title, list, idx, count) {
      var c = el('div', 'pcms__card'), h = el('div', 'pcms__card-h');
      h.appendChild(el('span', '', title));
      if (idx != null && grow) {
        [['↑', -1, '위로'], ['↓', 1, '아래로'], ['복사해서 추가', 0, ''], ['삭제', null, '']].forEach(function (a) {
          var bt = el('button', '', a[0]); bt.type = 'button'; if (a[2]) bt.title = a[2];
          if ((a[1] === -1 && idx === 0) || (a[1] === 1 && idx === count - 1) || (a[1] === null && count <= 1)) bt.disabled = true;
          bt.addEventListener('click', function () { itemAction(idx, a[1]); });
          h.appendChild(bt);
        });
      }
      c.appendChild(h);
      list.forEach(function (b) { if (b.type === 'field') c.appendChild(/^상품 점$/.test(b.label) ? spotUI(b, list) : fieldUI(b)); else if (b.type === 'img') c.appendChild(imgUI(b)); });
      return c;
    }
    /* 장면 속 상품 점 : 같은 칸의 사진을 원래 비율로 크게 보여 주고, 누른 자리에 번호 점을 찍고, 끌어서 옮긴다.
       본문에는 예전처럼 한 줄에 「상품번호 가로% 세로%」로 쓴다. 번호를 아직 안 적은 점은 「(번호) 가로 세로」(화면에는 안 나옴) */
    function readSpots(v) {
      return String(v || '').split('\n').map(trim).filter(Boolean).map(function (line) {
        var parts = line.split(/\s+/), nums = [];
        while (parts.length > 1 && nums.length < 2 && /^\d+(\.\d+)?%?$/.test(parts[parts.length - 1])) nums.unshift(parseFloat(parts.pop()));
        var key = parts.join(' ');
        return { key: /^(\(번호\)|\?)$/.test(key) ? '' : key, x: nums.length === 2 ? nums[0] : 50, y: nums.length === 2 ? nums[1] : 50 };
      });
    }
    var lookupQ = Promise.resolve();
    function writeSpots(spots) { return spots.map(function (s) { return (s.key || '(번호)') + ' ' + s.x + ' ' + s.y; }).join('\n'); }
    function spotUI(b, list) {
      var wrap = el('div', 'pcms__field'), lab = el('div', 'pcms__label');
      lab.appendChild(el('span', '', '사진 속 상품 점'));
      var undo = el('button', 'pcms__undo', '↺ 되돌리기'); undo.type = 'button'; lab.appendChild(undo);
      wrap.appendChild(lab);
      var spots = readSpots(b.value), pic = list.filter(function (x) { return x.type === 'img'; })[0];
      wrap.appendChild(el('div', 'pcms__hint', pic ? '① 사진에서 상품이 있는 자리를 누르면 번호 점이 생겨요.  ② 점은 끌어서 옮겨요.  ③ 아래 같은 번호 칸에 상품번호를 적으면 상품 이름이 떠요.' : '이 칸에 사진이 없어 아래 목록으로만 고칠 수 있어요.'));
      var box = el('div', 'pcms__spot-box'), stage = el('div', 'pcms__spot-stage'), im = el('img'), rows = el('ol', 'pcms__spot-rows');
      im.alt = ''; im.draggable = false; if (pic) im.src = pic.src;
      stage.appendChild(im); box.appendChild(stage); box.hidden = !pic;
      wrap.appendChild(box); wrap.appendChild(rows);
      var more = el('details', 'pcms__spot-raw'), ta = el('textarea');
      more.appendChild(el('summary', '', '글자로 직접 고치기 (한 줄에 「상품번호 가로% 세로%」)'));
      more.appendChild(ta); wrap.appendChild(more);
      ta.addEventListener('change', function () { spots = readSpots(ta.value); save(true); draw(); });
      function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
      function at(e) { var r = im.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width * 100), clamp((e.clientY - r.top) / r.height * 100)]; }
      function mark() { var diff = b.id in orig && orig[b.id] !== b.value; wrap.classList.toggle('is-changed', diff); undo.hidden = !diff; }
      function save(now) { b.value = writeSpots(spots); ta.value = b.value; mark(); if (now) changed(true); else { sync(); push(false); buttons(); } }
      function draw() {
        stage.querySelectorAll('.pcms__dot').forEach(function (d) { d.remove(); });
        rows.innerHTML = '';
        ta.value = b.value; ta.rows = Math.max(3, spots.length + 1);
        if (!spots.length) rows.appendChild(el('li', 'pcms__spot-empty', '아직 점이 없어요. 위 사진에서 상품 자리를 눌러 보세요.'));
        spots.forEach(function (s, i) {
          var dot = el('button', 'pcms__dot', String(i + 1)); dot.type = 'button'; dot.title = (i + 1) + '번 점 · 끌어서 옮기기';
          dot.style.left = s.x + '%'; dot.style.top = s.y + '%';
          stage.appendChild(dot);
          var li = el('li', 'pcms__spot-row'), inp = el('input'), info = el('div', 'pcms__spot-info'), nm = el('span', 'pcms__spot-name'), xy = el('span', 'pcms__spot-xy'), del = el('button', 'pcms__spot-del', '삭제');
          li.appendChild(el('b', 'pcms__dot pcms__dot--num', String(i + 1)));
          inp.type = 'text'; inp.inputMode = 'numeric'; inp.value = s.key; inp.placeholder = '상품번호 (예: 29)'; inp.setAttribute('aria-label', (i + 1) + '번 점 상품번호');
          li.appendChild(inp); info.appendChild(nm); info.appendChild(xy); li.appendChild(info);
          del.type = 'button'; li.appendChild(del); rows.appendChild(li);
          function showXY() { xy.textContent = '가로 ' + s.x + '% · 세로 ' + s.y + '%'; }
          showXY();
          function lookup() {
            clearTimeout(li.__t);
            var k = s.key;
            nm.className = 'pcms__spot-name';
            if (!k) { nm.textContent = '상품번호를 적어 주세요'; nm.classList.add('is-bad'); return; }
            if (!/^\d+$/.test(k)) { var isUrl = /^(https?:\/\/|\/)/.test(k); nm.textContent = isUrl ? '→ 이 주소로 가는 점' : '상품번호는 숫자로 적어요'; nm.classList.add(isUrl ? 'is-ok' : 'is-bad'); return; }
            if (!C.product) { nm.textContent = '상품 ' + k; return; }
            nm.textContent = '상품 이름 확인 중…';
            li.__t = setTimeout(function () {
              // 카페24가 요청이 몰리면 막으므로 상품 확인은 하나씩 차례로
              lookupQ = lookupQ.then(function () {
                if (s.key !== k) return;
                return C.product(k).then(function (p) {
                  if (s.key !== k) return;
                  nm.textContent = p ? '✓ ' + p.name : '⚠ ' + k + '번 상품을 찾지 못했어요. 번호를 확인해 주세요.';
                  nm.classList.add(p ? 'is-ok' : 'is-bad');
                });
              });
            }, 450);
          }
          lookup();
          inp.addEventListener('input', function () { s.key = trim(inp.value); save(false); lookup(); });
          inp.addEventListener('focus', function () { dot.classList.add('is-on'); });
          inp.addEventListener('blur', function () { dot.classList.remove('is-on'); });
          del.addEventListener('click', function () { spots.splice(i, 1); save(true); draw(); });
          // 끌어서 옮기기 (마우스·손가락 모두)
          dot.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            try { dot.setPointerCapture(e.pointerId); } catch (er) {}
            dot.classList.add('is-drag');
            var moved = false;
            function move(ev) { var p = at(ev); if (p[0] === s.x && p[1] === s.y) return; s.x = p[0]; s.y = p[1]; moved = true; dot.style.left = s.x + '%'; dot.style.top = s.y + '%'; showXY(); }
            function up() {
              dot.removeEventListener('pointermove', move); dot.removeEventListener('pointerup', up); dot.removeEventListener('pointercancel', up);
              dot.classList.remove('is-drag');
              if (moved) save(true); else inp.focus();
            }
            dot.addEventListener('pointermove', move); dot.addEventListener('pointerup', up); dot.addEventListener('pointercancel', up);
          });
        });
      }
      stage.addEventListener('click', function (e) {
        if (e.target.closest('.pcms__dot')) return;
        var p = at(e);
        spots.push({ key: '', x: p[0], y: p[1] });
        save(true); draw();
        var inputs = rows.querySelectorAll('input'); if (inputs.length) inputs[inputs.length - 1].focus();
      });
      undo.addEventListener('click', function () { b.value = orig[b.id]; render(); changed(true); });
      mark(); draw();
      return wrap;
    }
    // 번호 묶음 단위로 나누기 : [앞부분, 1번, 2번, …]
    function split() {
      var head = [], items = [], cur = null;
      model.forEach(function (b) {
        if (b.type === 'marker') { cur = { marker: b, blocks: [] }; items.push(cur); return; }
        if (b.type === 'note') return;
        (cur ? cur.blocks : head).push(b);
      });
      return { head: head, items: items };
    }
    function itemAction(i, dir) {
      var parts = split(), items = parts.items, notesBefore = [], notesAfter = [], seenMarker = false;
      model.forEach(function (b) { if (b.type === 'marker') seenMarker = true; if (b.type === 'note') (seenMarker ? notesAfter : notesBefore).push(b); });
      if (dir === -1 || dir === 1) { var t = items[i]; items[i] = items[i + dir]; items[i + dir] = t; }
      else if (dir === 0) { var cp = clone([items[i].marker].concat(items[i].blocks)); cp.forEach(function (b) { b.id = 'b' + (++uid); }); items.splice(i + 1, 0, { marker: cp[0], blocks: cp.slice(1) }); }
      else if (dir === null) { if (!confirm((i + 1) + '번 칸을 지울까요? (실행 취소로 되살릴 수 있어요)')) return; items.splice(i, 1); }
      model = notesBefore.concat(parts.head, [].concat.apply([], items.map(function (it) { return [it.marker].concat(it.blocks); })), notesAfter);
      render(); changed(true);
    }
    function render() {
      body.innerHTML = '';
      var notes = model.filter(function (b) { return b.type === 'note' && !/쌍점|제목은 그대로|사진은 눌러서/.test(b.text); });
      if (notes.length) {
        var ul = el('ul', 'pcms__notes');
        notes.forEach(function (n) { ul.appendChild(el('li', '', n.text)); });
        body.appendChild(ul);
      }
      var parts = split();
      if (parts.head.length) body.appendChild(card('영역 전체', parts.head));
      parts.items.forEach(function (it, i) { body.appendChild(card((i + 1) + '번' + (it.marker.label ? ' · ' + it.marker.label : ''), it.blocks, i, parts.items.length)); });
      buttons();
    }
    function load(blocks) { model = clone(blocks); render(); changed(true); flush(); }

    root.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'undo' && pos > 0) { pos--; model = clone(history[pos]); render(); flush(); }
      else if (a === 'redo' && pos < history.length - 1) { pos++; model = clone(history[pos]); render(); flush(); }
      else if (a === 'reset') { if (confirm('처음 이 화면을 열었을 때 상태로 되돌릴까요?')) load(original); }
      else if (a === 'native') {
        native = !native;
        if (nativeRow) nativeRow.classList.toggle('pcms__native-hidden', !native);
        body.hidden = native;
        e.target.textContent = native ? '← 쉬운 편집으로 돌아가기' : '고급: 원래 편집기';
        var adv = $('.pcms__adv', root);
        if (native) { flush(); if (!adv) { adv = el('div', 'pcms__adv', '원래 편집기에서 고친 내용은 [쉬운 편집으로 돌아가기]를 누르면 그대로 가져와요.'); root.appendChild(adv); } }
        else { if (adv) adv.remove(); load(parseDoc(ed.get())); }
        buttons();
      } else if (a === 'save') {
        if (native) model = parseDoc(ed.get());
        flush(); backup(name, serialize(model));
        // 편집기에 내용이 실제로 들어갔는지 확인 (비어 있는 글이 저장되지 않게)
        if (!hasFields(parseDoc(ed.get()))) {
          ed.set(serialize(model));
          if (!hasFields(parseDoc(ed.get()))) { alert('본문을 편집기에 넣지 못했어요. 잠시 뒤 다시 [저장하기]를 눌러 주세요. 계속 안 되면 [고급: 원래 편집기]에서 확인해 주세요.'); return; }
        }
        // 이 브라우저가 기억한 화면 내용을 지워 저장 직후 새로고침하면 바로 보이게
        try { Object.keys(localStorage).forEach(function (k) { if (/^inter-cms-v\d+-/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
        var submit = Array.from(document.querySelectorAll('.ec-base-button a, .ec-base-button button, .ec-base-button input')).filter(function (x) { return /^(등록|수정|확인|저장)$/.test(trim(x.textContent || x.value)); }).pop();
        if (submit) submit.click(); else alert('아래쪽의 [등록] 버튼을 눌러 주세요.');
      }
    });
    root.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-a') !== 'backup' || !e.target.value) return;
      var list = (C.lsGet(BACKUP_KEY) || {})[name] || [], it = list[+e.target.value - 1];
      e.target.value = '';
      if (it && confirm(new Date(it.t).toLocaleString('ko-KR') + ' 저장본을 불러올까요? (실행 취소로 되돌릴 수 있어요)')) load(parseDoc(it.html));
    });
    document.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey) || native) return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/INPUT|TEXTAREA/.test(tag)) return; // 입력 중인 칸은 브라우저 기본 실행 취소
      var k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); $('[data-a=undo]', root).click(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); $('[data-a=redo]', root).click(); }
    });
    // 이전 저장본 목록
    var sel = $('[data-a=backup]', root);
    ((C.lsGet(BACKUP_KEY) || {})[name] || []).forEach(function (it, i) { var o = el('option', '', (i + 1) + '. ' + new Date(it.t).toLocaleString('ko-KR')); o.value = i + 1; sel.appendChild(o); });
    if (sel.options.length === 1) sel.hidden = true;
    render();
    // 카페24가 편집기를 켜면서 늦게 내용을 다시 채우는 경우가 있어, 우리 내용이 남을 때까지 몇 번 더 넣는다
    var stick = 0;
    (function keep() {
      if (native) return;
      var now = ed.get(), want = serialize(model);
      if (now !== want && !hasFields(parseDoc(now))) ed.set(want);
      else if (now !== want && stick === 0) ed.set(want);
      if (++stick < 12) setTimeout(keep, 500);
    }());
    // 섹션 순서처럼 메인 화면에서 [저장하기]를 이미 누르고 온 경우 : 여기서 한 번 더 누르지 않게 바로 저장한다 (2분 안, 한 번만)
    if (d && d.autosave && Date.now() - d.t < 120000) {
      var drafts = C.lsGet(C.draftKey) || {};
      if (drafts[name]) { delete drafts[name].autosave; C.lsSet(C.draftKey, drafts); }
      var wait = el('div', 'pcms__adv', '⏳ 바뀐 순서를 저장하고 있어요. 잠시만 기다려 주세요…');
      root.insertBefore(wait, body);
      setTimeout(function () { $('[data-a=save]', root).click(); }, 1800);
    }
  }
  // 이 브라우저에 최근 저장본 5개를 남긴다 (같은 내용은 한 번만)
  function backup(name, content) {
    var all = C.lsGet(BACKUP_KEY) || {}, list = all[name] || [];
    if (list[0] && list[0].html === content) return;
    list.unshift({ t: Date.now(), html: content });
    all[name] = list.slice(0, 5);
    C.lsSet(BACKUP_KEY, all);
  }

  var tries = 0;
  (function wait() {
    var ed = findEditor();
    if (!ed && ++tries < 80) { setTimeout(wait, 250); return; }
    if (ed) setTimeout(function () { start(findEditor() || ed); }, 600); // 켜진 직후 카페24가 한 번 더 손대는 시간을 준다
  }());
}());

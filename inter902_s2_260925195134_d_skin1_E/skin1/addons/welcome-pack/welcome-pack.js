/* =========================================================================
   무료회원 감사 쿠폰팩 버튼 (2026-10-09) : 새로 가입한 회원에게만 주는 쿠폰 3장 (기존 회원은 받을 수 없음)
   - 오른쪽 플로팅 버튼 묶음(#s9Float)의 챗봇 버튼 바로 밑에 동그란 쿠폰 버튼을 단다. 로그인한 회원에게는 보이지 않는다
   - 누르면 /inter/welcome.html?pop=1 을 작은 창(모바일은 전체 화면)으로 연다. 내용은 그 페이지에서 (?edit=1 로 고침)
   - 쿠폰은 카페24 「조건부 자동 발급 › 회원 가입」이 가입할 때 넣는다. 가입을 마친 화면(/member/join_result.html)에서 창을 「가입 축하」로 한 번 연다
   - 주소 끝에 #welcome-pack 을 붙인 링크로도 열 수 있다
   빼려면 layout.html 의 welcome-pack.js 한 줄을 지운다
   ========================================================================= */
(function () {
  'use strict';
  if (window.top !== window) return;                                   // 쿠폰팩 창 · 보이지 않는 창 안에서는 달지 않는다
  if (/^\/inter\/welcome\.html$/.test(location.pathname)) return;        // 쿠폰팩 페이지 자체
  if (/[?&]edit=1/.test(location.search)) return;                       // 화면 관리(편집) 중
  var PAGE = '/inter/welcome.html', SHOWN_KEY = 'inter-wp-joined';
  var ORIGIN = location.protocol + '//' + location.host;
  var JOINED = /^\/member\/join_result\.html$/.test(location.pathname);
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} return null; }
  function isMember() { return [].some.call(document.querySelectorAll('a[href]'), function (a) { return /logout/i.test(a.getAttribute('href') || ''); }); }

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M4.2 6.5h15.6a1.2 1.2 0 0 1 1.2 1.2v2.6a1.7 1.7 0 0 0 0 3.4v2.6a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 16.3v-2.6a1.7 1.7 0 0 0 0-3.4V7.7a1.2 1.2 0 0 1 1.2-1.2z"/>'
    + '<path d="M15.5 7v10" stroke-dasharray="1.6 2"/><path d="M7.6 14.4l3.8-4.8"/><circle cx="7.9" cy="9.9" r=".95"/><circle cx="11.1" cy="14.1" r=".95"/></svg>';
  var CSS = [
    /* 버튼 : 쿠폰 티켓과 같은 토프 톤 · 왼쪽 말풍선 「무료회원 감사 쿠폰팩」 · 오른쪽 위 「3장」 */
    '#s9Float .s9-float__btn.s9-float__btn--wp{position:relative;overflow:visible;border-color:transparent!important;background:linear-gradient(135deg,#c29466,#8a6541)!important;color:#fff!important}',
    '#s9Float .s9-float__btn.s9-float__btn--wp:hover,#s9Float .s9-float__btn.s9-float__btn--wp:focus-visible{background:linear-gradient(135deg,#9c7650,#6f5034)!important;color:#fff!important;transform:translateY(-2px)}',
    '#s9Float .s9-float__btn--wp svg{width:23px!important;height:23px!important;animation:wpk-wiggle 4s ease-in-out 2s infinite}',
    '@keyframes wpk-wiggle{0%,86%,100%{transform:none}89%{transform:rotate(-12deg)}92%{transform:rotate(10deg)}95%{transform:rotate(-6deg)}}',
    '.s9-float__btn--wp::before{content:attr(data-label);position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);padding:7px 12px;border-radius:999px;background:#8a6541;color:#fff;font:600 12px/1.2 "Pretendard Variable",Pretendard,system-ui,sans-serif;letter-spacing:-.01em;white-space:nowrap;box-shadow:0 10px 22px -12px rgba(60,40,20,.55);pointer-events:none;transition:opacity .25s}',
    '.s9-float__btn--wp::after{content:attr(data-badge);position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;padding:0 5px;border:2px solid #fff;border-radius:999px;background:#33302b;color:#fff;font:700 10px/16px "Pretendard Variable",Pretendard,system-ui,sans-serif;text-align:center;box-sizing:border-box}',
    'html.wh-open .s9-float__btn--wp::before,html.wpk-open .s9-float__btn--wp::before{opacity:0}',
    '@media (max-width:767px){html.bot-label-off .s9-float__btn--wp::before{display:none}}',
    /* 작은 창 : PC 는 오른쪽 아래 카드, 모바일은 전체 화면 */
    '.wpk{position:fixed;inset:0;z-index:2147482000;visibility:hidden;pointer-events:none}',
    '.wpk.is-open{visibility:visible;pointer-events:auto}',
    '.wpk__dim{position:absolute;inset:0;background:rgba(20,14,8,.28);opacity:0;transition:opacity .35s}.wpk.is-open .wpk__dim{opacity:1}',
    '.wpk__card{position:absolute;right:clamp(16px,2.4vw,36px);bottom:24px;width:400px;height:min(720px,calc(100vh - 48px));border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 40px 80px -30px rgba(40,28,16,.55),0 0 0 1px rgba(0,0,0,.05);opacity:0;transform:translateY(24px) scale(.97);transform-origin:100% 100%;transition:opacity .3s,transform .45s cubic-bezier(.2,.8,.2,1)}',
    '.wpk.is-open .wpk__card{opacity:1;transform:none}',
    '.wpk__card iframe{display:block;width:100%;height:100%;border:0;opacity:0;transition:opacity .25s}.wpk.is-ready .wpk__card iframe{opacity:1}',
    '.wpk__load{position:absolute;inset:0;display:grid;place-items:center}.wpk.is-ready .wpk__load{display:none}',
    '.wpk__load i{width:28px;height:28px;border:2.5px solid #e7e0d5;border-top-color:#9c7650;border-radius:50%;animation:wpk-spin .8s linear infinite}@keyframes wpk-spin{to{transform:rotate(360deg)}}',
    '.wpk__x{position:absolute;top:14px;right:12px;z-index:1;width:36px;height:36px;border:0;border-radius:50%;background:transparent;cursor:pointer}.wpk.is-ready .wpk__x{display:none}',
    '@media (max-width:767px){.wpk__card{inset:0;width:auto;height:auto;border-radius:0;transform:translateY(40px)}.wpk__dim{display:none}}',
    'html.wpk-open,html.wpk-open body{overflow:hidden}',
    '@media (min-width:768px){html.wpk-open,html.wpk-open body{overflow:auto}}',
    '@media (prefers-reduced-motion:reduce){.wpk *,.s9-float__btn--wp svg{animation:none!important;transition:none!important}}'
  ].join('\n');

  var btn, box, frame;
  function mountButton() {
    var f = document.getElementById('s9Float');
    if (!f || btn) return;
    btn = document.createElement('a');
    btn.className = 's9-float__btn s9-float__btn--wp';
    btn.href = PAGE;
    btn.setAttribute('data-label', '무료회원 감사 쿠폰팩');
    btn.setAttribute('data-badge', '3장');
    btn.setAttribute('aria-label', '무료회원 감사 쿠폰팩');
    btn.innerHTML = ICON;
    btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
    place();
    if (isMember()) btn.hidden = true;   // 기존 회원은 받을 수 없으니 로그인한 회원에게는 버튼을 숨긴다
  }
  // 챗봇 버튼 바로 밑 (챗봇은 shop-helper.js 가 나중에 달 수 있어 카카오톡 버튼 앞에 둔다)
  function place() {
    var f = document.getElementById('s9Float'); if (!f || !btn) return;
    var helper = f.querySelector('.s9-float__btn--helper'), kk = f.querySelector('[data-s9="kakao"]');
    if (helper) helper.after(btn); else if (kk) f.insertBefore(btn, kk); else f.prepend(btn);
  }
  function open(joined) {
    if (!box) {
      box = document.createElement('div');
      box.className = 'wpk'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '무료회원 감사 쿠폰팩');
      box.innerHTML = '<div class="wpk__dim" data-wpk-close></div><div class="wpk__card"><div class="wpk__load"><i></i></div><button type="button" class="wpk__x" data-wpk-close aria-label="닫기"></button></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function (e) { if (e.target.closest('[data-wpk-close]')) close(); });
    }
    if (!frame || joined) {
      if (frame) frame.remove();
      box.classList.remove('is-ready');
      frame = document.createElement('iframe');
      frame.title = '무료회원 감사 쿠폰팩';
      frame.src = PAGE + '?pop=1' + (joined ? '&joined=1' : '');
      box.querySelector('.wpk__card').appendChild(frame);
      setTimeout(function () { box.classList.add('is-ready'); }, 6000);   // 늦어도 보이게
    }
    requestAnimationFrame(function () { box.classList.add('is-open'); document.documentElement.classList.add('wpk-open'); });
  }
  function close() {
    if (!box) return;
    box.classList.remove('is-open'); document.documentElement.classList.remove('wpk-open');
    if (btn) btn.focus({ preventScroll: true });
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || !e.data || !e.data.wp) return;
    if (e.data.wp === 'ready' && box) box.classList.add('is-ready');
    if (e.data.wp === 'close') close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box && box.classList.contains('is-open')) close(); });
  window.addEventListener('hashchange', function () { if (location.hash === '#welcome-pack') open(); });
  // 다른 곳의 링크 : href="#welcome-pack" 또는 data-welcome-pack
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#welcome-pack"],[data-welcome-pack]');
    if (a) { e.preventDefault(); open(); }
  });

  function boot() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    mountButton();
    // 챗봇 버튼이 나중에 붙으면 그 밑으로 옮긴다
    var f = document.getElementById('s9Float');
    if (f && window.MutationObserver) {
      var mo = new MutationObserver(function () { if (f.querySelector('.s9-float__btn--helper') && btn && btn.previousElementSibling !== f.querySelector('.s9-float__btn--helper')) place(); });
      mo.observe(f, { childList: true });
      setTimeout(function () { mo.disconnect(); }, 8000);
    }
    // 가입을 막 마친 회원 : 「가입 축하 · 쿠폰 3장이 들어갔어요」 창을 한 번 연다
    if (JOINED && isMember() && !ss(SHOWN_KEY)) { ss(SHOWN_KEY, '1'); setTimeout(function () { open(true); }, 500); }
    else if (location.hash === '#welcome-pack') open();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

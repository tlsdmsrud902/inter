/* 쇼핑 도우미 (Shop Helper) — 카페24 스킨에 넣고 빼는 단독 기능                         v1.1
   ----------------------------------------------------------------------------------------------
   AI · 외부 서비스 · 월 이용료 없이, 사장님이 적어 둔 메뉴와 질문 · 답으로 손님을 안내하는 상담 창.
   손님이 오른쪽 아래 말풍선을 누르면 메뉴(배송 안내 · 교환·반품·환불 · 상품 상담 …) → 질문 → 안내 + 바로가기 버튼.
   「상담원 연결」은 카카오톡 채널 1:1 채팅(실시간)과 문의 게시판으로 잇는다.

   [넣기]  이 파일을 스킨 폴더 /addons/shop-helper/ 에 올리고, layout.html 의 </body> 바로 앞에 한 줄
             <script src="/addons/shop-helper/shop-helper.js?v=1"></script>
           설정 파일(shop-helper.config.js)을 쓰면 그 줄 바로 앞에 한 줄 더.
   [빼기]  위 줄을 지운다 (또는 설정의 enabled: false). 스킨의 다른 화면에는 영향이 없다.

   [가르치기 — 카페24 안에서]
     1) 설정 : window.SHOP_HELPER_CONFIG (shop-helper.config.js) — 이름 · 인사말 · 메뉴 · 운영 시간 · 상담 주소 · 질문과 답 · 색
     2) 자주묻는질문 게시판(기본 3번) 글 = 「자주 묻는 질문」 메뉴 (제목 = 질문, 본문 = 답, 본문에 「키워드: …」 「버튼: 이름 주소」 줄)
     3) (선택) 설정 게시판 글 「[모든 페이지] 쇼핑 도우미」 — 본문에 「이름: …」 「메뉴: …」 「── 1번 ──」 형식으로 쓰면 설정보다 먼저 쓴다
     4) inter 계열 스킨의 화면 편집 모드가 있으면 [쇼핑 도우미 고치기] 편집 창 · 교육 모드와 함께 동작
   [v1.1 더한 것]
     · 스타일 추천 (설정 style.steps 가 있을 때) : 몇 가지 질문 → 상품 분류 목록에서 상품 이름 · 가격으로 골라 카드로 보여 준다
     · 이동 경로 : 본 상품 · 분류 · 검색어를 이 브라우저에만 남긴다 (설정 trail: false 면 끔). 서버로 보내지 않는다
     · 상담 넘기기 : 손님이 「카카오톡 상담」 · 「문의 남기기」를 누르면, 동의할 때만 최근 본 상품 · 둘러본 순서 · 회원 정보를
       카카오톡은 복사(붙여넣기), 문의 게시판은 글쓰기 칸에 미리 넣어 준다
     · 상담 이력 : 챗봇에서 고른 메뉴 · 물어본 질문 · 못 찾은 질문 · 추천 결과 · 상담 연결을 이 브라우저에 남겨
       다시 온 손님에게 「지난번에는 ○○을 물어보셨어요」, 상담 넘기기 글에 「상담 이력」을 붙인다
     · 상담 기록 게시판 (설정 consultBoard 번호) : 회원이 동의하고 상담을 넘기면 그 내용을 비밀글로 남긴다 → 사장님이 회원 아이디로 모아 본다
   자세한 내용은 같은 폴더의 README.md */
(function () {
  'use strict';
  if (window.SHOP_HELPER && window.SHOP_HELPER.version) return;     // 두 번 넣어도 한 번만
  var SC = window.STORE_CONTENT || {}, CMS = window.INTER_CMS;    // inter 계열 스킨이면 함께 쓴다 (없어도 동작)
  var UC = window.SHOP_HELPER_CONFIG || SC.helper || {};              // 사장님 설정
  var NAME = '쇼핑 도우미';                                   // 화면 관리 게시판 글 이름 : [모든 페이지] 쇼핑 도우미
  var CFG_KEY = (CMS && CMS.helperKey) || 'shop-helper-cfg', KB_KEY = 'shop-helper-kb', CHAT_KEY = 'shop-helper-chat3', TEACH_KEY = 'shop-helper-teach';
  var EDIT = /[?&]edit=1\b/.test(location.search);
  // 주문서 · 결제 완료 화면 (공통 레이아웃을 쓰지 않는 화면) 에서는 <script ... data-track-only> 로 넣어 챗봇 창 없이 기록만 한다
  var TRACK = !!(document.currentScript && document.currentScript.hasAttribute('data-track-only'));
  var CFG_TTL = 30 * 60000, KB_TTL = 60 * 60000;
  var html = document.documentElement;

  function trim(s) { return String(s == null ? '' : s).replace(/[ \t ​]+/g, ' ').trim(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function store(k) { try { return window[k]; } catch (e) { return null; } }
  function get(k, s) { try { return JSON.parse((store(s || 'localStorage')).getItem(k)); } catch (e) { return null; } }
  function put(k, v, s) { try { (store(s || 'localStorage')).setItem(k, JSON.stringify(v)); } catch (e) {} }
  function list(v) { return Array.isArray(v) ? v.slice() : String(v == null ? '' : v).split(/\n/).map(trim).filter(Boolean); }
  function won(n) { return Number(n || 0).toLocaleString('ko-KR'); }

  /* ---------- 1. 기본 설정 · 기본 답 (게시판 글이 없을 때) ---------- */
  var FREE = UC.freeShipping || (SC.shipping && SC.shipping.freeOver) || 0;
  // 업종마다 다른 바로가기 : 설정에 있을 때만 버튼이 생긴다
  var COUPON = UC.couponLink != null ? UC.couponLink : (SC.sale && SC.sale.categoryNo ? '/product/list.html?cate_no=' + SC.sale.categoryNo : '');
  var SIZE = UC.sizeGuide || '', GUIDE = UC.guideLink || '';
  function opt(label, url) { return url ? label + ' ' + url : ''; }
  function lines2() { return [].slice.call(arguments).filter(Boolean).join('\n'); }
  var BASE = {
    enabled: true,
    name: '쇼핑 도우미',
    fabLabel: '챗봇 상담',                                    // 버튼 왼쪽 말풍선 글자 (없음 = 말풍선을 보이지 않음)
    fabIcon: '말풍선',                                        // 버튼 그림 : 말풍선 · 로봇 · 물음표 · 반짝임 · 선물 · 사람 · 쇼핑백 · 하트 · 이모지 · 사진 주소
    hint: '무엇을 도와드릴까요?',                            // 처음 온 손님에게 한 번 나오는 안내 (없음 = 나오지 않음)
    label: 'Concierge',                                       // 챗봇 창 맨 위 영문 (브랜드 이름 뒤)
    kicker: 'How can we help?',                               // 챗봇 창 이름 위의 작은 글
    placeholder: '메뉴에 없으면 직접 물어보세요',               // 입력창 안내
    backGreeting: '오늘은 무엇을 도와드릴까요?',                // 다시 온 손님에게 인사말 첫 줄 대신
    // 재방문 시크릿 쿠폰 : 다시 온 손님(지난 방문에서 30분 넘게 지나 다시 온 브라우저)에게 챗봇 첫 화면에서 보여 주는 쿠폰
    revisitCoupon: '',                                         // 카페24 쿠폰 번호 (관리자 › 프로모션 › 쿠폰). 비우면 쿠폰 카드를 보이지 않음
    revisitValue: '10%',                                       // 쿠폰에 크게 보이는 혜택 (10% 또는 5,000원)
    revisitTitle: '재방문 시크릿 쿠폰',
    revisitDesc: '다시 찾아 주신 분께만 드리는 할인이에요',
    revisitCond: '',                                           // 사용 조건 한 줄 (예: 5만 원 이상 구매 시 · 받은 날부터 7일)
    revisitHours: 24,                                          // 처음 보여 준 때부터 몇 시간 동안 받을 수 있는지
    greeting: '안녕하세요! {brand} 쇼핑 도우미예요.\n궁금한 내용을 골라 주세요.',
    // 첫 화면 메뉴 : 「이름 | 설명」. 질문과 답의 「분류」가 이 이름과 같으면 그 메뉴 안에 들어간다
    menu: ['배송 안내 | 출고 일정 · 배송비 · 배송 조회', '교환 · 반품 · 환불 | 신청 방법 · 기간 · 환불 시점', '상품 상담 | 사이즈 · 옵션 · 재입고 · 상품 문의',
      '쿠폰 · 이벤트 | 쿠폰 받기 · 쓰는 법', '주문 · 결제 | 주문 조회 · 취소 · 결제 수단', '회원 · 적립금 | 가입 혜택 · 적립금 · 아이디 찾기', '상담원 연결 | 카카오톡 실시간 상담'],
    fallback: '딱 맞는 답을 찾지 못했어요. 아래에서 골라 보시거나 상담원에게 물어봐 주세요.',
    hours: '평일 10:00 – 17:00 (점심 12:00 – 13:00, 주말 · 공휴일 휴무)',
    contact: '',                                              // 비우면 카카오톡 상담 버튼 주소
    askLink: '',                                              // 「문의 남기기」 버튼 주소 — 비우면 버튼을 만들지 않는다 (챗봇 안에서 답하고, 사람 상담은 카카오톡으로)
    faqBoard: 3,                                              // 자동으로 배울 자주묻는질문 게시판 (0 = 끔)
    synonyms: ['환불 = 반품 = 돌려받 = 돈 돌려', '배송 = 택배 = 도착 = 출고 = 발송 = 언제 와 = 언제와 = 받아볼', '교환 = 바꾸 = 바꿔',
      '사이즈 = 치수 = 크기 = 핏 = 실측 = 작아 = 커요 = 커서 = 작아서', '쿠폰 = 할인 = 세일 = 이벤트 = 프로모션', '적립금 = 포인트 = 마일리지',
      '결제 = 카드 = 무통장 = 입금 = 계좌 = 페이', '주문 = 구매 = 샀', '취소 = 철회', '회원 = 가입 = 로그인 = 아이디 = 비밀번호 = 비번',
      '상담 = 상담원 = 문의 = 연락 = 전화 = 카톡 = 카카오 = 사람', '운영시간 = 영업시간 = 몇 시 = 몇시 = 근무'],
    qna: [
      { cat: '배송 안내', q: '배송은 언제 와요?', keywords: '배송, 도착, 출고, 언제', a: '결제가 확인되면 출고돼요. 받으시기까지 보통 {배송기간} 걸려요.\n상품에 따라 출고가 조금 늦어질 수 있어요.', buttons: '주문 · 배송 조회 /myshop/order/list.html' },
      { cat: '배송 안내', q: '배송비는 얼마예요?', keywords: '배송비, 무료배송, 택배비', a: '배송비 안내 : {배송비}\n장바구니에서 무료배송까지 남은 금액을 볼 수 있어요.', buttons: '장바구니 /order/basket.html' },
      { cat: '배송 안내', q: '배송 조회는 어디서 해요?', keywords: '배송 조회, 송장, 운송장, 어디쯤', a: '주문 조회에서 주문을 누르면 송장 번호와 배송 상태를 볼 수 있어요.\n출고 당일에는 택배사 조회가 늦게 뜰 수 있어요.', buttons: '주문 · 배송 조회 /myshop/order/list.html' },
      { cat: '교환 · 반품 · 환불', q: '교환 · 반품은 어떻게 해요?', keywords: '교환, 반품, 반송', a: '받으신 날부터 {교환기간} 안에, 사용 흔적이 없고 택 · 구성품이 그대로인 상품이면 교환 · 반품할 수 있어요.\n주문 조회에서 신청하신 뒤 안내에 따라 보내 주세요.', buttons: '교환 · 반품 신청 (주문 조회) /myshop/order/list.html' },
      { cat: '교환 · 반품 · 환불', q: '환불은 언제 돼요?', keywords: '환불, 환불 언제, 돈 언제', a: '반품 상품이 도착해 확인되면 {환불기간} 안에 결제하신 수단으로 환불해 드려요.\n카드 결제는 승인 취소로 처리돼 카드사 일정에 따라 반영돼요.' },
      { cat: '교환 · 반품 · 환불', q: '불량 · 오배송이에요', keywords: '불량, 오배송, 잘못 왔, 하자, 찢어', a: '불편을 드려 죄송해요. 카카오톡 상담으로 상품 사진을 보내 주시면 확인 후 다시 보내 드리거나 환불해 드려요. 왕복 배송비는 저희가 부담해요.', next: '상담원과 이야기하고 싶어요' },
      { cat: '교환 · 반품 · 환불', q: '사이즈가 안 맞아요', keywords: '안 맞, 작아요, 커요, 사이즈 교환', a: '받으신 날부터 {교환기간} 안에 사용 흔적이 없으면 다른 사이즈 · 옵션으로 교환할 수 있어요.', buttons: '교환 신청 (주문 조회) /myshop/order/list.html' },
      { cat: '상품 상담', q: '사이즈는 어떻게 골라요?', keywords: '사이즈, 치수, 어깨, 가슴, 총장, 키, 몸무게, 추천', a: '상품 상세페이지의 사이즈 표(실측)를 가지고 계신 옷과 비교해 보세요.\n그래도 고민되시면 카카오톡 상담으로 키 · 평소 사이즈를 알려 주시면 바로 추천해 드려요.', buttons: opt('사이즈 가이드 보기', SIZE) },
      { cat: '상품 상담', q: '사용 · 관리 방법이 궁금해요', keywords: '세탁, 빨래, 드라이, 관리, 보관, 사용법', a: '상품마다 사용 · 관리 방법이 달라요. 상세페이지의 안내와 관리 가이드를 먼저 확인해 주세요.', buttons: opt('관리 가이드', GUIDE) },
      { cat: '상품 상담', q: '품절 상품은 다시 들어와요?', keywords: '품절, 재입고, 재고', a: '재입고 일정은 상품마다 달라요. 카카오톡 상담으로 상품 이름을 알려 주시면 바로 확인해 드려요.', next: '상담원과 이야기하고 싶어요' },
      { cat: '상품 상담', q: '상품에 대해 물어보고 싶어요', keywords: '상품 문의, 소재, 색상, 두께, 비침', a: '소재 · 색상 · 두께처럼 상세페이지에 없는 내용은 카카오톡 상담으로 물어봐 주시면 바로 답해 드려요.', next: '상담원과 이야기하고 싶어요' },
      { cat: '쿠폰 · 이벤트', q: '쿠폰은 어디서 받아요?', keywords: '쿠폰, 할인, 세일, 이벤트', a: UC.couponText || (COUPON ? '진행 중인 이벤트 페이지에서 쿠폰을 받을 수 있어요.\n받은 쿠폰은 마이쿠폰에서 확인해요.' : '진행 중인 쿠폰은 회원 가입 · 이벤트로 받을 수 있어요.\n받은 쿠폰은 마이쿠폰에서 확인해요.'), buttons: lines2(opt('쿠폰 받으러 가기', COUPON), '내 쿠폰함 /myshop/coupon/coupon.html') },
      { cat: '쿠폰 · 이벤트', q: '쿠폰은 어떻게 써요?', keywords: '쿠폰 사용, 쿠폰 적용, 쿠폰 쓰', a: '주문서의 「할인 · 쿠폰」에서 쿠폰을 골라 적용하면 돼요. 쿠폰마다 사용 기간과 최소 금액이 달라요.', buttons: '내 쿠폰함 /myshop/coupon/coupon.html' },
      { cat: '주문 · 결제', q: '주문 내역을 보고 싶어요', keywords: '주문 조회, 주문 내역, 주문 확인', a: '로그인하시면 주문 조회에서 결제 · 배송 상태를 볼 수 있어요.\n비회원 주문은 주문번호로 조회해요.', buttons: '주문 조회 /myshop/order/list.html' },
      { cat: '주문 · 결제', q: '주문을 취소하고 싶어요', keywords: '취소, 주문 취소', a: '배송 준비 전이라면 주문 조회에서 직접 취소할 수 있어요.\n이미 출고된 주문은 받으신 뒤 반품으로 진행해 주세요.', buttons: '주문 조회 /myshop/order/list.html' },
      { cat: '주문 · 결제', q: '결제는 어떻게 해요?', keywords: '결제, 카드, 무통장, 입금, 계좌', a: '신용카드 · 무통장 입금 등 주문서에 나오는 결제 수단으로 결제할 수 있어요.\n무통장 입금은 주문 후 안내된 계좌로 기한 안에 입금해 주세요.' },
      { cat: '회원 · 적립금', q: '회원 가입 혜택이 있나요?', keywords: '회원가입, 가입, 혜택, 신규', a: '회원이 되시면 회원 전용 쿠폰 · 이벤트에 참여할 수 있고, 구매 금액에 따라 적립금이 쌓여요.', buttons: '회원 가입 /member/agreement.html\n로그인 /member/login.html' },
      { cat: '회원 · 적립금', q: '적립금은 어떻게 써요?', keywords: '적립금, 포인트', a: '쌓인 적립금은 주문서에서 사용할 수 있어요. 적립 내역은 마이페이지에서 확인해요.', buttons: '적립금 내역 /myshop/mileage/historyList.html' },
      { cat: '회원 · 적립금', q: '아이디 · 비밀번호를 잊었어요', keywords: '아이디, 비밀번호, 비번, 로그인 안', a: '아래에서 가입하신 정보로 아이디와 비밀번호를 찾을 수 있어요.', buttons: '아이디 찾기 /member/id/find_id.html\n비밀번호 찾기 /member/passwd/find_passwd_info.html' },
      { cat: '상담원 연결', q: '상담원과 이야기하고 싶어요', keywords: '상담, 상담원, 문의, 연락, 전화, 카톡, 사람', a: '아래 버튼을 누르면 카카오톡으로 상담원과 바로 이야기할 수 있어요.\n운영 시간 : {운영시간}', buttons: '카카오톡 실시간 상담 {상담}' }
    ]
  };

  /* 설정 : 기본값 ← store-content.js 의 helper ← 화면 관리 게시판 글(이 브라우저가 기억한 것) */
  var boardCfg = (get(CFG_KEY) || {}).cfg || null;
  function config() {
    var c = {}, k, sc = UC;
    for (k in BASE) c[k] = BASE[k];
    for (k in sc) if (sc[k] != null && sc[k] !== '') c[k] = sc[k];
    if (boardCfg) for (k in boardCfg) if (k !== 'qna' && boardCfg[k] != null && boardCfg[k] !== '') c[k] = boardCfg[k];
    if (typeof c.faqBoard === 'string') c.faqBoard = parseInt(c.faqBoard, 10) || 0;
    if (Object.prototype.hasOwnProperty.call(sc, 'hours') && !sc.hours) c.hours = '';   // hours: '' = 운영 시간을 보이지 않음 (24시간 상담)
    // 같은 말은 기본 + 설정 + 게시판 글을 모두 합친다 (설정에 몇 줄만 써도 기본 묶음이 사라지지 않게)
    c.synonyms = list(BASE.synonyms).concat(list(sc.synonyms), list(boardCfg && boardCfg.synonyms));
    // 질문과 답 : 사장님이 쓴 것 + (같은 질문이 없는) 기본 답. 답변을 비운 칸은 그 질문을 끄는 표시
    var base = (sc.qna && sc.qna.length ? sc.qna : BASE.qna).concat(sc.addQna || []), own = (boardCfg && boardCfg.qna) || [], have = {};
    // addQna 의 같은 질문은 기본 답을 덮어쓴다 (자리는 기본 답 자리 그대로)
    var at = {}, merged = [];
    base.forEach(function (q) { var k = flat(q.q); if (at[k] != null) merged[at[k]] = q; else { at[k] = merged.length; merged.push(q); } });
    base = merged;
    own.forEach(function (q) { have[flat(q.q)] = 1; });
    c.qnaAll = own.map(function (q) { return copy(q, 'board'); }).concat(base.filter(function (q) { return !have[flat(q.q)]; }).map(function (q) { return copy(q, 'base'); }));
    c.qnaAll.forEach(function (q, i) { q.idx = i; });
    c.qna = c.qnaAll.filter(function (q) { return trim(q.a); });
    return c;
  }
  function copy(q, src) { var o = {}; for (var k in q) if (k.charAt(0) !== '_') o[k] = q[k]; o.src = src; return o; }
  function fill(s) {
    var c = config();
    return String(s || '').replace(c.hours ? /^$/ : /[^\n]*\{운영시간\}[^\n]*\n?/g, '').replace(/\{brand\}/g, brandName()).replace(/\{운영시간\}/g, c.hours || '').replace(/\n+$/, '')   // 운영 시간을 비우면 그 줄을 뺀다
      .replace(/\{무료배송\}/g, FREE ? won(FREE) + '원' : '')
      .replace(/\{(배송비|배송기간|배송방법|교환기간|환불기간)\}/g, function (m, k) { return MALL[k] || MALL_FALLBACK[k](); });   // 카페24 관리자 「이용안내」 값
  }
  /* 카페24 관리자 「이용안내」(쇼핑몰 설정)에 적은 배송비 · 배송 기간 · 교환 · 환불 안내를 이용안내 화면에서 읽는다 (1시간 기억)
     관리자에서 고치면 챗봇 답도 따라 바뀐다. 답변 글에 {배송비} {배송기간} {배송방법} {교환기간} {환불기간} 을 쓰면 채워진다 */
  var MALL = {}, MALL_KEY = 'shop-helper-mallinfo';
  var MALL_FALLBACK = {
    배송비: function () { return FREE ? won(FREE) + '원 이상 구매하시면 무료배송이에요' : '주문서에서 확인할 수 있어요'; },
    배송기간: function () { return '며칠'; }, 배송방법: function () { return '택배'; },
    교환기간: function () { return '7일'; }, 환불기간: function () { return '3영업일'; }
  };
  function loadMallInfo() {
    var c = get(MALL_KEY);
    if (c && Date.now() - c.t < 60 * 60000 && !EDIT) { MALL = c.v || {}; return Promise.resolve(); }
    return fetch(UC.infoPage || '/shopinfo/guide.html', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var d = t && new DOMParser().parseFromString(t, 'text/html'), v = {};
      if (!d) return;
      [].forEach.call(d.querySelectorAll('.xans-mall-faq .ec-base-fold, [module="mall_faq"] .ec-base-fold'), function (box) {
        var h = trim((box.querySelector('h3') || {}).textContent || ''), body = box.querySelector('.contents'), text = body ? textOf(body.innerHTML) : '';
        if (/배송/.test(h)) text.split('\n').forEach(function (l) {
          var m = l.match(/^\s*(배송\s*방법|배송\s*비용|배송\s*기간)\s*[:：]\s*(.+)$/);
          if (m) v[{ '배송방법': '배송방법', '배송비용': '배송비', '배송기간': '배송기간' }[m[1].replace(/\s/g, '')]] = trim(m[2]);
        });
        if (/교환|반품/.test(h)) { var e = text.match(/(\d+)\s*일\s*(이내|안에|까지)?/); if (e) v.교환기간 = e[1] + '일'; }
        if (/환불/.test(h)) { var f = text.match(/(\d+)\s*(영업일|일)/); if (f) v.환불기간 = f[1] + f[2]; }
      });
      MALL = v; put(MALL_KEY, { t: Date.now(), v: v });
    }).catch(function () {});
  }
  function brandName() {
    var m = document.querySelector('meta[property="og:site_name"]');
    return UC.brand || (SC.brand && SC.brand.name) || (m && m.content) || '';
  }
  function contactUrl() {
    var c = config();
    if (/^https?:\/\//.test(c.contact || '')) return c.contact;
    var kk = document.querySelector('[data-s9="kakao"], a[href*="pf.kakao.com/_"]');
    return (kk && /^https?:/.test(kk.href) && kk.href) || (SC.floating && SC.floating.kakao) || 'https://pf.kakao.com/';
  }
  function linkOf(u) {
    u = trim(u);
    if (/^\{?(상담|카카오|카톡)\}?$/.test(u)) return contactUrl();
    if (/^\{?문의\}?$/.test(u)) return config().askLink || '';   // 문의 남기기 주소가 없으면 버튼을 만들지 않는다
    if (/^www\./i.test(u)) u = 'https://' + u;
    return /^(https?:\/\/|\/|#|\?|tel:|mailto:)/i.test(u) ? u : '';
  }
  // 「이름 주소」 한 줄 → { label, href, kind } (주소는 마지막 칸). kind : talk = 카카오톡 상담, ask = 문의 남기기 (상담 넘기기에 쓴다)
  function buttons(v) {
    return list(v).map(function (l) {
      var m = l.match(/^(.*\S)\s+(\S+)$/);
      if (!m) return null;
      var raw = trim(m[2]), href = linkOf(raw);
      var kind = /^\{?(상담|카카오|카톡)\}?$/.test(raw) || /pf\.kakao\.com\//.test(href) ? 'talk' : /^\{?문의\}?$/.test(raw) ? 'ask' : '';
      return href ? { label: m[1], href: href, kind: kind } : null;
    }).filter(Boolean);
  }

  /* ---------- 2. 알아듣기 (AI 없이 : 같은 말 → 키워드 → 낱말 → 글자 쌍) ---------- */
  function flat(s) { return String(s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, ''); }
  function words(s) { return String(s || '').toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').split(/\s+/).filter(Boolean); }
  var TAIL = /(에서는|에서|으로는|으로|까지|부터|에게|한테|이랑|이나|하고|은요|는요|이요|인가요|있나요|되나요|하나요|할까요|나요|까요|어요|아요|해요|예요|이에요|에요|주세요|해줘|알려줘|은|는|을|를|이|가|에|로|와|과|도|만|요)$/;
  function stem(w) { var p; do { p = w; if (w.length > 2 || (w.length === 2 && !/^[가-힣]{2}$/.test(w))) w = w.replace(TAIL, ''); } while (w !== p && w.length > 1); return w; }
  var STOP = { '저': 1, '제가': 1, '좀': 1, '혹시': 1, '그': 1, '이거': 1, '어떻게': 1, '언제': 0, '뭐': 1, '무엇': 1, '하는': 1, '싶어': 1, '싶어요': 1, '궁금': 1, '알고': 1, '방법': 1, '있': 1, '없': 1, '수': 1, '것': 1, '거': 1 };
  var synMap = null, synKey = '';
  function synonyms() {
    var c = config(), key = JSON.stringify(c.synonyms || '');
    if (synMap && key === synKey) return synMap;
    synKey = key; synMap = [];
    list(c.synonyms).forEach(function (line) {
      var g = line.split(/[=,]/).map(flat).filter(Boolean);
      if (g.length > 1) synMap.push({ head: g[0], all: g });
    });
    return synMap;
  }
  // 문장에 들어 있는 「같은 말 묶음」의 대표 말들
  function concepts(text) {
    var f = flat(text), out = {};
    synonyms().forEach(function (g) { if (g.all.some(function (w) { return f.indexOf(w) > -1; })) out[g.head] = 1; });
    return out;
  }
  function grams(s) { var f = flat(s), g = {}; for (var i = 0; i < f.length - 1; i++) g[f.substr(i, 2)] = 1; return g; }
  function dice(a, b) { var n = 0, x = 0, y = 0, k; for (k in a) { x++; if (b[k]) n++; } for (k in b) y++; return x + y ? 2 * n / (x + y) : 0; }
  function prep(item) {
    if (item._p) return item._p;
    var kws = String(item.keywords || '').split(/[,\n/]/).map(flat).filter(function (k) { return k.length > 0; });
    var c = concepts(item.q + ' ' + (item.keywords || ''));
    return (item._p = { q: flat(item.q), kws: kws, words: words(item.q).map(stem).filter(function (w) { return w && !STOP[w]; }), c: c, g: grams(item.q) });
  }
  function score(item, Q) {
    var p = prep(item), s = 0, k;
    if (p.q && p.q === Q.f) return 100;
    p.kws.forEach(function (kw) { if (kw.length > 1 && Q.f.indexOf(kw) > -1) s += 2.5 + Math.min(kw.length, 6) * 0.25; });
    for (k in Q.c) if (p.c[k]) s += 2;
    Q.w.forEach(function (w) {
      if (w.length < 2) return;
      p.words.forEach(function (x) { if (x === w) s += 1.5; else if (x.length > 1 && (x.indexOf(w) > -1 || w.indexOf(x) > -1)) s += 0.7; });
    });
    s += 3 * dice(Q.g, p.g);
    return s * (item.boost || 1);
  }
  function query(text) { return { f: flat(text), w: words(text).map(stem).filter(function (w) { return w && !STOP[w]; }), c: concepts(text), g: grams(text) }; }

  /* ---------- 3. 지식 모으기 ---------- */
  var KB = { faq: [], main: [], cats: [] }, kbLoading = null;
  function textOf(htmlStr) {
    var d = document.createElement('div');
    d.innerHTML = String(htmlStr || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n');
    return d.textContent.split('\n').map(trim).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  // 자주묻는질문 게시판 글 본문 : 「키워드:」 · 「버튼:」 · 「이어서:」 줄을 따로 떼고 나머지가 답
  function fromPost(subject, content, no) {
    var kw = [], btn = [], next = '', rest = [];
    textOf(content).split('\n').forEach(function (l) {
      var m = l.match(/^(키워드|버튼|이어서)\s*[:：]\s*(.*)$/);
      if (m) { if (m[1] === '키워드') kw.push(m[2]); else if (m[1] === '버튼') btn.push(m[2]); else next = m[2]; }
      else if (!/^※/.test(l)) rest.push(l);
    });
    return { q: subject.replace(/^\s*\[[^\]]*\]\s*/, ''), keywords: kw.join(', '), a: rest.join('\n').trim(), buttons: btn.join('\n'), next: next, src: 'faq', no: no };
  }
  /* 게시판 읽기 : inter 화면 관리(inter-cms.js)가 있으면 그것을, 없으면 이 파일의 간단한 읽기로 */
  function articleNo(h) { var m = String(h || '').match(/\/article\/[^/]+\/\d+\/(\d+)/) || String(h || '').match(/[?&]no=(\d+)/); return m ? m[1] : ''; }
  function ownList(board) {
    var all = [], seen = {}, size = 0;
    function page(n) {
      return fetch('/board/free/list.html?board_no=' + board + '&page=' + n, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
        var doc = new DOMParser().parseFromString(t, 'text/html'), got = [];
        doc.querySelectorAll('a[href*="/article/"], a[href*="read.html"]').forEach(function (a) {
          var no = articleNo(a.getAttribute('href')), sub = trim(a.textContent);
          if (no && sub && !seen[no]) { seen[no] = 1; got.push({ no: no, subject: sub, href: a.getAttribute('href') }); }
        });
        all = all.concat(got);
        if (n === 1) size = got.length;
        if (!got.length || got.length < size || size < 5 || n >= 8) return;
        return new Promise(function (r) { setTimeout(r, 250); }).then(function () { return page(n + 1); });
      });
    }
    return page(1).then(function () { return all; }).catch(function () { return all; });
  }
  function ownRead(p, board) {
    return fetch(p.href, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var box = t && new DOMParser().parseFromString(t, 'text/html').querySelector('[data-inter-content], [module^="board_read"] .detail, .boardView .detail, .detail');
      if (box && box.innerHTML.trim()) return { content: box.innerHTML };
      return fetch('/exec/front/board/product/' + board + '?no=' + p.no + '&board_no=' + board + '&pass_check=F', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); }).then(function (d) { return d && d.read ? { content: String(d.read.content || '') } : null; });
    }).catch(function () { return null; });
  }
  var BOARD = {
    list: function (b) { return CMS && CMS.listBoard ? CMS.listBoard(b) : ownList(b); },
    read: function (p, b) { return CMS && CMS.readPost ? CMS.readPost(p, b) : ownRead(p, b); }
  };
  function loadFaq() {
    var c = config(), board = c.faqBoard;
    var cached = get(KB_KEY);
    if (cached && cached.board === board && Date.now() - cached.t < KB_TTL && !EDIT) { KB.faq = cached.items || []; return Promise.resolve(); }
    if (!board) { KB.faq = []; return Promise.resolve(); }
    return BOARD.list(board).then(function (posts) {
      posts = posts.slice(0, 80);
      var old = {}, items = [], i = 0;
      ((cached && cached.items) || []).forEach(function (x) { old[x.no] = x; });
      function worker() {
        if (i >= posts.length) return Promise.resolve();
        var p = posts[i++];
        if (old[p.no] && old[p.no].q === p.subject.replace(/^\s*\[[^\]]*\]\s*/, '') && !EDIT) { items.push(old[p.no]); return worker(); }
        return BOARD.read(p, board).then(function (b) { if (b && b.content) items.push(fromPost(p.subject, b.content, p.no)); return worker(); });
      }
      return Promise.all([worker(), worker()]).then(function () {
        KB.faq = items.filter(function (x) { return x.q && x.a; });
        put(KB_KEY, { t: Date.now(), board: board, items: KB.faq });
      });
    }).catch(function () { KB.faq = (cached && cached.items) || []; });
  }
  // 메인 「자주 묻는 질문」 : 메인이면 화면에서, 아니면 메인 화면 관리 기억(inter-cms-v2-…-/)에서
  function loadMain() {
    var box = document.querySelector('[data-cms="자주 묻는 질문"]');
    if (box) {
      KB.main = Array.from(box.querySelectorAll('details')).map(function (d) {
        var s = d.querySelector('summary'), a = d.querySelector('[data-cms-text="답변"]') || d.querySelector('p');
        var link = a && a.querySelector('a[href]');
        return s && a ? { q: trim(s.textContent), a: textOf(a.innerHTML), buttons: link ? trim(link.textContent) + ' ' + link.getAttribute('href') : '', src: 'main' } : null;
      }).filter(Boolean);
      put(KB_KEY + '-main', KB.main);
    } else KB.main = get(KB_KEY + '-main') || [];
  }
  // 상품 분류 : 머리글 메뉴의 분류 링크 (이름 → 주소)
  function loadCats() {
    var seen = {};
    KB.cats = Array.from(document.querySelectorAll('header a[href*="cate_no="], #header a[href*="cate_no="], .xans-layout-category a[href*="cate_no="]')).map(function (a) {
      var t = trim(a.textContent).replace(/\s*(new|best|sale)?\s*$/i, ''), f = flat(t);
      if (!f || f.length > 12 || seen[f]) return null;
      seen[f] = 1;
      return { label: t, f: f, href: a.getAttribute('href') };
    }).filter(Boolean);
  }
  function loadAll() {
    if (!kbLoading) {
      loadMain(); loadCats();
      kbLoading = Promise.all([loadFaq(), refreshCfg(), loadMallInfo()]).catch(function () {});
    }
    return kbLoading;
  }
  // 화면 관리 영역이 없는 페이지(상품 상세 등)에서 처음 열면 게시판 설정 글을 읽어 온다
  /* 설정 게시판 글 「[모든 페이지] 쇼핑 도우미」 본문 → 설정 (inter-cms.js 없이 쓸 때)
     「칸 이름: 값」 줄, 다음 줄은 이어 쓰기, 「── 1번 ──」 부터는 질문과 답 묶음 */
  var F_TOP = { '보이기': 'enabled', '이름': 'name', '인사말': 'greeting', '메뉴': 'menu', '못찾았을때': 'fallback', '운영시간': 'hours', '상담연결주소': 'contact', '문의남기기주소': 'askLink', '배울게시판번호': 'faqBoard', '같은말': 'synonyms' };
  var F_ITEM = { '분류': 'cat', '질문': 'q', '키워드': 'keywords', '답변': 'a', '버튼': 'buttons', '이어서': 'next' };
  function parseSettings(htmlStr) {
    var o = { qna: [] }, cur = o, key = null;
    textOf(htmlStr).split('\n').forEach(function (l) {
      if (/^※/.test(l)) return;
      if (/^[\s─━—\-=]*\d{1,2}\s*번/.test(l)) { cur = {}; o.qna.push(cur); key = null; return; }
      var m = l.match(/^([^:：]{1,14})\s*[:：]\s?(.*)$/), map = cur === o ? F_TOP : F_ITEM, k = m && map[m[1].replace(/\s/g, '')];
      if (k) { key = k; cur[k] = m[2]; } else if (key && trim(l)) cur[key] += '\n' + l;
    });
    if (o.enabled != null) o.enabled = !/^(아니|아니오|아니요|숨김|끔|no|off|false)$/i.test(trim(o.enabled));
    o.qna = o.qna.filter(function (q) { return trim(q.q || ''); });
    return o;
  }
  function refreshCfg() {
    var c0 = get(CFG_KEY), sb = UC.settingsBoard;
    if (!CMS && sb && !(c0 && Date.now() - c0.t < CFG_TTL)) {
      return ownList(sb).then(function (posts) {
        var p = posts.filter(function (x) { return x.subject.replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\s/g, '') === NAME.replace(/\s/g, ''); }).sort(function (a, b) { return b.no - a.no; })[0];
        if (!p) { put(CFG_KEY, { t: Date.now(), cfg: null }); return; }
        return ownRead(p, sb).then(function (b) { if (b) { var o = parseSettings(b.content); put(CFG_KEY, { t: Date.now(), cfg: o }); api.setBoardConfig(o); } });
      });
    }
    var c = get(CFG_KEY);
    if ((c && Date.now() - c.t < CFG_TTL && !EDIT) || !CMS || !CMS.fetchData || document.querySelector('[data-cms="' + NAME + '"]')) return Promise.resolve();
    return CMS.fetchData(NAME, CMS.helperLabels()).then(function (data) {
      if (data) CMS.applyHelper(data); else put(CFG_KEY, { t: Date.now(), cfg: null });
    });
  }
  var itemsCache = null, itemsKey = '';
  function allItems() {
    var c = config(), key = JSON.stringify([c.qna, KB.faq.length, KB.main.length, c.synonyms]);
    if (itemsCache && key === itemsKey) return itemsCache;   // prep() 결과(_p)를 다시 쓰도록 같은 내용이면 그대로
    itemsKey = key;
    return (itemsCache = c.qna.concat(KB.faq.map(function (x) { x.boost = 1.05; return x; }), KB.main));
  }

  /* ---------- 4. 답 고르기 ---------- */
  var SEARCH = /(찾아|찾고|찾는|있나요|있어요|있을까|파나요|팔아요|보여|추천|사고\s*싶|사려|살래|구해|구매하려|어딨|어디\s*있)/;
  // 상품 검색어에서 뺄 말 (동사 · 묻는 말)
  var VERB = /(싶|하고|해요|했|하려|받고|받을|드려|주세요|줘|있|없|되|돼|나요|까요|어요|아요|인가|이에요|예요|얼마|어떻게|언제|왜|뭐|무슨)/;
  function answer(text) {
    var Q = query(text), items = allItems(), ranked = items.map(function (it) { return { it: it, s: score(it, Q) }; })
      .filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    var cats = KB.cats.filter(function (c) { return Q.f.indexOf(c.f) > -1; });
    var best = ranked[0], res = { q: text };
    if (best && best.s >= 3) {
      res.item = best.it;
      res.also = ranked.slice(1, 4).filter(function (r) { return r.s >= Math.max(3, best.s * 0.7) && flat(r.it.q) !== flat(best.it.q); }).map(function (r) { return r.it.q; }).slice(0, 2);
    } else {
      res.suggest = ranked.filter(function (r) { return r.s >= 1.2; }).slice(0, 3).map(function (r) { return r.it.q; });
    }
    // 분류 이름이 들어 있으면 그 분류로, 「찾아요 · 있나요」처럼 물건을 찾는 말이면 상품 검색으로 이어 준다
    res.links = cats.slice(0, 2).map(function (c) { return { label: c.label + ' 보러 가기', href: c.href }; });
    var kw = words(text).filter(function (w) { return w.length > 1 && !SEARCH.test(w) && !VERB.test(w) && !STOP[w]; }).map(stem).slice(0, 2).join(' ');
    // 물건을 찾는 말(「코트 있나요」 · 「니트 추천」)이거나, 답이 없는 짧은 낱말(「트렌치코트」)일 때만 상품 검색으로 잇는다
    var short = words(text).length <= 2 && !VERB.test(text);
    if (kw && !cats.length && (SEARCH.test(text) || (!res.item && short))) res.links.push({ label: '「' + kw + '」 상품 찾아보기', href: '/product/search.html?keyword=' + encodeURIComponent(kw) });
    return res;
  }

  /* ---------- 4-2. 이동 경로 : 본 상품 · 분류 · 검색어를 이 브라우저에만 남긴다 (서버로 보내지 않음) ---------- */
  var TRAIL_KEY = 'shop-helper-trail', TRAIL_ON = UC.trail !== false, TRAIL_MAX = 40, TRAIL_DAYS = 30;
  function meta(n) { var m = document.querySelector('meta[property="' + n + '"], meta[name="' + n + '"]'); return m ? trim(m.content) : ''; }
  function pageTitle() { return trim(String(document.title || '').split(/\s[-|–]\s/)[0]); }
  function pageInfo() {
    var p = location.pathname, s = location.search;
    var no = (s.match(/[?&]product_no=(\d+)/) || p.match(/^\/product\/[^/]+\/(\d+)(\/|$)/) || [])[1];
    if (no && /^\/product\/(detail\.html|[^/]+\/\d+)/.test(p)) {
      var h = document.querySelector('.headingArea h2, .infoArea .headingArea h2, #span_product_name');
      var price = meta('product:sale_price:amount') || meta('product:price:amount');
      return { k: 'product', no: no, n: trim(h ? h.textContent : '') || trim(meta('og:title').split(/\s[-|–]\s/)[0]) || pageTitle(), p: price ? won(price) + '원' : '', img: meta('og:image') };
    }
    if (/^\/product\/list\.html/.test(p) || /^\/category\//.test(p)) {
      var t = document.querySelector('.titleArea h2, .xans-product-headcategory h2, .xans-product-headcategory .title');
      return { k: 'category', n: trim(t ? t.textContent : '') || pageTitle() };
    }
    if (/^\/product\/search\.html/.test(p)) { var kw = (s.match(/[?&]keyword=([^&]*)/) || [])[1]; try { kw = kw ? decodeURIComponent(kw.replace(/\+/g, ' ')) : ''; } catch (e) { kw = ''; } return kw ? { k: 'search', n: kw } : null; }
    if (p === '/' || /^\/index\.html/.test(p)) return { k: 'main', n: '메인' };
    if (/^\/order\/basket/.test(p)) return { k: 'cart', n: '장바구니' };
    if (/^\/order\/orderform/.test(p)) return { k: 'order', n: '주문서 작성' };
    if (/^\/order\/order_result/.test(p)) return { k: 'order', n: '주문 완료' };
    if (/^\/(member|myshop)\//.test(p)) return null;   // 회원 · 마이페이지 화면은 남기지 않는다
    return { k: 'page', n: pageTitle() };
  }
  function trailItems() { var now = Date.now(); return (get(TRAIL_KEY) || []).filter(function (x) { return x && x.n && now - x.t < TRAIL_DAYS * 864e5; }); }
  function record() {
    if (!TRAIL_ON || EDIT) return;
    var i = pageInfo(); if (!i || !i.n || (i.k === 'page' && flat(i.n) === flat(brandName()))) return;   // 제목이 쇼핑몰 이름뿐인 화면은 남기지 않는다
    i.t = Date.now(); i.u = i.k === 'page' ? location.pathname : location.pathname + location.search;
    var a = trailItems(), last = a[a.length - 1];
    if (last && last.u === i.u) last.t = i.t; else a.push(i);
    put(TRAIL_KEY, a.slice(-TRAIL_MAX));
  }

  /* 회원 : 머리글의 로그아웃 링크로 로그인 여부, 이름은 layout.html 의 <span id="whMember" module="Layout_stateLogon">{$name}</span>,
     아이디는 손님이 상담 넘기기를 고를 때만 회원정보 수정 화면에서 읽는다 (이 브라우저 안에서만) */
  var MEM_KEY = 'shop-helper-member';
  function isMember() { return [].some.call(document.querySelectorAll('a[href]'), function (a) { return /logout/i.test(a.getAttribute('href') || ''); }); }
  function memberName() { var e = document.getElementById('whMember'), t = trim(e ? e.textContent : ''); return /\{\$/.test(t) ? '' : t.replace(/\s*님$/, ''); }
  // 카페24가 쇼핑몰 화면에 주는 회원 정보 (아이디 · 이름 · 휴대폰 · 이메일 · 등급 · 가입일) — 안 되면 회원정보 수정 화면에서 읽는다
  function strOf(v) { return v == null ? '' : typeof v === 'object' ? [].concat.apply([], Object.keys(v).map(function (k) { return v[k]; })).filter(Boolean).join('-') : trim(String(v)); }
  function memberInfo() {
    if (!isMember() && !TRACK) return Promise.resolve({ on: false });
    // 기억해 두지 않고 매번 묻는다 : 같은 탭에서 다른 아이디로 다시 로그인해도 지금 회원으로 남긴다
    try { store('sessionStorage').removeItem(MEM_KEY); } catch (e) {}
    return asyncMod('member').then(function (j) {
      var m = (j && j.memberData) || {};
      if (!m.id) throw new Error('no member');
      var info = { v: 3, sms: strOf(m.sms), mail: strOf(m.news_mail), on: true, id: strOf(m.id), name: strOf(m.name) || memberName(), phone: strOf(m.cellphone) || strOf(m.phone), email: strOf(m.email), group: strOf(m.group_name), joined: strOf(m.created_date).slice(0, 10) };
      return memberAddr().then(function (a) { info.addr = a; return info; });
    }).catch(TRACK ? function () { return { on: false }; } : memberInfoPage);
  }
  // 주소 : 카페24가 회원 정보에 주소를 주지 않아 회원정보 수정 화면의 주소 칸에서 읽는다 (비밀번호 확인 화면 · 관리자 계정이면 빈칸)
  function addrOf(d, z, a1, a2) {
    var v = function (s) { var e = d.querySelector(s); return e ? trim(e.value || '') : ''; };
    var zip = v(z), one = v(a1), two = v(a2);
    return one ? (zip ? '(' + zip + ') ' : '') + one + (two ? ' ' + two : '') : '';
  }
  function memberAddr() {
    return fetch('/member/modify.html', { credentials: 'same-origin' }).then(function (r) { return r.ok && !/login|check_password/i.test(r.url) ? r.text() : ''; }).then(function (t) {
      if (!t) return '';
      var d = new DOMParser().parseFromString(t, 'text/html');
      return addrOf(d, '#postcode1, input[name="postcode1"], #zipcode1', '#addr1, input[name="addr1"]', '#addr2, input[name="addr2"]');
    }).catch(function () { return ''; });
  }
  // 주문서의 받는 분 주소 (배송지)
  function shipAddr() { return addrOf(document, '#rzipcode1, input[name="rzipcode1"]', '#raddr1, input[name="raddr1"]', '#raddr2, input[name="raddr2"]'); }
  function memberInfoPage() {
    return fetch('/member/modify.html', { credentials: 'same-origin' }).then(function (r) { return r.ok && !/login|check_password/i.test(r.url) ? r.text() : ''; }).then(function (t) {
      var d = t && new DOMParser().parseFromString(t, 'text/html'), f = d && d.querySelector('input[name="member_id"], #member_id'), n = d && d.querySelector('input[name="name"], #name');
      return { on: true, id: trim(f ? (f.value || f.textContent) : ''), name: memberName() || trim(n ? n.value : '') };
    }).catch(function () { return { on: true, id: '', name: memberName() }; });
  }

  /* 회원의 쇼핑 정보 : 누적 주문 · 주문 상태 · 적립금 · 관심상품 (카페24 /exec/front/manage/async),
     장바구니 상품 (/order/basket.html) · 최근 주문 (/myshop/order/list.html, 최근 3개월) — 회원이 상담을 넘길 때만 읽는다 */
  function asyncMod(m) {
    return fetch('/exec/front/manage/async?module=' + m, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) { return j ? j[m] : null; });
  }
  function asyncSafe(m) { return asyncMod(m).catch(function () { return null; }); }
  function pageDoc(u) {
    return fetch(u, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { return t ? new DOMParser().parseFromString(t, 'text/html') : null; }).catch(function () { return null; });
  }
  function prodNoOf(href) { var m = String(href || '').match(/[?&]product_no=(\d+)/) || String(href || '').match(/\/product\/[^/?#]+\/(\d+)(\/|$|\?)/); return m ? m[1] : ''; }
  function txtOf(el) { return el ? trim(el.textContent.replace(/\s+/g, ' ')) : ''; }
  function wonOf(v) { var n = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? '' : won(n) + '원'; }
  function numOf(v) { var n = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; }
  // light : 주문서 · 결제 완료 기록은 손님이 곧 화면을 떠날 수 있어 무거운 화면(장바구니 · 주문 목록)은 읽지 않는다
  function shopInfo(light) {
    var no = function () { return Promise.resolve(null); };
    return Promise.all([asyncSafe('Order'), asyncSafe('Ordercnt'), asyncSafe('Mileage'), asyncSafe('Basketcnt'), asyncSafe('Basketprice'), asyncSafe('Wishcount'),
      light ? no() : pageDoc('/order/basket.html'), light ? no() : pageDoc('/myshop/order/list.html')]).then(function (r) {
      var o = { light: !!light, order: r[0] || {}, cnt: r[1] || null, mileage: r[2] || {}, basketCnt: r[3], basketPrice: r[4], wish: r[5], basket: [], orders: [] };
      if (r[6]) [].forEach.call(r[6].querySelectorAll('.xans-order-basketpackage .ec-base-prdInfo .prdBox'), function (b) {
        var name = txtOf(b.querySelector('.prdName a') || b.querySelector('.prdName')); if (!name) return;
        var opt = [].map.call(b.querySelectorAll('.optionGroup .optionStr'), txtOf).filter(Boolean).join(' / ');
        var q = b.querySelector('.quantity input'), qty = q && q.value ? q.value : ((txtOf(b.querySelector('.optionGroup')).match(/\((\d+)개\)/) || [])[1] || '');
        o.basket.push({ n: name, opt: opt, qty: qty, p: txtOf(b.querySelector('.sumPrice strong')).replace(/^([\d,]+)$/, '$1원'), no: prodNoOf((b.querySelector('.thumbnail a') || b.querySelector('.prdName a') || {}).href) });
      });
      if (r[7]) [].forEach.call(r[7].querySelectorAll('.xans-myshop-orderhistorylistitem .order'), function (b) {
        var name = txtOf(b.querySelector('.prdName a') || b.querySelector('.prdName')); if (!name || o.orders.length >= 8) return;
        var link = b.querySelector('.thumbnail a') || b.querySelector('.prdName a'), exp = b.querySelector('.deliveryDate'), num = b.querySelector('.number a');
        o.orders.push({ d: txtOf(b.querySelector('.date')), id: txtOf(b.querySelector('.number')).replace(/[()]/g, ''), n: name, opt: txtOf(b.querySelector('p.optionGroup')),
          qty: (txtOf(b.querySelector('.qty')).match(/\d+/) || [''])[0], p: txtOf(b.querySelector('.price strong')).replace(/^([\d,]+)$/, '$1원'), st: txtOf(b.querySelector('.txtStatus')),
          no: prodNoOf(link && link.getAttribute('href')), exp: exp && !/displaynone/.test(exp.className) ? txtOf(exp).replace(/\s*발송예정$/, '') : '', detail: num ? num.getAttribute('href') : '' });
      });
      // 배송 중 · 배송 완료 주문은 주문 상세에서 택배사 · 송장번호를 읽는다 (최근 3건 · 카페24는 실제 발송일 · 도착일을 쇼핑몰 화면에 주지 않는다)
      var need = o.orders.filter(function (x) { return x.detail && /배송|완료/.test(x.st) && !/준비/.test(x.st); }).slice(0, 3);
      return Promise.all(need.map(function (x) {
        return pageDoc(x.detail).then(function (d) {
          var box = d && d.querySelector('.prdBox'); if (!box) return;
          var inv = txtOf(box).match(/\[(\d{8,})\]/); if (inv) x.inv = inv[1];
          var co = [].filter.call(box.querySelectorAll('li a[href]'), function (a) { return !/displaynone/.test(a.parentNode.className) && /^https?:/.test(a.getAttribute('href') || '') && txtOf(a); })[0];
          if (co) x.co = txtOf(co);
        });
      })).then(function () { return o; });
    }).catch(function () { return null; });
  }
  function shopLines(s) {
    if (!s) return [];
    var out = [], c = s.cnt;
    out.push('구매 요약 : 누적 주문 ' + numOf(s.order.total_order_count) + '번 · 누적 구매 ' + (wonOf(s.order.total_order_price) || '0원') + ' · 적립금 ' + (wonOf(s.mileage.avail_mileage) || '0원') + ' · 관심상품 ' + numOf(s.wish) + '개');
    if (c) out.push('주문 상태 : 입금 전 ' + numOf(c.shipped_before_count) + ' · 배송 준비 ' + numOf(c.shipped_standby_count) + ' · 배송 중 ' + numOf(c.shipped_begin_count) + ' · 배송 완료 ' + numOf(c.shipped_complate_count)
      + ' · 취소 ' + numOf(c.order_cancel_count) + ' · 교환 ' + numOf(c.order_exchange_count) + ' · 반품 ' + numOf(c.order_return_count));
    if (s.light) return out;   // 주문서 · 결제 완료 기록 : 주문서 상품이 따로 있다
    out.push('', '최근 주문 (최근 3개월)');
    if (s.orders.length) s.orders.forEach(function (x) {
      out.push('· ' + x.d + ' (' + x.id + ') ' + x.n + (x.opt ? ' [' + x.opt + ']' : '') + (x.qty ? ' ' + x.qty + '개' : '') + (x.p ? ' ' + x.p : '') + ' — ' + (x.st || '-') +
        (x.no ? ' (상품번호 ' + x.no + ')' : '') + (x.co || x.inv ? ' · 택배 ' + (x.co || '') + (x.inv ? ' ' + x.inv : '') : '') + (x.exp ? ' · 발송예정 ' + x.exp : ''));
    });
    else out.push('· 없음');
    out.push('', '장바구니 (' + numOf(s.basketCnt) + '개 · ' + (wonOf(s.basketPrice) || '0원') + ')');
    if (s.basket.length) s.basket.forEach(function (x) { out.push('· ' + x.n + (x.opt ? ' [' + x.opt + ']' : '') + (x.qty ? ' ' + x.qty + '개' : '') + (x.p ? ' ' + x.p : '') + (x.no ? ' (상품번호 ' + x.no + ')' : '')); });
    else out.push('· 비어 있음');
    return out;
  }

  /* 상담 참고 글 : 회원 정보 · 스타일 추천 결과 · 최근 본 상품 · 둘러본 순서 */
  function when(t) { var d = new Date(t), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function stepName(x) { return x.k === 'search' ? '검색 「' + x.n + '」' : x.n; }
  function summary(mem) {
    var a = trailItems(), out = ['[상담 참고 · ' + (brandName() ? brandName() + ' ' : '') + '쇼핑 도우미]'];
    out.push(mem && mem.on ? '회원' + (mem.name ? ' ' + mem.name : '') + (mem.id ? ' (아이디 ' + mem.id + ')' : '') : '비회원');
    if (mem && mem.on) {
      if (mem.phone) out.push('휴대폰 : ' + mem.phone);
      if (mem.email) out.push('이메일 : ' + mem.email);
      if (mem.addr) out.push('주소 : ' + mem.addr);
      if (mem.ship && mem.ship !== mem.addr) out.push('배송지 : ' + mem.ship);
      if (mem.group || mem.joined) out.push('회원 등급 : ' + (mem.group || '-') + (mem.joined ? ' · 가입 ' + mem.joined : ''));
      if (mem.sms || mem.mail) out.push('수신 동의 : 문자 ' + (mem.sms === 'T' ? '동의' : '거부') + ' · 메일 ' + (mem.mail === 'T' ? '동의' : '거부'));   // 광고성 문자 · 메일은 동의한 손님에게만
    }
    if (mem && mem.paid) out.push('결제 완료 : 주문번호 ' + (mem.paid.id || '-') + (mem.paid.total ? ' · ' + mem.paid.total : ''));
    if (mem && mem.qna) {
      var qa = mem.qna;
      out.push('', '상품 문의 : ' + qa.subject);
      if (qa.no || qa.pname) out.push('· 상품 : ' + (qa.pname || '-') + (qa.no ? ' (상품번호 ' + qa.no + ')' : ''));
      if (qa.href) out.push('· 글 : ' + qa.href);
      if (qa.body) out.push('· 내용 : ' + qa.body.replace(/\s*\n\s*/g, ' / '));
      out.push('');
    }
    if (mem && mem.orderform && mem.orderform.items.length) {
      out.push('', '주문서 상품 (결제 예정 ' + (mem.orderform.total || '-') + ')');
      mem.orderform.items.forEach(function (x) { out.push('· ' + x.n + (x.opt ? ' [' + x.opt + ']' : '') + (x.qty ? ' ' + x.qty + '개' : '') + (x.p ? ' ' + x.p : '') + (x.no ? ' (상품번호 ' + x.no + ')' : '')); });
      out.push('');
    }
    var st = get(STYLE_KEY);
    if (st && Date.now() - st.t < 7 * 864e5) out.push('스타일 추천 : ' + st.labels.join(' · '));
    var shop = mem && mem.on && shopLines(mem.shop);
    if (shop && shop.length) out = out.concat(shop);
    var seen = {}, prods = a.slice().reverse().filter(function (x) { if (x.k !== 'product' || seen[x.no]) return false; seen[x.no] = 1; return true; }).slice(0, 6);
    if (prods.length) {
      out.push('', '최근 본 상품 (최신순)');
      prods.forEach(function (x) { out.push('· ' + x.n + (x.p ? ' ' + x.p : '') + ' (상품번호 ' + x.no + ') ' + when(x.t)); });
    }
    var path = a.slice(-12);
    if (path.length) out.push('', '둘러본 순서', path.map(stepName).join(' → '));
    var hist = consultLines();
    if (hist.length) { out.push(''); out = out.concat(hist); }
    return out.join('\n');
  }

  /* ---------- 4-5. 상담 이력 : 챗봇에서 한 일을 이 브라우저에 남긴다 (30분 안에 이어지면 같은 상담) ---------- */
  var CONSULT_KEY = 'shop-helper-consult', GAP = 30 * 60000;
  var EV = { menu: '메뉴', q: '질문', miss: '못 찾은 질문', style: '스타일 추천', talk: '카카오톡 상담 연결', ask: '문의 남기기' };
  function sessions() { return (get(CONSULT_KEY) || []).filter(function (s) { return s && s.items && s.items.length; }); }
  function logEvent(k, n) {
    if (!TRAIL_ON || EDIT || !n) return;
    var a = sessions(), now = Date.now(), s = a[a.length - 1];
    if (!s || now - s.e > GAP) { s = { s: now, e: now, items: [] }; a.push(s); }
    var last = s.items[s.items.length - 1];
    if (!(last && last.k === k && last.n === n)) s.items.push({ t: now, k: k, n: String(n).slice(0, 80) });
    s.items = s.items.slice(-30); s.e = now;
    put(CONSULT_KEY, a.slice(-30));
    if (/^(q|miss|style)$/.test(k)) chatLogLater();
  }
  /* 회원이 챗봇에 묻기만 하고 끝난 대화도 상담 기록으로 남긴다 (대화 한 번 = 글 하나) :
     챗봇을 닫을 때 · 1분 30초 동안 더 묻지 않을 때 · 다른 화면으로 넘어간 뒤 (그 화면에서) */
  var chatTimer = 0;
  function asked(s) { return s.items.filter(function (x) { return /^(q|miss|style)$/.test(x.k); }).length; }
  // 아직 기록하지 않은 질문이 있는 대화 (기록한 뒤 더 물으면 그 뒤로 한 번 더)
  function chatPending() {
    var a = sessions(), s = a[a.length - 1];
    return s && Date.now() - s.e < 864e5 && asked(s) > (+s.logged || 0) ? s : null;
  }
  function chatLogLater(ms) {
    if (!TRAIL_ON || !LOG_ON || EDIT || !isMember()) return;
    clearTimeout(chatTimer); chatTimer = setTimeout(chatLog, ms == null ? 90000 : ms);
  }
  function markLogged() {
    var a = sessions(); if (!a.length) return;
    var s = a[a.length - 1]; s.logged = asked(s); put(CONSULT_KEY, a.slice(-30));
  }
  /* 주문서까지 온 회원 : 주문서 화면에 들어오면 「주문서」 기록 (주문서 상품 · 결제 예정 금액 · 연락처 · 구매 요약),
     결제를 마치면 「결제 완료」 기록 → 상담 기록 목록에서 미결제 손님만 골라 연락한다 (같은 상품이면 30분에 한 번) */
  var OFORM_KEY = 'shop-helper-orderform';
  function orderformItems() {
    var root = document.getElementById('mCafe24Order') || document, seen = {}, items = [];
    [].forEach.call(root.querySelectorAll('.prdBox'), function (b) {
      var name = txtOf(b.querySelector('.ec-product-name') || b.querySelector('.prdName')); if (!name) return;
      var t = txtOf(b), qty = (t.match(/(\d+)\s*개/) || [])[1] || '', prices = t.match(/[\d,]+\s*원/g) || [];
      var opt = txtOf(b.querySelector('.optionItem')).replace(/\(?\s*\d+\s*개\s*\)?/g, '').replace(/^[\s\-\[\]]+|[\s\-\[\]]+$/g, '');
      var a = b.querySelector('.thumbnail a, a.ec-product-name, .prdName a'), item = { n: name, opt: opt, qty: qty, p: (prices.pop() || '').replace(/\s/g, ''), no: prodNoOf(a && a.getAttribute('href')) };
      var key = item.n + '|' + item.opt + '|' + item.qty; if (seen[key]) return; seen[key] = 1;
      items.push(item);
    });
    var tot = txtOf(document.getElementById('total_order_sale_price_view') || document.getElementById('payment_total_order_sale_price_view'));
    return { items: items, total: tot ? tot.replace(/원?$/, '원') : '' };
  }
  function orderLog(kind) {
    if (!TRAIL_ON || !LOG_ON || EDIT || (!TRACK && !isMember())) return;   // 주문서 · 결제 완료 화면은 로그아웃 링크가 없다 → 회원 여부는 memberInfo 가 가린다
    var extra = {};
    if (kind === 'order') {
      var of = orderformItems(); if (!of.items.length) return;
      extra.orderform = of;
      extra.sig = of.items.map(function (x) { return x.n + x.opt + x.qty; }).join('/');   // 같은 회원 · 같은 주문서는 30분에 한 번 (아래에서 아이디와 함께 본다)
    } else {
      var body = txtOf(document.querySelector('#contents, .xans-order-result, body'));
      var oid = (body.match(/주문번호\s*:?\s*(\d{8}-\d{5,})/) || body.match(/(\d{8}-\d{7})/) || [])[1] || '';
      var done = get(OFORM_KEY + '-paid'); if (done && done.id === oid && oid) return;
      put(OFORM_KEY + '-paid', { id: oid, t: Date.now() });
      extra.paid = { id: oid, total: (body.match(/최종\s*결제\s*금액\s*:?\s*([\d,]+\s*원)/) || [])[1] || '' };
    }
    memberInfo().then(function (mem) {
      if (!mem || !mem.on) return;
      if (extra.sig) {
        var sig = mem.id + '|' + extra.sig, last = get(OFORM_KEY);
        if (last && last.sig === sig && Date.now() - last.t < 30 * 60000) return;   // 같은 회원이 같은 주문서로 새로고침 · 다시 들어옴
        put(OFORM_KEY, { sig: sig, t: Date.now() });
      }
      return shopInfo(true).then(function (sh) {
        var m = {}; for (var k in mem) m[k] = mem[k]; m.shop = sh; for (var e in extra) if (e !== 'sig') m[e] = extra[e];
        if (kind === 'order') m.ship = shipAddr();
        var sent = saveLog(m, kind, summary(m));
        if (sent && SHEET && kind === 'order') shopInfo(false).then(function (full) {
          if (!full) return; m.shop = full; m.ship = shipAddr() || m.ship;   // 손님이 그사이 배송지를 고쳤으면 고친 주소로
          sendSheet({ type: 'log', replace: true, id: sent.id, kind: kind, subject: sent.subject, name: m.name || '', uid: m.id || '', phone: m.phone || '', email: m.email || '', text: summary(m) });
        });
      });
    }).catch(function () {});
  }
  /* 상품 문의 : 회원이 상품 Q&A 게시판에 글을 올리면 그 회원 기록으로 남긴다 (관리자 페이지 「상품 문의」 탭은 게시판 목록을 직접 읽는다)
     글쓰기 화면에서 [등록]을 누를 때 제목 · 내용 · 상품을 기억 → 다음 화면에서 게시판 목록에 그 글이 올라온 것을 확인하고 보낸다 */
  var QNA_KEY = 'shop-helper-qna';
  function qnaBoardNo() { var n = parseInt(UC.qnaBoard, 10); if (n) return n; var m = String(UC.askLink || '').match(/board_no=(\d+)/); return m ? +m[1] : 6; }
  function qnaListUrl(n) { return '/board/product/list.html?board_no=' + qnaBoardNo() + (n > 1 ? '&page=' + n : ''); }
  // 관리자가 쓴 글인가 : 작성자가 관리자 · 운영자 · 쇼핑몰 아이디 · 쇼핑몰 이름 (설정 adminName 으로 더 넣을 수 있다)
  function isAdminWriter(w) {
    var n = function (v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }, me = n(w);
    return !!me && ['관리자', '운영자', SHOP.split('.')[0], brandName() || ''].concat(UC.adminName || []).some(function (x) { return n(x) === me; });
  }
  // 게시판 목록 한 쪽 → 문의 글들 (관리자가 쓴 답변 글은 바로 앞 질문에 「답변 완료」로 붙인다 · 댓글은 답변으로 치지 않는다)
  function qnaRows(d) {
    var out = [];
    [].forEach.call(d.querySelectorAll('tbody[class*="xans-board-list"] > tr'), function (tr) {
      var sub = tr.querySelector('td.subject'), a = sub && (sub.querySelector('a[href*="/article/"]') || sub.querySelector('a[href]')); if (!a) return;
      var tds = [].slice.call(tr.children), di = -1;
      tds.forEach(function (td, i) { if (di < 0 && /\d{4}-\d{2}-\d{2}/.test(txtOf(td))) di = i; });
      var date = di > -1 ? (txtOf(tds[di]).match(/\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?/) || [''])[0] : '';
      var wtd = di > 0 ? tds.slice(0, di).filter(function (td) { return !/displaynone/.test(td.className); }).pop() : null;
      var img = tr.querySelector('td.thumb img'), pl = tr.querySelector('td.thumb a[href]'), src = img ? img.getAttribute('src') || '' : '';
      // 글 주소 : 카페24는 몇 쪽에서 눌렀는지를 주소에 붙인다 (/article/…/46/page/2/) → 떼어 내야 같은 글로 본다 (없는 쪽을 물으면 마지막 쪽을 다시 준다)
      var row = { href: a.getAttribute('href').replace(/[?#].*$/, '').replace(/\/page\/\d+\/?$/, '/'), subject: txtOf(a), product: txtOf(tr.querySelector('p.product')), plink: pl ? pl.getAttribute('href').replace(/\?.*$/, '') : '',
        img: /img_product_medium|^$/.test(src) ? '' : src, writer: wtd && wtd !== sub ? txtOf(wtd) : '', date: date, at: date ? new Date(date.replace(' ', 'T')).getTime() || 0 : 0,
        comments: parseInt((txtOf(tr.querySelector('.comment')).match(/\d+/) || ['0'])[0], 10), lock: !!sub.querySelector('img[src*="lock"], img[alt*="비밀"]'),
        reply: !!sub.querySelector('img[src*="ico_re"], img[alt*="답변"]') };
      // 답변 글 : 관리자가 썼거나, 질문을 쓴 사람과 다른 사람이 쓴 것만 답변으로 본다 (질문한 손님이 자기 글에 쓴 답변 글은 답변이 아니다)
      if (row.reply) { var q = out[out.length - 1]; if (q && (isAdminWriter(row.writer) || row.writer !== q.writer)) q.answered = true; return; }
      row.answered = false;
      out.push(row);
    });
    return out;
  }
  function qnaList(pages) {
    var all = [], seen = {};
    function page(n) {
      return pageDoc(qnaListUrl(n)).then(function (d) {
        var rows = d ? qnaRows(d) : [], fresh = rows.filter(function (r) { return !seen[r.href]; });
        fresh.forEach(function (r) { seen[r.href] = 1; all.push(r); });
        return fresh.length && n < pages ? page(n + 1) : all;
      });
    }
    return page(1);
  }
  function qnaWatch() {
    if (!/^\/board\/product\/write\.html/.test(location.pathname) || !LOG_ON || !isMember()) return;
    var f = document.getElementById('boardWriteForm') || document.querySelector('form[name="boardWriteForm"]'); if (!f) return;
    var bn = f.querySelector('[name="board_no"]'); if (bn && +bn.value !== qnaBoardNo()) return;
    var grab = function () {
      var v = function (s) { var e = f.querySelector(s); return e ? String(e.value || '') : ''; };
      var subject = trim(v('[name="subject"]')), body = v('[name="content"]');
      body = trim(body.replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')).slice(0, 500);
      if (!subject) return;
      put(QNA_KEY, { t: Date.now(), subject: subject.slice(0, 120), body: body, no: v('[name="product_no"]'),
        pname: txtOf(document.querySelector('.xans-board-product .name, .typeProduct .name, .ec-base-box.typeProduct p.name, .xans-board-product strong')) });
    };
    var BW = window.BOARD_WRITE;   // 카페24 [등록] = BOARD_WRITE.form_submit (에디터 내용을 칸에 옮긴 뒤 보낸다)
    if (BW && typeof BW.form_submit === 'function' && !BW.__sh) {
      var orig = BW.form_submit; BW.__sh = 1;
      BW.form_submit = function () { var r = orig.apply(this, arguments); try { grab(); } catch (e) {} return r; };
    }
  }
  function qnaSend() {
    var p = get(QNA_KEY); if (!p || /^\/board\/product\/write\.html/.test(location.pathname)) return;   // 아직 글쓰기 화면 = 등록이 안 됐다
    try { localStorage.removeItem(QNA_KEY); } catch (e) {}
    if (Date.now() - p.t > 10 * 60000 || !LOG_ON || !isMember()) return;
    // 게시판 목록에 그 글이 올라왔는지 확인 (같은 제목 또는 방금 올라온 글) — 없으면 등록이 안 된 것으로 보고 남기지 않는다
    qnaList(1).then(function (rows) {
      var hit = rows.filter(function (r) { return r.subject === p.subject; })[0] || rows.filter(function (r) { return r.at && r.at >= p.t - 120000; })[0];
      if (!hit) return;
      p.href = hit.href; if (!p.pname) p.pname = hit.product; if (!p.no) p.no = prodNoOf(hit.plink);
      return memberInfo().then(function (mem) {
        if (!mem || !mem.on) return;
        return shopInfo(true).then(function (sh) { var m = {}; for (var k in mem) m[k] = mem[k]; m.shop = sh; m.qna = p; saveLog(m, 'qna', summary(m)); });
      });
    }).catch(function () {});
  }
  function chatLog() {
    clearTimeout(chatTimer);
    if (!TRAIL_ON || !LOG_ON || EDIT || !isMember() || !chatPending()) return;
    markLogged();
    memberInfo().then(function (mem) {
      if (!mem || !mem.on) return;
      return shopInfo().then(function (sh) { var m = {}; for (var k in mem) m[k] = mem[k]; m.shop = sh; saveLog(m, 'chat', summary(m)); });
    }).catch(function () {});
  }
  // 한 번의 상담을 한 줄로 : 질문 · 추천 · 연결을 앞에, 그것이 없으면 고른 메뉴
  function sessionLine(s) {
    var main = s.items.filter(function (x) { return x.k !== 'menu'; }), use = main.length ? main : s.items, seen = {};
    return when(s.s) + ' — ' + use.filter(function (x) { var key = x.k + x.n; if (seen[key]) return false; seen[key] = 1; return true; }).slice(-5)
      .map(function (x) { return x.k === 'q' || x.k === 'menu' ? x.n : x.k === 'miss' ? '「' + x.n + '」(못 찾음)' : x.k === 'style' ? '스타일 추천(' + x.n + ')' : EV[x.k]; }).join(' / ');
  }
  function consultLines() {
    var a = sessions(); if (!a.length) return [];
    var linked = 0; a.forEach(function (s) { s.items.forEach(function (x) { if (x.k === 'talk' || x.k === 'ask') linked++; }); });
    return ['상담 이력 (이 기기) : 챗봇 ' + a.length + '번 · 상담 연결 ' + linked + '번'].concat(a.slice(-4).reverse().map(function (s) { return '· ' + sessionLine(s); }));
  }
  // 을 / 를 : 끝 글자(문장부호 빼고)에 받침이 있으면 「을」
  function eul(w) { var s = String(w).replace(/[^0-9a-zA-Z가-힣]+$/, ''), k = s.charCodeAt(s.length - 1) - 0xAC00; return k >= 0 && k <= 11171 && k % 28 === 0 ? '를' : '을'; }
  // 다시 온 손님 : 10분 넘게 지난 지난번 상담에서 물어본 것 → 인사말에 한 줄, 다시 묻기 칩, 마지막으로 본 상품
  function welcomeBack() {
    var a = sessions(), now = Date.now(), prev = null;
    for (var i = a.length - 1; i >= 0; i--) if (now - a[i].e > 10 * 60000) { prev = a[i]; break; }
    if (!prev) return null;
    var qs = prev.items.filter(function (x) { return x.k === 'q' && !/상담원|상담\s*연결|사람/.test(x.n); }), st = prev.items.filter(function (x) { return x.k === 'style'; }).pop(), last = qs[qs.length - 1];
    var did = last ? '「' + last.n + '」' + eul(last.n) + ' 물어보셨어요.' : st ? '스타일 추천(' + st.n + ')을 받으셨어요.' : '';
    var prod = trailItems().filter(function (x) { return x.k === 'product'; }).pop();
    if (!did && !prod) return null;
    var d = new Date(prev.s);
    return { q: last ? last.n : '', st: st ? st.n : '', head: '다시 찾아 주셨네요!', back: did ? '지난번(' + (d.getMonth() + 1) + '/' + d.getDate() + ')에는 ' + did : '',
      text: '다시 찾아 주셨네요!' + (did ? ' 지난번(' + (d.getMonth() + 1) + '/' + d.getDate() + ')에는 ' + did : ''),
      chips: last ? [last.n] : st && STYLE ? [RESTYLE] : [], links: prod ? [{ label: '최근 본 상품 · ' + prod.n, href: prod.u || ('/product/detail.html?product_no=' + prod.no) }] : [] };
  }

  /* ---------- 4-6. 상담 기록 게시판 (설정 consultBoard) : 회원이 동의하고 상담을 넘기면 비밀글로 남긴다 ----------
     화면 뒤(보이지 않는 창)에서 그 게시판 글쓰기 화면을 열면, 그 창 안의 이 파일이 제목 · 본문 · 비밀글을 채우고 [등록]을 누른다 */
  var LOG_KEY = 'shop-helper-log', LOG_BOARD = parseInt(UC.consultBoard, 10) || 0;
  // 구글 시트 저장소 (설정 logSheet = Apps Script 웹 앱 주소) : 카페24 게시판 글쓰기는 보안 확인(Turnstile)에 막혀 손님 화면 뒤에서 저장할 수 없다
  // 저장소는 쇼핑몰마다 그 쇼핑몰 구글 계정에 따로 설치한다. logSheet 가 비어 있으면 기록을 남기지 않는다 (다른 곳으로 보내지 않는다)
  var SHEET_RE = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
  var SHEET = SHEET_RE.test(trim(UC.logSheet || '')) ? trim(UC.logSheet) : '';
  var SHOP = location.host.toLowerCase().replace(/^(www|m)\./, '');   // 이 쇼핑몰 (저장소가 쇼핑몰을 가린다)
  var LOG_ON = !!(LOG_BOARD || SHEET);
  // 화면을 떠나는 순간에도 보내지도록 sendBeacon (안 되면 keepalive fetch)
  function sendSheet(p) {
    p.shop = SHOP; var body = JSON.stringify(p);
    try { if (navigator.sendBeacon && navigator.sendBeacon(SHEET, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return; } catch (e) {}
    try { fetch(SHEET, { method: 'POST', mode: 'no-cors', keepalive: body.length < 60000, headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body }); } catch (e) {}
  }
  function logSubject(mem, kind) { return '[상담 기록] ' + (mem.name || '회원') + (mem.id ? ' (' + mem.id + ')' : '') + ' · ' + ({ talk: '카카오톡', chat: '챗봇', order: '주문서', paid: '결제 완료', qna: '상품 문의' }[kind] || '문의') + ' · ' + when(Date.now()); }
  // 남길 기록 줄 (기록마다 번호 · 한 번만 등록) — 예전 형식(기록 하나)도 읽는다
  function logQueue() {
    var v = get(LOG_KEY), now = Date.now();
    return (Array.isArray(v) ? v : v && v.subject ? [v] : []).filter(function (x) { return x && x.subject && now - x.t < 10 * 60000; })
      .map(function (x) { if (!x.id) x.id = String(x.t); return x; });
  }
  function dropLog(id) { put(LOG_KEY, logQueue().filter(function (x) { return x.id !== id; })); }
  function saveLog(mem, kind, text) {
    if (!LOG_ON || !mem || !mem.on) return;
    // 문의 남기기는 곧바로 글쓰기 화면으로 넘어가므로, 넘어간 화면에서 이어서 남긴다 (pending)
    var id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    if (SHEET) { var subj = logSubject(mem, kind); sendSheet({ type: 'log', id: id, kind: kind, subject: subj, name: mem.name || '', uid: mem.id || '', phone: mem.phone || '', email: mem.email || '', text: text }); return { id: id, subject: subj }; }
    put(LOG_KEY, logQueue().concat([{ id: id, t: Date.now(), subject: logSubject(mem, kind), text: text, html: summaryHtml(text).replace(/^<p>─+<\/p>/, ''), pending: kind === 'ask' }]).slice(-5));
    if (kind !== 'ask') logFrame(id);
  }
  function logFrame(id) {
    var f = document.createElement('iframe'), src = '/board/free/write.html?board_no=' + LOG_BOARD + '&whlog=1&whid=' + encodeURIComponent(id), seen = false, tries = 0, over = false;
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'position:fixed;left:-10000px;top:0;width:1100px;height:900px;border:0;opacity:0;pointer-events:none';
    function finish() { if (over) return; over = true; setTimeout(function () { f.remove(); }, 0); }
    f.addEventListener('load', function () {
      var p = '';
      try { var w = f.contentWindow; p = w.location.pathname; w.alert = function () {}; } catch (e) { return; }   // 카페24 보안 확인 화면이면 지나갈 때까지 기다린다
      if (!seen && /\/write\.html$/.test(p)) { seen = true; return; }
      // 보안 확인을 마치면 카페24가 글쓰기 화면이 아니라 원래 보던 화면으로 돌려보낸다 → 글쓰기 화면을 다시 연다
      if (!seen) { if (tries++ < 3) f.src = src; else finish(); return; }
      dropLog(id); finish();   // 글쓰기 화면에서 [등록]을 누른 뒤 다음 화면이 뜨면 끝 (다시 글쓰기 화면이 떠도 또 등록하지 않는다)
    });
    f.src = src;
    document.body.appendChild(f);
    setTimeout(finish, 60000);
  }
  // (보이지 않는 창 안) 상담 기록 글쓰기 화면 : 넘겨받은 기록을 채워 등록
  var WHLOG = /[?&]whlog=1\b/.test(location.search) && /\/write\.html$/.test(location.pathname);
  if (WHLOG) window.confirm = function (m) { return /작성\s*중|임시\s*저장|불러오/.test(String(m)) ? false : true; };
  function writeLog() {
    if (!WHLOG) return;
    var id = decodeURIComponent((location.search.match(/[?&]whid=([^&]+)/) || [])[1] || ''), q = logQueue();
    var d = q.filter(function (x) { return id ? x.id === id : true; })[0];
    if (!d || d.sent) return;   // 이미 [등록]을 누른 기록은 다시 누르지 않는다
    d.sent = Date.now(); put(LOG_KEY, q);
    var n = 0;
    (function wait() {
      var ed = froala(), ta = document.querySelector('textarea[name="content"], textarea#content'), sub = document.querySelector('input[name="subject"], #subject');
      var plain = n > 8 && !window.FroalaEditor && !(window.jQuery && window.jQuery.FroalaEditor);
      if (!ed && !plain && n++ < 60) { setTimeout(wait, 300); return; }
      if (sub) sub.value = d.subject;
      if (ed) ed.set(d.html); else if (ta) ta.value = d.text;
      var sec = document.querySelector('input[name="secure"][value="T"]'); if (sec) sec.checked = true;   // 비밀글
      var btn = Array.from(document.querySelectorAll('.ec-base-button a, .ec-base-button button, .ec-base-button input')).filter(function (x) { return /^(등록|확인|저장)$/.test(trim(x.textContent || x.value)); }).pop();
      if (btn) setTimeout(function () { btn.click(); }, 400);
    })();
  }
  function summaryHtml(text) { return '<p>──────────</p>' + text.split('\n').map(function (l) { return '<p>' + (l ? esc(l) : '<br>') + '</p>'; }).join(''); }

  /* ---------- 4-7. 상담 기록 보기 : 상담 기록 게시판의 글 · 목록을 한눈에 보이게 그린다 (글은 그대로 두고 화면만 바꾼다, [원문 보기]로 원래 글) ---------- */
  function onLogBoard() {
    return !!LOG_BOARD && (new RegExp('[?&]board_no=' + LOG_BOARD + '(&|$)').test(location.search) || new RegExp('^/(article|board)/[^/]+/' + LOG_BOARD + '(/|$)').test(location.pathname));
  }
  // 「[상담 기록] 이름 (아이디) · 카카오톡 · 10/08 02:13」
  function parseSubject(s) {
    var m = trim(s).match(/^\[상담 기록\]\s*(.+?)(?:\s*\(([^)]+)\))?\s*·\s*(카카오톡|상품 문의|문의|챗봇|주문서|결제 완료)\s*·\s*(.+)$/);
    return m ? { name: m[1], id: m[2] || '', ch: m[3], t: m[4] } : null;
  }
  // summary() 로 만든 글을 칸별로 나눈다
  function parseLog(text) {
    var L = String(text || '').split('\n').map(trim), o = { member: false, name: '', id: '', phone: '', email: '', group: '', style: [], prods: [], path: [], chat: 0, link: 0, hist: [], buy: null, status: [], orders: [], cart: null, carts: [] }, sec = '', m;
    var at = L.indexOf('──────────'); if (at > -1) L = L.slice(at + 1);
    while (L.length && !L[0]) L.shift();
    if (!/^\[상담 참고/.test(L[0] || '')) return null;
    L.slice(1).forEach(function (l) {
      if (!l) { sec = ''; return; }
      if (!sec && !o.member && !/:/.test(l) && (m = l.match(/^회원\s*(.*?)(?:\s*\(아이디\s*([^)]+)\))?$/))) { o.member = true; o.name = m[1]; o.id = m[2] || ''; return; }
      if (!sec && l === '비회원') return;
      if (!sec && (m = l.match(/^수신 동의\s*:\s*문자\s*(\S+)\s*·\s*메일\s*(\S+)/))) { o.agree = { sms: m[1] === '동의', mail: m[2] === '동의' }; return; }
      if (!sec && (m = l.match(/^(휴대폰|이메일|회원 등급|주소|배송지)\s*:\s*(.+)$/))) { o[{ '휴대폰': 'phone', '이메일': 'email', '회원 등급': 'group', '주소': 'addr', '배송지': 'ship' }[m[1]]] = m[2]; return; }
      if ((m = l.match(/^결제 완료\s*:\s*주문번호\s*(\S+)(?:\s*·\s*(.+))?$/))) { o.paid = { id: m[1], total: m[2] || '' }; return; }
      if ((m = l.match(/^상품 문의\s*:\s*(.+)$/))) { o.qna = { subject: m[1], pname: '', no: '', href: '', body: '' }; sec = 'qna'; return; }
      if (sec === 'qna' && (m = l.match(/^·\s*상품\s*:\s*(.+?)(?:\s*\(상품번호\s*(\d+)\))?$/))) { o.qna.pname = m[1] === '-' ? '' : m[1]; o.qna.no = m[2] || ''; return; }
      if (sec === 'qna' && (m = l.match(/^·\s*글\s*:\s*(\S+)$/))) { o.qna.href = m[1]; return; }
      if (sec === 'qna' && (m = l.match(/^·\s*내용\s*:\s*(.*)$/))) { o.qna.body = m[1]; return; }
      if ((m = l.match(/^주문서 상품\s*\(결제 예정\s*([^)]*)\)/))) { o.oform = { total: m[1], items: [] }; sec = 'oform'; return; }
      if (sec === 'oform' && (m = l.match(/^·\s*(.+?)(?:\s*\(상품번호\s*(\d+)\))?$/))) { o.oform.items.push({ n: m[1], no: m[2] || '' }); return; }
      if ((m = l.match(/^스타일 추천\s*:\s*(.+)$/))) { o.style = m[1].split(/\s*·\s*/); return; }
      if ((m = l.match(/^구매 요약\s*:\s*누적 주문\s*(\d+)번\s*·\s*누적 구매\s*(\S+)\s*·\s*적립금\s*(\S+)\s*·\s*관심상품\s*(\d+)개/))) { o.buy = { count: m[1], total: m[2], mileage: m[3], wish: m[4] }; return; }
      if ((m = l.match(/^주문 상태\s*:\s*(.+)$/))) { o.status = m[1].split(/\s*·\s*/).map(function (x) { var p = x.match(/^(.+?)\s+(\d+)$/); return p ? [p[1], +p[2]] : [x, 0]; }); return; }
      if (/^최근 주문/.test(l)) { sec = 'order'; return; }
      if ((m = l.match(/^장바구니\s*\((\d+)개\s*·\s*([^)]+)\)/))) { o.cart = { cnt: m[1], price: m[2] }; sec = 'cart'; return; }
      if (sec === 'order' && (m = l.match(/^·\s*(\S+)\s*\(([^)]*)\)\s*(.+?)\s*—\s*(.+)$/))) {
        var rest = m[4], pn = rest.match(/\(상품번호\s*(\d+)\)/), tk = rest.match(/·\s*택배\s+([^·]*?)\s*(\d{8,})?\s*(?=·|$)/), ex = rest.match(/·\s*발송예정\s+(\S+)/);
        o.orders.push({ d: m[1], id: m[2], n: m[3], st: trim(rest.split(/\s+\(상품번호|\s+·\s+/)[0]), no: pn ? pn[1] : '', co: tk ? trim(tk[1]) : '', inv: tk && tk[2] ? tk[2] : '', exp: ex ? ex[1] : '' });
        return;
      }
      if (sec === 'cart' && (m = l.match(/^·\s*(.+?)(?:\s*\(상품번호\s*(\d+)\))?$/)) && m[1] !== '비어 있음') { o.carts.push({ n: m[1], no: m[2] || '' }); return; }
      if (sec === 'order' || sec === 'cart') return;
      if (/^최근 본 상품/.test(l)) { sec = 'prod'; return; }
      if (/^둘러본 순서/.test(l)) { sec = 'path'; return; }
      if ((m = l.match(/^상담 이력[^:]*:\s*챗봇\s*(\d+)\s*번\s*·\s*상담 연결\s*(\d+)\s*번/))) { o.chat = +m[1]; o.link = +m[2]; sec = 'hist'; return; }
      if (sec === 'prod' && (m = l.match(/^·\s*(.+?)(?:\s+([\d,]+원))?\s*\(상품번호\s*(\d+)\)\s*(.*)$/))) { o.prods.push({ n: m[1], p: m[2] || '', no: m[3], t: m[4] }); return; }
      if (sec === 'path') { o.path = o.path.concat(l.split(/\s*→\s*/).filter(Boolean)); return; }
      if (sec === 'hist' && (m = l.match(/^·\s*(\S+\s+\S+)\s*—\s*(.+)$/))) o.hist.push({ t: m[1], items: m[2].split(/\s*\/\s*/) });
    });
    return o;
  }
  function logCss() {
    if (document.getElementById('whlCss')) return;
    var s = document.createElement('style'); s.id = 'whlCss';
    s.textContent = [
      '.whl,.whp-wrap,.whl-cs-lay,[data-whl-cs]{--whl-ink:#111;--whl-sub:#6b6b6b;--whl-line:#e6e6e6;--whl-soft:#f6f6f4;--whl-pt:#111}',
      '.whl{--whl-ink:#111;--whl-sub:#6b6b6b;--whl-line:#e6e6e6;--whl-soft:#f6f6f4;--whl-pt:#111;color:var(--whl-ink);font-size:14px;line-height:1.6;margin:8px 0 24px;text-align:left}',
      '.whl *{box-sizing:border-box}',
      '.whl-top{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between;padding:20px 22px;border:1px solid var(--whl-line);border-radius:14px;background:#fff}',
      '.whl-who{display:flex;gap:14px;align-items:center;min-width:0}',
      '.whl-av{flex:none;width:46px;height:46px;border-radius:50%;background:var(--whl-pt);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600}',
      '.whl-av.is-guest{background:#bdbdbd}',
      '.whl-who b{display:block;font-size:18px;font-weight:600;letter-spacing:-.01em}',
      '.whl-who div span{display:block;color:var(--whl-sub);font-size:13px}',
      '.whl-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--whl-sub);font-size:13px}',
      '.whl-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;line-height:1.5;background:var(--whl-soft);color:var(--whl-ink);white-space:nowrap;vertical-align:middle}',
      '.whl-tag.is-order{background:#ff7a1a;color:#fff}.whl-tag.is-paid{background:#1e7a46;color:#fff}.whl-tag.is-unpaid{background:#d93025;color:#fff}.whl-sec.is-order{border-color:#ff7a1a;background:#fff8f2}.whl-sec.is-order h4{color:#c2570c}.whl-sec.is-paid{border-color:#1e7a46;background:#f1f8f3}.whl-contact{flex-basis:100%;display:flex;flex-wrap:wrap;gap:8px}.whl-tag.is-chat{background:#e9eefb;color:#2c4a9a}.whl-tag.is-talk{background:#fee500;color:#191919}.whl-tag.is-ask{background:#111;color:#fff}.whl-tag.is-miss{background:#fdecea;color:#c0392b}.whl-tag.is-buy{background:#e8f3ec;color:#1e7a46}',
      '.whl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}',
      '.whl-stat{padding:16px 18px;border-radius:12px;background:var(--whl-soft)}',
      '.whl-stat em{display:block;font-style:normal;color:var(--whl-sub);font-size:12px}',
      '.whl-stat b{display:block;font-size:24px;font-weight:600;line-height:1.3}',
      '.whl-stat b small{font-size:13px;font-weight:500;margin-left:2px}',
      '.whl-sec{padding:20px 22px;border:1px solid var(--whl-line);border-radius:14px;margin-top:12px;background:#fff}',
      '.whl-sec h4{margin:0 0 12px;font-size:13px;font-weight:600;color:var(--whl-sub);letter-spacing:.02em}',
      '.whl-chips{display:flex;flex-wrap:wrap;gap:6px}',
      '.whl-prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}',
      '.whl-prod{display:block;color:inherit;text-decoration:none}',
      '.whl-prod i{display:block;aspect-ratio:3/4;border-radius:10px;background:var(--whl-soft) center/cover no-repeat;margin-bottom:8px}',
      '.whl-prod b{display:block;font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.whl-prod span{display:block;font-size:12px;color:var(--whl-sub)}',
      '.whl-prod strong{font-weight:600;color:var(--whl-ink);margin-right:6px}',
      '.whl-path{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px 0;align-items:center}',
      '.whl-path li{display:inline-flex;align-items:center;font-size:13px}',
      '.whl-path li+li:before{content:"";width:14px;height:1px;background:#bbb;margin:0 6px}',
      '.whl-path li span{display:inline-flex;gap:6px;align-items:center;padding:5px 10px;border:1px solid var(--whl-line);border-radius:8px;background:#fff}',
      '.whl-path li span em{font-style:normal;font-size:11px;color:var(--whl-sub)}',
      '.whl-path li.is-prod span{border-color:#111}.whl-path li.is-search span{background:var(--whl-soft)}.whl-path li.is-buy span{background:#e8f3ec;border-color:#1e7a46;color:#1e7a46}',
      '.whl-path li.is-last span{background:#111;color:#fff;border-color:#111}.whl-path li.is-last span em{color:#ccc}',
      '.whl-time{list-style:none;margin:0;padding:0 0 0 4px}',
      '.whl-time li{position:relative;padding:0 0 16px 22px;border-left:1px solid var(--whl-line)}',
      '.whl-time li:last-child{border-left-color:transparent;padding-bottom:0}',
      '.whl-time li:before{content:"";position:absolute;left:-5px;top:6px;width:9px;height:9px;border-radius:50%;background:#111}',
      '.whl-time li time{display:block;font-size:12px;color:var(--whl-sub);margin-bottom:4px}',
      '.whl-empty{color:var(--whl-sub);font-size:13px}',
      '.whl-foot{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}',
      '.whl-btn{display:inline-flex;align-items:center;height:36px;padding:0 14px;border:1px solid #d5d5d5;border-radius:8px;background:#fff;color:#111;font-size:13px;text-decoration:none;cursor:pointer}',
      '.whl-btn:hover{border-color:#111}',
      '.whl-raw{margin-top:12px;padding:16px 18px;border-radius:12px;background:var(--whl-soft);font-size:13px}',
      '.whl-info{flex-basis:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 20px;margin:2px 0 0;padding-top:16px;border-top:1px solid var(--whl-line)}',
      '.whl-info dt{font-size:12px;color:var(--whl-sub);margin:0}',
      '.whl-info dd{margin:2px 0 0;font-size:15px;font-weight:500;word-break:break-all}',
      '.whl-info a{color:inherit;text-decoration:underline;text-underline-offset:3px}',
      '.whl-top .whl-foot,.whl-top>p{flex-basis:100%;margin-top:0}',
      '.whl-tag.is-on{background:#111;color:#fff}',
      '.whl-orders{list-style:none;margin:0;padding:0}',
      '.whl-orders li{display:grid;grid-template-columns:150px 1fr auto;gap:4px 16px;align-items:center;padding:12px 0;border-top:1px solid var(--whl-line)}',
      '.whl-orders li:first-child{border-top:0;padding-top:0}',
      '.whl-orders li div time{display:block;font-size:13px}.whl-orders li div span{display:block;font-size:12px;color:var(--whl-sub)}',
      '.whl-orders li b{font-weight:500;font-size:13px}',
      '.whl-row-order td{background:#fff8f2}.whl-row-order.is-unpaid td:first-child{box-shadow:inset 4px 0 0 #ff7a1a}.whl-row-order.is-unpaid td{background:#fff1e6}',
      '.whl-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px}',
      '.whl-filter{display:inline-flex;flex-wrap:wrap;gap:6px}.whl-filter button{height:34px;padding:0 14px;border:1px solid #d5d5d5;border-radius:99px;background:#fff;font-size:13px;cursor:pointer;color:#111}.whl-filter button.is-on{background:#111;border-color:#111;color:#fff}',
      '.whl-cs-box.is-wide{max-width:720px}.whl-cs-contact{margin-bottom:14px}.whl-cs-contact:empty{display:none}',
      '.whl-reach{list-style:none;margin:0;padding:0}.whl-reach>li{padding:14px 0;border-top:1px solid #e6e6e6}.whl-reach>li:first-child{border-top:0;padding-top:0}',
      '.whl-reach-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.whl-reach-top span{color:#6b6b6b;font-size:12px}.whl-reach-sum{font-weight:700;color:#c2570c!important;font-size:14px!important}',
      '.whl-reach-items{margin:4px 0 0;font-size:13px}.whl-reach-info{margin:2px 0 8px;font-size:12px;color:#6b6b6b}',
      /* 글 화면 (요약 → 2단) */
      '.whl2 .whl-hero{padding:24px 26px;border:1px solid var(--whl-line);border-radius:18px;background:#fff}',
      '.whl-hero-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px 16px}',
      '.whl-who>div>span{display:block;color:var(--whl-sub);font-size:13px}',
      '.whl-headline{margin:18px 0 0;font-size:20px;line-height:1.5;font-weight:500;letter-spacing:-.02em;color:#111}',
      '.whl-headline b{font-weight:700}.whl-headline em{font-style:normal;font-weight:700}.whl-headline em.is-order{color:#d9600f}.whl-headline em.is-paid{color:#1e7a46}.whl-headline em.is-talk{color:#7a5c00}',
      '.whl-headline .whl-tag{vertical-align:3px;margin-left:4px}',
      '.whl-keys{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding:0}',
      '.whl-keys li{padding:6px 12px;border-radius:99px;background:var(--whl-soft);font-size:13px;font-weight:500}',
      '.whl-keys li.is-order{background:#fff1e6;color:#c2570c}.whl-keys li.is-paid{background:#e8f3ec;color:#1e7a46}.whl-keys li.is-miss{background:#fdecea;color:#c0392b}',
      '.whl-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:18px;padding-top:16px;border-top:1px solid var(--whl-line)}.whl-acts .whl-contact{flex-basis:auto}',
      '.whl-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;margin-top:14px;align-items:start}',
      '.whl-main,.whl-side{display:grid;gap:14px;min-width:0}',
      '.whl-card{padding:20px 22px;border:1px solid var(--whl-line);border-radius:16px;background:#fff}',
      '.whl-card>h4,.whl-more>summary{margin:0 0 14px;font-size:14px;font-weight:600;color:#111}',
      '.whl-card h4 small,.whl-more summary small{margin-left:6px;font-size:12px;font-weight:400;color:var(--whl-sub)}',
      '.whl-card.is-order{border-color:#ffb37a;background:#fffaf5}.whl-card.is-paid{border-color:#8cc7a3;background:#f5fbf7}',
      '.whl-card p{margin:0}',
      '.whl-more>summary{margin:0;cursor:pointer;list-style:none}.whl-more>summary::-webkit-details-marker{display:none}.whl-more>summary:after{content:" ▾";color:var(--whl-sub)}.whl-more[open]>summary{margin-bottom:14px}',
      '.whl-dl{margin:0;display:grid;gap:10px}.whl-dl div{display:grid;grid-template-columns:72px 1fr;gap:8px}.whl-dl dt{margin:0;color:var(--whl-sub);font-size:12.5px}.whl-dl dd{margin:0;font-size:13.5px;font-weight:500;word-break:break-all}',
      '.whl-dl a{color:inherit;text-decoration:underline;text-underline-offset:3px}.whl-yes{color:#1e7a46}.whl-no{color:#c0392b}',
      '.whl-card .whl-dl+.whl-chips{margin-top:12px}',
      '.whl-others{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:8px}.whl-others li{display:flex;align-items:center;gap:8px;font-size:13px}.whl-others a{color:#111}.whl-others small{margin-left:auto;color:var(--whl-sub)}',
      '.whl-more-link{font-size:12.5px;color:var(--whl-sub)}',
      '.whl2 .whl-prods{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}',
      /* 목록 : 손님별로 묶기 */
      '.whp-switch{display:inline-flex;padding:4px;border-radius:99px;background:#f1f1ef;margin:0 0 14px}',
      '.whp-switch button{height:34px;padding:0 16px;border:0;border-radius:99px;background:none;font-size:13px;font-weight:500;color:#6b6b6b;cursor:pointer}',
      '.whp-switch button[aria-pressed="true"]{background:#fff;color:#111;box-shadow:0 1px 3px rgba(0,0,0,.12)}',
      '.whp-bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}',
      '.whp-tools{display:flex;gap:8px;align-items:center}.whp-q{height:36px;width:200px;padding:0 14px;border:1px solid #d5d5d5;border-radius:99px;font-size:16px;background:#fff}',
      '.whp-head,.whp-main{display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(0,1.6fr) 150px 120px 20px;gap:12px;align-items:center}',
      '.whp-head{padding:10px 16px;border-top:2px solid #111;border-bottom:1px solid var(--whl-line);font-size:12px;color:var(--whl-sub)}',
      '.whp-list{list-style:none;margin:0;padding:0}',
      '.whp-row{border-bottom:1px solid var(--whl-line)}.whp-row.is-unpaid{background:#fff8f2;box-shadow:inset 4px 0 0 #ff7a1a}.whp-row.is-open{background:#fafafa}',
      '.whp-main{width:100%;padding:14px 16px;border:0;background:none;text-align:left;cursor:pointer;font:inherit;color:inherit}',
      '.whp-who{display:flex;align-items:center;gap:10px;min-width:0}.whp-who .whl-av{width:36px;height:36px;font-size:14px}.whp-who b{display:block;font-size:14px}.whp-who small{display:block;font-size:12px;color:var(--whl-sub)}',
      '.whp-tags{display:flex;flex-wrap:wrap;gap:4px}',
      '.whp-last b{display:block;font-size:13px;font-weight:500}.whp-last small{display:block;font-size:12px;color:var(--whl-sub)}',
      '.whp-main .whl-cs{justify-self:start;pointer-events:none}',
      '.whp-chev:before{content:"▾";color:var(--whl-sub)}.whp-row.is-open .whp-chev:before{content:"▴"}',
      '.whp-sub{padding:4px 16px 18px 62px}',
      '.whp-recs{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:8px}.whp-recs li{display:flex;align-items:center;gap:10px;font-size:13px}.whp-recs a{color:#111;text-decoration:underline;text-underline-offset:3px}.whp-recs .whl-cs{margin-left:auto;height:28px}',
      '.whp-acts{display:flex;flex-wrap:wrap;gap:8px}',
      '.whp-note{margin:12px 0 0;font-size:12px;color:var(--whl-sub)}.whp-none{padding:30px 0;text-align:center}',
      '@media (max-width:900px){.whl-grid{grid-template-columns:1fr}.whp-head{display:none}.whp-main{grid-template-columns:1fr auto;grid-template-areas:"who chev" "tags tags" "last cs"}.whp-who{grid-area:who}.whp-tags{grid-area:tags}.whp-last{grid-area:last}.whp-main .whl-cs{grid-area:cs;justify-self:end}.whp-chev{grid-area:chev}.whp-sub{padding-left:16px}.whp-q{width:100%}.whp-tools{width:100%}}',
      '@media (max-width:640px){.whl2 .whl-hero{padding:18px}.whl-headline{font-size:17px}.whl-card{padding:16px}}',
      '.whl-btn.is-warn{border-color:#f0b4ae;color:#b3261e;background:#fff6f5}',
      '.whl-cs-th{width:118px}.whl-cs-td{text-align:center}',
      '.whl-cs{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 12px;border:1px solid #d5d5d5;border-radius:99px;background:#fff;color:#6b6b6b;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}',
      '.whl-cs:hover{border-color:#111;color:#111}.whl-cs.is-done{background:#111;border-color:#111;color:#fff}.whl-cs b{font-weight:700}',
      '.whl-cs-lay{position:fixed;inset:0;z-index:2147483000;background:rgba(17,17,17,.45);display:flex;align-items:center;justify-content:center;padding:16px;text-align:left}',
      '.whl-cs-box{width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;color:#111;font-size:14px;line-height:1.6}',
      '.whl-cs-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid #e6e6e6}',
      '.whl-cs-head b{font-size:16px;font-weight:600}.whl-cs-head div>span:last-child{color:#6b6b6b;font-size:12px}',
      '.whl-cs-x{flex:none;width:36px;height:36px;border:0;border-radius:50%;background:#f6f6f4;font-size:22px;line-height:1;cursor:pointer;color:#111}',
      '.whl-cs-body{padding:16px 20px;overflow:auto;flex:1}.whl-cs-body h4{margin:0 0 10px;font-size:13px;color:#6b6b6b;font-weight:600}',
      '.whl-cs-list{list-style:none;margin:0;padding:0}.whl-cs-list li{border:1px solid #e6e6e6;border-radius:10px;margin-bottom:8px}.whl-cs-list li.whl-empty{border:0;padding:4px 0}',
      '.whl-cs-list li.is-open{border-color:#111}',
      '.whl-cs-item{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;width:100%;padding:12px 14px;border:0;background:none;text-align:left;cursor:pointer;color:inherit;font:inherit}',
      '.whl-cs-no{grid-row:1/3;width:24px;height:24px;border-radius:50%;background:#f6f6f4;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center}',
      '.whl-cs-sum{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.whl-cs-meta{font-size:12px;color:#6b6b6b}',
      '.whl-cs-full{padding:0 14px 14px 48px;white-space:normal;word-break:break-all}',
      '.whl-cs-form{padding:16px 20px 20px;border-top:1px solid #e6e6e6;background:#fafafa}',
      '.whl-cs-form label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}',
      '.whl-cs-form textarea{width:100%;box-sizing:border-box;border:1px solid #d5d5d5;border-radius:10px;padding:10px 12px;font:inherit;font-size:16px;resize:vertical;background:#fff}',
      '.whl-cs-form textarea:focus{outline:2px solid #111;outline-offset:1px}',
      '.whl-cs-acts{display:flex;justify-content:space-between;gap:8px;margin-top:10px}.whl-btn.is-main{background:#111;color:#fff!important;border-color:#111}.whl-btn[disabled]{opacity:.5;cursor:default}',
      '.whl-cs-msg{margin:8px 0 0;font-size:12px;color:#6b6b6b;min-height:1em}',
      '.whl-li{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center}',
      '.whl-li b{font-weight:600}.whl-li span{color:var(--whl-sub);font-size:12px}',
      '@media (max-width:640px){.whl-top,.whl-sec{padding:16px}.whl-stats{grid-template-columns:repeat(2,1fr)}.whl-prods{grid-template-columns:repeat(2,1fr)}.whl-stat b{font-size:20px}.whl-info{grid-template-columns:repeat(2,minmax(0,1fr))}.whl-orders li{grid-template-columns:1fr auto}.whl-orders li b{grid-column:1/-1;grid-row:2}}'
    ].join('');
    document.head.appendChild(s);
  }
  // 둘러본 화면의 종류 (글에는 이름만 남아 있어 이름으로 가린다)
  function stepKind(n, o) {
    if (/^검색 「/.test(n)) return 'search';
    if (/^(장바구니|주문서 작성|주문 완료)$/.test(n)) return 'buy';
    if (o.prods.some(function (p) { return p.n === n; })) return 'prod';
    return '';
  }
  function histTag(x) {
    if (/\(못 찾음\)$/.test(x)) return '<span class="whl-tag is-miss">못 찾은 질문</span> ' + esc(x.replace(/\(못 찾음\)$/, ''));
    if (/카카오톡 상담 연결/.test(x)) return '<span class="whl-tag is-talk">카카오톡 연결</span>';
    if (/문의 남기기/.test(x)) return '<span class="whl-tag is-ask">문의 남기기</span>';
    if (/^스타일 추천/.test(x)) return '<span class="whl-tag">스타일 추천</span> ' + esc(x.replace(/^스타일 추천\(?|\)$/g, ''));
    return esc(x);
  }
  function chCls(ch) { return { '카카오톡': 'is-talk', '챗봇': 'is-chat', '주문서': 'is-order', '결제 완료': 'is-paid', '상품 문의': 'is-qna' }[ch] || 'is-ask'; }
  /* ---------- 4-8. 상담 내용 (관리자 메모) : 상담 기록 글의 댓글을 상담 내용으로 쓴다 ----------
     목록의 작성자 앞 [상담 전 / 상담 완료 N] → 레이어 팝업 : 상담 내용 목록 (누르면 펼침) · 새 상담 내용 등록 (댓글로 저장) */
  /* 손님에게 바로 연락 : 전화 · 문자(휴대폰 문자 앱) · 메일(메일 앱) — 주문서 손님이면 담아 둔 상품으로 안내 문구를 채운다 */
  function digits(p) { return String(p || '').replace(/[^\d+]/g, ''); }
  function contactText(c) {
    var brand = brandName() || '쇼핑몰', who = (c.name && c.name !== '회원' ? c.name + '님' : '고객님'), item = c.items && c.items.length ? c.items[0].replace(/\s*\[.*$/, '') + (c.items.length > 1 ? ' 외 ' + (c.items.length - 1) + '개' : '') : '';
    var basket = location.origin + '/order/basket.html';
    if (c.unpaid) return { sms: '[' + brand + '] ' + who + ', 주문서에 담아 두신 ' + (item || '상품') + '이(가) 아직 결제 전이에요. 궁금한 점이 있으면 편하게 답장 주세요. ' + basket,
      subject: '[' + brand + '] 주문을 마무리하지 못하셨나요?', body: '안녕하세요, ' + brand + '입니다.\n\n' + who + '께서 주문서에 담아 두신 ' + (item || '상품') + '이(가) 아직 결제 전이에요.\n사이즈 · 배송 · 결제 등 궁금한 점이 있으시면 이 메일에 답장 주세요.\n\n장바구니 바로가기 : ' + basket + '\n\n감사합니다.' };
    return { sms: '[' + brand + '] ' + who + ', 문의 주셔서 감사해요. ', subject: '[' + brand + '] 문의 주신 내용 안내드려요', body: '안녕하세요, ' + brand + '입니다.\n\n' + who + '께서 문의 주신 내용 안내드려요.\n\n\n감사합니다.' };
  }
  function contactBar(c) {
    var t = contactText(c), tel = digits(c.phone), out = [], ag = c.agree;   // ag : 수신 동의 (없으면 모르는 기록)
    var no = function (k) { return ag && !ag[k] ? ' is-warn" title="광고성 안내는 수신 동의한 손님에게만 보낼 수 있어요' : ''; }, lab = function (k, s) { return s + (ag ? (ag[k] ? ' · 수신 동의' : ' · 수신 거부') : ''); };
    if (tel) out.push('<a class="whl-btn" href="tel:' + esc(tel) + '">전화</a>', '<a class="whl-btn' + no('sms') + '" href="sms:' + esc(tel) + '?&body=' + encodeURIComponent(t.sms) + '">' + lab('sms', '문자 보내기') + '</a>');
    if (c.email) out.push('<a class="whl-btn' + no('mail') + '" href="mailto:' + esc(c.email) + '?subject=' + encodeURIComponent(t.subject) + '&body=' + encodeURIComponent(t.body) + '">' + lab('mail', '메일 보내기') + '</a>');
    if (tel) out.push('<button type="button" class="whl-btn" data-whl-copy="' + esc(c.phone) + '">번호 복사</button>');
    if (c.id) out.push('<a class="whl-btn" href="/admin/php/shop1/c/member_admin_d_f.php?user_id=' + encodeURIComponent(c.id) + '" target="_blank" rel="noopener">회원 정보 ↗</a>');
    return out.length ? '<div class="whl-contact">' + out.join('') + '</div>' : '<p class="whl-empty">연락처가 없는 기록이에요.</p>';
  }
  function copyNow(text, el) {
    var done = function () { if (el) { var o = el.textContent; el.textContent = '복사했어요'; setTimeout(function () { el.textContent = o; }, 1500); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { prompt('복사해 주세요', text); });
    else { prompt('복사해 주세요', text); }
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-whl-copy]'); if (b) { e.preventDefault(); copyNow(b.getAttribute('data-whl-copy'), b); } });
  function csLabel(n) { return n ? '상담 완료 <b>' + n + '</b>' : '상담 전'; }
  function csColumn() {
    var first = document.querySelector('[class*="xans-board-list"] [data-whl-subject]'); if (!first) return;
    var table = first.closest('table'); if (!table || table.getAttribute('data-whl-cs')) return;
    table.setAttribute('data-whl-cs', '1');
    var ths = table.querySelectorAll('thead th'), at = -1;
    [].forEach.call(ths, function (th, i) { if (at < 0 && /작성자/.test(th.textContent)) at = i; });
    if (at < 0) return;
    var th = document.createElement('th'); th.scope = 'col'; th.className = 'whl-cs-th'; th.textContent = '상담';
    ths[at].parentNode.insertBefore(th, ths[at]);
    [].forEach.call(table.querySelectorAll('colgroup'), function (cg) { var cols = cg.querySelectorAll('col'); if (cols[at]) { var c = document.createElement('col'); c.style.width = '118px'; cg.insertBefore(c, cols[at]); } });
    [].forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
      var cells = tr.children;
      if (cells.length === 1 && cells[0].colSpan > 1) { cells[0].colSpan += 1; return; }   // 「글이 없습니다」 줄
      var td = document.createElement('td'); td.className = 'whl-cs-td';
      var a = tr.querySelector('[data-whl-subject]');
      if (a) {
        var n = parseInt((txtOf(tr.querySelector('.comment')).match(/\d+/) || ['0'])[0], 10);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'whl-cs' + (n ? ' is-done' : ''); b.innerHTML = csLabel(n);
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openCs(a, b); });
        td.appendChild(b);
      }
      if (cells[at]) tr.insertBefore(td, cells[at]); else tr.appendChild(td);
    });
  }
  // 글 화면을 읽어 상담 내용(댓글)을 꺼낸다
  function loadNotes(href) {
    return pageDoc(href + (href.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now()).then(function (d) {
      if (!d) throw new Error('read');
      var notes = [].map.call(d.querySelectorAll('[class*="xans-board-commentlist"] li'), function (li) {
        var c = li.querySelector('.comment');
        return { name: txtOf(li.querySelector('.commentTop .name')), date: txtOf(li.querySelector('.commentTop .date')), text: c ? textOf(c.innerHTML) : '' };
      }).filter(function (x) { return x.text || x.name; });
      var body = d.querySelector('[class*="xans-board-read"] .detail .fr-view') || d.querySelector('[class*="xans-board-read"] .detail');
      notes.log = body ? parseLog(textOf(body.innerHTML)) : null;   // 기록 본문 (연락처 · 주문서 상품)
      return notes;
    });
  }
  // 목록 : 주문서 기록을 눈에 띄게 + 결제 완료 / 미결제 + 필터 + 미결제 손님 한꺼번에 연락
  function rowTime(r) {
    var m = r.tr.innerText.match(/(\d{4})-(\d\d)-(\d\d)\s+(\d\d):(\d\d)/);
    if (m) return +(m[1] + m[2] + m[3] + m[4] + m[5]);
    var t = (r.s.t || '').match(/(\d\d)\/(\d\d)\s+(\d\d):(\d\d)/); return t ? +(new Date().getFullYear() + t[1] + t[2] + t[3] + t[4]) : 0;
  }
  function orderRows() {
    var rows = [].map.call(document.querySelectorAll('[class*="xans-board-list"] [data-whl-subject]'), function (a) {
      var s = parseSubject(a.getAttribute('data-whl-subject')); return s ? { a: a, tr: a.closest('tr'), s: s } : null;
    }).filter(function (r) { return r && r.tr; });
    if (!rows.length || document.querySelector('.whl-bar')) return;
    rows.forEach(function (r) { r.at = rowTime(r); });
    var orders = rows.filter(function (r) { return r.s.ch === '주문서'; });
    orders.forEach(function (r) {
      var paid = rows.some(function (p) { return p.s.ch === '결제 완료' && (p.s.id || p.s.name) === (r.s.id || r.s.name) && p.at >= r.at; });
      r.unpaid = !paid;
      r.tr.classList.add('whl-row-order'); if (!paid) r.tr.classList.add('is-unpaid');
      var tag = document.createElement('span'); tag.className = 'whl-tag ' + (paid ? 'is-paid' : 'is-unpaid'); tag.textContent = paid ? '결제 완료' : '미결제';
      var li = r.a.querySelector('.whl-li'); if (li) li.appendChild(tag);
    });
    var unpaid = orders.filter(function (r) { return r.unpaid; });
    var table = rows[0].tr.closest('table'), bar = document.createElement('div'); bar.className = 'whl-bar';
    bar.innerHTML = '<div class="whl-filter" role="group" aria-label="보기">' +
      '<button type="button" data-f="all" class="is-on">전체 ' + rows.length + '</button>' +
      '<button type="button" data-f="order">주문서까지 온 손님 ' + orders.length + '</button>' +
      '<button type="button" data-f="unpaid">미결제 ' + unpaid.length + '</button></div>' +
      (unpaid.length ? '<button type="button" class="whl-btn is-main" data-whl-reach>미결제 손님 연락하기 (' + unpaid.length + ')</button>' : '');
    table.parentNode.insertBefore(bar, table);
    [].forEach.call(bar.querySelectorAll('[data-f]'), function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        [].forEach.call(bar.querySelectorAll('[data-f]'), function (x) { x.classList.toggle('is-on', x === b); });
        rows.forEach(function (r) { r.tr.style.display = f === 'all' || (f === 'order' && r.s.ch === '주문서') || (f === 'unpaid' && r.unpaid) ? '' : 'none'; });
      });
    });
    var reach = bar.querySelector('[data-whl-reach]'); if (reach) reach.addEventListener('click', function () { openReach(unpaid); });
  }
  // 미결제 손님 연락 목록 (손님마다 최근 주문서 하나) : 전화 · 문자 · 메일 + 번호 모두 복사 · 메일 숨은참조로 한 번에
  function openReach(list) {
    var seen = {}, people = list.filter(function (r) { var k = r.s.id || r.s.name; if (seen[k]) return false; seen[k] = 1; return true; });
    var old = document.getElementById('whlReach'); if (old) old.remove();
    var lay = document.createElement('div'); lay.id = 'whlReach'; lay.className = 'whl-cs-lay'; lay.setAttribute('role', 'dialog'); lay.setAttribute('aria-modal', 'true'); lay.setAttribute('aria-label', '미결제 손님 연락하기');
    lay.innerHTML = '<div class="whl-cs-box is-wide"><div class="whl-cs-head"><div><span class="whl-tag is-unpaid">미결제</span> <b>주문서까지 왔지만 결제하지 않은 손님 ' + people.length + '명</b></div><button type="button" class="whl-cs-x" aria-label="닫기">×</button></div>' +
      '<div class="whl-cs-body"><ul class="whl-reach"><li class="whl-empty">연락처를 모으는 중…</li></ul></div>' +
      '<div class="whl-cs-form"><div class="whl-cs-acts"><button type="button" class="whl-btn" data-all-tel disabled>휴대폰 번호 모두 복사</button><a class="whl-btn is-main" data-all-mail href="#none">메일 한 번에 보내기 (숨은참조)</a></div>' +
      '<p class="whl-cs-msg">여러 명에게 문자를 보내려면 번호를 복사해 카페24 관리자 › 고객 › SMS 발송(문자 충전 필요)이나 휴대폰 문자 앱에 붙여 넣으세요.</p></div></div>';
    document.body.appendChild(lay);
    function close() { lay.remove(); document.removeEventListener('keydown', k); }
    function k(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', k);
    lay.addEventListener('click', function (e) { if (e.target === lay) close(); });
    lay.querySelector('.whl-cs-x').addEventListener('click', close);
    var ul = lay.querySelector('.whl-reach');
    Promise.all(people.map(function (r) {
      if (r.o) return Promise.resolve({ r: r, o: r.o, notes: r.notes || 0 });   // 관리자 페이지 : 기록 내용을 이미 갖고 있다
      return loadNotes(r.a.getAttribute('href')).then(function (n) { return { r: r, o: n.log || {}, notes: n.length }; }).catch(function () { return { r: r, o: {}, notes: 0 }; });
    })).then(function (all) {
      var tels = [], mails = [];
      ul.innerHTML = all.map(function (x) {
        var o = x.o, s = x.r.s, name = o.name || s.name, items = o.oform ? o.oform.items.map(function (i) { return i.n; }) : [];
        if (o.phone) tels.push(o.phone); if (o.email) mails.push(o.email);
        return '<li><div class="whl-reach-top"><div><b>' + esc(name) + '</b> <span>' + esc(o.id || s.id || '') + ' · ' + esc(s.t) + (x.notes ? ' · 상담 ' + x.notes + '번' : '') + '</span></div>' +
          '<span class="whl-reach-sum">' + esc(o.oform ? o.oform.total : '') + '</span></div>' +
          (items.length ? '<p class="whl-reach-items">' + esc(items.map(function (i) { return i.replace(/\s*\(상품번호.*$/, ''); }).join(' / ')) + '</p>' : '') +
          '<p class="whl-reach-info">' + esc(o.phone || '휴대폰 없음') + ' · ' + esc(o.email || '이메일 없음') + '</p>' +
          contactBar({ name: name, id: o.id || s.id, phone: o.phone, email: o.email, agree: o.agree, unpaid: true, items: items }) + '</li>';
      }).join('') || '<li class="whl-empty">연락할 손님이 없어요.</li>';
      var bt = lay.querySelector('[data-all-tel]'), bm = lay.querySelector('[data-all-mail]'), t = contactText({ unpaid: true });
      bt.disabled = !tels.length; bt.addEventListener('click', function () { copyNow(tels.join('\n'), bt); });
      if (mails.length) bm.href = 'mailto:?bcc=' + mails.map(encodeURIComponent).join(',') + '&subject=' + encodeURIComponent(t.subject) + '&body=' + encodeURIComponent(t.body);
      else { bm.removeAttribute('href'); bm.setAttribute('aria-disabled', 'true'); bm.style.opacity = '.5'; }
    });
  }
  // 상담 내용 등록 : 글 화면을 보이지 않는 창으로 열어 댓글 칸에 적고 [등록]을 누른다 (카페24 댓글 그대로)
  function addNote(href, text) {
    return new Promise(function (ok, no) {
      var f = document.createElement('iframe'), sent = false, tries = 0, over = false, msg = [];
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:800px;border:0;opacity:0;pointer-events:none';
      function end(good) { if (over) return; over = true; setTimeout(function () { f.remove(); }, 0); if (good) ok(msg.join(' ')); else no(new Error(msg.join(' ') || '등록하지 못했어요')); }
      f.addEventListener('load', function () {
        var w, d;
        try { w = f.contentWindow; d = f.contentDocument; w.alert = function (m) { msg.push(String(m)); }; w.confirm = function () { return true; }; } catch (e) { return; }   // 보안 확인 화면이면 기다린다
        if (sent) { setTimeout(function () { end(true); }, 300); return; }   // 등록 뒤 화면이 다시 뜨면 끝
        var box = d.querySelector('[class*="xans-board-commentwrite"]'), ta = box && box.querySelector('textarea[name="comment"]');
        var btn = box && [].filter.call(box.querySelectorAll('a, button'), function (x) { return x.offsetParent !== null && /^(등록|확인)$/.test(trim(x.textContent)); })[0];
        if (!ta || !btn) { if (tries++ < 2) { f.src = href; return; } msg.push('상담 내용을 적을 수 있는 권한이 없어요 (관리자로 로그인해 주세요)'); return end(false); }
        ta.value = text;
        var nm = box.querySelector('input[name="comment_name"]'); if (nm && !trim(nm.value)) nm.value = memberName() || brandName() || '상담원';   // 작성자 이름 (카페24 필수 칸)
        // 관리자 화면에서 로그인한 상태는 카페24가 댓글을 비회원처럼 받아 비밀번호 칸을 요구한다 → 고칠 때만 쓰는 값이라 매번 임의로 채운다
        var pw = box.querySelector('input[name="comment_password"]'); if (pw && pw.offsetParent !== null && !pw.value) pw.value = 'Wh' + (Math.random().toString(36).slice(2) + 'kq4m8z2x').slice(0, 8) + '7!';
        try { ta.dispatchEvent(new w.Event('input', { bubbles: true })); ta.dispatchEvent(new w.Event('keyup', { bubbles: true })); } catch (e) {}
        sent = true; btn.click();
        setTimeout(function () { end(true); }, 8000);   // 화면을 다시 띄우지 않는 경우 (등록됐는지는 목록을 다시 읽어 확인)
      });
      f.src = href; document.body.appendChild(f);
      setTimeout(function () { end(false); }, 30000);
    });
  }
  function openCs(a, btn) {
    var href = a.getAttribute('href'), s = parseSubject(a.getAttribute('data-whl-subject')) || {};
    var old = document.getElementById('whlCs'); if (old) old.remove();
    var lay = document.createElement('div'); lay.id = 'whlCs'; lay.className = 'whl-cs-lay'; lay.setAttribute('role', 'dialog'); lay.setAttribute('aria-modal', 'true'); lay.setAttribute('aria-label', '상담 내용');
    lay.innerHTML = '<div class="whl-cs-box">' +
      '<div class="whl-cs-head"><div><span class="whl-tag ' + chCls(s.ch) + '">' + esc(s.ch || '') + '</span> <b>' + esc(s.name || '') + '</b> <span>' + esc(s.id || '') + ' · ' + esc(s.t || '') + '</span></div>' +
      '<button type="button" class="whl-cs-x" aria-label="닫기">×</button></div>' +
      '<div class="whl-cs-body"><div class="whl-cs-contact"></div><h4>상담 내용</h4><ul class="whl-cs-list"><li class="whl-empty">불러오는 중…</li></ul></div>' +
      '<form class="whl-cs-form"><label for="whlCsIn">새 상담 내용</label><textarea id="whlCsIn" rows="4" placeholder="예) 10/08 카카오톡으로 사이즈 문의 → 66 사이즈 교환 안내, 회수 접수함"></textarea>' +
      '<div class="whl-cs-acts"><a class="whl-btn" href="' + esc(href) + '">기록 원문 보기</a><button type="submit" class="whl-btn is-main">상담 내용 등록</button></div><p class="whl-cs-msg" role="status"></p></form></div>';
    document.body.appendChild(lay);
    var list = lay.querySelector('.whl-cs-list'), form = lay.querySelector('form'), ta = lay.querySelector('textarea'), msgEl = lay.querySelector('.whl-cs-msg'), sub = form.querySelector('[type=submit]');
    function close() { lay.remove(); document.removeEventListener('keydown', esc1); }
    function esc1(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc1);
    lay.addEventListener('click', function (e) { if (e.target === lay) close(); });
    lay.querySelector('.whl-cs-x').addEventListener('click', close);
    function render(notes) {
      btn.className = 'whl-cs' + (notes.length ? ' is-done' : ''); btn.innerHTML = csLabel(notes.length);
      if (!notes.length) { list.innerHTML = '<li class="whl-empty">아직 등록한 상담 내용이 없어요. 아래에 적어 등록해 주세요.</li>'; return; }
      list.innerHTML = notes.map(function (x, i) {
        var line = x.text.split('\n')[0];
        return '<li><button type="button" class="whl-cs-item" aria-expanded="false"><span class="whl-cs-no">' + (i + 1) + '</span><span class="whl-cs-sum">' + esc(line) + '</span><span class="whl-cs-meta">' + esc(x.name) + ' · ' + esc(x.date) + '</span></button>' +
          '<div class="whl-cs-full" hidden>' + esc(x.text).replace(/\n/g, '<br>') + '</div></li>';
      }).join('');
      [].forEach.call(list.querySelectorAll('.whl-cs-item'), function (b) {
        b.addEventListener('click', function () { var full = b.nextElementSibling, open = full.hidden; full.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.parentNode.classList.toggle('is-open', open); });
      });
    }
    function reload() { return loadNotes(href).then(function (n) {
      var c = lay.querySelector('.whl-cs-contact'), o = n.log;
      if (o && c && !c.innerHTML && o.member) c.innerHTML = contactBar({ name: o.name || s.name, id: o.id || s.id, phone: o.phone, email: o.email, agree: o.agree, unpaid: s.ch === '주문서', items: o.oform ? o.oform.items.map(function (x) { return x.n; }) : [] });
      render(n);
    }).catch(function () { list.innerHTML = '<li class="whl-empty">상담 내용을 불러오지 못했어요.</li>'; }); }
    reload();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = trim(ta.value.replace(/\r/g, '')); if (!v) { ta.focus(); return; }
      sub.disabled = true; msgEl.textContent = '등록하는 중이에요…';
      var before = list.querySelectorAll('.whl-cs-item').length;
      var said = '';
      addNote(href, ta.value).then(function (m) { said = m || ''; return reload(); }).then(function () {
        var now = list.querySelectorAll('.whl-cs-item').length;
        if (now > before) { ta.value = ''; msgEl.textContent = '상담 내용을 등록했어요.'; var last = list.querySelectorAll('.whl-cs-item'); last[last.length - 1].click(); }
        else msgEl.textContent = said || '등록이 확인되지 않아요. 잠시 뒤 다시 열어 확인해 주세요.';
      }).catch(function (err) { msgEl.textContent = (err && err.message) || '등록하지 못했어요.'; })
        .then(function () { sub.disabled = false; });
    });
    setTimeout(function () { ta.focus(); }, 50);
  }
  /* ---------- 4-9. 손님별로 묶기 : 같은 손님의 기록을 한 줄로 (최근 여러 쪽을 읽어 묶는다) ---------- */
  var REC_PAGES = 6, recCache = null;
  // 글 번호 : /article/상담-기록/1002/45/page/2/ · /board/free/read.html?board_no=1002&no=45
  function artNo(href) { var h = String(href || ''), m = h.match(new RegExp('/' + LOG_BOARD + '/(\\d+)')) || h.match(/[?&]no=(\d+)/); return m ? m[1] : h; }
  function fetchRecords() {
    if (recCache) return recCache;
    var all = [], seen = {};
    function page(n) {
      return pageDoc('/board/free/list.html?board_no=' + LOG_BOARD + '&page=' + n + '&_=' + Date.now()).then(function (d) {
        if (!d) return;
        var got = 0;
        [].forEach.call(d.querySelectorAll('[class*="xans-board-list"] tbody tr'), function (tr) {
          var a = [].filter.call(tr.querySelectorAll('td.subject a[href]'), function (x) { return parseSubject(txtOf(x)); })[0]; if (!a) return;
          var href = a.getAttribute('href'), no = artNo(href);   // 쪽마다 주소에 쪽 번호(/page/2/)가 붙는다 → 글 번호로 가린다
          if (seen[no]) return; seen[no] = 1; got++; href = href.replace(/page\/\d+\/?$/, '').replace(/[?&]page=\d+/, '').replace(/\?$/, '');
          var subj = txtOf(a), m = txtOf(tr).match(/(\d{4})-(\d\d)-(\d\d)\s+(\d\d):(\d\d)/);
          all.push({ href: href, subject: subj, s: parseSubject(subj), at: m ? +(m[1] + m[2] + m[3] + m[4] + m[5]) : 0, date: m ? m[2] + '/' + m[3] + ' ' + m[4] + ':' + m[5] : '',
            notes: parseInt((txtOf(tr.querySelector('.comment')).match(/\d+/) || ['0'])[0], 10) });
        });
        if (got && n < REC_PAGES) return page(n + 1);
      });
    }
    recCache = page(1).then(function () { all.sort(function (x, y) { return y.at - x.at; }); return all; });
    return recCache;
  }
  function personKey(s) { return s.id || s.name; }
  // 카카오 · 네이버 등으로 가입한 회원의 아이디 (카페24 : 1234567890@k · abcd@n …)
  function snsOf(id) { var m = String(id || '').match(/@(k|kakao|n|naver|g|google|a|apple|f|facebook|l|line)$/i); return m ? { k: '카카오', n: '네이버', g: '구글', a: '애플', f: '페이스북', l: '라인' }[m[1].charAt(0).toLowerCase()] : ''; }
  function idText(id) { var s = snsOf(id); return id ? id + (s ? ' (' + s + ' 가입)' : '') : ''; }
  // 같은 손님 묶기 : ① 아이디가 같으면 한 사람
  // ② 아이디가 달라도 (카카오 · 네이버 · 일반 가입을 따로 한 경우) 이름이 같고 휴대폰 또는 이메일까지 같으면 한 사람 — 이름만 같으면 다른 사람으로 둔다
  // ③ 아이디 없이 남은 기록은 이름이 같은 손님이 딱 한 명일 때만 그 손님에게 (여럿이거나 없으면 이름끼리 따로)
  function groupRecords(all) {
    var up = {}, link = {}, noId = [];
    function find(k) { while (up[k] !== k) k = up[k] = up[up[k]]; return k; }
    function join(a, b) { a = find(a); b = find(b); if (a !== b) up[b] = a; }
    function key(k, i) { if (link[k] == null) link[k] = i; else join(link[k], i); }
    function nameOf(r) { var n = trim(r.s.name || ''); return n === '회원' ? '' : n; }   // 「회원」 = 이름을 못 읽은 기록
    all.forEach(function (r, i) {
      var id = trim(r.s.id || '').toLowerCase(), nm = nameOf(r);
      if (!id) { noId.push(i); return; }
      up[i] = i; key('i:' + id, i);
      var ph = String(r.phone || '').replace(/\D/g, ''), em = trim(r.email || '').toLowerCase();
      if (nm && ph.length >= 9) key('p:' + nm + ':' + ph, i);
      if (nm && /@/.test(em)) key('e:' + nm + ':' + em, i);
    });
    var byName = {};
    Object.keys(up).forEach(function (i) { var nm = nameOf(all[i]); if (nm) (byName[nm] = byName[nm] || {})[find(+i)] = 1; });
    noId.forEach(function (i) {
      var nm = nameOf(all[i]), gs = nm ? Object.keys(byName[nm] || {}) : [];
      up[i] = i;
      if (gs.length === 1) join(+gs[0], i); else key('n:' + (nm || trim(all[i].s.name || '')), i);
    });
    var map = {}, list = [], used = {};
    all.forEach(function (r, i) {
      var g = find(i), p = map[g];
      if (!p) { p = map[g] = { key: '', name: r.s.name, id: '', ids: [], recs: [], count: {}, notes: 0 }; list.push(p); }
      if (r.s.id && p.ids.indexOf(r.s.id) < 0) p.ids.push(r.s.id);
      if (!nameOf({ s: { name: p.name } }) && nameOf(r)) p.name = r.s.name;   // 「회원」보다 진짜 이름
      p.recs.push(r); p.count[r.s.ch] = (p.count[r.s.ch] || 0) + 1; p.notes += r.notes;
    });
    list.forEach(function (p) {
      p.id = p.ids[0] || '';   // 가장 최근 기록의 아이디
      var k = p.id || p.name, n = 1; while (used[k]) k = (p.id || p.name) + '#' + (++n); used[k] = 1; p.key = k;
      p.latest = p.recs[0];
      var lastOrder = p.recs.filter(function (r) { return r.s.ch === '주문서'; })[0];
      p.order = !!lastOrder;
      p.unpaid = !!lastOrder && !p.recs.some(function (r) { return r.s.ch === '결제 완료' && r.at >= lastOrder.at; });
      p.lastOrder = lastOrder;
    });
    return list;
  }
  function idsShort(p) { var o = p.ids.length - 1, s = snsOf(p.id); return esc(p.id || '') + (s ? ' <span class="sha-dim">' + s + '</span>' : '') + (o > 0 ? ' <span class="sha-dim" title="' + esc(p.ids.map(idText).join(' · ')) + '">외 ' + o + '개</span>' : ''); }
  function fakeLink(r) { var a = document.createElement('a'); a.setAttribute('href', r.href); a.setAttribute('data-whl-subject', r.subject); return a; }
  var CH_ORDER = ['주문서', '결제 완료', '상품 문의', '카카오톡', '챗봇', '문의'];
  function groupView() {
    var table = document.querySelector('[data-whl-cs]'); if (!table || document.querySelector('.whp-wrap')) return;
    var mode = 'person'; try { mode = localStorage.getItem('shop-helper-logmode') || 'person'; } catch (e) {}
    var oldBar = document.querySelector('.whl-bar'), pager = document.querySelector('[class*="xans-board-paging"], .ec-base-paginate');
    var sw = document.createElement('div'); sw.className = 'whp-switch'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', '보기 방식');
    sw.innerHTML = '<button type="button" data-m="person">손님별로 보기</button><button type="button" data-m="record">기록별로 보기</button>';
    var wrap = document.createElement('div'); wrap.className = 'whp-wrap';
    wrap.innerHTML = '<p class="whl-empty">기록을 손님별로 묶는 중이에요…</p>';
    var anchor = oldBar || table; anchor.parentNode.insertBefore(sw, anchor); table.parentNode.insertBefore(wrap, table);
    function setMode(m) {
      mode = m; try { localStorage.setItem('shop-helper-logmode', m); } catch (e) {}
      [].forEach.call(sw.querySelectorAll('[data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === m)); });
      var rec = m === 'record';
      table.style.display = rec ? '' : 'none'; if (oldBar) oldBar.style.display = rec ? '' : 'none'; if (pager) pager.style.display = rec ? '' : 'none';
      wrap.style.display = rec ? 'none' : '';
    }
    sw.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) setMode(b.getAttribute('data-m')); });
    setMode(mode);
    fetchRecords().then(function (all) {
      var people = groupRecords(all), f = 'all', q = '';
      var n = { all: people.length, order: people.filter(function (p) { return p.order; }).length, unpaid: people.filter(function (p) { return p.unpaid; }).length, none: people.filter(function (p) { return !p.notes; }).length };
      wrap.innerHTML = '<div class="whp-bar"><div class="whl-filter" role="group" aria-label="손님 거르기">' +
        '<button type="button" data-f="all" class="is-on">전체 손님 ' + n.all + '</button><button type="button" data-f="order">주문서까지 온 손님 ' + n.order + '</button>' +
        '<button type="button" data-f="unpaid">미결제 ' + n.unpaid + '</button><button type="button" data-f="none">상담 전 ' + n.none + '</button></div>' +
        '<div class="whp-tools"><input type="search" class="whp-q" placeholder="이름 · 아이디 찾기" aria-label="이름 · 아이디 찾기">' +
        (n.unpaid ? '<button type="button" class="whl-btn is-main" data-reach-all>미결제 손님 연락하기 (' + n.unpaid + ')</button>' : '') + '</div></div>' +
        '<div class="whp-head" aria-hidden="true"><span>손님</span><span>기록</span><span>마지막 활동</span><span>상담</span></div>' +
        '<ul class="whp-list"></ul><p class="whp-note">기록 ' + all.length + '개를 손님 ' + people.length + '명으로 묶었어요.' + (all.length >= REC_PAGES * 10 ? ' 최근 ' + REC_PAGES + '쪽까지 묶어요. 더 오래된 기록은 「기록별로 보기」에서 보세요.' : '') + '</p>';
      var ul = wrap.querySelector('.whp-list');
      function tagsOf(p) {
        return CH_ORDER.filter(function (c) { return p.count[c]; }).map(function (c) { return '<span class="whl-tag ' + chCls(c) + '">' + esc(c) + ' ' + p.count[c] + '</span>'; }).join('') +
          (p.order ? '<span class="whl-tag ' + (p.unpaid ? 'is-unpaid">미결제' : 'is-paid">결제 완료') + '</span>' : '');
      }
      function draw() {
        var list = people.filter(function (p) {
          if (f === 'order' && !p.order) return false; if (f === 'unpaid' && !p.unpaid) return false; if (f === 'none' && p.notes) return false;
          return !q || (p.name + ' ' + p.ids.join(' ')).toLowerCase().indexOf(q) > -1;
        });
        ul.innerHTML = list.length ? list.map(function (p, i) {
          return '<li class="whp-row' + (p.unpaid ? ' is-unpaid' : '') + '" data-i="' + people.indexOf(p) + '">' +
            '<button type="button" class="whp-main" aria-expanded="false">' +
            '<span class="whp-who"><span class="whl-av">' + esc((p.name || '?').charAt(0)) + '</span><span><b>' + esc(p.name) + '</b><small>' + (p.id ? idsShort(p) : '아이디 없음') + '</small></span></span>' +
            '<span class="whp-tags">' + tagsOf(p) + '</span>' +
            '<span class="whp-last"><b>' + esc(p.latest.date || p.latest.s.t) + '</b><small>' + esc(p.latest.s.ch) + ' · 기록 ' + p.recs.length + '개</small></span>' +
            '<span class="whl-cs' + (p.notes ? ' is-done' : '') + '">' + csLabel(p.notes) + '</span><span class="whp-chev" aria-hidden="true"></span></button>' +
            '<div class="whp-sub" hidden></div></li>';
        }).join('') : '<li class="whl-empty whp-none">해당하는 손님이 없어요.</li>';
      }
      function openRow(li) {
        var p = people[+li.getAttribute('data-i')], sub = li.querySelector('.whp-sub'), btn = li.querySelector('.whp-main'), open = sub.hidden;
        sub.hidden = !open; btn.setAttribute('aria-expanded', String(open)); li.classList.toggle('is-open', open);
        if (!open || sub.innerHTML) return;
        sub.innerHTML = '<ol class="whp-recs">' + p.recs.map(function (r, j) {
          return '<li><span class="whl-tag ' + chCls(r.s.ch) + '">' + esc(r.s.ch) + '</span><a href="' + esc(r.href) + '">' + esc(r.date || r.s.t) + ' 기록 보기</a>' +
            '<button type="button" class="whl-cs' + (r.notes ? ' is-done' : '') + '" data-j="' + j + '">' + csLabel(r.notes) + '</button></li>';
        }).join('') + '</ol><div class="whp-acts"><a class="whl-btn is-main" href="' + esc(p.latest.href) + '">최근 기록 열기</a>' +
          (p.unpaid ? '<button type="button" class="whl-btn" data-reach>이 손님 연락하기</button>' : '') + '</div>';
        sub.addEventListener('click', function (e) {
          var b = e.target.closest('[data-j]'); if (b) { openCs(fakeLink(p.recs[+b.getAttribute('data-j')]), b); return; }
          if (e.target.closest('[data-reach]')) openReach([{ a: fakeLink(p.lastOrder), s: p.lastOrder.s, unpaid: true }]);
        });
      }
      draw();
      wrap.addEventListener('click', function (e) {
        var fb = e.target.closest('[data-f]');
        if (fb) { f = fb.getAttribute('data-f'); [].forEach.call(wrap.querySelectorAll('[data-f]'), function (x) { x.classList.toggle('is-on', x === fb); }); draw(); return; }
        if (e.target.closest('[data-reach-all]')) { openReach(people.filter(function (p) { return p.unpaid; }).map(function (p) { return { a: fakeLink(p.lastOrder), s: p.lastOrder.s, unpaid: true }; })); return; }
        var main = e.target.closest('.whp-main'); if (main) openRow(main.parentNode);
      });
      wrap.querySelector('.whp-q').addEventListener('input', function () { q = trim(this.value).toLowerCase(); draw(); });
      var h = decodeURIComponent((location.hash.match(/^#whp=(.+)$/) || [])[1] || '');   // 글 화면의 「이 손님 기록 모두 보기」 → 그 손님 줄을 펼친다
      if (h) { setMode('person'); var hit = ul.querySelector('[data-i="' + people.map(function (p) { return p.key; }).indexOf(h) + '"]'); if (hit) { openRow(hit); hit.scrollIntoView({ block: 'center' }); } }
    }).catch(function () { wrap.innerHTML = '<p class="whl-empty">손님별로 묶지 못했어요. 「기록별로 보기」를 써 주세요.</p>'; });
  }

  /* ---------- 4-10. 기록 글 화면 : 요약(누구 · 무슨 일 · 핵심 숫자 · 연락) → 상세 2단 (왼쪽 이번 기록 · 오른쪽 손님 정보) ---------- */
  function prodCards(list) {
    return '<div class="whl-prods">' + list.map(function (p) {
      var t = p.n.match(/^(.+?)(?:\s*\[(.+)\])?(?:\s+(\d+)개)?(?:\s+([\d,]{2,})원?)?$/) || [p.n, p.n];   // 예전 장바구니 기록은 가격에 「원」이 없다
      var price = (t[4] ? t[4] + '원' : '') || p.p || '', sub = (t[2] ? t[2] + ' · ' : '') + (t[3] ? t[3] + '개' : '') + (p.t ? p.t : '');
      return '<a class="whl-prod" href="' + (p.no ? '/product/detail.html?product_no=' + encodeURIComponent(p.no) : '#none') + '" target="_blank" rel="noopener">' + (p.no ? '<i data-whl-img="' + esc(p.no) + '"></i>' : '<i></i>') +
        '<b>' + esc(t[1]) + '</b><span>' + (price ? '<strong>' + esc(price) + '</strong>' : '') + esc(sub) + '</span></a>';
    }).join('') + '</div>';
  }
  function card(title, body, cls) { return '<section class="whl-card' + (cls ? ' ' + cls : '') + '"><h4>' + title + '</h4>' + body + '</section>'; }
  function dl(rows) { return '<dl class="whl-dl">' + rows.filter(Boolean).map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>'; }
  function loadPics(view) {
    var pics = {};
    [].forEach.call(view.querySelectorAll('[data-whl-img]'), function (i) {
      var no = i.getAttribute('data-whl-img');
      (pics[no] = pics[no] || fetch('/product/detail.html?product_no=' + encodeURIComponent(no), { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; })).then(function (t) {
        var m = t.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || t.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (m) i.style.backgroundImage = 'url("' + m[1].replace(/["\\]/g, '') + '")';
      }).catch(function () {});
    });
  }
  // 기록 하나의 화면 (게시판 글 화면 · 관리자 페이지가 함께 쓴다). opt.board = 게시판 글 화면 (다른 기록 칸 · 원문 보기)
  function detailHtml(o, s, opt) {
      opt = opt || {};
      var name = o.name || s.name || (o.member ? '회원' : '비회원'), id = o.id || s.id || '', g = (o.group || '').split(/\s*·\s*가입\s*/);
      var last = o.hist[0], asked = last ? last.items.filter(function (x) { return !/카카오톡 상담 연결|문의 남기기|^go$/.test(x); }) : [];
      var miss = o.hist.reduce(function (n, h) { return n + h.items.filter(function (x) { return /\(못 찾음\)$/.test(x); }).length; }, 0);
      var who = esc(name) + '님이 ';
      var head = s.ch === '주문서' ? who + '<em class="is-order">주문서까지 왔어요</em>' + (o.oform && o.oform.total ? ' · 결제 예정 <b>' + esc(o.oform.total) + '</b>' : '')
        : s.ch === '결제 완료' ? who + '<em class="is-paid">결제를 마쳤어요</em>' + (o.paid && o.paid.total ? ' · <b>' + esc(o.paid.total) + '</b>' : '')
        : s.ch === '카카오톡' ? who + '<em class="is-talk">카카오톡 상담으로 연결했어요</em>'
        : s.ch === '챗봇' ? who + '챗봇에 <b>' + (asked.length || o.chat) + '가지</b>를 물어봤어요'
        : who + '문의를 남겼어요';
      var keys = [];
      if (o.oform && o.oform.total) keys.push(['is-order', '결제 예정 ' + o.oform.total]);
      if (o.paid) keys.push(['is-paid', '주문번호 ' + o.paid.id]);
      if (o.cart && +o.cart.cnt) keys.push(['', '장바구니 ' + o.cart.cnt + '개 · ' + o.cart.price]);
      if (o.buy) keys.push(['', '누적 구매 ' + o.buy.total + ' (' + o.buy.count + '번)']);
      if (miss) keys.push(['is-miss', '답을 못 찾은 질문 ' + miss + '개']);
      if (o.prods.length) keys.push(['', '최근 본 상품 ' + o.prods.length + '개']);
      if (o.chat) keys.push(['', '챗봇 ' + o.chat + '번 · 상담 연결 ' + o.link + '번']);
      var html = '<div class="whl whl2">' +
        '<div class="whl-hero"><div class="whl-hero-top"><div class="whl-who"><span class="whl-av' + (o.member ? '' : ' is-guest') + '">' + esc(name.charAt(0)) + '</span><div><b>' + esc(name) + '</b>' +
        '<span>' + (o.member ? '회원' : '비회원') + (id ? ' · ' + esc(id) : '') + (g[0] ? ' · ' + esc(g[0]) : '') + '</span></div></div>' +
        '<div class="whl-meta">' + (s.ch ? '<span class="whl-tag ' + chCls(s.ch) + '">' + esc(s.ch) + '</span>' : '') + (s.t ? '<span>' + esc(s.t) + '</span>' : '') + '</div></div>' +
        '<p class="whl-headline">' + head + '</p>' +
        (keys.length ? '<ul class="whl-keys">' + keys.map(function (k) { return '<li class="' + k[0] + '">' + esc(k[1]) + '</li>'; }).join('') + '</ul>' : '') +
        '<div class="whl-acts">' + (o.member ? contactBar({ name: name, id: id, phone: o.phone, email: o.email, agree: o.agree, unpaid: s.ch === '주문서', items: o.oform ? o.oform.items.map(function (x) { return x.n; }) : [] }) : '') +
        '<button type="button" class="whl-btn is-main" data-whl-note>상담 내용 등록</button></div></div>';
      // 왼쪽 : 이번 기록
      var main = '';
      if (o.oform && o.oform.items.length) main += card('주문서까지 온 상품 <small>결제 예정 ' + esc(o.oform.total) + '</small>', prodCards(o.oform.items), 'is-order');
      if (o.paid) main += card('결제 완료', '<p><b>주문번호 ' + esc(o.paid.id) + '</b>' + (o.paid.total ? ' · ' + esc(o.paid.total) : '') + '</p>', 'is-paid');
      main += card('상담 이력 <small>이 손님 기기 기준 · 최근 4번</small>', o.hist.length ? '<ol class="whl-time">' + o.hist.map(function (h) {
        return '<li><time>' + esc(h.t) + '</time><div class="whl-chips">' + h.items.map(function (x) { return '<span>' + histTag(x) + '</span>'; }).join('<span class="whl-empty">→</span>') + '</div></li>';
      }).join('') + '</ol>' : '<p class="whl-empty">챗봇 상담 이력이 없어요.</p>');
      if (o.prods.length) main += card('최근 본 상품 <small>최신순</small>', prodCards(o.prods));
      if (o.carts.length) main += card('장바구니 <small>' + esc(o.cart.cnt) + '개 · ' + esc(o.cart.price) + '</small>', prodCards(o.carts));
      if (o.orders.length) main += card('최근 주문 <small>최근 3개월</small>', '<ul class="whl-orders">' + o.orders.map(function (x) {
        return '<li><div><time>' + esc(x.d) + '</time><span>' + esc(x.id) + '</span></div><b>' + esc(x.n) + '</b><span class="whl-tag' + (/취소|반품|교환/.test(x.st) ? ' is-miss' : /완료/.test(x.st) ? ' is-buy' : '') + '">' + esc(x.st) + '</span></li>';
      }).join('') + '</ul>');
      if (o.path.length) main += '<details class="whl-card whl-more" open><summary>둘러본 순서 <small>' + o.path.length + '곳 · 눌러서 접기</small></summary><ol class="whl-path">' + o.path.map(function (n, i) {
        var k = stepKind(n, o); return '<li class="' + (k ? 'is-' + k : '') + (i === o.path.length - 1 ? ' is-last' : '') + '"><span><em>' + (i + 1) + '</em>' + esc(n) + '</span></li>';
      }).join('') + '</ol></details>';
      // 오른쪽 : 손님 정보
      var side = '';
      if (o.member) {
        var yn = function (k) { return !o.agree ? '-' : o.agree[k] ? '<span class="whl-yes">동의</span>' : '<span class="whl-no">거부</span>'; };
        side += card('연락처', dl([['휴대폰', o.phone ? '<a href="tel:' + esc(digits(o.phone)) + '">' + esc(o.phone) + '</a>' : '<span class="whl-empty">등록 안 함</span>'],
          ['이메일', o.email ? '<a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a>' : '<span class="whl-empty">-</span>'],
          ['문자 수신', yn('sms')], ['메일 수신', yn('mail')]]) + (!o.phone && !o.email ? '<p class="whl-empty">이 기록에는 연락처가 없어요. 「회원 정보」에서 확인하세요.</p>' : ''));
        side += card('회원 · 구매', dl([['회원 등급', esc(g[0] || '-')], ['가입일', esc(g[1] || '-')],
          o.buy && ['누적 주문', esc(o.buy.count) + '번'], o.buy && ['누적 구매', esc(o.buy.total)], o.buy && ['적립금', esc(o.buy.mileage)], o.buy && ['관심상품', esc(o.buy.wish) + '개']]) +
          (o.status.length ? '<div class="whl-chips">' + o.status.filter(function (x) { return x[1]; }).map(function (x) { return '<span class="whl-tag is-on">' + esc(x[0]) + ' ' + x[1] + '</span>'; }).join('') + '</div>' : ''));
      }
      if (o.style.length) side += card('스타일 취향', '<div class="whl-chips">' + o.style.map(function (x) { return '<span class="whl-tag">' + esc(x) + '</span>'; }).join('') + '</div>');
      var key = id || (o.member ? name : '');
      if (key && opt.board) side += card('이 손님의 다른 기록', '<ul class="whl-others"><li class="whl-empty">불러오는 중…</li></ul><a class="whl-more-link" href="/board/free/list.html?board_no=' + LOG_BOARD + '#whp=' + encodeURIComponent(key) + '">손님별 보기에서 모두 보기 →</a>', 'is-others');
      if (opt.side) side = opt.side + side;   // 관리자 페이지 : 상담 메모 칸을 맨 위에
      html += '<div class="whl-grid"><div class="whl-main">' + main + '</div><aside class="whl-side">' + side + '</aside></div>' +
        (opt.board ? '<div class="whl-foot"><button type="button" class="whl-btn" data-whl-raw>원문 보기</button></div>' : '') + '</div>';
      return html;
  }
  function renderDetail(box, o, s) {
    try {
      var name = o.name || s.name || (o.member ? '회원' : '비회원'), id = o.id || s.id || '', key = id || (o.member ? name : '');
      var html = detailHtml(o, s, { board: true });
      var wrap = document.createElement('div'); wrap.innerHTML = html;
      var view = wrap.firstChild; box.parentNode.insertBefore(view, box);
      box.classList.add('whl-raw'); box.style.display = 'none';
      view.querySelector('[data-whl-raw]').addEventListener('click', function () { var hide = box.style.display !== 'none'; box.style.display = hide ? 'none' : ''; this.textContent = hide ? '원문 보기' : '원문 닫기'; });
      view.querySelector('[data-whl-note]').addEventListener('click', function () {
        var subj = trim((document.querySelector('[class*="xans-board-read"] .head h3') || {}).textContent || ''), a = document.createElement('a');
        a.setAttribute('href', location.pathname + location.search); a.setAttribute('data-whl-subject', subj); openCs(a, document.createElement('span'));
      });
      loadPics(view);
      var others = view.querySelector('.whl-others');
      if (others) fetchRecords().then(function (all) {
        var here = artNo(location.pathname + location.search), mine = all.filter(function (r) { return personKey(r.s) === key; }), rest = mine.filter(function (r) { return artNo(r.href) !== here; });
        others.innerHTML = rest.length ? rest.slice(0, 8).map(function (r) {
          return '<li><span class="whl-tag ' + chCls(r.s.ch) + '">' + esc(r.s.ch) + '</span><a href="' + esc(r.href) + '">' + esc(r.date || r.s.t) + '</a>' + (r.notes ? '<small>상담 ' + r.notes + '</small>' : '') + '</li>';
        }).join('') : '<li class="whl-empty">다른 기록이 없어요.</li>';
        // 주문서 기록이면 그 뒤에 결제했는지 알려 준다
        if (s.ch === '주문서') {
          var me = mine.filter(function (r) { return artNo(r.href) === here; })[0], paid = me && mine.some(function (r) { return r.s.ch === '결제 완료' && r.at >= me.at; });
          var hl = view.querySelector('.whl-headline'); if (hl && me) hl.insertAdjacentHTML('beforeend', paid ? ' <span class="whl-tag is-paid">이후 결제 완료</span>' : ' <span class="whl-tag is-unpaid">아직 결제 전</span>');
        }
      }).catch(function () { others.innerHTML = '<li class="whl-empty">불러오지 못했어요.</li>'; });
      return true;
    } catch (e) { return false; }
  }
  /* ---------- 4-11. 관리자 페이지 (/addons/shop-helper/admin.html) : 구글 시트에 쌓인 기록을 손님별로 묶어 보고 · 상담 메모 · 미결제 연락 ----------
     접속 키(시트 코드의 ADMIN_KEY)를 넣어야 기록이 보인다. 키는 이 브라우저에만 기억한다 ([잠그기]로 지움) */
  var ADMIN = !!(document.currentScript && document.currentScript.hasAttribute('data-admin'));
  var AKEY = 'shop-helper-admin-key';
  function sheetCall(body) {
    body.shop = SHOP;
    return fetch(SHEET, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function adminCss() {
    if (document.getElementById('shaCss')) return;
    var s = document.createElement('style'); s.id = 'shaCss';
    // 쇼핑몰 톤 : 흑백 · Pretendard + Jost(영문) · 둥근 검정 버튼 · 얇은 선 · 넉넉한 여백
    s.textContent = [
      'html{overflow-y:scroll;scrollbar-gutter:stable}',   /* 목록이 짧아져도 스크롤바 자리를 비워 두어 화면이 옆으로 밀리지 않게 */
      'body{margin:0;background:#fff;font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#111;-webkit-font-smoothing:antialiased;letter-spacing:-.01em}',
      '.sha,.sha-drawer{--ink:#111;--sub:#767676;--faint:#a3a3a3;--line:#e7e7e4;--soft:#f3f3f0;--bg:#fff;--point:#2f5bff;--point-dark:#1f45e0;--accent:#2f5bff;--red:#c8372d;--green:#1f7a4a;--en:Jost,Pretendard,sans-serif;',
      '--whl-ink:#111;--whl-sub:#767676;--whl-line:#e7e7e4;--whl-soft:#f3f3f0;--whl-pt:#111}',
      '.sha{max-width:1320px;margin:0 auto;padding:0 32px 80px;font-size:14px;line-height:1.6}',
      '.sha *,.sha-drawer *{box-sizing:border-box}',
      '.wh-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
      /* 머리 */
      '.sha-top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding:40px 0 28px;border-bottom:1px solid var(--ink);margin-bottom:28px}',
      '.sha-top small{display:block;font:500 11px/1 var(--en);letter-spacing:.22em;text-transform:uppercase;color:var(--sub)}',
      '.sha-top h1{margin:12px 0 0;font-size:34px;line-height:1.15;font-weight:600;letter-spacing:-.04em}',
      '.sha-top-acts{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}',
      /* 버튼 (쇼핑몰 BUY IT NOW · CART 와 같은 둥근 모양) */
      '.sha .whl-btn,.sha-drawer .whl-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 20px;border:1px solid #d9d9d5;border-radius:999px;background:#fff;color:#111;font:500 13px/1 Pretendard,sans-serif;text-decoration:none;cursor:pointer;transition:border-color .2s,background .2s,color .2s}',
      '.sha .whl-btn:hover,.sha-drawer .whl-btn:hover{border-color:#111}',
      '.sha .whl-btn.is-main,.sha-drawer .whl-btn.is-main{background:var(--point);border-color:var(--point);color:#fff!important}.sha .whl-btn.is-main:hover,.sha-drawer .whl-btn.is-main:hover{background:var(--point-dark);border-color:var(--point-dark)}',
      '.sha .whl-btn[disabled]{opacity:.35;cursor:default}',
      /* 버튼 설명 말풍선 : 마우스를 올리거나 키보드로 가면 보인다 */
      '.sha-tools .whl-btn[data-tip]{position:relative}',
      '.sha-tools .whl-btn[data-tip]::after{content:attr(data-tip);position:absolute;z-index:30;left:50%;top:calc(100% + 10px);transform:translateX(-50%);width:max-content;max-width:min(270px,80vw);padding:10px 14px;border-radius:12px;background:#111;color:#fff;font:400 12.5px/1.55 Pretendard,sans-serif;letter-spacing:-.01em;text-align:left;white-space:normal;box-shadow:0 8px 24px rgba(0,0,0,.18);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}',
      '.sha-tools .whl-btn[data-tip]::before{content:"";position:absolute;z-index:31;left:50%;top:calc(100% + 4px);width:10px;height:10px;background:#111;transform:translateX(-50%) rotate(45deg);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}',
      '.sha-tools .whl-btn[data-tip]:last-child::after{left:auto;right:0;transform:none}',
      /* 표 제목 설명 말풍선 */
      '.sha-tip{position:relative;display:inline-block}',
      '.sha-tip::after{content:attr(data-tip);position:absolute;z-index:30;left:0;top:calc(100% + 12px);width:max-content;max-width:min(240px,70vw);padding:9px 12px;border-radius:10px;background:#111;color:#fff;font:400 12px/1.55 Pretendard,sans-serif;letter-spacing:-.01em;text-transform:none;text-align:left;white-space:normal;box-shadow:0 8px 24px rgba(0,0,0,.18);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}',
      '.sha-tip::before{content:"";position:absolute;z-index:31;left:14px;top:calc(100% + 7px);width:9px;height:9px;background:#111;transform:rotate(45deg);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}',
      '.sha-table th:nth-last-child(-n+3) .sha-tip::after{left:auto;right:0}.sha-table th:nth-last-child(-n+3) .sha-tip::before{left:auto;right:14px}',
      '.sha-table th:hover .sha-tip::after,.sha-table th:hover .sha-tip::before{opacity:1;visibility:visible}',
      '.sha-tools .whl-btn[data-tip]:hover::after,.sha-tools .whl-btn[data-tip]:hover::before,.sha-tools .whl-btn[data-tip]:focus-visible::after,.sha-tools .whl-btn[data-tip]:focus-visible::before{opacity:1;visibility:visible}',
      '.sha-drawer .whl-btn.is-warn{border-color:#efc4bf;color:var(--red);background:#fff}',
      /* 숫자 요약 */
      '.sha-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0;margin:0 0 32px;border:1px solid var(--line);border-radius:18px;background:#fff;overflow:hidden}',
      '.sha-sum span{display:flex;flex-direction:column;gap:6px;padding:20px 24px;border-left:1px solid var(--line)}.sha-sum span:first-child{border-left:0}',
      '.sha-sum em{font-style:normal;font-size:12.5px;color:#111}',
      '.sha-sum b{font:500 30px/1 var(--en);letter-spacing:-.01em;color:#111}',
      '.sha-sum .is-none b,.sha-sum .is-unpaid b{color:#111}.sha-sum .is-range b{font:600 14px/1.4 Pretendard,sans-serif}',
      /* 도구 줄 */
      '.sha-bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 16px;margin:0 0 14px}',
      '.sha-dates,.sha-search,.sha-tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.sha-label{font:500 11px/1 var(--en);letter-spacing:.18em;text-transform:uppercase;color:var(--sub);margin-right:4px}',
      '.sha-date,.sha-q,.sha-sort{height:40px;padding:0 16px;border:1px solid #d9d9d5;border-radius:999px;background:#fff;font:inherit;font-size:14px;color:#111}',
      '.sha-date{width:150px;padding:0 12px}.sha-q{width:240px;font-size:16px}.sha-sort{padding:0 14px;cursor:pointer}',
      '.sha-date:focus,.sha-q:focus,.sha-sort:focus{outline:none;border-color:#111}',
      '.sha-tilde{color:var(--faint)}',
      '.sha-chip{height:32px;padding:0 12px;border:0;border-radius:999px;background:transparent;font:500 12.5px/1 Pretendard,sans-serif;color:var(--sub);cursor:pointer}.sha-chip:hover{background:var(--soft);color:#111}',
      /* 상담 여부 탭 : 상세페이지 탭처럼 밑줄 */
      '.sha .sha-tabs{display:flex;gap:28px;border:0}',
      '.sha .sha-tabs button{height:auto;padding:6px 0 10px;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;font:500 15px/1.2 Pretendard,sans-serif;color:var(--faint);cursor:pointer}',
      '.sha .sha-tabs button:hover{color:#111}.sha .sha-tabs button.is-on{color:var(--point);border-bottom-color:var(--point);background:none}',
      /* 목록 */
      '.sha-table-wrap{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden}',
      '.sha-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:14px}',
      '.sha-table th{padding:16px 14px;border-bottom:1px solid var(--line);font:500 11px/1 var(--en);letter-spacing:.14em;text-transform:uppercase;color:var(--sub);text-align:left;white-space:nowrap}',
      '.sha-table th[data-s]{cursor:pointer}.sha-table th[data-s]:hover,.sha-table th[aria-sort]{color:#111}.sha-table th[aria-sort]:after{content:"↓";margin-left:6px;font-family:var(--en)}',
      '.sha-table td{padding:18px 14px;border-bottom:1px solid #f0f0ed;vertical-align:middle}',
      '.sha-table tbody tr:last-child td{border-bottom:0}',
      '.sha-table tbody tr[data-p]{cursor:pointer;transition:background .15s}.sha-table tbody tr[data-p]:hover{background:#fafaf8}.sha-table tbody tr[data-p]:focus-visible{outline:2px solid #111;outline-offset:-2px}',
      '.sha-table .c-no{width:64px;text-align:center;font-family:var(--en);color:var(--faint)}.sha-table .c-cs{width:128px}.sha-table .c-who{width:160px}.sha-table .c-cnt{width:70px}.sha-table .c-pay{width:104px}.sha-table .c-tel{width:140px}.sha-table .c-time{width:116px}',
      '.c-who b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.c-who small{display:block;margin-top:2px;font-size:12px;color:var(--sub);overflow:hidden;text-overflow:ellipsis}',
      '.sha-table td.c-what{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#333}.c-what .whl-tag{margin-right:6px}',
      '.sha-table td.c-cnt,.sha-table td.c-tel,.sha-table td.c-time{white-space:nowrap;color:#555;font-variant-numeric:tabular-nums}',
      /* 상담 상태 : 점 + 글자 */
      '.sha-cs{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;white-space:nowrap}',
      '.sha-cs:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}',
      '.sha-cs.is-none{color:var(--red)}.sha-cs.is-done{color:var(--green)}',
      '.sha-dim{color:#c9c9c5}.sha-none{padding:72px 14px!important;text-align:center;color:var(--sub)}',
      /* 배지 */
      '.sha .whl-tag,.sha-drawer .whl-tag{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;font-size:11.5px;font-weight:600;background:var(--soft);color:#111;white-space:nowrap;vertical-align:middle}',
      '.sha .whl-tag.is-order,.sha-drawer .whl-tag.is-order{background:#fff;border:1px solid var(--accent);color:var(--accent)}',
      '.sha .whl-tag.is-chat,.sha-drawer .whl-tag.is-chat{background:var(--soft);color:#555}',
      '.sha .whl-tag.is-talk,.sha-drawer .whl-tag.is-talk{background:#fee500;color:#191919}',
      '.sha .whl-tag.is-unpaid,.sha-drawer .whl-tag.is-unpaid{background:var(--accent);color:#fff}',
      '.sha .whl-tag.is-paid,.sha-drawer .whl-tag.is-paid{background:#e9f3ed;color:var(--green)}',
      '.sha-drawer .whl-tag.is-miss{background:#fbeceb;color:var(--red)}.sha-drawer .whl-tag.is-on{background:#111;color:#fff}',
      '.sha-table tr.is-unpaid td:first-child{box-shadow:inset 3px 0 0 var(--accent)}',
      /* 쪽 */
      '.sha-pages{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:22px}',
      '.sha-pages button{min-width:36px;height:36px;padding:0 10px;border:0;border-radius:999px;background:transparent;font:500 13px/1 var(--en);color:var(--sub);cursor:pointer}.sha-pages button:hover{color:#111}',
      '.sha-pages button[aria-current="page"]{background:var(--point);color:#fff}.sha-pages button[disabled]{opacity:.3;cursor:default}',
      /* 손님 자세히 보기 */
      '.sha-drawer{position:fixed;inset:0;z-index:2147483000;display:flex;justify-content:flex-end;background:rgba(17,17,17,.38);font-family:Pretendard,sans-serif}',
      '.sha-drawer-box{display:flex;flex-direction:column;width:min(1040px,100%);height:100%;background:var(--bg);box-shadow:-20px 0 60px rgba(0,0,0,.18);animation:shaIn .25s ease;margin:0;color:#111}',
      '@keyframes shaIn{from{transform:translateX(32px);opacity:.5}to{transform:none;opacity:1}}',
      '.sha-drawer-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:20px 32px;background:#fff;border-bottom:1px solid var(--line)}',
      '.sha-drawer-head b{font-size:20px;font-weight:600;letter-spacing:-.03em}.sha-drawer-head small{margin-left:10px;font-size:13px;color:var(--sub)}',
      '.sha-drawer .whl-cs-x{width:40px;height:40px;border:1px solid var(--line);border-radius:50%;background:#fff;font-size:20px;cursor:pointer}',
      '.sha-drawer-body{flex:1;overflow:auto;padding:28px 32px 64px;font-size:14px;line-height:1.65}',
      '.shp-top{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start}',
      '.shp-sec{margin:0 0 16px;padding:26px 28px;background:#fff;border:1px solid var(--line);border-radius:18px}',
      '.shp-sec>h3{display:flex;align-items:baseline;gap:12px;margin:0 0 20px;font-size:17px;font-weight:600;letter-spacing:-.03em}',
      '.shp-sec>h3 i{font:500 12px/1 var(--en);font-style:normal;letter-spacing:.12em;color:var(--faint)}',
      '.shp-sec>h3 small{font-size:12.5px;font-weight:400;color:var(--sub)}',
      '.shp-sec.is-order{border-color:#f2c3ab}',
      '.shp-who{display:flex;align-items:center;gap:14px;margin-bottom:20px}',
      '.shp-who .whl-av{width:52px;height:52px;border-radius:50%;background:var(--point);color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:600;flex:none}',
      '.shp-who b{display:block;font-size:21px;font-weight:600;letter-spacing:-.03em}.shp-who>div:not(.shp-badges)>span{display:block;font-size:13px;color:var(--sub)}',
      '.shp-badges .sha-todo{height:26px;padding:0 11px 0 9px;font-size:12px}',
      '.shp-badges{margin-left:auto;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:flex-end}',
      '.shp-dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;margin:0 0 18px;padding:4px 0;border-top:1px solid var(--line)}',
      '.shp-dl div{display:grid;grid-template-columns:86px 1fr;gap:10px;padding:11px 0;border-bottom:1px solid #f1f1ee}',
      '.shp-dl dt{margin:0;font-size:12.5px;color:var(--sub)}.shp-dl dd{margin:0;font-size:14px;font-weight:500;word-break:break-all}',
      '.shp-dl a{color:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:#bbb}',
      '.whl-yes{color:var(--green)}.whl-no{color:var(--red)}',
      '.shp-style{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 18px}.shp-style>span:first-child{font-size:12.5px;color:var(--sub);margin-right:6px}',
      '.sha-drawer .whl-contact{display:flex;flex-wrap:wrap;gap:8px}',
      '.shp-sub{margin:24px 0 12px;font-size:14px;font-weight:600}.shp-sub small{margin-left:6px;font-size:12px;font-weight:400;color:var(--sub)}',
      '.sha-note-form textarea{width:100%;min-height:96px;padding:14px 16px;border:1px solid #d9d9d5;border-radius:14px;background:#fff;font:inherit;font-size:16px;line-height:1.55;resize:vertical}',
      '.sha-note-form textarea:focus{outline:none;border-color:#111}',
      '.sha-note-form .whl-btn{width:100%;height:46px;margin-top:10px}.sha-note-msg{margin:8px 0 0;font-size:12.5px;color:var(--sub);min-height:1em}',
      '.sha-notes{list-style:none;margin:0;padding:0;display:grid;gap:10px}',
      '.sha-notes li{padding:14px 16px;border-radius:14px;background:var(--soft);font-size:14px;white-space:pre-wrap}',
      '.sha-notes small{display:block;margin-bottom:4px;font-size:11.5px;color:var(--sub)}',
      '.sha-drawer .sha-note-pages{margin-top:14px}',
      /* 상품 문의 */
      '.sha .whl-tag.is-qna,.sha-drawer .whl-tag.is-qna{background:#fff;border:1px solid #111;color:#111}',
      '.sha-sum .is-wait b,.sha-sum .is-wait em{color:#111}',
      '.sha-table tr.is-wait td:first-child{box-shadow:inset 3px 0 0 var(--red)}',
      '.sha-table .c-prd{width:240px}.sha-qprd{display:flex;align-items:center;gap:12px;min-width:0}.sha-qprd i{flex:none;width:40px;height:52px;border-radius:8px;background:var(--soft) center/cover no-repeat}',
      '.sha-qprd span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#333}',
      '.sha-qsub{display:block;overflow:hidden;text-overflow:ellipsis;font-weight:600;color:#111}.sha-qsub small{font-weight:400;color:var(--sub)}',
      '.sha-lock{vertical-align:-1px;margin-right:5px;color:var(--sub)}',
      '.sha .whl-btn.is-kakao{background:#fee500;border-color:#fee500;color:#191919;text-decoration:none}.sha .whl-btn.is-kakao:hover{border-color:#191919}',
      '.shp-dl .sha-link{margin-left:8px;font-size:12px}',
      '.sha-loading{display:flex;justify-content:center;align-items:center;padding:48px 0}.sha-loading.is-page{min-height:60vh}.sha-loading.is-small{padding:20px 0}',
      '.sha-spin{display:inline-flex}.sha-spin i{display:block;width:34px;height:34px;border-radius:50%;border:3px solid #e3e8ff;border-top-color:var(--point,#2f5bff);animation:shaSpin .8s linear infinite}',
      '.sha-loading.is-small .sha-spin i{width:24px;height:24px;border-width:2.5px}.sha-spin.is-tiny i{width:20px;height:20px;border-width:2.5px;margin-top:6px}',
      '@keyframes shaSpin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.sha-spin i{animation-duration:2s}}',
      '.sha-qacts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.sha-qacts .sha-copy{margin:0;text-decoration:none}',
      '.sha-copy.is-reply{background:var(--point);border-color:var(--point);color:#fff}.sha-copy.is-reply:hover{background:var(--point-dark)}',
      '.sha-table td.c-cs .sha-state{max-width:100%}',
      '.sha-qbadge{display:inline-flex;align-items:center;height:22px;padding:0 8px;border:1px solid var(--red);border-radius:999px;background:#fff;color:var(--red);font-size:11px;font-weight:600;white-space:nowrap;flex:none}',
      '.shp-sec.is-wait{border-color:#efc4bf}',
      '.shp-qna{list-style:none;margin:0;padding:0;display:grid;gap:12px}',
      '.shp-qna li{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:14px}',
      '.shp-qna li>i{display:block;aspect-ratio:3/4;border-radius:10px;background:var(--soft) center/cover no-repeat}',
      '.shp-qna-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-bottom:4px}.shp-qna-top time{font:500 12px/1 var(--en);color:var(--sub)}',
      '.shp-qna b{display:block;font-size:14px;font-weight:600}.shp-qna p{margin:4px 0 0;font-size:13px;color:#333;white-space:pre-wrap}.shp-qna li>div>span{display:block;margin-top:4px;font-size:12px;color:var(--sub)}',
      '.shp-qna .whl-btn{height:36px;padding:0 14px;font-size:12.5px}.shp-qna-acts{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}',
      '@media (max-width:820px){.shp-qna li{grid-template-columns:56px minmax(0,1fr)}.shp-qna-acts{grid-column:1/-1;justify-content:flex-start}.sha-table td.c-prd{order:3;flex:1 1 100%}}',
      '.shp-dl div.is-wide{grid-column:1/-1}',
      '.sha-copy{display:inline-flex;align-items:center;height:24px;margin-left:8px;padding:0 10px;border:1px solid #d9d9d5;border-radius:999px;background:#fff;font:500 11.5px/1 Pretendard,sans-serif;color:#111;cursor:pointer;vertical-align:middle;white-space:nowrap}',
      '.sha-copy:hover{border-color:#111}.sha-copy:focus-visible{outline:2px solid #111;outline-offset:2px}',
      '.sha-dd-note{display:block;margin-top:2px;font-size:11.5px;font-weight:400;color:var(--sub)}',
      /* 오늘 확인 : 빨강 배지 · 확인 완료 : 초록 배지 · 상담 내용마다 드롭다운 */
      '.sha-todo{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 9px 0 7px;border-radius:999px;background:var(--red);color:#fff;font-size:11.5px;font-weight:600;line-height:1;white-space:nowrap;flex:none;vertical-align:middle}',
      '.sha-todo.is-done{background:#e9f3ed;color:var(--green)}',
      '.sha-table .c-who{width:230px}.sha-table td.c-who b{display:flex;align-items:center;gap:8px;min-width:0}.sha-table td.c-who b>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      /* 목록 정리 : 배지 대신 글자 · 할 일 줄은 왼쪽 빨간 막대 하나 · 버튼은 오른쪽 끝 글자 링크 */
      '.sha-table tr.is-flag td:first-child{box-shadow:inset 3px 0 0 var(--red)}',
      '.sha-table .c-no{width:56px}.sha-table .c-cs{width:118px}.sha-table .c-who{width:150px}.sha-table .c-cnt{width:60px}.sha-table .c-pay{width:92px}.sha-table .c-tel{width:132px}.sha-table .c-time{width:112px}.sha-table .c-go{width:132px;text-align:right}',
      '.sha-line{display:flex;align-items:baseline;min-width:0}.sha-ch{flex:none;width:64px;font-size:12px;font-weight:500;color:var(--sub)}',
      '.sha-txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#222}.sha-txt small{color:var(--sub)}',
      /* 상담 신청 칸 : 카톡 상담 · 챗봇 상담 · 문의 남기기 딱지 (마우스를 올리면 마지막 신청 시각) */
      '.sha-table .c-req{width:124px}',
      '.sha-req{display:block;position:relative;width:max-content;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600;line-height:1.4;white-space:nowrap;cursor:default}.sha-req+.sha-req{margin-top:5px}',
      '.sha-req.is-kk{background:#fee500;color:#191919}.sha-req.is-bot{background:#111;color:#fff}.sha-req.is-ask{background:#f0f0ec;color:#444}',
      '.sha-req::after{content:attr(data-tip);position:absolute;z-index:30;left:calc(100% + 11px);top:50%;transform:translateY(-50%);width:max-content;max-width:190px;padding:8px 12px;border-radius:10px;background:#111;color:#fff;font:400 12px/1.5 Pretendard,sans-serif;letter-spacing:-.01em;white-space:normal;box-shadow:0 8px 24px rgba(0,0,0,.18);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}',
      '.sha-req::before{content:"";position:absolute;z-index:31;left:calc(100% + 7px);top:50%;width:8px;height:8px;margin-top:-4px;background:#111;transform:rotate(45deg);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}',
      '.sha-req:hover::after,.sha-req:hover::before{opacity:1;visibility:visible}',
      '.sha-flag{display:block;margin:6px 0 0 64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;color:var(--red)}',
      '.sha-flag:before{content:"";display:inline-block;width:5px;height:5px;margin:0 7px 2px 0;border-radius:50%;background:currentColor;vertical-align:middle}',
      '.sha-pay{font-size:13px;font-weight:600;white-space:nowrap}.sha-pay.is-unpaid{color:var(--accent)}.sha-pay.is-paid{color:var(--green)}',
      '.sha-cs select.sha-plain{max-width:100%;height:auto;margin:0;padding:0 16px 0 0;border:0;background:transparent url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%279%27 height=%276%27%3E%3Cpath d=%27M1 1l3.5 3.5L8 1%27 fill=%27none%27 stroke=%27%23999%27 stroke-width=%271.4%27/%3E%3C/svg%3E") right center no-repeat;-webkit-appearance:none;appearance:none;font:inherit;color:inherit;cursor:pointer}',
      '.sha-cs select.sha-plain:focus-visible{outline:2px solid #111;outline-offset:3px}',
      '.sha-links{display:inline-flex;flex-wrap:wrap;justify-content:flex-end;gap:4px 12px}',
      '.sha-link{padding:0;border:0;background:none;font:500 12.5px/1.6 Pretendard,sans-serif;color:#111;text-decoration:underline;text-underline-offset:3px;text-decoration-color:#c9c9c5;cursor:pointer;white-space:nowrap}.sha-link:hover{text-decoration-color:#111}',
      '.sha-go{font-size:12.5px;color:var(--faint);white-space:nowrap}.sha-go:after{content:" ›"}.sha-table tbody tr[data-p]:hover .sha-go{color:#111}',
      '.c-what .sha-todo-line{display:block;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;font-weight:600;color:var(--red)}.c-what .sha-todo-line small{font-weight:400;opacity:.75}',
      '.c-what .sha-act{display:block;overflow:hidden;text-overflow:ellipsis}',
      '.sha-sum button{display:flex;flex-direction:column;gap:6px;padding:20px 24px;border:0;border-left:1px solid var(--line);background:#fff;font:inherit;text-align:left;color:inherit;cursor:pointer;transition:background .15s}',
      '.sha-sum button:first-child{border-left:0}.sha-sum button:hover{background:#f7f7f7}.sha-sum button.is-on{background:#f1f1f1}.sha-sum button:focus-visible{outline:2px solid #111;outline-offset:-2px}',
      '.sha-sum .is-todo b,.sha-sum .is-todo em{color:#111}',
      '.shp-sec>h3 .sha-check{margin-left:auto;align-self:center}',
      '.sha-check{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px 0 10px;border:1px solid #efc4bf;border-radius:999px;background:#fff;color:var(--red);font-size:13px;font-weight:600;letter-spacing:-.01em;cursor:pointer;user-select:none}',
      '.sha-check input{width:18px;height:18px;margin:0;accent-color:var(--red);cursor:pointer}',
      '.sha-check:has(input:checked){background:var(--red);border-color:var(--red);color:#fff}.sha-check:has(input:checked) input{accent-color:#fff}',
      '.sha-check:focus-within{outline:2px solid #111;outline-offset:2px}',
      '.sha-note-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:8px;white-space:normal}.sha-note-top small{display:inline;margin:0}',
      '.sha-notes li.is-todo{background:#fff1ef;box-shadow:inset 3px 0 0 var(--red)}.sha-notes li.is-done{background:#f1f7f3}',
      '.sha-state{height:30px;padding:0 28px 0 12px;border:1px solid #d9d9d5;border-radius:999px;background:#fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%23767676%27 stroke-width=%271.5%27/%3E%3C/svg%3E") right 11px center no-repeat;-webkit-appearance:none;appearance:none;font:600 12.5px/1 Pretendard,sans-serif;color:#555;cursor:pointer}',
      '.sha-state.is-todo{border-color:var(--red);color:var(--red)}.sha-state.is-done{border-color:#bcdcc8;color:var(--green)}.sha-state:focus{outline:none;border-color:#111}.sha-state[disabled]{opacity:.5;cursor:default}',
      '.sha-late{font-style:normal;font-size:11.5px;font-weight:600;color:var(--red)}.sha-saving{font-style:normal;font-size:11.5px;color:var(--sub)}.sha-fail{font-style:normal;font-size:11.5px;font-weight:600;color:var(--red)}',
      '.sha-done{height:26px;padding:0 10px;border:1px solid #d9d9d5;border-radius:999px;background:#fff;font:500 11.5px/1 Pretendard,sans-serif;cursor:pointer}.sha-done:hover{border-color:#111}',
      '.sha-drawer .whl-time{list-style:none;margin:0;padding:0 0 0 6px}.sha-drawer .whl-time li{position:relative;padding:0 0 16px 22px;border-left:1px solid var(--line)}',
      '.sha-drawer .whl-time li:last-child{border-left-color:transparent;padding-bottom:0}.sha-drawer .whl-time li:before{content:"";position:absolute;left:-4px;top:7px;width:7px;height:7px;border-radius:50%;background:#111}',
      '.sha-drawer .whl-time time{display:block;font:500 12px/1.4 var(--en);color:var(--sub);margin-bottom:4px}.sha-drawer .whl-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
      '.sha-drawer .whl-empty{color:var(--sub);font-size:13px;margin:0}',
      /* 상품 카드 */
      '.sha-drawer .whl-prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px 14px}',
      '.sha-drawer .whl-prod{display:block;color:inherit;text-decoration:none}',
      '.sha-drawer .whl-prod i,.shp-order i{display:block;aspect-ratio:3/4;border-radius:12px;background:var(--soft) center/cover no-repeat;margin-bottom:10px}',
      '.sha-drawer .whl-prod b{display:block;font-size:13.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sha-drawer .whl-prod span{display:block;margin-top:2px;font-size:12px;color:var(--sub)}.sha-drawer .whl-prod strong{color:#111;font-weight:600;margin-right:6px}',
      '.shp-orders{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}',
      '.shp-order{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;padding:14px;border:1px solid var(--line);border-radius:14px}',
      '.shp-order i{margin:0}.shp-order b{display:block;font-size:14px;font-weight:600;margin-bottom:2px}.shp-order>div>span{display:block;font-size:12.5px;color:var(--sub);margin-bottom:8px}.shp-order strong{color:#111;margin-right:6px}',
      '.shp-order .whl-tag{margin-bottom:10px}',
      '.shp-order dl{margin:0;display:grid;gap:4px}.shp-order dl div{display:grid;grid-template-columns:60px 1fr;gap:8px;font-size:12.5px}.shp-order dt{color:var(--sub)}.shp-order dd{margin:0;word-break:break-all}',
      '.shp-note{margin:14px 0 0;font-size:12px;color:var(--sub)}',
      '.shp-of{padding:18px 0;border-top:1px solid #f1f1ee}.shp-of:first-of-type{padding-top:0;border-top:0}',
      '.shp-of-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}.shp-of-head b{font:500 14px/1 var(--en)}.shp-of-head span:not(.whl-tag){font-size:13px;color:#333}',
      /* 이동 경로 */
      '.sha-drawer .whl-path{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px 0;align-items:center}',
      '.sha-drawer .whl-path li{display:inline-flex;align-items:center;font-size:13px}.sha-drawer .whl-path li+li:before{content:"";width:16px;height:1px;background:#cfcfcb;margin:0 6px}',
      '.sha-drawer .whl-path li span{display:inline-flex;gap:6px;align-items:center;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:#fff}',
      '.sha-drawer .whl-path li span em{font:500 11px/1 var(--en);font-style:normal;color:var(--faint)}',
      '.sha-drawer .whl-path li.is-prod span{border-color:#111}.sha-drawer .whl-path li.is-buy span{border-color:var(--accent);color:var(--accent)}.sha-drawer .whl-path li.is-search span{background:var(--soft)}',
      '.sha-drawer .whl-path li.is-last span{background:var(--point);border-color:var(--point);color:#fff}.sha-drawer .whl-path li.is-last span em{color:#aaa}',
      /* 로그인 · 안내 */
      '.sha-login,.sha-guide{max-width:440px;margin:14vh auto 0;padding:44px 40px;background:#fff;border:1px solid var(--line);border-radius:22px}',
      '.sha-kicker{display:block;margin-bottom:12px;font:500 11px/1 var(--en);letter-spacing:.22em;text-transform:uppercase;color:var(--sub)}',
      '.sha-login h1,.sha-guide h1{margin:0 0 10px;font-size:26px;font-weight:600;letter-spacing:-.04em}.sha-login p,.sha-guide p{margin:0 0 24px;color:var(--sub);font-size:13.5px}',
      '.sha-login input{width:100%;height:50px;padding:0 18px;border:1px solid #d9d9d5;border-radius:999px;font:500 16px/1 var(--en);letter-spacing:.06em}.sha-login input:focus{outline:none;border-color:#111}',
      '.sha-login .whl-btn{width:100%;height:50px;margin-top:12px;font-size:14px}.sha-login .sha-err{color:var(--red);font-size:13px;margin:12px 0 0}',
      '.sha-empty{padding:72px 20px;text-align:center;color:var(--sub);background:#fff;border:1px solid var(--line);border-radius:18px}',
      '@media (prefers-reduced-motion:reduce){.sha-drawer-box{animation:none}}',
      '@media (max-width:980px){.shp-top{grid-template-columns:1fr}}',
      '@media (max-width:820px){.sha{padding:0 16px 60px}.sha-top{padding:28px 0 20px}.sha-top h1{font-size:26px}.sha-sum span{padding:16px}.sha-sum b{font-size:24px}',
      '.sha-search,.sha-dates{width:100%}.sha-q{flex:1;width:auto}.sha-date{flex:1;width:auto;min-width:0}.sha .sha-tabs{gap:18px;overflow-x:auto}',
      '.sha-table,.sha-table tbody{display:block}.sha-table thead{display:none}',
      '.sha-table tr[data-p]{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:16px 18px;border-bottom:1px solid #f0f0ed}',
      '.sha-table td{display:block;padding:0!important;border:0!important;width:auto!important}.sha-table .c-no{display:none}',
      '.sha-table td.c-who{flex:1 1 55%;order:1}.sha-table td.c-cs{order:2}.sha-table td.c-what{order:3;flex:1 1 100%;white-space:normal}.sha-table td.c-pay{order:4}.sha-table td.c-req{order:4}',
      '.sha-table td.c-cnt,.sha-table td.c-tel,.sha-table td.c-time{order:5;font-size:12px}',
      '.sha-table td.c-go{order:6;flex:1 1 100%;text-align:left}.sha-go{display:none}.sha-table tr.is-flag{box-shadow:inset 3px 0 0 var(--red)}.sha-table tr.is-flag td:first-child{box-shadow:none}',
      '.sha-table tr.is-unpaid td:first-child{box-shadow:none}.sha-table tr.is-unpaid{box-shadow:inset 3px 0 0 var(--accent)}.sha-table tr.is-todo{box-shadow:inset 3px 0 0 var(--red)}',
      '.sha-drawer-head{padding:14px 16px}.sha-drawer-body{padding:16px 14px 48px}.shp-sec{padding:20px 18px}.shp-dl{grid-template-columns:1fr}.shp-orders{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }
  function fmtTime(t) { var d = new Date(t), p = function (n) { return (n < 10 ? '0' : '') + n; }; return isNaN(d) ? '' : p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function adminApp() {
    var root = document.getElementById('shAdmin'); if (!root) return;
    logCss(); adminCss();
    document.title = '상담 관리 · ' + (brandName() || '쇼핑몰');
    if (!SHEET) {
      root.innerHTML = '<div class="sha"><div class="sha-guide"><h1>상담 관리</h1><p>상담 기록 저장소가 아직 준비되지 않았어요. 스킨 판매자에게 문의해 주세요.</p></div></div>';
      return;
    }
    var key = ''; try { key = localStorage.getItem(AKEY) || ''; } catch (e) {}
    var st = { recs: [], people: [], f: 'all', q: '', qRaw: '', sel: '', rec: '', sort: 'todo', page: 1, from: '', to: '', draft: '', draftTodo: false, qna: null };
    function login(err) {
      root.innerHTML = '<div class="sha"><form class="sha-login"><small class="sha-kicker">Customer care</small><h1>상담 관리</h1><p>' + esc(brandName() || '') + ' 관리자 전용 화면이에요.<br>스킨 판매자에게 받은 <b>접속 키</b>를 붙여 넣어 주세요. 한 번 넣으면 이 브라우저가 기억해요.</p>' +
        '<label class="wh-sr" for="shaKey">접속 키</label><input id="shaKey" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="예) K7Q2-M9XD-4HPA">' +
        '<button type="submit" class="whl-btn is-main">들어가기</button>' + (err ? '<p class="sha-err" role="alert">' + esc(err) + '</p>' : '') + '</form></div>';
      var f = root.querySelector('form'), inp = root.querySelector('input');
      setTimeout(function () { inp.focus(); }, 30);
      f.addEventListener('submit', function (e) { e.preventDefault(); key = trim(inp.value); if (!key) return; try { localStorage.setItem(AKEY, key); } catch (x) {} load(); });
    }
    function load() {
      root.innerHTML = '<div class="sha"><div class="sha-loading is-page">' + spinner('기록을 불러오는 중') + '</div></div>';
      sheetCall({ type: 'list', key: key, max: 1000 }).then(function (d) {
        if (!d || !d.ok) { if (d && d.error === 'key') { try { localStorage.removeItem(AKEY); } catch (x) {} return login('접속 키가 맞지 않아요.'); } throw new Error('sheet'); }
        build(d); draw(); loadQna();
      }).catch(function () { root.innerHTML = '<div class="sha"><p class="sha-empty">구글 시트에 연결하지 못했어요. 웹 앱 주소와 배포 설정(액세스: 모든 사용자)을 확인해 주세요. <button type="button" class="whl-btn" data-retry>다시 시도</button></p></div>'; root.querySelector('[data-retry]').onclick = load; });
    }
    function build(d) {
      var by = {};
      st.qnaMarks = {};   // 상품 문의 답변 표시 (상담메모 탭의 기록 번호 = qna:글 주소)
      (d.notes || []).forEach(function (n) {
        if (/^qna:/.test(n.id)) { st.qnaMarks[n.id.slice(4)] = { nid: n.nid, done: n.done }; return; }
        (by[n.id] = by[n.id] || []).push(n);
      });
      st.recs = (d.records || []).map(function (r) {
        var s = parseSubject(r.subject) || { name: r.name || '회원', id: r.uid || '', ch: '챗봇', t: '' };
        return { id: r.id, at: r.at, date: fmtTime(r.at), s: s, text: r.text, phone: r.phone || '', email: r.email || '', o: null, noteList: by[r.id] || [], notes: (by[r.id] || []).length };
      }).sort(function (a, b) { return b.at - a.at; });
      st.people = groupRecords(st.recs);
      st.people.forEach(function (p) {
        p.phone = ''; p.email = '';
        p.recs.some(function (r) { if (r.phone || r.email) { p.phone = r.phone; p.email = r.email; return true; } return false; });
      });
      marks();
    }
    function spinner(label) { return '<span class="sha-spin" role="status"><i aria-hidden="true"></i><span class="wh-sr">' + esc(label) + '</span></span>'; }
    function logOf(r) { if (!r.o) r.o = parseLog(r.text) || parseLog('[상담 참고]\n' + r.text) || {}; return r.o; }
    // 상품 문의 : 상품 Q&A 게시판 목록을 직접 읽는다 (지난 글 · 비회원 글 · 비밀글까지, 최근 10쪽)
    function loadQna(quiet) {
      if (!quiet) st.qna = null;   // quiet : 다시 읽는 동안 지금 목록을 그대로 둔다
      st.qnaAt = Date.now();
      qnaList(10).then(function (rows) { st.qna = rows; st.qnaErr = false; }).catch(function () { if (!quiet) { st.qna = []; st.qnaErr = true; } }).then(function () { if (root.querySelector('.sha-table')) drawList(); if (drawer) drawDetail(); });
    }
    // [답변 달기]로 다른 창에서 답변하고 돌아오면 게시판을 다시 읽어 「답변 완료」로 바꾼다
    document.addEventListener('visibilitychange', function () { if (!document.hidden && st.qna && Date.now() - (st.qnaAt || 0) > 5000) loadQna(true); });
    window.addEventListener('focus', function () { if (st.qna && Date.now() - (st.qnaAt || 0) > 5000) loadQna(true); });
    function qnaByHref(h) { return (st.qna || []).filter(function (x) { return x.href === h; })[0] || null; }
    // 문의 글 → 손님 : 회원이 쓴 글은 기록에 글 주소가 있다 (그 기록의 아이디 = 손님). 없으면 작성자가 아이디 · 이름과 같은 손님
    // 게시판 목록은 작성자 이름을 가려서 보여 준다 (신****) → 이름이 아니라 아이디로 손님을 찾아 한 줄로 합친다
    function qnaPerson(x) {
      if (st.qpFor !== st.qna || st.qpPeople !== st.people) { st.qp = {}; st.qpFor = st.qna; st.qpPeople = st.people; }
      if (st.qp.hasOwnProperty(x.href)) return st.qp[x.href];
      var hit = null;
      st.people.some(function (p) { return p.recs.some(function (r) { return r.s.ch === '상품 문의' && (logOf(r).qna || {}).href === x.href; }) && (hit = p); });
      if (!hit && x.writer) st.people.some(function (p) { return p.ids.indexOf(x.writer) > -1 && (hit = p); }) || st.people.some(function (p) { return x.writer === p.name && (hit = p); });
      return (st.qp[x.href] = hit);
    }
    function qnaOf(p) { return (st.qna || []).filter(function (x) { return qnaPerson(x) === p; }); }
    // 카카오톡 채팅은 카카오가 밖으로 주지 않는다 → 카카오톡 채널 관리자 센터의 채팅 목록으로 바로 간다 (채널 주소 pf.kakao.com/_xxxx 에서 채널 번호를 읽는다)
    function kakaoAdminUrl() {
      var u = ''; try { u = contactUrl(); } catch (e) {}
      var m = String(u || UC.contact || (SC.floating && SC.floating.kakao) || '').match(/pf\.kakao\.com\/(_[A-Za-z0-9]+)/);
      return m ? 'https://center-pf.kakao.com/' + m[1] + '/chats' : 'https://center-pf.kakao.com/';
    }
    function qnaWaitOf(p) { return p.qnas.filter(function (x) { return !ans(x); }).length; }
    function lockIcon() { return '<svg class="sha-lock" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-label="비밀글"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'; }
    function bgImg(src) { return src ? ' style="background-image:url(\'' + esc(String(src).replace(/'/g, '%27')) + '\')"' : ''; }
    // 오늘 확인 : 상담 내용에 「오늘 확인」을 체크한 것 중 아직 [확인 완료]를 누르지 않은 것 (지난 날짜도 끝날 때까지 남는다)
    function todoOf(p) {
      var t = ymd(Date.now()), out = [];
      p.recs.forEach(function (r) { r.noteList.forEach(function (n) { if (n.due && !n.done && n.due <= t) out.push(n); }); });
      return out.sort(function (a, b) { return b.at - a.at; });   // 최근에 적은 것 먼저
    }
    function marks() {
      st.people.forEach(function (p) {
        p.todo = todoOf(p);
        p.checked = 0; p.recs.forEach(function (r) { r.noteList.forEach(function (n) { if (n.due && n.done) p.checked++; }); });
        // 이 손님의 상품 문의 글 (게시판) · 마지막 활동 = 기록과 문의 글 중 늦은 것
        p.qnas = qnaOf(p); p.lastAt = p.latest.at; p.lastQ = null;
        p.qnas.forEach(function (x) { if (x.at > p.lastAt + 60000) { p.lastAt = x.at; p.lastQ = x; } });
      });
    }
    // 목록 · 자세히 보기의 이름 옆 표시 : 아직 할 것이 있으면 빨강 「오늘 확인」, 모두 끝났으면 초록 「확인 완료」
    function markBadge(p) { return p.todo.length ? todoBadge(p.todo.length) : p.checked ? '<span class="sha-todo is-done"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>확인 완료</span>' : ''; }
    function md(d) { var m = String(d).match(/^\d{4}-(\d\d)-(\d\d)/); return m ? m[1] + '/' + m[2] : ''; }
    function todoBadge(n) { return '<span class="sha-todo"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>오늘 확인' + (n > 1 ? ' ' + n : '') + '</span>'; }
    function oneLine(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
    function ymd(t) { var d = new Date(t), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
    // 목록의 「최근 활동」 한 줄
    function what(r) {
      var o = logOf(r), ch = r.s.ch;
      if (ch === '주문서') {
        var it = o.oform && o.oform.items || [], first = it.length ? it[0].n.replace(/\s*\[.*$/, '').replace(/\s+\d+개.*$/, '') : '';
        return '주문서까지 옴' + (o.oform && o.oform.total ? ' · ' + o.oform.total : '') + (first ? ' · ' + first + (it.length > 1 ? ' 외 ' + (it.length - 1) + '개' : '') : '');
      }
      if (ch === '결제 완료') return '결제 완료' + (o.paid && o.paid.total ? ' · ' + o.paid.total : '');
      if (ch === '상품 문의') return (o.qna ? o.qna.subject : '상품 문의') + (o.qna && o.qna.pname ? ' · ' + o.qna.pname : '');
      var h = o.hist && o.hist[0], q = h ? h.items.filter(function (x) { return !/카카오톡 상담 연결|문의 남기기|^go$/.test(x); })[0] : '';
      var miss = q && /\(못 찾음\)$/.test(q); q = q ? q.replace(/^「|」?\(못 찾음\)$|」$/g, '') : '';
      if (ch === '카카오톡') return '카카오톡 상담 연결' + (q ? ' · ' + q : '');
      return q ? q + (miss ? ' (답을 못 찾음)' : '') : '챗봇 상담';
    }
    var SORTS = [['todo', '오늘 확인 먼저'], ['recent', '최근 활동순'], ['old', '오래된 순'], ['unpaid', '미결제 먼저'], ['none', '상담 전 먼저'], ['many', '기록 많은 순'], ['name', '이름순']];
    function sorted(list) {
      var by = {
        todo: function (a, b) { return ((b.todo.length > 0) - (a.todo.length > 0)) || (b.lastAt - a.lastAt); },
        recent: function (a, b) { return b.lastAt - a.lastAt; },
        old: function (a, b) { return a.lastAt - b.lastAt; },
        unpaid: function (a, b) { return (b.unpaid - a.unpaid) || (b.lastAt - a.lastAt); },
        none: function (a, b) { return ((!b.notes) - (!a.notes)) || (b.lastAt - a.lastAt); },
        many: function (a, b) { return (b.recs.length - a.recs.length) || (b.lastAt - a.lastAt); },
        name: function (a, b) { return String(a.name).localeCompare(String(b.name), 'ko'); }
      };
      return list.slice().sort(by[st.sort] || by.recent);
    }
    // 기간 : 그 기간에 기록이 하나라도 있는 손님
    function inRange(p) {
      if (!st.from && !st.to) return true;
      var a = st.from ? new Date(st.from + 'T00:00:00').getTime() : 0, b = st.to ? new Date(st.to + 'T23:59:59').getTime() : Infinity;
      return p.recs.some(function (r) { return r.at >= a && r.at <= b; }) || (p.qnas || []).some(function (x) { return x.at >= a && x.at <= b; });
    }
    function filtered() {
      return sorted(st.people.filter(function (p) {
        if (st.f === 'todo') { if (!p.todo.length) return false; } else if (!inRange(p)) return false;   // 오늘 확인은 기간과 상관없이 모두
        if (st.f === 'none' && p.notes) return false; if (st.f === 'done' && !p.notes) return false; if (st.f === 'unpaid' && !p.unpaid) return false;
        return !st.q || (p.name + ' ' + p.ids.join(' ') + ' ' + p.phone + ' ' + String(p.phone).replace(/\D/g, '')).toLowerCase().indexOf(st.q) > -1;
      }));
    }
    function counts() {
      var pp = st.people.filter(inRange), today = new Date(); today.setHours(0, 0, 0, 0);
      return { all: pp.length, none: pp.filter(function (p) { return !p.notes; }).length, done: pp.filter(function (p) { return p.notes; }).length,
        unpaid: pp.filter(function (p) { return p.unpaid; }).length, today: st.recs.filter(function (r) { return r.at >= today.getTime(); }).length,
        todo: st.people.filter(function (p) { return p.todo.length; }).length,
        qna: st.qna ? st.qna.length : 0, wait: st.qna ? st.qna.filter(function (x) { return !ans(x); }).length : 0,
        mix: pp.length + (st.qna ? qnaLoose().length : 0) };
    }
    function draw() {
      var n = counts();
      root.innerHTML = '<div class="sha">' +
        '<header class="sha-top"><div><small>Customer care · ' + esc(brandName() || '') + '</small><h1>상담 관리</h1></div>' +
        '<div class="sha-top-acts"><a class="whl-btn is-kakao" href="' + esc(kakaoAdminUrl()) + '" target="_blank" rel="noopener">카카오톡 채팅 열기 ↗</a><button type="button" class="whl-btn" data-refresh>새로고침</button><button type="button" class="whl-btn" data-lock>잠그기</button></div></header>' +
        '<div class="sha-sum"></div>' +
        // 1줄 : 기간 · 찾기
        '<div class="sha-bar"><div class="sha-dates" role="group" aria-label="기간"><span class="sha-label">기간</span>' +
        '<label class="wh-sr" for="shaFrom">시작일</label><input type="date" id="shaFrom" class="sha-date" value="' + esc(st.from) + '"><span class="sha-tilde">~</span>' +
        '<label class="wh-sr" for="shaTo">마지막 날</label><input type="date" id="shaTo" class="sha-date" value="' + esc(st.to) + '">' +
        [['0', '오늘'], ['7', '7일'], ['30', '30일'], ['all', '전체']].map(function (x) { return '<button type="button" class="sha-chip" data-range="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<form class="sha-search" role="search"><label class="wh-sr" for="shaQ">이름 · 아이디 · 전화번호</label><input type="search" id="shaQ" class="sha-q" placeholder="이름 · 아이디 · 전화번호" value="' + esc(st.qRaw || '') + '">' +
        '<button type="submit" class="whl-btn is-main">검색</button></form></div>' +
        // 2줄 : 상담 여부 탭 · 정렬 · 미결제
        '<div class="sha-bar"><div class="whl-filter sha-tabs" role="group" aria-label="상담 여부"></div>' +
        '<div class="sha-tools"><label class="wh-sr" for="shaSort">정렬</label><select id="shaSort" class="sha-sort">' + SORTS.map(function (x) { return '<option value="' + x[0] + '"' + (st.sort === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="whl-btn" data-reach-all data-tip="주문서까지 왔지만 결제하지 않은 손님 목록을 열어요. 목록에서 휴대폰 번호 복사 · 메일 보내기를 할 수 있어요.">미결제 손님 연락하기</button><button type="button" class="whl-btn" data-csv data-tip="주문서까지 왔지만 결제하지 않은 손님의 이름 · 연락처 · 주문서 상품을 엑셀 파일(CSV)로 내려받아요.">미결제 손님 다운로드 (CSV)</button>' +
        '<button type="button" class="whl-btn" data-csv-cart="never" data-tip="장바구니에 상품을 담았지만 한 번도 구매하지 않은 손님이에요. 이름 · 휴대폰 · 이메일 · 가입일 · 담은 상품을 엑셀 파일(CSV)로 내려받아요."></button><button type="button" class="whl-btn" data-csv-cart="rebuy" data-tip="구매한 적은 있지만, 장바구니에 담은 상품은 아직 구매하지 않은 손님이에요. 이름 · 휴대폰 · 이메일 · 가입일 · 담은 상품을 엑셀 파일(CSV)로 내려받아요."></button></div></div>' +
        '<div class="sha-table-wrap"><table class="sha-table"><caption class="wh-sr">손님 목록 · 줄을 누르면 자세히 봐요</caption><thead></thead><tbody></tbody></table></div><nav class="sha-pages" aria-label="쪽"></nav></div>';
      drawList();
      root.querySelector('.sha-sort').addEventListener('change', function () { st.sort = this.value; st.page = 1; drawList(); });
      [].forEach.call(root.querySelectorAll('.sha-date'), function (inp) { inp.addEventListener('change', function () { st.from = root.querySelector('#shaFrom').value; st.to = root.querySelector('#shaTo').value; st.page = 1; drawList(); }); });
    }
    function drawHead() {
      var n = counts();
      root.querySelector('.sha-sum').innerHTML = '<button type="button" class="is-todo' + (st.f === 'todo' ? ' is-on' : '') + '" data-f="todo"><em>오늘 확인</em><b>' + n.todo + '</b></button>' +
        '<button type="button" class="is-wait' + (st.f === 'qna' ? ' is-on' : '') + '" data-f="qna"><em>상품 문의 답변 대기</em><b>' + (st.qna ? n.wait : '<span class="sha-spin is-tiny"><i aria-hidden="true"></i></span>') + '</b></button><span><em>손님</em><b>' + n.all + '</b></span><span class="is-none"><em>상담 전</em><b>' + n.none + '</b></span>' +
        '<span class="is-unpaid"><em>주문서 미결제</em><b>' + n.unpaid + '</b></span><span><em>오늘 새 기록</em><b>' + n.today + '</b></span>';
      root.querySelector('.sha-tabs').innerHTML = [['all', '전체', n.mix], ['todo', '오늘 확인', n.todo], ['none', '상담 전', n.none], ['done', '상담 완료', n.done], ['unpaid', '미결제', n.unpaid], ['qna', '상품 문의', st.qna ? n.qna : '…']].map(function (x) {
        return '<button type="button" data-f="' + x[0] + '"' + (st.f === x[0] ? ' class="is-on"' : '') + '>' + x[1] + ' ' + x[2] + '</button>'; }).join('');
      var rb = root.querySelector('[data-reach-all]'), cb = root.querySelector('[data-csv]');
      rb.disabled = cb.disabled = !n.unpaid;
      var cg = cartGroups();
      [].forEach.call(root.querySelectorAll('[data-csv-cart]'), function (b) {
        var k = b.getAttribute('data-csv-cart');
        b.textContent = (k === 'never' ? '장바구니 · 구매 이력 없음 (CSV) ' : '장바구니 · 담은 상품 미구매 (CSV) ') + cg[k].length;
        b.style.color = cg[k].length ? '' : '#a3a3a3';   // 0명이어도 눌러 볼 수 있게 두고, 누르면 이유를 알려 준다
      });
    }
    // 표 제목 : 마우스를 올리면 짧은 설명 말풍선 (눌러서 정렬되는 제목은 그 설명도 함께)
    function tip(label, text) { return '<span class="sha-tip" data-tip="' + text + '">' + label + '</span>'; }
    var PEOPLE_HEAD = '<tr><th scope="col" class="c-no">번호</th>' +
      '<th scope="col" class="c-cs" data-s="none">' + tip('상담', '상담 메모를 남겼는지 보여요. 메모가 없으면 상담 전, 있으면 상담 완료예요. 누르면 상담 전 손님이 먼저 나와요.') + '</th>' +
      '<th scope="col" class="c-who" data-s="name">' + tip('손님', '손님 이름과 아이디예요. 누르면 이름순으로 정렬돼요.') + '</th>' +
      '<th scope="col" class="c-what">' + tip('최근 활동', '손님이 가장 최근에 한 일이에요. 챗봇, 카카오톡, 주문서, 상품 문의 등이 나와요.') + '</th>' +
      '<th scope="col" class="c-cnt" data-s="many">' + tip('기록', '이 손님이 남긴 기록(챗봇 상담, 주문서, 상품 문의 등)의 개수예요. 누르면 기록이 많은 순으로 정렬돼요.') + '</th>' +
      '<th scope="col" class="c-pay" data-s="unpaid">' + tip('결제', '주문서까지 갔는지, 결제를 마쳤는지 보여요. 누르면 미결제 손님이 먼저 나와요.') + '</th>' +
      '<th scope="col" class="c-req">' + tip('상담 신청', '손님이 신청한 상담이에요. 카톡 상담, 챗봇 상담, 문의 남기기 횟수가 나와요. 딱지에 마우스를 올리면 마지막 신청 시각이 보여요.') + '</th>' +
      '<th scope="col" class="c-tel">' + tip('연락처', '손님의 휴대폰 번호예요. 아직 모르면 -로 나와요.') + '</th>' +
      '<th scope="col" class="c-time" data-s="recent">' + tip('마지막 활동', '손님이 마지막으로 활동한 시각이에요. 누르면 최근 활동순으로 정렬돼요.') + '</th>' +
      '<th scope="col" class="c-go"><span class="wh-sr">바로가기</span></th></tr>';
    var QNA_HEAD = '<tr><th scope="col" class="c-no">번호</th>' +
      '<th scope="col" class="c-cs">' + tip('답변', '관리자가 답변 글을 쓰면 자동으로 답변 완료가 돼요. 아직 없으면 목록에서 직접 바꿀 수 있어요.') + '</th>' +
      '<th scope="col" class="c-prd">' + tip('상품', '문의가 달린 상품이에요.') + '</th>' +
      '<th scope="col" class="c-what">' + tip('문의', '손님이 남긴 문의 제목이에요. 줄을 누르면 그 글이 새 창으로 열려요.') + '</th>' +
      '<th scope="col" class="c-who">' + tip('작성자', '문의를 쓴 손님의 이름과 아이디예요.') + '</th>' +
      '<th scope="col" class="c-time">' + tip('작성일', '문의를 올린 시각이에요.') + '</th>' +
      '<th scope="col" class="c-go"><span class="wh-sr">바로가기</span></th></tr>';
    function pager(pages) {
      var b = [];
      if (pages > 1) {
        b.push('<button type="button" data-page="' + Math.max(1, st.page - 1) + '" aria-label="앞 쪽"' + (st.page === 1 ? ' disabled' : '') + '>‹</button>');
        for (var k = 1; k <= pages; k++) b.push('<button type="button" data-page="' + k + '"' + (k === st.page ? ' aria-current="page"' : '') + '>' + k + '</button>');
        b.push('<button type="button" data-page="' + Math.min(pages, st.page + 1) + '" aria-label="다음 쪽"' + (st.page === pages ? ' disabled' : '') + '>›</button>');
      }
      root.querySelector('.sha-pages').innerHTML = b.join('');
    }
    // 상품 문의 답변 : 게시판에 답변 글 · 댓글이 있으면 자동으로 완료, 아니면 「답변」 칸 드롭다운으로 사장님이 바꾼다 (시트 상담메모에 저장)
    function ans(x) { var m = st.qnaMarks && st.qnaMarks[x.href]; return !!(x.answered || (m && m.done)); }
    function replyUrl(x) {
      var no = (String(x.href).match(/\/(\d+)\/?$/) || [])[1] || '', pno = prodNoOf(x.plink);
      return '/board/product/reply.html?board_act=reply&no=' + no + '&board_no=' + qnaBoardNo() + (pno ? '&product_no=' + pno : '');
    }
    function qnaView() {
      var a = st.from ? new Date(st.from + 'T00:00:00').getTime() : 0, b = st.to ? new Date(st.to + 'T23:59:59').getTime() : Infinity;
      return (st.qna || []).filter(function (x) {
        if ((st.from || st.to) && (!x.at || x.at < a || x.at > b)) return false;
        return !st.q || (x.subject + ' ' + x.writer + ' ' + x.product).toLowerCase().indexOf(st.q) > -1;
      });
    }
    // 손님(아이디)을 찾은 글은 그 손님 줄에 합친다 → 「전체」 탭에 따로 나오는 건 손님을 못 찾은 글만 (비회원 등)
    function qnaLoose() { return qnaView().filter(function (x) { return !qnaPerson(x); }); }
    function qnaState(x) {
      if (x.answered) return '<span class="sha-cs is-done">답변 완료</span>';   // 게시판에 답변이 달렸다
      var v = ans(x) ? 'done' : 'wait', m = st.qnaMarks && st.qnaMarks[x.href], id = 'shaAns' + esc(String(x.href).replace(/\D/g, ''));
      return '<span class="sha-cs ' + (v === 'done' ? 'is-done' : 'is-none') + '"><label class="wh-sr" for="' + id + '">답변 상태</label><select id="' + id + '" class="sha-plain" data-ans="' + esc(x.href) + '"' + (m && m.busy ? ' disabled' : '') + '>' +
        '<option value="wait"' + (v === 'wait' ? ' selected' : '') + '>답변 대기</option><option value="done"' + (v === 'done' ? ' selected' : '') + '>답변 완료</option></select></span>';
    }
    // 오른쪽 끝 「바로가기」 칸 : 글자 링크만 (줄 안에는 버튼을 두지 않는다)
    function qnaLinks(x) {
      var p = qnaPerson(x);
      return '<span class="sha-links"><a class="sha-link" href="' + esc(replyUrl(x)) + '" target="_blank" rel="noopener">답변 달기</a>' +
        (p ? '<button type="button" class="sha-link" data-open-p="' + esc(p.key) + '">손님 보기</button>' : '') + '</span>';
    }
    function qnaWho(x) { var p = qnaPerson(x); return '<b><span>' + esc(p && p.name || x.writer || '-') + '</span></b><small>' + esc(p ? p.id || p.name : '작성자') + '</small>'; }
    function qnaSubj(x) { return (x.lock ? lockIcon() : '') + esc(x.subject) + (x.comments ? ' <small>댓글 ' + x.comments + '</small>' : ''); }
    function qnaTr(x) { return '<tr data-qna="' + esc(x.href) + '" tabindex="0" class="is-qna' + (ans(x) ? '' : ' is-flag') + '">'; }
    // 최근 활동 칸 : [종류] 내용 한 줄 + 할 일 한 줄 (빨강)
    function actCell(ch, txt, flags) {
      return '<span class="sha-line"><span class="sha-ch">' + esc(ch) + '</span><span class="sha-txt">' + txt + '</span></span>' +
        flags.map(function (f) { return '<span class="sha-flag">' + f + '</span>'; }).join('');
    }
    // 상담 신청 칸 : 손님이 신청한 상담 (카카오톡 연결 · 챗봇 상담 · 문의 남기기) 횟수 딱지 — 올리면 마지막 신청 시각
    var REQS = [['카카오톡', '카톡 상담', 'is-kk'], ['챗봇', '챗봇 상담', 'is-bot'], ['문의', '문의 남기기', 'is-ask']];
    function reqChips(p) {
      var out = REQS.map(function (q) {
        var n = p.count[q[0]] || 0; if (!n) return '';
        var last = p.recs.filter(function (r) { return r.s.ch === q[0]; })[0];
        return '<span class="sha-req ' + q[2] + '" data-tip="' + q[1] + ' ' + n + '번 · 마지막 ' + esc(last.date) + '">' + q[1] + ' ' + n + '번</span>';
      }).join('');
      return out || '<span class="sha-dim">-</span>';
    }
    // 「상품 문의」 탭 : 답변 대기 먼저, 최신순 · 줄을 누르면 그 글 (새 창)
    function drawQna() {
      root.querySelector('.sha-table thead').innerHTML = QNA_HEAD;
      root.querySelector('.sha-table caption').textContent = '상품 문의 목록 · 줄을 누르면 그 글이 새 창으로 열려요';
      var tb = root.querySelector('.sha-table tbody');
      if (!st.qna) { tb.innerHTML = '<tr class="sha-none-row"><td colspan="7" class="sha-none"><div class="sha-loading">' + spinner('상품 문의를 불러오는 중') + '</div></td></tr>'; pager(1); return; }
      var list = qnaView().sort(function (x, y) { return (ans(x) - ans(y)) || (y.at - x.at); });
      var per = 10, pages = Math.max(1, Math.ceil(list.length / per)); if (st.page > pages) st.page = pages;
      var start = (st.page - 1) * per;
      tb.innerHTML = list.length ? list.slice(start, start + per).map(function (x, i) {
        return qnaTr(x) +
          '<td class="c-no">' + (list.length - start - i) + '</td>' +
          '<td class="c-cs">' + qnaState(x) + '</td>' +
          '<td class="c-prd"><span class="sha-qprd"><i' + bgImg(x.img) + '></i><span>' + esc(x.product || '-') + '</span></span></td>' +
          '<td class="c-what"><span class="sha-qsub">' + qnaSubj(x) + '</span></td>' +
          '<td class="c-who">' + qnaWho(x) + '</td>' +
          '<td class="c-time">' + esc(x.at ? fmtTime(x.at) : x.date) + '</td>' +
          '<td class="c-go">' + qnaLinks(x) + '</td></tr>';
      }).join('') : '<tr class="sha-none-row"><td colspan="7" class="sha-none">' + (st.qnaErr ? '상품 문의 게시판을 읽지 못했어요. [새로고침]을 눌러 주세요.' : st.q || st.from || st.to ? '검색 · 기간에 맞는 상품 문의가 없어요.' : '상품 문의가 없어요.') + '</td></tr>';
      pager(pages);
    }
    function personTr(p, no) {
      var td = p.todo[0], wait = qnaWaitOf(p), flags = [];
      if (td) flags.push('오늘 확인 · ' + esc(oneLine(td.text)) + (td.due < ymd(Date.now()) ? ' (' + md(td.due) + '부터)' : ''));
      if (wait) flags.push('상품 문의 답변 대기 ' + wait + '건');
      var tc = flags.length ? 'is-flag' : p.unpaid ? 'is-unpaid' : '';
      return '<tr data-p="' + esc(p.key) + '" tabindex="0"' + (tc ? ' class="' + tc + '"' : '') + '>' +
        '<td class="c-no">' + no + '</td>' +
        // 상태 : 아직 끝내지 않은 「오늘 확인」 메모가 있으면 오늘 확인 → 메모가 있으면 상담 완료 → 없으면 상담 전
        '<td class="c-cs"><span class="sha-cs ' + (td ? 'is-none">오늘 확인' + (p.todo.length > 1 ? ' ' + p.todo.length : '') : p.notes ? 'is-done">상담 완료' : 'is-none">상담 전') + '</span></td>' +
        '<td class="c-who"><b><span>' + esc(p.name) + '</span></b><small>' + idsShort(p) + '</small></td>' +
        '<td class="c-what">' + (p.lastQ ? actCell('상품 문의', qnaSubj(p.lastQ) + (p.lastQ.product ? ' · ' + esc(p.lastQ.product) : ''), flags) : actCell(p.latest.s.ch, esc(what(p.latest)), flags)) + '</td>' +
        '<td class="c-cnt">' + p.recs.length + '건</td>' +
        '<td class="c-pay">' + (p.order ? '<span class="sha-pay ' + (p.unpaid ? 'is-unpaid">미결제' : 'is-paid">결제 완료') + '</span>' : '<span class="sha-dim">-</span>') + '</td>' +
        '<td class="c-req">' + reqChips(p) + '</td>' +
        '<td class="c-tel">' + (p.phone ? esc(p.phone) : '<span class="sha-dim">-</span>') + '</td>' +
        '<td class="c-time">' + esc(p.lastQ ? fmtTime(p.lastAt) : p.latest.date) + '</td>' +
        '<td class="c-go"><span class="sha-go">자세히 보기</span></td></tr>';
    }
    // 「전체」 탭의 상품 문의 줄 (손님 줄과 같은 칸에 맞춘다)
    function qnaAllTr(x, no) {
      return qnaTr(x) +
        '<td class="c-no">' + no + '</td>' +
        '<td class="c-cs">' + qnaState(x) + '</td>' +
        '<td class="c-who">' + qnaWho(x) + '</td>' +
        '<td class="c-what">' + actCell('상품 문의', qnaSubj(x) + (x.product ? ' · ' + esc(x.product) : ''), []) + '</td>' +
        '<td class="c-cnt"><span class="sha-dim">-</span></td><td class="c-pay"><span class="sha-dim">-</span></td><td class="c-req"><span class="sha-dim">-</span></td><td class="c-tel"><span class="sha-dim">-</span></td>' +
        '<td class="c-time">' + esc(x.at ? fmtTime(x.at) : x.date) + '</td>' +
        '<td class="c-go">' + qnaLinks(x) + '</td></tr>';
    }
    function drawList() {
      marks(); drawHead();
      if (st.f === 'qna') return drawQna();
      root.querySelector('.sha-table thead').innerHTML = PEOPLE_HEAD;
      root.querySelector('.sha-table caption').textContent = '손님 목록 · 줄을 누르면 자세히 봐요';
      // 전체 = 손님 (같은 아이디의 상품 문의 글은 손님 줄에 합침) + 손님을 못 찾은 상품 문의 글 (시간순으로 섞는다 · 「오늘 확인 먼저」면 오늘 확인 손님이 맨 위)
      var list = filtered().map(function (p) { return { p: p, at: p.lastAt }; });
      if (st.f === 'all' && st.qna) {
        var qs = qnaLoose().map(function (x) { return { x: x, at: x.at || 0 }; });
        if (/^(todo|recent|old)$/.test(st.sort)) {
          var top = st.sort === 'todo' ? list.filter(function (it) { return it.p.todo.length; }) : [];
          var rest = list.filter(function (it) { return top.indexOf(it) < 0; }).concat(qs).sort(function (a, b) { return st.sort === 'old' ? a.at - b.at : b.at - a.at; });
          list = top.concat(rest);
        } else list = list.concat(qs.sort(function (a, b) { return b.at - a.at; }));
      }
      var per = 10, pages = Math.max(1, Math.ceil(list.length / per));
      if (st.page > pages) st.page = pages;
      var start = (st.page - 1) * per, rows = list.slice(start, start + per);
      root.querySelector('.sha-table tbody').innerHTML = rows.length ? rows.map(function (it, i) {
        var no = list.length - start - i;
        return it.p ? personTr(it.p, no) : qnaAllTr(it.x, no);
      }).join('') : '<tr class="sha-none-row"><td colspan="10" class="sha-none">' + (st.q || st.from || st.to ? '검색 · 기간에 맞는 손님이 없어요.' : '해당하는 손님이 없어요.') + '</td></tr>';
      [].forEach.call(root.querySelectorAll('.sha-table th[data-s]'), function (th) {
        if (th.getAttribute('data-s') === st.sort) th.setAttribute('aria-sort', st.sort === 'name' ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort');
      });
      pager(pages);
    }
    // 답변 상태 바꾸기 : 바로 화면에 보이고, 시트에는 뒤에서 저장 (처음이면 표시 메모를 만들고, 다음부터는 그 메모의 완료 칸만 바꾼다)
    function setAns(href, v) {
      var marks0 = st.qnaMarks = st.qnaMarks || {}, m = marks0[href], done = v === 'done';
      if (m && m.busy) return;
      var prev = m ? { done: m.done } : null;
      if (!m) m = marks0[href] = { nid: 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), done: '', fresh: true };
      m.done = done ? Date.now() : ''; m.busy = true; drawList(); if (drawer) drawDetail();
      var make = m.fresh ? sheetCall({ type: 'note', key: key, id: 'qna:' + href, nid: m.nid, by: memberName() || '관리자', text: '상품 문의 답변 표시 · ' + href, due: '' }) : Promise.resolve({ ok: true });
      make.then(function (d) {
        if (!d || !d.ok) throw new Error('note');
        m.fresh = false;
        return sheetCall({ type: 'check', key: key, nid: m.nid, due: '', done: done });
      }).then(function (d) {
        if (!d || !d.ok) throw new Error('check');
        m.busy = false;
      }).catch(function () {
        m.busy = false;
        if (prev) m.done = prev.done; else if (m.fresh) delete marks0[href]; else m.done = '';
        alert('답변 상태를 저장하지 못했어요. 다시 골라 주세요.');
      }).then(function () { drawList(); if (drawer) drawDetail(); });
    }
    // 엑셀에서 바로 열리는 CSV 내려받기
    function saveCsv(rows, name) {
      var cell = function (v) { v = String(v == null ? '' : v).replace(/\r?\n/g, ' '); return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '_' + ymd(Date.now()).replace(/-/g, '') + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    // 장바구니 손님 : 가장 최근에 읽은 장바구니 기준 (상담을 넘길 때 읽는다 → 그때 담겨 있던 상품)
    //  never = 한 번도 구매하지 않은 손님 (누적 주문 0번이고 결제 완료 기록도 없다) · 담은 상품 모두
    //  rebuy = 구매한 적은 있지만, 담은 상품 중 구매 내역(최근 주문)에 없는 것이 남은 손님 · 그 상품만
    function cartBase(n) { var t = String(n || '').match(/^(.+?)(?:\s*\[(.+)\])?(?:\s+(\d+)개)?(?:\s+([\d,]{2,})원?)?$/); return trim(t ? t[1] : n); }
    function cartGroups() {
      var out = { never: [], rebuy: [] };
      st.people.forEach(function (p) {
        if (!inRange(p)) return;
        var rec = null, co = null;
        p.recs.some(function (r) { var o = logOf(r); if (o.cart) { rec = r; co = o; return true; } return false; });
        if (!co || !co.carts.length) return;
        var paidN = p.recs.filter(function (r) { return r.s.ch === '결제 완료'; }).length, count = Math.max(co.buy ? +co.buy.count || 0 : 0, paidN), m = memOf(p);
        var got = [];
        p.recs.forEach(function (r) { (logOf(r).orders || []).forEach(function (x) { if (!/취소|반품/.test(x.st)) got.push({ no: x.no, n: cartBase(x.n) }); }); });
        var row = function (items) {
          var g = (m.group || '').split(/\s*·\s*가입\s*/);
          return [p.name, p.ids.join(' / '), p.phone || m.phone || '', p.email || m.email || '', g[1] || '', items.map(function (x) { return x.n; }).join(' / '), co.cart.price, count, rec.date];
        };
        if (!count) { out.never.push(row(co.carts)); return; }
        var rest = co.carts.filter(function (c) {
          return !got.some(function (x) { return c.no && x.no ? c.no === x.no : x.n && x.n === cartBase(c.n); });
        });
        if (rest.length) out.rebuy.push(row(rest));
      });
      return out;
    }
    function cartCsv(kind) {
      var list = cartGroups()[kind];
      if (!list.length) return alert((kind === 'never' ? '장바구니에 담고 한 번도 구매하지 않은 손님이' : '구매한 적은 있고 담은 상품은 구매하지 않은 손님이') + ' 지금은 없어요.\n(장바구니는 손님이 챗봇 · 카카오톡 상담을 넘길 때 읽혀요. 위쪽 기간도 확인해 주세요.)');
      var rows = [['이름', '아이디', '휴대폰', '이메일', '가입일', '장바구니 상품', '장바구니 전체 금액', '누적 주문(번)', '장바구니 확인 시각']].concat(list);
      saveCsv(rows, kind === 'never' ? '장바구니_구매이력없음' : '장바구니_담은상품미구매');
    }
    // 미결제 손님 다운로드 (엑셀에서 바로 열리는 CSV)
    function csv() {
      var rows = [['이름', '아이디', '휴대폰', '이메일', '주소', '문자 수신', '메일 수신', '주문서 시각', '결제 예정 금액', '주문서 상품', '상담', '상담 메모 수', '마지막 활동']];
      st.people.filter(function (p) { return p.unpaid && inRange(p); }).forEach(function (p) {
        var o = logOf(p.lastOrder), m = memOf(p);
        var ad = pickOf(p, function (o) { return o.addr || o.ship; }) || {};
        rows.push([p.name, p.ids.join(' / '), p.phone || m.phone || '', p.email || m.email || '', ad.addr || ad.ship || '', m.agree ? (m.agree.sms ? '동의' : '거부') : '', m.agree ? (m.agree.mail ? '동의' : '거부') : '',
          p.lastOrder.date, o.oform ? o.oform.total : '', o.oform ? o.oform.items.map(function (x) { return x.n; }).join(' / ') : '', p.notes ? '상담 완료' : '상담 전', p.notes, p.latest.date]);
      });
      saveCsv(rows, '미결제손님');
    }
    function person() { return st.people.filter(function (p) { return p.key === st.sel; })[0]; }
    // 이 손님의 기록에서 가장 최근 값 (회원 정보 · 구매 · 장바구니 · 본 상품 · 이동 경로)
    function pickOf(p, fn) { for (var i = 0; i < p.recs.length; i++) { var o = logOf(p.recs[i]); if (fn(o)) return o; } return null; }
    function memOf(p) { return pickOf(p, function (o) { return o.phone || o.email || o.group || o.agree; }) || logOf(p.recs[0]) || {}; }
    var drawer = null, back = null;
    function closeDetail() {
      if (drawer) { drawer.remove(); drawer = null; }
      st.sel = ''; document.documentElement.style.overflow = ''; document.removeEventListener('keydown', escKey);
      if (back && back.focus) back.focus();
    }
    function escKey(e) { if (e.key === 'Escape') closeDetail(); }
    function openDetail(k, from) { st.sel = k; back = from; st.draft = ''; st.draftTodo = false; st.noteMsg = ''; st.notePage = 1; drawDetail(); }
    function sec(no, title, body, cls) { return '<section class="shp-sec' + (cls ? ' ' + cls : '') + '"><h3><i>' + (no < 10 ? '0' : '') + no + '</i>' + title + '</h3>' + body + '</section>'; }
    function empty(t) { return '<p class="whl-empty">' + t + '</p>'; }
    function drawDetail() {
      var p = person(); if (!p) return closeDetail();
      var recs = p.recs, m = memOf(p), name = p.name, g = (m.group || '').split(/\s*·\s*가입\s*/);
      var buyO = pickOf(p, function (o) { return o.buy; }), ordO = pickOf(p, function (o) { return o.orders && o.orders.length; }), cartO = pickOf(p, function (o) { return o.cart; });
      var prodO = pickOf(p, function (o) { return o.prods && o.prods.length; }), pathO = pickOf(p, function (o) { return o.path && o.path.length; }), styleO = pickOf(p, function (o) { return o.style && o.style.length; });
      var cnt = function (c) { return recs.filter(function (r) { return r.s.ch === c; }).length; };
      var yn = function (k) { return !m.agree ? '<span class="sha-dim">-</span>' : m.agree[k] ? '<span class="whl-yes">동의</span>' : '<span class="whl-no">거부</span>'; };
      var phone = p.phone || m.phone, email = p.email || m.email;
      var addr = (pickOf(p, function (o) { return o.addr; }) || {}).addr || '', ship = (pickOf(p, function (o) { return o.ship; }) || {}).ship || '';
      var copyBtn = function (v, what) { return '<button type="button" class="sha-copy" data-whl-copy="' + esc(v) + '" aria-label="' + what + ' 복사">복사</button>'; };
      // 1) 회원 정보
      var info = '<div class="shp-who"><span class="whl-av">' + esc((name || '?').charAt(0)) + '</span><div><b>' + esc(name) + '</b><span>' + idsShort(p) + (g[0] ? ' · ' + esc(g[0]) : '') + '</span></div>' +
        '<div class="shp-badges">' + markBadge(p) + '<span class="sha-cs ' + (p.notes ? 'is-done">상담 완료 ' + p.notes : 'is-none">상담 전') + '</span>' + (p.order ? '<span class="whl-tag ' + (p.unpaid ? 'is-unpaid">미결제' : 'is-paid">결제 완료') + '</span>' : '') + '</div></div>' +
        '<dl class="shp-dl">' + [
          ['이름', esc(name)], ['아이디', p.ids.length ? p.ids.map(function (x) { return esc(idText(x)); }).join('<br>') : '-'], ['휴대폰', phone ? '<a href="tel:' + esc(digits(phone)) + '">' + esc(phone) + '</a>' + copyBtn(phone, '휴대폰 번호') : '<span class="sha-dim">-</span>'],
          ['이메일', email ? '<a href="mailto:' + esc(email) + '">' + esc(email) + '</a>' : '<span class="sha-dim">-</span>'], ['가입일', esc(g[1] || '-')], ['회원 등급', esc(g[0] || '-')],
          ['문자 수신', yn('sms')], ['메일 수신', yn('mail')],
          ['누적 주문', buyO ? esc(buyO.buy.count) + '번' : '-'], ['누적 구매', buyO ? esc(buyO.buy.total) : '-'], ['적립금', buyO ? esc(buyO.buy.mileage) : '-'], ['관심상품', buyO ? esc(buyO.buy.wish) + '개' : '-'],
          ['챗봇 상담', cnt('챗봇') + '번'], ['카카오톡 연결', cnt('카카오톡') + '번' + (cnt('카카오톡') ? ' <a class="sha-link" href="' + esc(kakaoAdminUrl()) + '" target="_blank" rel="noopener">채팅 열기 ↗</a>' : '')], ['주문서 방문', cnt('주문서') + '번'], ['결제 완료', cnt('결제 완료') + '번'],
          ['처음 기록', esc(recs[recs.length - 1].date)], ['마지막 활동', esc(p.lastQ ? fmtTime(p.lastAt) : p.latest.date)],
          ['주소', addr ? esc(addr) + copyBtn(addr, '주소') : '<span class="sha-dim">-</span>', 1]
        ].concat(ship && ship !== addr ? [['배송지', esc(ship) + copyBtn(ship, '배송지') + '<small class="sha-dd-note">최근 주문서에 적은 받는 분 주소</small>', 1]] : [])
        .map(function (r) { return '<div' + (r[2] ? ' class="is-wide"' : '') + '><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
        (styleO ? '<div class="shp-style"><span>스타일 취향</span>' + styleO.style.map(function (x) { return '<span class="whl-tag">' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
        contactBar({ name: name, id: p.id, phone: phone, email: email, agree: m.agree, unpaid: p.unpaid, items: p.lastOrder ? (logOf(p.lastOrder).oform || { items: [] }).items.map(function (x) { return x.n; }) : [] });
      // 2) 상담 일지 (사장님이 적은 상담 내용 + 챗봇에서 물어본 것) · 상담 내용 등록
      // 상담 내용 : 확인할 것(오늘 확인 · 아직 안 끝남)을 맨 위에, 나머지는 최신순
      var notes = [], today = ymd(Date.now());
      recs.forEach(function (r) { r.noteList.forEach(function (n) { notes.push({ n: n, r: r, todo: !!(n.due && !n.done && n.due <= today) }); }); });
      notes.sort(function (a, b) { return (b.todo - a.todo) || (b.n.at - a.n.at); });
      var noteLi = function (x) {
        var n = x.n, busy = n.state === 'saving' || n.state === 'fail' || !n.nid;
        var v = n.done ? 'done' : n.due ? 'todo' : '';
        var flag = x.todo && n.due < today ? '<em class="sha-late">' + md(n.due) + '부터</em>' : '';
        // 확인 상태 셀렉트 : 표시 없음 / 오늘 확인 / 확인 완료 (예전 메모처럼 번호가 없으면 바꿀 수 없다)
        var acts = !n.nid ? '' : '<label class="wh-sr" for="shaSt' + esc(n.nid) + '">확인 상태</label><select id="shaSt' + esc(n.nid) + '" class="sha-state is-' + (v || 'none') + '" data-state="' + esc(n.nid) + '"' + (busy || n.checking ? ' disabled' : '') + '>' +
          [['', '표시 없음'], ['todo', '오늘 확인'], ['done', '확인 완료']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
        var state = n.state === 'saving' ? '<em class="sha-saving">저장 중…</em>' : n.state === 'fail' ? '<em class="sha-fail">저장 못 함</em><button type="button" class="sha-done" data-resend="' + esc(n.nid) + '">다시 보내기</button>' : '';
        return '<li class="' + (x.todo ? 'is-todo' : '') + (n.done ? ' is-done' : '') + '"><div class="sha-note-top">' + acts + flag + '<small>' + esc(fmtTime(n.at)) + ' · ' + esc(n.by || '관리자') + ' · ' + esc(x.r.s.ch) + ' 기록</small>' + state + '</div>' + esc(n.text) + '</li>';
      };
      // 상담 내용은 5개씩, 그 아래 쪽 번호
      var NPER = 5, npages = Math.max(1, Math.ceil(notes.length / NPER)), np = st.notePage = Math.min(Math.max(1, st.notePage || 1), npages), npNav = '';
      if (npages > 1) {
        npNav = '<nav class="sha-pages sha-note-pages" aria-label="상담 내용 쪽"><button type="button" data-npage="' + (np - 1) + '" aria-label="앞 쪽"' + (np === 1 ? ' disabled' : '') + '>‹</button>';
        for (var q = 1; q <= npages; q++) npNav += '<button type="button" data-npage="' + q + '"' + (q === np ? ' aria-current="page"' : '') + '>' + q + '</button>';
        npNav += '<button type="button" data-npage="' + (np + 1) + '" aria-label="다음 쪽"' + (np === npages ? ' disabled' : '') + '>›</button></nav>';
      }
      var hist = (pickOf(p, function (o) { return o.hist && o.hist.length; }) || {}).hist || [];
      var diary = '<form class="sha-note-form"><label class="wh-sr" for="shaNote">상담 내용</label><textarea id="shaNote" placeholder="예) 택배 교환 신청 접수 → 오늘 회수 확인"></textarea><button type="submit" class="whl-btn is-main">상담 내용 등록</button><p class="sha-note-msg" role="status">' + esc(st.noteMsg || '') + '</p></form>' +
        '<h4 class="shp-sub">상담 내용 <small>' + notes.length + '개 · 확인할 것 먼저 · 최신순</small></h4>' +
        (notes.length ? '<ul class="sha-notes">' + notes.slice((np - 1) * NPER, np * NPER).map(noteLi).join('') + '</ul>' + npNav : empty('아직 등록한 상담 내용이 없어요.')) +
        '<h4 class="shp-sub">챗봇에서 물어본 것 <small>이 손님 기기 기준</small></h4>' +
        (hist.length ? '<ol class="whl-time">' + hist.map(function (h) { return '<li><time>' + esc(h.t) + '</time><div class="whl-chips">' + h.items.map(function (x) { return '<span>' + histTag(x) + '</span>'; }).join('<span class="whl-empty">→</span>') + '</div></li>'; }).join('') + '</ol>' : empty('챗봇 상담 이력이 없어요.'));
      // 3) 상품 문의 : 이 회원이 올린 글 (기록) + 게시판에서 작성자가 이 손님인 글
      var myQ = [], qseen = {};
      recs.forEach(function (r) {
        var q = r.s.ch === '상품 문의' && logOf(r).qna; if (!q) return;
        var b = q.href ? qnaByHref(q.href) : null; if (q.href) qseen[q.href] = 1;
        myQ.push({ subject: q.subject, body: q.body, pname: q.pname || (b && b.product) || '', no: q.no, href: q.href, at: r.at, img: b && b.img, lock: b && b.lock, answered: b ? ans(b) : st.qna ? !!(st.qnaMarks && st.qnaMarks[q.href] && st.qnaMarks[q.href].done) : null });
      });
      (st.qna || []).forEach(function (x) {
        if (qseen[x.href] || qnaPerson(x) !== p) return;
        myQ.push({ subject: x.subject, body: '', pname: x.product, no: '', href: x.href, at: x.at, img: x.img, lock: x.lock, answered: ans(x) });
      });
      myQ.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      var qnaHtml = myQ.length ? '<ul class="shp-qna">' + myQ.map(function (x) {
        var bx = x.href ? qnaByHref(x.href) : null;
        var stt = bx ? qnaState(bx) : x.answered === true ? '<span class="sha-cs is-done">답변 완료</span>' : x.answered === false ? '<span class="sha-cs is-none">답변 대기</span>' : '<span class="sha-cs">답변 확인 중</span>';
        return '<li><i' + (x.img ? bgImg(x.img) : x.no ? ' data-whl-img="' + esc(x.no) + '"' : '') + '></i><div><div class="shp-qna-top">' + stt + '<time>' + esc(x.at ? fmtTime(x.at) : '') + '</time></div>' +
          '<b>' + (x.lock ? lockIcon() : '') + esc(x.subject) + '</b>' + (x.body ? '<p>' + esc(x.body) + '</p>' : '') + (x.pname ? '<span>' + esc(x.pname) + '</span>' : '') + '</div>' +
          (x.href ? '<span class="shp-qna-acts">' + (bx ? '<a class="whl-btn is-main" href="' + esc(replyUrl(bx)) + '" target="_blank" rel="noopener">답변 달기</a>' : '') + '<a class="whl-btn" href="' + esc(x.href) + '" target="_blank" rel="noopener">글 보기 ↗</a></span>' : '') + '</li>';
      }).join('') + '</ul>' : (st.qna ? empty('이 손님이 남긴 상품 문의가 없어요.') : '<div class="sha-loading is-small">' + spinner('상품 문의를 불러오는 중') + '</div>');
      // 4) 구매한 상품
      var orders = ordO ? ordO.orders : [];
      var bought = orders.length ? '<div class="shp-orders">' + orders.map(function (x) {
        var t = x.n.match(/^(.+?)(?:\s*\[(.+)\])?(?:\s+(\d+)개)?(?:\s+([\d,]+)원?)?$/) || [x.n, x.n];
        var stCls = /취소|반품|교환/.test(x.st) ? ' is-miss' : /완료/.test(x.st) ? ' is-paid' : /배송/.test(x.st) && !/준비/.test(x.st) ? ' is-on' : '';
        return '<div class="shp-order">' + (x.no ? '<a href="/product/detail.html?product_no=' + encodeURIComponent(x.no) + '" target="_blank" rel="noopener"><i data-whl-img="' + esc(x.no) + '"></i></a>' : '<i></i>') +
          '<div><b>' + esc(t[1]) + '</b><span>' + (t[4] ? '<strong>' + esc(t[4]) + '원</strong>' : '') + esc((t[2] ? t[2] + ' · ' : '') + (t[3] ? t[3] + '개' : '')) + '</span>' +
          '<span class="whl-tag' + stCls + '">' + esc(x.st || '-') + '</span>' +
          '<dl><div><dt>주문일</dt><dd>' + esc(x.d) + '</dd></div><div><dt>주문번호</dt><dd>' + esc(x.id) + '</dd></div>' +
          (x.co || x.inv ? '<div><dt>택배</dt><dd>' + esc(x.co || '') + ' ' + esc(x.inv || '') + '</dd></div>' : '') + (x.exp ? '<div><dt>발송예정</dt><dd>' + esc(x.exp) + '</dd></div>' : '') + '</dl></div></div>';
      }).join('') + '</div><p class="shp-note">최근 3개월 · 최대 8건. 카페24는 실제 발송일 · 도착일을 쇼핑몰 화면에 주지 않아서, 배송 상태 · 택배 · 송장번호로 보여 드려요. 송장번호로 택배사 배송 조회를 하면 도착일을 볼 수 있어요.</p>'
        : empty(buyO ? '최근 3개월 동안 구매한 상품이 없어요.' : '아직 구매 내역을 읽은 기록이 없어요. (손님이 챗봇에 묻거나 주문서에 오면 함께 모여요)');
      // 4) 주문서까지 간 상품 (주문서 기록 모두)
      var ofs = recs.filter(function (r) { return r.s.ch === '주문서'; });
      var oform = ofs.length ? ofs.map(function (r) {
        var o = logOf(r), paid = recs.some(function (x) { return x.s.ch === '결제 완료' && x.at >= r.at; });
        return '<div class="shp-of"><div class="shp-of-head"><b>' + esc(r.date) + '</b><span>결제 예정 ' + esc(o.oform ? o.oform.total : '-') + '</span><span class="whl-tag ' + (paid ? 'is-paid">이후 결제 완료' : 'is-unpaid">미결제') + '</span></div>' +
          (o.oform && o.oform.items.length ? prodCards(o.oform.items) : '') + '</div>';
      }).join('') : empty('주문서까지 간 기록이 없어요.');
      // 5) 최근 본 상품 · 6) 장바구니 · 7) 이동 경로
      var viewed = prodO ? prodCards(prodO.prods) : empty('본 상품이 없어요.');
      var cart = cartO && cartO.carts.length ? prodCards(cartO.carts) : empty(cartO ? '장바구니가 비어 있어요.' : '아직 장바구니를 읽은 기록이 없어요.');
      var path = pathO ? '<ol class="whl-path">' + pathO.path.map(function (n, i) { var k = stepKind(n, pathO); return '<li class="' + (k ? 'is-' + k : '') + (i === pathO.path.length - 1 ? ' is-last' : '') + '"><span><em>' + (i + 1) + '</em>' + esc(n) + '</span></li>'; }).join('') + '</ol>' : empty('남은 이동 경로가 없어요.');
      var first = !drawer;
      if (first) {
        drawer = document.createElement('div'); drawer.className = 'sha-drawer'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-label', '손님 자세히 보기');
        document.body.appendChild(drawer); document.documentElement.style.overflow = 'hidden'; document.addEventListener('keydown', escKey);
        drawer.addEventListener('click', function (e) {
          if (e.target === drawer || e.target.closest('[data-close]')) return closeDetail();
          var npb = e.target.closest('[data-npage]'); if (npb) { st.notePage = +npb.getAttribute('data-npage'); drawDetail(); var ul = drawer.querySelector('.sha-notes'); if (ul) ul.scrollIntoView({ block: 'nearest' }); return; }
          var rs = e.target.closest('[data-resend]'); if (rs) { var x = findNote(rs.getAttribute('data-resend')); if (x) sendNote(x.r, x.n); }
        });
        drawer.addEventListener('submit', submitNote);
        drawer.addEventListener('change', function (e) {
          var s = e.target.closest('[data-state]'); if (s) return setMark(s.getAttribute('data-state'), s.value);
          var a = e.target.closest('[data-ans]'); if (a) setAns(a.getAttribute('data-ans'), a.value);   // 상품 문의 답변 상태
        });
      }
      var scroll = first ? 0 : (drawer.querySelector('.sha-drawer-body') || {}).scrollTop || 0;
      // 다시 그려도 쓰던 글 · 체크는 그대로 (저장이 끝나 화면이 바뀌는 사이에 다음 내용을 쓰고 있을 수 있다)
      var ta0 = !first && drawer.querySelector('#shaNote'), ck0 = !first && drawer.querySelector('#shaTodo'), typing = ta0 && document.activeElement === ta0;
      if (ta0) { st.draft = ta0.value; st.draftTodo = !!(ck0 && ck0.checked); }
      drawer.innerHTML = '<div class="sha-drawer-box whl"><div class="sha-drawer-head"><div><b>' + esc(name) + '</b><small>' + idsShort(p) + ' · 기록 ' + recs.length + '건</small></div>' +
        '<button type="button" class="whl-cs-x" data-close aria-label="닫기">×</button></div><div class="sha-drawer-body">' +
        '<div class="shp-top">' + sec(1, '회원 정보', info, 'is-info') + sec(2, '상담 일지 · 상담 내용 등록<label class="sha-check" title="체크하고 등록하면 목록 이름 옆에 「오늘 확인」이 붙어요"><input type="checkbox" id="shaTodo"' + (st.draftTodo ? ' checked' : '') + '><span>오늘 확인</span></label>', diary, 'is-diary') + '</div>' +
        sec(3, '상품 문의 <small>' + myQ.length + '개' + (myQ.filter(function (x) { return x.answered === false; }).length ? ' · 답변 대기 ' + myQ.filter(function (x) { return x.answered === false; }).length : '') + '</small>', qnaHtml, myQ.some(function (x) { return x.answered === false; }) ? 'is-wait' : '') +
        sec(4, '구매한 상품', bought) + sec(5, '주문서까지 간 상품 <small>' + ofs.length + '번</small>', oform, ofs.length ? 'is-order' : '') +
        sec(6, '최근 본 상품', viewed) + sec(7, '장바구니' + (cartO && cartO.cart ? ' <small>' + esc(cartO.cart.cnt) + '개 · ' + esc(cartO.cart.price) + '</small>' : ''), cart) +
        sec(8, '이동 경로 <small>' + (pathO ? pathO.path.length + '곳 · 오래된 순 → 최근' : '') + '</small>', path) + '</div></div>';
      loadPics(drawer);
      var ta1 = drawer.querySelector('#shaNote'), ck1 = drawer.querySelector('#shaTodo');
      if (ta1) { ta1.value = st.draft; if (typing) ta1.focus(); } if (ck1) ck1.checked = st.draftTodo;
      var body = drawer.querySelector('.sha-drawer-body'); if (body) body.scrollTop = scroll;
      if (first) { var x = drawer.querySelector('[data-close]'); if (x) x.focus(); }
    }
    function submitNote(e) {
      var f = e.target.closest('.sha-note-form'); if (!f) return;
      e.preventDefault();
      var ta = f.querySelector('textarea'), msg = f.querySelector('.sha-note-msg'), btn = f.querySelector('button'), v = trim(ta.value.replace(/\r/g, ''));
      if (!v) { ta.focus(); return; }
      var p = person(), r = p && p.recs[0]; if (!r) return;   // 상담 내용은 이 손님의 가장 최근 기록에 붙인다
      // 바로 화면에 올리고, 구글 시트 저장은 뒤에서 (시트 저장은 몇 초~수십 초 걸릴 수 있다)
      var ck = drawer.querySelector('#shaTodo'), now = Date.now();
      var n = { at: now, id: r.id, nid: 'n' + now.toString(36) + Math.random().toString(36).slice(2, 6), by: memberName() || '관리자', text: v, due: ck && ck.checked ? ymd(now) : '', done: '' };
      r.noteList.push(n); r.notes = r.noteList.length; p.notes += 1;
      ta.value = ''; if (ck) ck.checked = false; st.draft = ''; st.draftTodo = false; st.notePage = 1;
      st.noteMsg = n.due ? '등록했어요. 목록 이름 옆에 「오늘 확인」이 붙었어요.' : '등록했어요.';
      sendNote(r, n);
    }
    function redraw() { drawList(); if (drawer) drawDetail(); }
    function findNote(nid) {
      for (var i = 0; i < st.recs.length; i++) for (var j = 0; j < st.recs[i].noteList.length; j++) if (st.recs[i].noteList[j].nid === nid) return { r: st.recs[i], n: st.recs[i].noteList[j] };
      return null;
    }
    function sendNote(r, n) {
      n.state = 'saving'; redraw();
      sheetCall({ type: 'note', key: key, id: r.id, nid: n.nid, by: n.by, text: n.text, due: n.due }).then(function (d) {
        if (!d || !d.ok) throw new Error('note');
        n.state = '';
      }).catch(function () { n.state = 'fail'; }).then(redraw);
    }
    // 확인 상태 셀렉트 (표시 없음 / 오늘 확인 / 확인 완료) : 고르면 바로 바뀌고, 시트에는 뒤에서 저장 (못 하면 되돌린다)
    function setMark(nid, v) {
      var x = findNote(nid); if (!x || x.n.checking) return;
      var n = x.n, prev = { due: n.due, done: n.done };
      n.due = v ? n.due || ymd(Date.now()) : ''; n.done = v === 'done' ? n.done || Date.now() : '';
      n.checking = true; st.noteMsg = ''; redraw();
      sheetCall({ type: 'check', key: key, nid: nid, due: n.due, done: !!n.done }).then(function (d) {
        if (!d || !d.ok) throw new Error('check');
        n.checking = false;
      }).catch(function () { n.due = prev.due; n.done = prev.done; n.checking = false; st.noteMsg = '확인 상태를 저장하지 못했어요. 다시 골라 주세요.'; }).then(redraw);
    }
    root.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-refresh]')) return load();
      if (t.closest('[data-lock]')) { try { localStorage.removeItem(AKEY); } catch (x) {} key = ''; return login(); }
      var fb = t.closest('[data-f]'); if (fb) { st.f = fb.getAttribute('data-f'); st.page = 1; drawList(); return; }
      var rg = t.closest('[data-range]'); if (rg) {
        var v = rg.getAttribute('data-range'), now = Date.now();
        st.from = v === 'all' ? '' : ymd(now - (+v) * 864e5); st.to = v === 'all' ? '' : ymd(now);
        root.querySelector('#shaFrom').value = st.from; root.querySelector('#shaTo').value = st.to; st.page = 1; drawList(); return;
      }
      if (t.closest('[data-csv]')) return csv();
      var cc = t.closest('[data-csv-cart]'); if (cc) return cartCsv(cc.getAttribute('data-csv-cart'));
      var pg = t.closest('[data-page]'); if (pg) { st.page = +pg.getAttribute('data-page'); drawList(); root.querySelector('.sha-table-wrap').scrollIntoView({ block: 'start' }); return; }
      var th = t.closest('th[data-s]'); if (th) { st.sort = th.getAttribute('data-s'); var sel = root.querySelector('.sha-sort'); if (sel) sel.value = st.sort; drawList(); return; }
      var op = t.closest('[data-open-p]'); if (op) { openDetail(op.getAttribute('data-open-p'), op); return; }   // 상품 문의 → 그 손님
      if (t.closest('tr[data-qna] select, tr[data-qna] label, tr[data-qna] a[href]')) return;   // 답변 드롭다운 · [답변 달기]는 그대로
      var qr = t.closest('tr[data-qna]'); if (qr) { window.open(qr.getAttribute('data-qna'), '_blank', 'noopener'); return; }
      var tr = t.closest('tr[data-p]'); if (tr) { openDetail(tr.getAttribute('data-p'), tr); return; }
      if (t.closest('[data-reach-all]')) {
        return openReach(st.people.filter(function (p) { return p.unpaid && inRange(p); }).map(function (p) { return { a: null, s: { name: p.name, id: p.id, t: p.lastOrder.date }, o: logOf(p.lastOrder), notes: p.lastOrder.notes, unpaid: true }; }));
      }
    });
    root.addEventListener('submit', function (e) {
      if (!e.target.closest('.sha-search')) return;
      e.preventDefault();
      var v = root.querySelector('#shaQ').value; st.qRaw = v; st.q = trim(v).toLowerCase(); st.page = 1; drawList();
    });
    root.addEventListener('change', function (e) { var s = e.target.closest && e.target.closest('[data-ans]'); if (s) setAns(s.getAttribute('data-ans'), s.value); });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var qr = e.target.matches && e.target.matches('tr[data-qna]') ? e.target : null; if (qr) { e.preventDefault(); window.open(qr.getAttribute('data-qna'), '_blank', 'noopener'); return; }
      var tr = e.target.matches && e.target.matches('tr[data-p]') ? e.target : null; if (tr) { e.preventDefault(); openDetail(tr.getAttribute('data-p'), tr); }
    });
    if (key) load(); else login();
  }

  function logView() {
    if (!onLogBoard()) return;
    logCss();
    // 목록 : 제목을 이름 · 아이디 · 상담 방법 배지로
    [].forEach.call(document.querySelectorAll('[class*="xans-board-list"] td.subject a, [class*="xans-board-list"] .subject a'), function (a) {
      var s = parseSubject(a.textContent); if (!s) return;
      a.setAttribute('data-whl-subject', trim(a.textContent));
      a.innerHTML = '<span class="whl-li"><span class="whl-tag ' + chCls(s.ch) + '">' + esc(s.ch) + '</span> <b>' + esc(s.name) + '</b>' + (s.id ? '<span>' + esc(s.id) + '</span>' : '') + '<span>· ' + esc(s.t) + '</span></span>';
    });
    csColumn();
    orderRows();
    groupView();
    // 글 보기
    var box = document.querySelector('[class*="xans-board-read"] .detail'); if (!box || box.getAttribute('data-whl')) return;
    var raw = box.querySelector('.fr-view') || box, o = parseLog(textOf(raw.innerHTML)); if (!o) return;
    box.setAttribute('data-whl', '1');
    var h3 = document.querySelector('[class*="xans-board-read"] .head h3'), s = parseSubject(h3 ? h3.textContent : '') || {};
    if (renderDetail(box, o, s)) return;   // 새 화면 (요약 → 상세 2단). 아래는 예전 화면 (그리기 실패 시)
    var name = o.name || s.name || (o.member ? '회원' : '비회원'), id = o.id || s.id || '';
    var ch = s.ch ? '<span class="whl-tag ' + chCls(s.ch) + '">' + esc({ '카카오톡': '카카오톡 상담', '챗봇': '챗봇 상담', '문의': '문의 남기기', '주문서': '주문서까지 옴' }[s.ch] || s.ch) + '</span>' : '';
    var buy = o.path.filter(function (n) { return stepKind(n, o) === 'buy'; }).length;
    var stat = function (label, n, unit) { return '<div class="whl-stat"><em>' + label + '</em><b>' + n + '<small>' + unit + '</small></b></div>'; };
    var html = '<div class="whl">' +
      '<div class="whl-top"><div class="whl-who"><span class="whl-av' + (o.member ? '' : ' is-guest') + '">' + esc(name.charAt(0)) + '</span><div><b>' + esc(name) + '</b><span>' + (o.member ? '회원' : '비회원') + (id ? ' · 아이디 ' + esc(id) : '') + '</span></div></div>' +
      '<div class="whl-meta">' + ch + (buy ? '<span class="whl-tag is-buy">장바구니 · 주문 화면까지 감</span>' : '') + (s.t ? '<span>' + esc(s.t) + '</span>' : '') + '</div>';
    // 연락처 · 등급 (회원) + 관리자 회원 정보 화면
    if (o.member) {
      var g = o.group.split(/\s*·\s*가입\s*/);
      html += '<dl class="whl-info">' +
        '<div><dt>이름</dt><dd>' + esc(name) + '</dd></div>' +
        '<div><dt>아이디</dt><dd>' + (id ? esc(id) : '-') + '</dd></div>' +
        '<div><dt>휴대폰</dt><dd>' + (o.phone ? '<a href="tel:' + esc(o.phone.replace(/[^\d+]/g, '')) + '">' + esc(o.phone) + '</a>' : '<span class="whl-empty">등록 안 함</span>') + '</dd></div>' +
        '<div><dt>이메일</dt><dd>' + (o.email ? '<a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a>' : '<span class="whl-empty">-</span>') + '</dd></div>' +
        '<div><dt>회원 등급</dt><dd>' + esc(g[0] || '-') + '</dd></div>' +
        '<div><dt>가입일</dt><dd>' + esc(g[1] || '-') + '</dd></div>' +
        '</dl>' + contactBar({ name: name, id: id, phone: o.phone, email: o.email, agree: o.agree, unpaid: s.ch === '주문서', items: o.oform ? o.oform.items.map(function (x) { return x.n; }) : [] }) +
        (!o.phone && !o.email && !o.group ? '<p class="whl-empty" style="margin-top:8px">이 기록은 연락처를 담기 전에 남은 글이에요. 위 버튼으로 관리자 회원 정보에서 확인하세요.</p>' : '');
    }
    html += '</div>';
    if (o.paid) html += '<div class="whl-sec is-paid"><h4>결제 완료</h4><p><b>주문번호 ' + esc(o.paid.id) + '</b>' + (o.paid.total ? ' · ' + esc(o.paid.total) : '') + '</p></div>';
    if (o.oform) html += '<div class="whl-sec is-order"><h4>주문서까지 온 상품 (결제 예정 ' + esc(o.oform.total) + ')</h4>' + (o.oform.items.length ? '<div class="whl-prods">' + o.oform.items.map(function (p) {
      var t = p.n.match(/^(.+?)(?:\s*\[(.+)\])?(?:\s+(\d+)개)?(?:\s+([\d,]+원))?$/) || [p.n, p.n];
      return '<a class="whl-prod" href="' + (p.no ? '/product/detail.html?product_no=' + encodeURIComponent(p.no) : '#none') + '" target="_blank" rel="noopener">' + (p.no ? '<i data-whl-img="' + esc(p.no) + '"></i>' : '<i></i>') + '<b>' + esc(t[1]) + '</b><span>' + (t[4] ? '<strong>' + esc(t[4]) + '</strong>' : '') + esc((t[2] ? t[2] + ' · ' : '') + (t[3] ? t[3] + '개' : '')) + '</span></a>';
    }).join('') + '</div>' : '') + '</div>';
    if (o.buy) html += '<div class="whl-stats">' + stat('누적 주문', o.buy.count, '번') + stat('누적 구매', esc(o.buy.total.replace(/원$/, '')), '원') + stat('적립금', esc(o.buy.mileage.replace(/원$/, '')), '원') + stat('장바구니', o.cart ? o.cart.cnt : 0, '개') + '</div>';
    html += '<div class="whl-stats">' + stat('챗봇 상담', o.chat, '번') + stat('상담 연결', o.link, '번') + stat('최근 본 상품', o.prods.length, '개') + stat('둘러본 화면', o.path.length, '곳') + '</div>';
    if (o.buy && o.cart) {   // 주문서 · 결제 완료 기록에는 최근 주문 · 장바구니 칸이 없다
      html += '<div class="whl-sec"><h4>최근 주문 (최근 3개월 · 최대 5건)</h4>' + (o.status.length ? '<div class="whl-chips" style="margin-bottom:12px">' + o.status.map(function (x) { return '<span class="whl-tag' + (x[1] ? ' is-on' : '') + '">' + esc(x[0]) + ' ' + x[1] + '</span>'; }).join('') + '</div>' : '') +
        (o.orders.length ? '<ul class="whl-orders">' + o.orders.map(function (x) {
          return '<li><div><time>' + esc(x.d) + '</time><span>' + esc(x.id) + '</span></div><b>' + esc(x.n) + '</b><span class="whl-tag' + (/취소|반품|교환/.test(x.st) ? ' is-miss' : /완료/.test(x.st) ? ' is-buy' : '') + '">' + esc(x.st) + '</span></li>';
        }).join('') + '</ul>' : '<p class="whl-empty">최근 3개월 주문이 없어요.</p>') + '</div>';
      html += '<div class="whl-sec"><h4>장바구니' + (o.cart ? ' (' + esc(o.cart.cnt) + '개 · ' + esc(o.cart.price) + ')' : '') + '</h4>' + (o.carts.length ? '<div class="whl-prods">' + o.carts.map(function (p) {
        var t = p.n.match(/^(.+?)(?:\s*\[(.+)\])?(?:\s+(\d+)개)?(?:\s+([\d,]+원))?$/) || [p.n, p.n];
        return '<a class="whl-prod" href="' + (p.no ? '/product/detail.html?product_no=' + encodeURIComponent(p.no) : '#none') + '" target="_blank" rel="noopener">' + (p.no ? '<i data-whl-img="' + esc(p.no) + '"></i>' : '<i></i>') + '<b>' + esc(t[1]) + '</b><span>' + (t[4] ? '<strong>' + esc(t[4]) + '</strong>' : '') + esc((t[2] ? t[2] + ' · ' : '') + (t[3] ? t[3] + '개' : '')) + '</span></a>';
      }).join('') + '</div>' : '<p class="whl-empty">장바구니가 비어 있어요.</p>') + '</div>';
    }
    if (o.style.length) html += '<div class="whl-sec"><h4>스타일 추천에서 고른 것</h4><div class="whl-chips">' + o.style.map(function (x) { return '<span class="whl-tag">' + esc(x) + '</span>'; }).join('') + '</div></div>';
    html += '<div class="whl-sec"><h4>최근 본 상품 (최신순)</h4>' + (o.prods.length ? '<div class="whl-prods">' + o.prods.map(function (p) {
      return '<a class="whl-prod" href="/product/detail.html?product_no=' + encodeURIComponent(p.no) + '" target="_blank" rel="noopener"><i data-whl-img="' + esc(p.no) + '"></i><b>' + esc(p.n) + '</b><span>' + (p.p ? '<strong>' + esc(p.p) + '</strong>' : '') + esc(p.t) + '</span></a>';
    }).join('') + '</div>' : '<p class="whl-empty">본 상품이 없어요.</p>') + '</div>';
    html += '<div class="whl-sec"><h4>둘러본 순서 (오래된 순 → 상담 직전)</h4>' + (o.path.length ? '<ol class="whl-path">' + o.path.map(function (n, i) {
      var k = stepKind(n, o), last = i === o.path.length - 1;
      return '<li class="' + (k ? 'is-' + k : '') + (last ? ' is-last' : '') + '"><span><em>' + (i + 1) + '</em>' + esc(n) + '</span></li>';
    }).join('') + '</ol>' : '<p class="whl-empty">남은 이동 경로가 없어요.</p>') + '</div>';
    html += '<div class="whl-sec"><h4>상담 이력 (이 손님 기기 기준 · 최근 4번)</h4>' + (o.hist.length ? '<ol class="whl-time">' + o.hist.map(function (h) {
      return '<li><time>' + esc(h.t) + '</time><div class="whl-chips">' + h.items.map(function (x) { return '<span>' + histTag(x) + '</span>'; }).join('<span class="whl-empty">→</span>') + '</div></li>';
    }).join('') + '</ol>' : '<p class="whl-empty">남은 상담 이력이 없어요.</p>') + '</div>';
    var key = id || (o.member ? name : '');
    html += '<div class="whl-foot">' + (key ? '<a class="whl-btn" href="/board/free/list.html?board_no=' + LOG_BOARD + '&search_key=subject&search=' + encodeURIComponent(key) + '">이 손님 기록 모두 보기</a>' : '') +
      '<button type="button" class="whl-btn" data-whl-raw>원문 보기</button></div></div>';
    var wrap = document.createElement('div'); wrap.innerHTML = html;
    var view = wrap.firstChild; box.parentNode.insertBefore(view, box);
    box.classList.add('whl-raw'); box.style.display = 'none';
    view.querySelector('[data-whl-raw]').addEventListener('click', function () { var hide = box.style.display !== 'none'; box.style.display = hide ? 'none' : ''; this.textContent = hide ? '원문 보기' : '원문 닫기'; });
    // 상품 사진 : 상품 화면의 대표 이미지(og:image)
    var pics = {};
    [].forEach.call(view.querySelectorAll('[data-whl-img]'), function (i) {
      var no = i.getAttribute('data-whl-img');
      (pics[no] = pics[no] || fetch('/product/detail.html?product_no=' + encodeURIComponent(no), { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; })).then(function (t) {
        var m = t.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || t.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (m) i.style.backgroundImage = 'url("' + m[1].replace(/["\\]/g, '') + '")';
      }).catch(function () {});
    });
  }

  /* ---------- 4-3. 스타일 추천 (설정 style.steps) : 고른 답의 낱말이 상품 이름에 있으면 점수, 예산은 가격으로 거른다 ---------- */
  var STYLE = UC.style && UC.style.steps && UC.style.steps.length && UC.style.enabled !== false ? UC.style : null;
  var STYLE_KEY = 'shop-helper-style', RUN_KEY = 'shop-helper-style-run', RESTYLE = '다시 추천받기';
  function styleTitle() { return (STYLE && STYLE.title) || '나에게 맞는 스타일 추천'; }
  function styleStart() {
    var run = { id: Date.now().toString(36), a: [] };
    put(RUN_KEY, run, 'sessionStorage');
    styleAsk(run, 0);
  }
  function styleAsk(run, i) {
    var st = STYLE.steps[i], n = STYLE.steps.length;
    push({ who: 'bot', text: (i === 0 ? (STYLE.intro || '몇 가지만 고르시면 어울리는 상품을 골라 드릴게요.') + '\n\n' : '') + '*' + (i + 1) + ' / ' + n + '* ' + st.q,
      opts: st.options.map(function (o, j) { return { label: o.label, v: run.id + ':' + i + ':' + j }; }), chips: [HOME], chipsCls: 'is-home' });
  }
  function stylePick(v) {
    var m = String(v).split(':'), run = get(RUN_KEY, 'sessionStorage');
    if (!run || run.id !== m[0] || !STYLE) return;
    var i = +m[1], j = +m[2], st = STYLE.steps[i], o = st && st.options[j];
    if (!o || run.a.length !== i) return;   // 지난 질문의 버튼을 다시 누른 경우
    run.a.push(j); put(RUN_KEY, run, 'sessionStorage');
    push({ who: 'me', text: o.label });
    if (i + 1 < STYLE.steps.length) styleAsk(run, i + 1); else typingThen(push, styleDone(run));
  }
  // 분류 : 번호(24)를 적으면 그 분류, 이름('아우터')을 적으면 페이지의 분류 링크에서 찾는다
  function catHref(name) {
    if (/^\d+$/.test(String(name || ''))) return '/product/list.html?cate_no=' + name;
    if (!KB.cats.length) loadCats();
    var f = flat(name), c = KB.cats.filter(function (x) { return x.f === f; })[0];
    if (!c) [].some.call(document.querySelectorAll('a[href*="cate_no="]'), function (a) { if (flat(a.textContent) === f) { c = { href: a.getAttribute('href') }; return true; } return false; });
    return c ? c.href : '';
  }
  function pickNum(s) { var m = String(s || '').match(/([\d,]+)\s*원/g); return m ? +m[m.length - 1].replace(/[^\d]/g, '') : 0; }
  // 분류 목록 화면(최대 4쪽)에서 상품 이름 · 가격 · 사진 · 주소를 읽는다 → 30분 기억
  function loadProducts(href) {
    var key = 'shop-helper-prd:' + href, c = get(key, 'sessionStorage');
    if (c && Date.now() - c.t < 30 * 60000) return Promise.resolve(c.items);
    var items = [], seen = {};
    function page(n) {
      return fetch(href + (href.indexOf('?') < 0 ? '?' : '&') + 'page=' + n, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
        var d = new DOMParser().parseFromString(t, 'text/html'), got = 0;
        d.querySelectorAll('ul.prdList > li, .prdList > li').forEach(function (li) {
          var a = li.querySelector('.thumbnail a[href], .name a[href]'), sp = li.querySelectorAll('.name a span');
          var no = ((li.id || '').match(/(\d+)$/) || (a && a.getAttribute('href').match(/product_no=(\d+)|\/(\d+)\/category/)) || [])[1];
          var name = trim(sp.length ? sp[sp.length - 1].textContent : (li.querySelector('.name') || {}).textContent || '').replace(/^상품명\s*:\s*/, '');
          if (!no || !name || seen[no]) return;
          var price = 0;
          li.querySelectorAll('.spec li, ul.spec > li').forEach(function (x) { if (/판매가/.test(x.textContent)) price = pickNum(x.textContent) || price; });
          var img = li.querySelector('.thumbnail img'), src = img ? (img.getAttribute('ec-data-src') || img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
          seen[no] = 1; got++;
          items.push({ no: no, name: name, price: price, img: src, href: a ? a.getAttribute('href') : '/product/detail.html?product_no=' + no });
        });
        if (got && n < 4) return new Promise(function (r) { setTimeout(r, 250); }).then(function () { return page(n + 1); });
      });
    }
    return page(1).then(function () { put(key, { t: Date.now(), items: items }, 'sessionStorage'); return items; }).catch(function () { return items; });
  }
  function styleDone(run) {
    var picks = run.a.map(function (j, i) { return STYLE.steps[i].options[j]; });
    var cat = picks.filter(function (o) { return o.category; })[0], href = catHref(cat ? cat.category : (STYLE.allCategory || '전체 상품'));
    if (!href && cat) href = catHref(STYLE.allCategory || '전체 상품');
    var labels = picks.map(function (o) { return o.label; });
    put(STYLE_KEY, { t: Date.now(), labels: labels }); logEvent('style', labels.join(' · '));
    return (href ? loadProducts(href) : Promise.resolve([])).then(function (items) {
      var ex = STYLE.exclude ? new RegExp(String(STYLE.exclude).split(/\s*,\s*/).join('|')) : null;
      var min = 0, max = Infinity;
      picks.forEach(function (o) { if (o.min != null) min = Math.max(min, +o.min); if (o.max != null) max = Math.min(max, +o.max); });
      var pool = items.filter(function (p) { return !(ex && ex.test(p.name)); }), inBudget = pool.filter(function (p) { return !p.price || (p.price >= min && p.price <= max); });
      var budgetMiss = !inBudget.length && pool.length;
      var ranked = (budgetMiss ? pool : inBudget).map(function (p, k) {
        var s = 0, f = flat(p.name);
        picks.forEach(function (o, i) {
          var w = +STYLE.steps[i].weight || 1, hit = 0;
          String(o.words || '').split(/[,\n]/).map(flat).filter(Boolean).forEach(function (x) { if (f.indexOf(x) > -1) hit++; });
          s += Math.min(hit, 2) * w;
        });
        return { p: p, s: s, k: k };
      }).sort(function (a, b) { return b.s - a.s || a.k - b.k; });
      var top = ranked.slice(0, +STYLE.count || 4), good = top.length && top[0].s > 0;
      var text = !items.length ? '지금은 상품 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'
        : '「' + labels.join(' · ') + '」 에 어울리는 상품을 골라 봤어요.' + (budgetMiss ? '\n예산 안의 상품이 없어 가까운 상품으로 보여 드려요.' : !good ? '\n딱 맞는 상품이 적어 비슷한 상품으로 골랐어요.' : '');
      return ({ who: 'bot', text: text, cards: top.map(function (r) { return { name: r.p.name, price: r.p.price ? won(r.p.price) + '원' : '', img: r.p.img, href: r.p.href }; }),
        links: href ? [{ label: (cat ? cat.label : '전체 상품') + ' 더 보기', href: href }] : [], chips: (top.length ? [RESTYLE] : []).concat(['상담원과 이야기하고 싶어요', HOME]), chipsCls: 'is-next' });
    });
  }

  /* ---------- 4-4. 상담 넘기기 : 손님이 동의하면 상담 참고 글을 카카오톡(복사) · 문의 글쓰기(미리 넣기)로 ---------- */
  var HANDOFF_KEY = 'shop-helper-handoff', handoff = null;
  function copyText(t) {
    function old() { var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).catch(old); return; } } catch (e) {}
    old();
  }
  function openLink(kind, href) { if (kind === 'talk' || (/^https?:\/\//.test(href) && href.indexOf(location.host) < 0)) window.open(href, '_blank', 'noopener'); else location.href = href; }
  // 화면 안의 자리로 내려가기 (사이즈 가이드 등). 사진 · 영상이 늦게 그려져 자리가 밀리므로 몇 번 다시 맞춘다
  var JUMP_KEY = 'shop-helper-jump';
  function jumpTo(hash) {
    [250, 900, 1800].forEach(function (ms) { setTimeout(function () { var t = document.querySelector(hash); if (t) t.scrollIntoView({ behavior: ms === 250 ? 'smooth' : 'auto', block: 'start' }); }, ms); });
  }
  function jumpOnLoad() {
    var j = get(JUMP_KEY, 'sessionStorage');
    if (!j || Date.now() - j.t > 30000 || location.hash !== j.hash) return;
    try { store('sessionStorage').removeItem(JUMP_KEY); } catch (e) {}
    jumpTo(j.hash);
  }
  // 카카오톡 상담 버튼 : 묻지 않고 바로 연결한다 (챗봇 화면에는 아무것도 띄우지 않음)
  // 회원이고 상담 기록 게시판(consultBoard)이 있으면, 화면 뒤에서 최근 본 상품 · 상담 이력을 비밀글로 남겨 사장님이 참고한다
  function offerHandoff(kind, href) {
    logEvent(kind, 'go');
    openLink(kind, href);   // 새 창 열기는 누르는 순간에 바로 해야 막히지 않는다
    if (TRAIL_ON && LOG_ON && isMember()) { clearTimeout(chatTimer); markLogged(); }   // 이 대화는 카카오톡 상담 기록으로 남긴다 (챗봇 기록을 따로 또 남기지 않음)
    if (TRAIL_ON && LOG_ON && isMember()) memberInfo().then(function (mem) {
      if (!mem || !mem.on) return;
      return shopInfo().then(function (s) { var m = {}; for (var k in mem) m[k] = mem[k]; m.shop = s; saveLog(m, kind, summary(m)); });   // 주문 · 장바구니도 함께
    }).catch(function () {});
  }
  // (예전 방식 : 보낼 내용을 보여 주고 고르게 하기 — 지금은 쓰지 않음)
  function offerHandoffAsk(kind, href) {
    var h = handoff = { kind: kind, href: href, text: summary({ on: isMember(), name: memberName() }) };
    var msg = { who: 'bot', text: kind === 'talk'
        ? '상담원이 바로 도와드릴 수 있게 아래 내용을 함께 보낼까요?\n「함께 보내기」를 누르면 내용이 복사돼요. 카카오톡 채팅창에 붙여넣기만 하면 돼요.'
          + (LOG_BOARD && isMember() ? '\n회원님의 상담 기록으로도 남겨 다음 상담 때 참고해요.' : '')
        : '문의 글에 아래 내용을 붙여 드릴까요?\n글을 올리기 전에 직접 보고 고치거나 지울 수 있어요.'
          + (LOG_BOARD && isMember() ? '\n회원님의 상담 기록으로도 남겨 다음 상담 때 참고해요.' : ''),
      preview: h.text, acts: [{ act: 'send', label: kind === 'talk' ? '함께 보내기 (복사하고 카카오톡 열기)' : '붙여서 문의 남기기' }, { act: 'plain', label: '그냥 연결할게요' }] };
    push(msg);
    var pv = log.lastChild && log.lastChild.querySelector('.wh-preview');
    // 회원 아이디는 미리 읽어 둔다 (복사는 누르는 순간에 바로 해야 해서) → 읽히면 미리 보기도 고친다
    memberInfo().then(function (mem) { h.mem = mem; h.text = msg.preview = summary(mem); save(); if (pv) pv.textContent = h.text; });
  }
  function doHandoff(act) {
    if (!handoff) return;
    var h = handoff;
    logEvent(h.kind, act);
    // 회원이 함께 보내기를 고르면 상담 기록 게시판에도 남긴다 (설정 consultBoard 가 있을 때)
    if (act === 'send') { h.text = summary(h.mem || { on: isMember(), name: memberName() }); if (h.mem && h.mem.on) saveLog(h.mem, h.kind, h.text); }
    if (act === 'send' && h.kind === 'talk') {
      copyText(h.text); openLink('talk', h.href);
      push({ who: 'bot', text: '내용을 복사했어요. 카카오톡 채팅창을 길게 눌러 *붙여넣기* 한 뒤 보내 주세요.', chips: [HOME], chipsCls: 'is-home' });
    } else if (act === 'send') {
      put(HANDOFF_KEY, { t: Date.now(), text: h.text, html: summaryHtml(h.text) }, 'sessionStorage');
      openLink('ask', h.href);
    } else openLink(h.kind, h.href);
  }
  // 문의 글쓰기 화면 : 넘겨받은 상담 참고 글을 본문 아래에 넣는다 (카페24 글쓰기 편집기 Froala)
  function froala() {
    var F = window.FroalaEditor;
    if (F && F.INSTANCES && F.INSTANCES.length) {
      var ed = F.INSTANCES[0];
      if (ed.el && ed.html && ed.el.getAttribute('contenteditable') === 'true') return { get: function () { return ed.html.get(); }, set: function (h) { ed.html.set(h); try { ed.events.trigger('contentChanged'); } catch (e) {} } };
    }
    var jq = window.jQuery, box = jq && jq('[name="content"], #content').filter(function () { return jq(this).data('froala.editor'); });
    if (box && box.length) return { get: function () { return box.froalaEditor('html.get'); }, set: function (h) { box.froalaEditor('html.set', h); } };
    return null;
  }
  function prefill() {
    var h = get(HANDOFF_KEY, 'sessionStorage');
    if (!h || Date.now() - h.t > 20 * 60000 || !/\/write\.html$/.test(location.pathname)) return;
    var n = 0;
    function done() { try { store('sessionStorage').removeItem(HANDOFF_KEY); } catch (e) {} }
    (function wait() {
      var ed = froala(), ta = document.querySelector('textarea[name="content"], textarea#content');
      if (ed) { var cur = ed.get() || ''; ed.set((trim(textOf(cur)) ? cur : '<p><br></p>') + '<p><br></p>' + h.html); done(); }
      else if (n++ > 50 || (n > 8 && !window.FroalaEditor && !(window.jQuery && window.jQuery.FroalaEditor))) { if (ta && !ta.value) { ta.value = '\n\n' + h.text; done(); } }   // 편집기 없는 글쓰기 화면이면 글 칸에 바로
      else setTimeout(wait, 300);
    })();
  }

  /* ---------- 5. 화면 ---------- */
  var root, log, input, opened = false, history = get(CHAT_KEY, 'sessionStorage') || [];
  function icon(name) {
    var p = {
      chat: '<path d="M4.5 5.5h15v10.5h-9.5l-5.5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      home: '<path d="M4 11.5 12 5l8 6.5M6.5 10v8.5h11V10"/>',
      send: '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
      arrow: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
      truck: '<path d="M3 7.5h10.5v8.5H3zM13.5 10.5h4l3 3v2.5h-7z"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
      'return': '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M17.8 3.6v3.6h-3.6M6.2 20.4v-3.6h3.6"/>',
      tag: '<path d="M8.5 4.5 12 7l3.5-2.5 4 3-2 3.5-1.5-1v10h-8v-10l-1.5 1-2-3.5z"/>',
      gift: '<path d="M4.5 9.5h15v3h-15zM6 12.5v7h12v-7M12 9.5v10M12 9.5c-1.5-3.5-5-3.5-5-1.5S12 9.5 12 9.5zM12 9.5c1.5-3.5 5-3.5 5-1.5s-5 1.5-5 1.5z"/>',
      card: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17M7 14.5h4"/>',
      user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1-3.5 3.8-5 7-5s6 1.5 7 5"/>',
      help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 1 1 3.2 2.1c-.7.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.6" r=".4"/>',
      robot: '<rect x="4" y="8" width="16" height="11" rx="3.5"/><path d="M12 8V4.8M2 12.5v3M22 12.5v3M9.5 16.3h5"/><circle cx="12" cy="3.8" r="1.1"/><circle cx="9" cy="13.2" r="1.1"/><circle cx="15" cy="13.2" r="1.1"/>',
      bag: '<path d="M5.5 8.5h13l-1 11h-11z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
      heart: '<path d="M12 19.5S4.5 15 4.5 9.6A3.6 3.6 0 0 1 12 8a3.6 3.6 0 0 1 7.5 1.6C19.5 15 12 19.5 12 19.5z"/>',
      clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      ticket: '<path d="M4 7.5h16v3a1.5 1.5 0 0 0 0 3v3H4v-3a1.5 1.5 0 0 0 0-3z"/><path d="M14 7.5v9" stroke-dasharray="1.6 1.8"/>',
      dot: '<circle cx="12" cy="12" r="2.5"/>',
      spark: '<path d="M12 4.5l1.6 4.4 4.4 1.6-4.4 1.6L12 16.5l-1.6-4.4-4.4-1.6 4.4-1.6z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'
    }[name];
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  // 버튼 그림 : 이름(말풍선 · 로봇 …) · 이모지 · 사진 주소. 알 수 없는 이름이면 말풍선
  var FAB_ICON = { '말풍선': 'chat', '로봇': 'robot', '물음표': 'help', '반짝임': 'spark', '반짝이': 'spark', '선물': 'gift', '사람': 'user', '쇼핑백': 'bag', '하트': 'heart', '채팅': 'chat' };
  function fabIconHtml(c) {
    var v = trim(c.fabIcon || BASE.fabIcon);
    if (/^(https?:)?\/\/\S+$|^\/[^\s]+\.(png|jpe?g|webp|gif|svg)(\?\S*)?$/i.test(v)) return { custom: true, html: '<img class="wh-fab__img" src="' + esc(v) + '" alt="">' };
    if (FAB_ICON[v]) return { custom: FAB_ICON[v] !== 'chat', html: icon(FAB_ICON[v]) };
    if (v && v.length <= 4 && !/^[0-9A-Za-z가-힣\s]+$/.test(v)) return { custom: true, html: '<span class="wh-fab__emoji">' + esc(v) + '</span>' };
    return { custom: false, html: icon('chat') };
  }
  // 버튼 모양 · 말풍선 글자를 설정대로 (처음 달 때와 게시판 설정을 읽은 뒤 둘 다)
  function paintFab() {
    if (!fab) return;
    var c = config(), lab = trim(c.fabLabel == null ? BASE.fabLabel : c.fabLabel), ic = fabIconHtml(c);
    var none = !lab || /^(없음|없애기|숨김|끔|off)$/i.test(lab);
    fab.classList.toggle('wh-fab--nolabel', none);
    fab.classList.toggle('wh-fab--custom', !!ic.custom);
    if (!none) fab.style.setProperty('--wh-fab-label', '"' + lab.replace(/["\\\n]/g, ' ') + '"'); else fab.style.removeProperty('--wh-fab-label');
    var chat = fab.querySelector('.wh-fab__i--chat');
    if (chat) chat.innerHTML = ic.html;
    fab.setAttribute('aria-label', c.name || BASE.name);
  }
  function rich(s) {
    return esc(fill(s)).replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  }
  function save() { put(CHAT_KEY, history.slice(-40), 'sessionStorage'); }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function chips(arr, cls) {
    if (!arr || !arr.length) return '';
    return '<div class="wh-chips ' + (cls || '') + '">' + arr.map(function (t) {
      var home = t === HOME;
      return '<button type="button" class="wh-chip' + (home ? ' wh-chip--home' : '') + '" data-ask="' + esc(t) + '">' + (home ? icon('home') : '') + '<span>' + esc(t) + '</span></button>';
    }).join('') + '</div>';
  }
  // 사이트 버튼과 같은 모양 : 검은 알약 + 동그라미 화살표 (첫 버튼만 검정, 나머지는 흰색)
  function linkBtns(arr) {
    if (!arr || !arr.length) return '';
    return '<div class="wh-links">' + arr.map(function (b, i) {
      var ext = /^https?:\/\//.test(b.href) && b.href.indexOf(location.host) < 0;
      return '<a class="wh-btn' + (i ? ' wh-btn--soft' : '') + '" href="' + esc(b.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + (b.kind && TRAIL_ON ? ' data-handoff="' + b.kind + '"' : '') + '>'
        + '<b>' + esc(b.label) + '</b><span class="wh-btn__ic">' + icon('arrow') + '</span></a>';
    }).join('') + '</div>';
  }
  function srcLabel(it) {
    if (!it) return '';
    if (it.src === 'faq') return '자주묻는질문 게시판 글';
    if (it.src === 'main') return '메인 「자주 묻는 질문」';
    if (it.src === 'board') return '쇼핑 도우미 글 · 질문과 답 ' + (it.idx + 1) + '번';
    return '기본 답 (아직 가르치지 않음) · 질문과 답 ' + (it.idx + 1) + '번';
  }
  /* 메뉴 : 「이름 | 설명」 줄 → [{ name, desc, items }]. 질문과 답의 분류가 메뉴 이름과 같으면 그 안에 들어간다.
     게시판 · 메인 자주 묻는 질문은 「자주 묻는 질문」, 분류가 없거나 메뉴에 없는 질문은 「그 밖의 질문」으로 모은다 */
  var MENU_ICON = [[/추천|스타일|코디/, 'spark'], [/배송|택배|출고/, 'truck'], [/교환|반품|환불/, 'return'], [/상품|사이즈|소재|세탁/, 'tag'], [/쿠폰|이벤트|할인|세일/, 'gift'],
    [/주문|결제/, 'card'], [/회원|적립|로그인/, 'user'], [/상담|문의|연결/, 'chat'], [/자주|질문/, 'help']];
  function menus() {
    var c = config(), out = [], by = {};
    list(c.menu).forEach(function (l) {
      var m = l.split('|'), name = trim(m[0]), key = flat(name);
      if (!key || by[key]) return;
      by[key] = { name: name, desc: trim(m.slice(1).join('|')), items: [] };
      out.push(by[key]);
    });
    var etc = [], faq = KB.faq.concat(KB.main);
    c.qna.forEach(function (q) { var g = by[flat(q.cat)]; if (g) g.items.push(q); else etc.push(q); });
    var contact = out.filter(function (g) { return /상담원|연결/.test(g.name); })[0], at = contact ? out.indexOf(contact) : out.length;
    if (faq.length) out.splice(at++, 0, { name: '자주 묻는 질문', desc: '사장님이 정리한 질문 모음', items: faq });
    if (etc.length) out.splice(at, 0, { name: '그 밖의 질문', desc: '', items: etc });
    if (STYLE) out.unshift({ name: styleTitle(), desc: STYLE.desc || '몇 가지만 고르면 어울리는 상품을 골라 드려요', items: [{ q: styleTitle(), style: true }], style: true });   // 스타일 추천은 맨 위
    return out.filter(function (g) { return g.items.length; });
  }
  function menuIcon(name) { for (var i = 0; i < MENU_ICON.length; i++) if (MENU_ICON[i][0].test(name)) return MENU_ICON[i][1]; return 'dot'; }
  /* ---------- 5-1. 첫 인사 · 다시 온 손님 ----------
     다시 온 손님 = 지난 방문에서 30분 넘게 지나 다시 온 브라우저 또는 로그인한 회원 (방문 기록은 이 브라우저에만, 서버로 보내지 않음)
     ① 반겨 주는 카드(지난 방문일 · 몇 번째 방문) ② 지난번 질문을 기억하고 [이어서 물어보기]
     ③ 기억한 상품 2개 : 장바구니 → 관심상품(회원) → 최근 본 상품 순 ④ 재방문 시크릿 쿠폰 : 처음 보여 준 때부터 revisitHours 시간 동안 챗봇 안에서 바로 받기
     ⑤ 쿠폰 이벤트 바로가기 */
  var VISIT_KEY = 'shop-helper-visit', RV_KEY = 'shop-helper-revisit', RV_GOT_KEY = 'shop-helper-revisit-got', PRD_KEY = 'shop-helper-wbprods', VISIT_GAP = 30 * 60000;
  var CALM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // 페이지를 열 때마다 : 마지막으로 본 때에서 30분 넘게 지났으면 새 방문 (처음 쓰는 브라우저는 이동 경로의 마지막 시각을 지난 방문으로)
  function visitTouch() {
    if (EDIT) return;
    var v = get(VISIT_KEY), now = Date.now();
    if (!v) { var tr = trailItems(); v = { n: 1, last: tr.length ? tr[tr.length - 1].t : now }; }
    if (now - v.last > VISIT_GAP) { v.prev = v.last; v.n = (v.n || 1) + 1; v.start = now; }
    if (!v.start) v.start = now;
    v.last = now; put(VISIT_KEY, v);
  }
  function revisitCfg() {
    var c = config(), val = trim(c.revisitValue || BASE.revisitValue), m = val.match(/^([\d,.]+)\s*(%|원)?/);
    return { no: String(c.revisitCoupon || '').replace(/\D/g, ''), value: val, num: m ? parseFloat(m[1].replace(/,/g, '')) : 0, unit: m ? (m[2] || '') : '',
      title: c.revisitTitle || BASE.revisitTitle, desc: c.revisitDesc || '', cond: c.revisitCond || '', hours: parseFloat(c.revisitHours) || 24, link: COUPON };
  }
  // 이번 방문에 쿠폰을 받을 수 있는 마감 시각 : 이번 방문에서 처음 보여 준 때부터 hours 시간
  function revisitUntil(rv) {
    var v = get(VISIT_KEY) || {}, r = get(RV_KEY) || {};
    if (r.visit !== v.start || r.no !== rv.no) { r = { visit: v.start, no: rv.no, until: Date.now() + rv.hours * 3600e3 }; put(RV_KEY, r); }
    return r.until;
  }
  function revisitGot(rv) { var g = get(RV_GOT_KEY); return g && g.no === rv.no ? g : null; }
  function leftTime(until) {
    var t = Math.max(0, Math.floor((until - Date.now()) / 1000)), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(Math.floor(t / 3600)) + ':' + p(Math.floor(t % 3600 / 60)) + ':' + p(t % 60);
  }
  function dayGap(t) { var a = new Date(t), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5); }
  function welcomeHtml(w) {
    var name = isMember() ? memberName() : '', d = new Date(w.prev), g = dayGap(w.prev), rv = revisitCfg();
    var since = g <= 0 ? '오늘 또 와 주셨네요' : g === 1 ? '하루 만에 다시 오셨어요' : g + '일 만에 다시 오셨어요';
    var when = w.prev ? (d.getMonth() + 1) + '월 ' + d.getDate() + '일 이후 ' + since : '오늘도 찾아 주셔서 고마워요';   // 이 브라우저에 지난 방문 기록이 없는 회원
    var ask = w.q || (w.st && STYLE ? RESTYLE : '');
    // 반겨 주는 카드 하나에 : 이름 · 지난 방문 + (있으면) 지난번 질문을 기억해 이어서 묻기
    var h = '<div class="wh-wb"><div class="wh-wb__hero" style="--i:0">'
      + '<div class="wh-wb__top"><span class="wh-wb__av" aria-hidden="true"><i></i>' + icon('heart') + '</span>'
      + '<span class="wh-wb__hi"><small>Welcome back</small><b>' + (name ? esc(name) + '님, ' : '') + '다시 만나 반가워요</b>'
      + '<em>' + when + '</em></span></div>';
    if (ask) h += '<div class="wh-wb__mem"><p data-type>' + (w.q ? '지난번엔 「' + esc(w.q) + '」' + eul(w.q) + ' 물어보셨죠.' : '지난번엔 「' + esc(w.st) + '」 스타일을 추천받으셨죠.') + '</p>'
      + '<button type="button" class="wh-wb__go" data-ask="' + esc(ask) + '">' + (w.q ? '이어서 물어보기' : '다시 추천받기') + icon('arrow') + '</button></div>';
    h += '</div>' + couponHtml(rv) + '<div class="wh-wb__prods" data-wb-prods style="--i:2"></div>';   // 쿠폰은 반겨 주는 카드 바로 밑
    return h + '</div>';
  }
  // 티켓 한 장 : 왼쪽 혜택 숫자 | 가운데 쿠폰 이름 · 남은 시간(받은 뒤엔 쓰는 곳) | 오른쪽 받기 버튼
  function couponHtml(rv, state) {
    if (!rv.no) return '';
    var got = state || (revisitGot(rv) ? 'got' : ''), until = revisitUntil(rv);
    if (!got && until <= Date.now()) return '';
    var info = got ? '<span class="wh-cp__s">' + (got === 'have' ? '이미 받으신 쿠폰이에요 · ' : '') + '주문서에서 바로 쓸 수 있어요</span>'
      : '<span class="wh-cp__s">' + icon('clock') + '<b data-wb-time="' + until + '">' + leftTime(until) + '</b> 남았어요</span>';
    var act = got ? '<a class="wh-cp__btn is-done" href="/order/basket.html">' + icon('check') + '받음</a>'
      : '<button type="button" class="wh-cp__btn" data-wb-coupon>' + '받기' + '</button>';
    return '<div class="wh-cp' + (got ? ' is-got' : '') + '" data-wb-cp style="--i:1" title="' + esc(rv.desc) + '">'
      + '<div class="wh-cp__v"><strong data-count="' + (got ? 0 : rv.num) + '">' + (rv.num ? won(rv.num) : esc(rv.value)) + '</strong>' + (rv.unit ? '<span>' + rv.unit + '</span>' : '') + '</div>'
      + '<div class="wh-cp__t"><small>Secret coupon</small><b>' + esc(rv.title) + '</b>' + (rv.cond ? '<span class="wh-cp__c">' + esc(rv.cond) + '</span>' : '') + info + '</div>'
      + act + '</div>';
  }
  // 쿠폰 받기 : 챗봇 안에서 바로 발급 (세일 쿠폰 뽑기와 같은 카페24 발급 주소). 손님이면 로그인 뒤 이 화면으로 돌아온다
  function claimCoupon(btn) {
    var rv = revisitCfg(), box = btn.closest('.wh-cp'), note = box.querySelector('.wh-cp__note');
    if (!isMember()) { location.href = '/member/login.html?returnUrl=' + encodeURIComponent(location.pathname + location.search); return; }
    btn.disabled = true; btn.textContent = '받는 중…';
    if (note) note.remove();
    fetch('/exec/front/newcoupon/IssueDownload?coupon_no=' + encodeURIComponent(rv.no) + '&opener_url=' + encodeURIComponent(location.href), { credentials: 'same-origin' })
      .then(function (r) { return r.text(); }).then(function (tx) {
        var al = ((/alert\('([^']*)'\)/.exec(tx || '') || [])[1] || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
        var ok = /발급\s*되었/.test(al) && !/불가|실패|초과|이미|없/.test(al), have = /동일인|재발급|초과|이미/.test(al);
        if (ok || have) {
          put(RV_GOT_KEY, { no: rv.no, t: Date.now() });
          var w = document.createElement('div'); w.innerHTML = couponHtml(rv, ok ? 'got' : 'have');
          var nb = w.firstChild; nb.classList.add('is-pop'); box.replaceWith(nb);
          return;
        }
        throw new Error(/운영자/.test(al) ? '관리자 계정은 쿠폰을 받을 수 없어요. 손님 계정으로 확인해 주세요.' : al || '쿠폰을 받지 못했어요. 잠시 뒤 다시 눌러 주세요.');
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = '다시 받기';
        var n = document.createElement('p'); n.className = 'wh-cp__note'; n.textContent = (e && e.message && !/fetch/i.test(e.message)) ? e.message : '쿠폰을 받지 못했어요. 잠시 뒤 다시 눌러 주세요.';
        box.appendChild(n);
      });
  }
  // 기억한 상품 : 장바구니 · 관심상품(회원) 화면의 상품 칸(.prdBox)을 읽고, 모자라면 최근 본 상품으로 채운다 (5분 기억)
  function boxItems(doc, src) {
    var out = [];
    if (!doc) return out;
    [].forEach.call(doc.querySelectorAll('.prdBox'), function (b) {
      var a = b.querySelector('.thumbnail a') || b.querySelector('.prdName a'), img = b.querySelector('.thumbnail img'), no = prodNoOf(a && a.getAttribute('href'));
      var name = txtOf(b.querySelector('.prdName a') || b.querySelector('.prdName')), pr = txtOf(b.querySelector('.price strong') || b.querySelector('.sumPrice strong'));
      if (!name || !no) return;
      out.push({ no: no, n: name, img: img ? img.getAttribute('src') : '', p: /\d/.test(pr) ? pr.replace(/^([\d,]+)$/, '$1원') : '', u: src === 'cart' ? '/order/basket.html' : '/product/detail.html?product_no=' + no, src: src });
    });
    return out;
  }
  function wbProducts() {
    var c = get(PRD_KEY, 'sessionStorage');
    if (c && Date.now() - c.t < 5 * 60000) return Promise.resolve(c.v);
    return Promise.all([pageDoc('/order/basket.html'), isMember() ? pageDoc('/myshop/wish_list.html') : null]).then(function (r) {
      var seen = {}, out = [];
      function add(x) { if (!x || !x.no || !x.n || seen[x.no] || out.length >= 2) return; seen[x.no] = 1; out.push(x); }
      boxItems(r[0], 'cart').forEach(add);
      boxItems(r[1], 'wish').forEach(add);
      trailItems().filter(function (x) { return x.k === 'product'; }).reverse().forEach(function (x) { add({ no: x.no, n: x.n, img: x.img, p: x.p, u: x.u || '/product/detail.html?product_no=' + x.no, src: 'seen' }); });
      put(PRD_KEY, { t: Date.now(), v: out }, 'sessionStorage');
      return out;
    });
  }
  function fillProds(box, anim) {
    if (!box) return;
    wbProducts().then(function (list) {
      if (!list.length) { box.remove(); return; }
      var tag = { cart: '장바구니', wish: '관심상품', seen: '최근 본 상품' };
      // 작은 목록 두 줄 : 사진 · 어디서 기억했는지 · 이름 · 가격
      box.innerHTML = '<p class="wh-wb__h">' + (list.some(function (x) { return x.src === 'cart'; }) ? '담아 두신 상품, 그대로 있어요' : '지난번에 보신 상품이에요') + '</p>'
        + '<div class="wh-wb__list">' + list.map(function (x, i) {
          return '<a class="wh-wb__prd" href="' + esc(x.u) + '" style="--j:' + i + '"><span class="wh-wb__img">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" loading="lazy">' : '') + '</span>'
            + '<span class="wh-wb__t"><small>' + esc(tag[x.src] || '') + '</small><b>' + esc(x.n) + '</b>' + (x.p ? '<em>' + esc(x.p) + '</em>' : '') + '</span>' + icon('arrow') + '</a>';
        }).join('') + '</div>';
      box.classList.add('is-on');
      if (anim) box.classList.add('is-anim');
    }).catch(function () { box.remove(); });
  }
  // 처음 보여 줄 때만 : 차례로 나타나기 · 지난번 질문 타이핑 · 쿠폰 숫자 올라가기
  function animateWelcome(el) {
    var wb = el.querySelector('.wh-wb');
    if (!wb || CALM) return;
    wb.classList.add('is-anim');
    var t = wb.querySelector('[data-type]');
    if (t) {
      var full = t.textContent, i = 0;
      t.textContent = ''; t.classList.add('is-typing');
      setTimeout(function tick() { i += 1; t.textContent = full.slice(0, i); if (i < full.length) setTimeout(tick, 26); else t.classList.remove('is-typing'); }, 520);
    }
    var n = wb.querySelector('[data-count]'), to = n ? parseFloat(n.getAttribute('data-count')) : 0;
    if (n && to) {
      // 시간으로 계산해 창이 가려져 있어도 마지막 숫자에서 멈춘다
      n.textContent = '0';
      setTimeout(function () {
        var t0 = Date.now();
        (function step() { var k = Math.min(1, (Date.now() - t0) / 900), e = 1 - Math.pow(1 - k, 3); n.textContent = won(Math.round(to * e)); if (k < 1) setTimeout(step, 30); })();
      }, 900);
    }
  }
  // 첫 인사 : 도우미 이름 · 아이콘 + 말풍선 (첫 줄은 굵게, 나머지는 작은 안내)
  function helloHtml(o) {
    var c = config();
    return '<div class="wh-hello"><div class="wh-hello__who"><span class="wh-hello__av">' + fabIconHtml(c).html + '</span><b>' + esc(c.name || BASE.name) + '</b><em><i></i>바로 답해 드려요</em></div>'
      + '<div class="wh-hello__bubble"><b>' + rich(o.t) + '</b>' + (o.s ? '<span>' + rich(o.s) + '</span>' : '') + '</div></div>';
  }
  function render(m) {
    var el = document.createElement('div');
    el.className = 'wh-msg wh-msg--' + m.who + (m.menu || m.qs || m.opts || m.cards ? ' wh-msg--list' : '');
    if (m.who === 'me') el.innerHTML = '<p class="wh-bubble">' + esc(m.text) + '</p>';
    else {
      var h = m.hello ? (m.welcome ? welcomeHtml(m.welcome) : '') + helloHtml(m.hello) : m.text ? '<div class="' + (m.menu || m.qs || m.opts || m.cards ? 'wh-lead' : 'wh-bubble') + '">' + rich(m.text) + '</div>' : '';
      // 스타일 추천 : 고를 것 · 상품 카드
      if (m.opts) h += '<div class="wh-menu wh-menu--q">' + m.opts.map(function (o, i) {
        return '<button type="button" class="wh-item" data-style="' + esc(o.v) + '"><span class="wh-item__no">' + String.fromCharCode(65 + i) + '</span><span class="wh-item__t"><b>' + esc(o.label) + '</b></span><span class="wh-item__ic">' + icon('arrow') + '</span></button>';
      }).join('') + '</div>';
      if (m.cards && m.cards.length) h += '<div class="wh-cards">' + m.cards.map(function (c) {
        return '<a class="wh-card" href="' + esc(c.href) + '"><span class="wh-card__img">' + (c.img ? '<img src="' + esc(c.img) + '" alt="" loading="lazy">' : '') + '</span>'
          + '<span class="wh-card__t"><b>' + esc(c.name) + '</b>' + (c.price ? '<small>' + esc(c.price) + '</small>' : '') + '</span></a>';
      }).join('') + '</div>';
      // 상담 넘기기 : 보낼 내용 미리 보기 + 고르기
      if (m.preview) h += '<pre class="wh-preview">' + esc(m.preview) + '</pre>';
      if (m.acts) h += '<div class="wh-links">' + m.acts.map(function (a, i) {
        return '<button type="button" class="wh-btn' + (i ? ' wh-btn--soft' : '') + '" data-handoff-go="' + esc(a.act) + '"><b>' + esc(a.label) + '</b><span class="wh-btn__ic">' + icon('arrow') + '</span></button>';
      }).join('') + '</div>';
      if (m.menu) h += '<div class="wh-menu">' + m.menu.map(function (g, i) {
        return '<button type="button" class="wh-item" data-cat="' + esc(g.name) + '"><span class="wh-item__no">' + (i < 9 ? '0' : '') + (i + 1) + '</span>'
          + '<span class="wh-item__t"><b>' + esc(g.name) + '</b>' + (g.desc ? '<small>' + esc(g.desc) + '</small>' : '') + '</span><span class="wh-item__ic">' + icon('arrow') + '</span></button>';
      }).join('') + '</div>';
      if (m.qs) h += '<div class="wh-menu wh-menu--q">' + m.qs.map(function (q) {
        return '<button type="button" class="wh-item" data-ask="' + esc(q) + '"><span class="wh-item__no wh-item__no--q">Q.</span><span class="wh-item__t"><b>' + esc(q) + '</b></span><span class="wh-item__ic">' + icon('arrow') + '</span></button>';
      }).join('') + '</div>';
      h += linkBtns(m.links) + chips(m.chips, m.chipsCls);
      if (EDIT && m.teach != null) {
        h += '<div class="wh-teach">' + (m.src ? '<span>답 출처 : ' + esc(m.src) + '</span>' : '<span>이 질문은 아직 몰라요</span>')
          + '<button type="button" data-teach="' + esc(m.teach) + '">' + (m.src ? '이 답 고치기' : '이 질문 가르치기') + '</button></div>';
      }
      el.innerHTML = h;
    }
    log.appendChild(el);
    if (m.welcome) {
      fillProds(el.querySelector('[data-wb-prods]'), m.anim);
      if (m.anim) { delete m.anim; save(); animateWelcome(el); }
    }
  }
  // 새 답은 처음부터 보이게 : 답이 창보다 길면 답의 맨 위(바로 앞 내 질문 포함)로, 짧으면 맨 아래로
  // 대화를 시작하면 머리글을 한 줄로 접어 대화 칸을 넓힌다
  function compact() { if (root) root.classList.toggle('is-compact', history.some(function (x) { return x.who === 'me'; })); }
  function push(m) {
    history.push(m); save(); render(m); compact();
    var el = log.lastChild, prev = el && el.previousSibling, top = (prev && prev.classList.contains('wh-msg--me') ? prev : el).offsetTop - 12;
    log.scrollTop = m.who === 'bot' && el.offsetTop + el.offsetHeight - top > log.clientHeight ? top : log.scrollHeight;
  }
  var HOME = '처음 메뉴';
  function menuMsg(text) {
    return { who: 'bot', text: text, menu: menus().map(function (g) { return { name: g.name, desc: g.desc }; }) };
  }
  function greet() {
    var c = config(), m = menuMsg(c.greeting || BASE.greeting), wb = welcomeBack();
    var gl = String(m.text).split('\n'), v = get(VISIT_KEY) || {};
    m.hello = { t: gl[0], s: gl.slice(1).join('\n') };   // 인사말 : 첫 줄은 굵게, 나머지는 작은 안내
    // 다시 온 손님 = 이 브라우저의 지난 방문 기록이 있거나, 로그인한 회원(가입한 적이 있으니 다시 온 손님)
    if (v.prev || isMember()) {   // 반겨 주는 카드 · 지난번 질문 · 기억한 상품 · 시크릿 쿠폰 + 인사는 짧게
      m.welcome = { prev: v.prev || 0, n: v.n || 2, q: (wb && wb.q) || '', st: (wb && wb.st) || '' };
      m.hello = { t: c.backGreeting || BASE.backGreeting, s: gl.slice(1).join('\n') };
      m.anim = 1;
    }
    push(m);
  }
  // 메뉴 하나를 골랐을 때 : 질문이 하나뿐이면 바로 답, 여럿이면 질문 목록
  function openCat(name) {
    push({ who: 'me', text: name });
    var g = menus().filter(function (x) { return x.name === name; })[0];
    if (!g) { push(menuMsg('메뉴가 바뀌었어요. 다시 골라 주세요.')); return; }
    if (g.style) { styleStart(); return; }
    logEvent('menu', g.name);
    if (g.items.length === 1) { push(reply(g.items[0].q, true)); return; }
    push({ who: 'bot', text: '「' + g.name + '」 에서 무엇이 궁금하세요?', qs: g.items.map(function (q) { return q.q; }), chips: [HOME], chipsCls: 'is-home' });
  }
  function catOf(item) {
    var gs = menus();
    for (var i = 0; i < gs.length; i++) if (gs[i].items.indexOf(item) > -1 || gs[i].items.some(function (x) { return flat(x.q) === flat(item.q); })) return gs[i];
    return null;
  }
  function reply(text, quiet) {
    var r = answer(text), c = config(), m = { who: 'bot', teach: text };
    if (r.item) logEvent('q', r.item.q); else logEvent('miss', text);   // 상담 이력
    if (r.item) {
      m.text = r.item.a;
      m.links = buttons(r.item.buttons).concat(r.links || []);
      // 이어서 : 사장님이 적은 「이어서」 → 같은 메뉴의 다른 질문 → 처음 메뉴
      var g = catOf(r.item), same = g ? g.items.map(function (x) { return x.q; }) : [];
      m.chips = String(r.item.next || '').split('/').map(trim).filter(Boolean).concat(r.also || [], same)
        .filter(function (t, i, a) { return a.indexOf(t) === i && flat(t) !== flat(r.item.q); }).slice(0, 4).concat([HOME]);
      m.chipsCls = 'is-next';
      m.src = srcLabel(r.item);
      if (r.item.src === 'base' || r.item.src === 'board') m.teach = r.item.q;
    } else {
      m.text = r.suggest && r.suggest.length ? '이걸 찾으셨나요?' : (c.fallback || BASE.fallback);
      m.qs = r.suggest && r.suggest.length ? r.suggest : null;
      m.chips = (STYLE && /추천|어울|코디|스타일|뭐\s*입|골라/.test(text) ? [styleTitle()] : []).concat(['상담원과 이야기하고 싶어요', HOME]);
      m.links = (r.links || []).concat(r.suggest && r.suggest.length ? [] : buttons('카카오톡 실시간 상담 {상담}'));
    }
    return m;
  }
  // extra : 더 기다릴 일(상품 목록 읽기 등) — 끝나면 그 결과를 fn 에 넘긴다
  function typingThen(fn, extra) {
    var typing = document.createElement('div');
    typing.className = 'wh-msg wh-msg--bot'; typing.innerHTML = '<div class="wh-bubble wh-typing" aria-label="답을 찾는 중"><i></i><i></i><i></i></div>';
    log.appendChild(typing); scroll();
    var wait = new Promise(function (r) { setTimeout(r, 320); });
    Promise.all([loadAll(), wait, extra]).then(function (r) { typing.remove(); fn(r[2]); })
      .catch(function () { typing.remove(); push({ who: 'bot', text: '잠시 문제가 생겼어요. 다시 시도해 주세요.', chips: [HOME], chipsCls: 'is-home' }); });
  }
  function ask(text) {
    text = trim(text);
    if (!text) return;
    if (text === HOME) { push({ who: 'me', text: HOME }); push(menuMsg('다른 궁금한 내용을 골라 주세요.')); return; }
    if (STYLE && (text === RESTYLE || flat(text) === flat(styleTitle()))) { push({ who: 'me', text: text }); styleStart(); return; }
    push({ who: 'me', text: text });
    typingThen(function () { push(reply(text)); });
  }
  function teach(q) {
    put(TEACH_KEY, q, 'sessionStorage');
    var b = document.querySelector('[data-cms="' + NAME + '"]'), btn = b && b.__cmsBtn;
    if (btn) btn.click();
    else location.href = '/?edit=1#helper';
  }
  // 운영 시간 글에서 「평일 10:00 – 17:00」 같은 첫 시간대를 읽어 지금 상담 중인지 (평일 · 주말 표시가 있으면 반영)
  function onAir(hours) {
    var m = String(hours || '').match(/(\d{1,2}):(\d{2})\s*[–~\-]\s*(\d{1,2}):(\d{2})/);
    if (!m) return null;
    var d = new Date(), day = d.getDay(), now = d.getHours() * 60 + d.getMinutes();
    if (/평일/.test(hours) && (day === 0 || day === 6)) return false;
    var lunch = String(hours).match(/점심\s*(\d{1,2}):(\d{2})\s*[–~\-]\s*(\d{1,2}):(\d{2})/);
    if (lunch && now >= lunch[1] * 60 + +lunch[2] && now < lunch[3] * 60 + +lunch[4]) return false;
    return now >= m[1] * 60 + +m[2] && now < m[3] * 60 + +m[4];
  }
  function headHtml(c) {
    var live = onAir(c.hours), brand = brandName();
    return '<div class="wh-head__bar"><span class="wh-head__brand">' + esc((brand ? brand + ' · ' : '') + (c.label || BASE.label)) + '</span>'
      + '<button type="button" class="wh-icon" data-act="home" aria-label="처음 메뉴">' + icon('home') + '</button>'
      + '<button type="button" class="wh-icon" data-act="close" aria-label="닫기">' + icon('close') + '</button></div>'
      + '<p class="wh-head__kicker">' + esc(c.kicker || BASE.kicker) + '</p><h2 class="wh-head__title">' + esc(c.name || BASE.name) + '</h2>'
      + (c.hours ? '<p class="wh-head__status' + (live === true ? ' is-live' : '') + '"><i></i>' + esc(live === true ? '지금 상담 가능' : live === false ? '지금은 상담 시간이 아니에요' : '상담 시간') + '<span>' + esc(c.hours) + '</span></p>' : '');
  }
  function build() {
    var c = config();
    root = document.createElement('div');
    root.className = 'wh'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', c.name || BASE.name);
    root.innerHTML = '<div class="wh-head">' + headHtml(c) + '</div>'
      + (EDIT ? '<div class="wh-edu"><b>교육 모드</b><span>사장님 화면에만 보여요. 물어보고, 모르는 질문은 바로 가르치세요.</span><button type="button" data-act="teach">설정 · 질문과 답 고치기</button></div>' : '')
      + '<div class="wh-log" aria-live="polite"></div>'
      + '<form class="wh-form"><label class="wh-sr" for="wh-in">질문 입력</label><input id="wh-in" type="text" autocomplete="off" maxlength="120" placeholder="' + esc(c.placeholder || BASE.placeholder) + '">'
      + '<button type="submit" aria-label="보내기">' + icon('send') + '</button></form>';
    document.body.appendChild(root);
    log = root.querySelector('.wh-log'); input = root.querySelector('input');
    root.addEventListener('click', function (e) {
      var cb = e.target.closest('[data-wb-coupon]');
      if (cb) { e.preventDefault(); claimCoupon(cb); return; }
      var ho = e.target.closest('a[data-handoff]');
      if (ho) { e.preventDefault(); offerHandoff(ho.getAttribute('data-handoff'), ho.getAttribute('href')); return; }
      // 「사이즈 가이드 보기」처럼 화면 안의 자리(#…)로 가는 버튼 : 같은 화면이면 창을 닫고 그 자리로 내려가고,
      // 다른 화면이면 넘어간 뒤 그 자리로 다시 맞춰 내려간다 (메인은 늦게 그려지는 영역이 많아 처음 위치가 어긋난다)
      var jl = e.target.closest('a.wh-btn[href*="#"]');
      if (jl) {
        var ju = new URL(jl.getAttribute('href'), location.href);
        if (ju.hash && ju.origin === location.origin) {
          if (ju.pathname === location.pathname && document.querySelector(ju.hash)) { e.preventDefault(); toggle(false); jumpTo(ju.hash); return; }
          put(JUMP_KEY, { t: Date.now(), hash: ju.hash }, 'sessionStorage');
        }
      }
      var a = e.target.closest('[data-ask],[data-act],[data-teach],[data-cat],[data-style],[data-handoff-go]');
      if (!a) return;
      if (a.hasAttribute('data-handoff-go')) doHandoff(a.getAttribute('data-handoff-go'));
      else if (a.hasAttribute('data-style')) stylePick(a.getAttribute('data-style'));
      else if (a.hasAttribute('data-cat')) openCat(a.getAttribute('data-cat'));
      else if (a.hasAttribute('data-ask')) ask(a.getAttribute('data-ask'));
      else if (a.hasAttribute('data-teach')) teach(a.getAttribute('data-teach'));
      else if (a.getAttribute('data-act') === 'close') toggle(false);
      else if (a.getAttribute('data-act') === 'teach') teach('');
      else if (a.getAttribute('data-act') === 'home') { history = []; save(); log.innerHTML = ''; compact(); typingThen(greet); }
    });
    root.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; ask(v); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    if (history.length) { history.forEach(render); compact(); } else typingThen(greet);
    // 시크릿 쿠폰 남은 시간 : 창이 열려 있을 때 1초마다, 끝나면 쿠폰 카드를 거둔다
    setInterval(function () {
      if (!opened) return;
      [].forEach.call(root.querySelectorAll('[data-wb-time]'), function (b) {
        var u = +b.getAttribute('data-wb-time');
        if (u <= Date.now()) { var cp = b.closest('.wh-cp'); if (cp) cp.remove(); } else b.textContent = leftTime(u);
      });
    }, 1000);   // 게시판 자주 묻는 질문까지 읽고 메뉴를 그린다
  }
  var fab;
  function toggle(on) {
    if (on == null) on = !opened;
    if (on && !root) build();
    if (!root) return;
    opened = on;
    if (on) { root.hidden = false; requestAnimationFrame(function () { root.classList.add('is-in'); }); }
    else { root.classList.remove('is-in'); setTimeout(function () { if (!opened) root.hidden = true; }, 220); chatLog(); }   // 닫으면 이번 대화를 상담 기록으로
    html.classList.toggle('wh-open', on);
    if (fab) fab.setAttribute('aria-expanded', String(on));
    if (on) { loadAll(); setTimeout(function () { if (window.innerWidth > 640) input.focus(); }, 50); }
    else if (fab) fab.focus();
  }

  /* ---------- 6. 버튼 달기 ---------- */
  function mount() {
    var c = config(), f = document.getElementById('s9Float');
    if ((c.enabled === false && !EDIT) || WHLOG || window.top !== window) return;   // 상담 기록을 쓰는 보이지 않는 창 · 다른 창 안에서는 버튼을 달지 않는다
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'wh-fab' + (f ? ' s9-float__btn s9-float__btn--helper' : ' wh-fab--solo'); fab.setAttribute('data-s9', 'helper');
    fab.setAttribute('aria-label', c.name || BASE.name); fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = '<span class="wh-fab__i wh-fab__i--chat">' + fabIconHtml(c).html + '</span><span class="wh-fab__i wh-fab__i--x">' + icon('close') + '</span><span class="wh-sr">' + esc(c.name || BASE.name) + '</span>';
    fab.addEventListener('click', function (e) { if (html.classList.contains('cms-edit') && e.target.closest('.cms-btn')) return; toggle(); });
    if (f) f.insertBefore(fab, f.firstChild); else document.body.appendChild(fab);   // inter 계열 스킨이면 오른쪽 아래 버튼 줄 맨 위, 아니면 혼자
    paintFab();
    fonts(); theme();
    // 화면 관리 영역이 있는 페이지 : 편집 모드에서 [쇼핑 도우미 고치기]가 막대에 나오도록 (카카오톡 버튼과 같은 방식)
    if (CMS && CMS.board && document.querySelector('[data-cms]')) {
      fab.setAttribute('data-cms', NAME); fab.setAttribute('data-cms-adapter', 'helper'); fab.setAttribute('data-cms-page', '모든 페이지'); fab.setAttribute('data-cms-bar', '');
    }
    // 처음 온 손님에게 한 번만 : 버튼 옆에 「무엇을 도와드릴까요?」 (5초 뒤 사라짐)
    var hintText = c.hint === false ? '' : trim(c.hint == null ? BASE.hint : c.hint);
    if (/^(없음|없애기|숨김|끔|off)$/i.test(hintText)) hintText = '';
    if (hintText && !get('shop-helper-hint', 'sessionStorage') && !EDIT) {
      put('shop-helper-hint', 1, 'sessionStorage');
      setTimeout(function () {
        if (opened) return;
        var t = document.createElement('button'); t.type = 'button'; t.className = 'wh-hint'; t.textContent = hintText;
        t.addEventListener('click', function () { t.remove(); toggle(true); });
        document.body.appendChild(t);
        var r = fab.getBoundingClientRect(); t.style.bottom = (window.innerHeight - r.bottom + r.height / 2 - 18) + 'px'; t.style.right = (window.innerWidth - r.left + 10) + 'px';
        requestAnimationFrame(function () { t.classList.add('is-in'); });
        setTimeout(function () { t.classList.remove('is-in'); setTimeout(function () { t.remove(); }, 400); }, 5000);
      }, 2500);
    }
    if (EDIT && /#helper$/.test(location.hash)) setTimeout(function () { var b = fab.__cmsBtn; if (b) b.click(); }, 1500);
    css();
  }

  /* ---------- 7. 바깥에서 쓰는 것 (inter-cms.js 의 helper 어댑터) ---------- */
  var api = window.SHOP_HELPER = window.INTER_HELPER = {
    version: '1.1',
    config: config,
    // 이동 경로 · 상담 참고 글 (이 브라우저 안에서만)
    trail: function () { return trailItems(); },
    summary: function () { return memberInfo().then(summary); },
    clearTrail: function () { try { localStorage.removeItem(TRAIL_KEY); localStorage.removeItem(STYLE_KEY); } catch (e) {} },
    style: function () { toggle(true); push({ who: 'me', text: styleTitle() }); styleStart(); },
    // 화면 관리 게시판 글을 읽었을 때 : 설정을 바꾸고 이름 · 버튼 글자도 새로
    setBoardConfig: function (o) {
      boardCfg = o; synMap = null;
      var c = config();
      paintFab();
      if (root) { root.querySelector('.wh-head').innerHTML = headHtml(c); root.querySelector('.wh-form input').placeholder = c.placeholder || BASE.placeholder; }
    },
    // [이 질문 가르치기] 로 넘긴 질문 (편집 창 초안 끝에 새 칸으로 붙는다)
    takeTeach: function () { var q = get(TEACH_KEY, 'sessionStorage'); try { store('sessionStorage').removeItem(TEACH_KEY); } catch (e) {} return q; },
    open: function () { toggle(true); },
    ask: function (t) { toggle(true); ask(t); },
    answer: function (t) { return loadAll().then(function () { return answer(t); }); }
  };

  /* ---------- 8. 디자인 (흑백 · Pretendard, 사이트 톤) ---------- */
  // 글꼴 : 페이지에 없을 때만 불러온다 (Pretendard · Jost — 사이트 본문 · 영문 라벨과 같은 글꼴). 설정 fonts: false 면 페이지 글꼴 그대로
  function fonts() {
    if (UC.fonts === false) return;
    var hrefs = Array.from(document.querySelectorAll('link[href]')).map(function (l) { return l.href; }).join(' ');
    function add(h) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); }
    if (!/pretendard/i.test(hrefs)) add('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
    if (!/Jost/.test(hrefs)) add('https://fonts.googleapis.com/css2?family=Jost:wght@500;600&display=swap');
  }
  // 색 : 설정 colors { ink: 진한 색(머리글 · 버튼), soft: 연한 바탕(말풍선), line: 선 } — 기본 흑백
  function theme() {
    var c = UC.colors || {}, st = document.createElement('style');
    st.textContent = '.wh,.wh-fab,.wh-hint{--wh-ink:' + (c.ink || '#111') + ';--wh-on:' + (c.onInk || '#fff') + ';--wh-soft:' + (c.soft || '#f5f5f5') + ';--wh-line:' + (c.line || '#ededed') + '}';
    document.head.appendChild(st);
  }
  function css() {
    if (document.getElementById('wh-css')) return;
    var s = document.createElement('style'); s.id = 'wh-css';
    var E = 'cubic-bezier(.2,.75,.2,1)';
    s.textContent = [
      /* 버튼 (오른쪽 아래 떠 있는 버튼 줄의 맨 위) */
      '.wh-fab{position:relative;display:grid;place-items:center;width:52px;height:52px;padding:0;border:1px solid var(--wh-ink);border-radius:50%;background:var(--wh-ink);color:var(--wh-on);cursor:pointer;box-shadow:0 10px 26px -10px rgba(0,0,0,.45);transition:transform .35s ' + E + '}',
      '.wh-fab:hover{transform:translateY(-2px)}.s9-float__btn--helper{margin-left:-3px}',
      '.wh-fab--solo{position:fixed;right:clamp(12px,1.6vw,24px);bottom:clamp(16px,2vw,32px);z-index:990}',
      '.wh-fab__i{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .25s,transform .35s ' + E + '}',
      '.wh-fab__i--x{opacity:0;transform:rotate(-90deg)}',
      '.wh-fab__img{display:block;width:60%;height:60%;object-fit:contain;border-radius:50%}.wh-fab__emoji{font-size:24px;line-height:1}',
      'html .s9-float__btn--helper.wh-fab--custom .wh-fab__i--chat svg,html .s9-float__btn--helper.wh-fab--custom:hover .wh-fab__i--chat svg{opacity:1!important;transform:none!important}html .s9-float__btn--helper.wh-fab--custom .wh-fab__i--chat::after{display:none!important}',
      '.s9-float__btn--helper.wh-fab--nolabel::before{display:none!important}',
      '.wh-open .wh-fab__i--chat{opacity:0;transform:rotate(90deg)}.wh-open .wh-fab__i--x{opacity:1;transform:none}',
      '.wh-hint{position:fixed;z-index:989;padding:9px 16px;border:1px solid var(--wh-line);border-radius:999px;background:#fff;color:var(--wh-ink);font:600 13px/1.2 "Pretendard Variable",Pretendard,system-ui,sans-serif;letter-spacing:-.01em;box-shadow:0 12px 26px -16px rgba(36,36,36,.35);cursor:pointer;opacity:0;transform:translateX(8px);transition:opacity .35s,transform .45s ' + E + '}',
      '.wh-hint.is-in{opacity:1;transform:none}',
      /* 창 */
      '.wh{position:fixed;right:clamp(12px,1.6vw,24px);bottom:calc(clamp(16px,2vw,32px) + 66px);z-index:1001;width:392px;height:min(660px,calc(100vh - 130px));display:flex;flex-direction:column;',
      'background:#fff;color:var(--wh-ink);border-radius:24px;box-shadow:0 30px 80px -24px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.06);overflow:hidden;',
      'font:14px/1.6 "Pretendard Variable",Pretendard,system-ui,sans-serif;letter-spacing:-.015em;opacity:0;transform:translateY(14px) scale(.97);transform-origin:100% 100%;transition:opacity .22s,transform .4s ' + E + '}',
      '.wh.is-in{opacity:1;transform:none}.wh[hidden]{display:none}',
      '.wh *{box-sizing:border-box}',
      /* 머리글 : 검정 · 세리프 이탤릭 소제목 · 굵은 한글 제목 (사이트 섹션 머리와 같은 순서) */
      '.wh-head{flex:none;padding:16px 16px 22px 24px;background:var(--wh-ink);color:var(--wh-on);transition:padding .35s ' + E + '}',
      '.wh-head__bar{display:flex;align-items:center;gap:2px}',
      '.wh-head__brand{flex:1;min-width:0;font:500 10.5px/1 Jost,Archivo,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wh-icon{flex:none;width:36px;height:36px;border:0;border-radius:50%;background:none;color:inherit;display:grid;place-items:center;cursor:pointer;transition:background .2s}.wh-icon:hover{background:rgba(255,255,255,.12)}',
      '.wh-icon svg{width:18px;height:18px}',
      '.wh-head__kicker{margin:18px 0 4px;font:500 18px/1.2 Jost,"Pretendard Variable",Pretendard,sans-serif;letter-spacing:-.01em;color:rgba(255,255,255,.72);letter-spacing:0;transition:all .35s ' + E + '}',
      '.wh-head__title{margin:0;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-.03em;color:var(--wh-on);transition:all .35s ' + E + '}',
      '.wh-head__status{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin:12px 0 0;font-size:12px;color:rgba(255,255,255,.75)}',
      '.wh-head__status i{width:7px;height:7px;border-radius:50%;border:1.5px solid rgba(255,255,255,.6)}.wh-head__status.is-live i{background:#fff;border-color:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.14)}',
      '.wh-head__status span{color:rgba(255,255,255,.5)}.wh-head__status span::before{content:"·";margin-right:8px}',
      /* 대화를 시작하면 한 줄로 */
      '.wh.is-compact .wh-head{padding-bottom:12px}',
      '.wh.is-compact .wh-head__kicker{margin:0;height:0;opacity:0;overflow:hidden}',
      '.wh.is-compact .wh-head__title{font-size:15px;margin-top:6px}',
      '.wh.is-compact .wh-head__status{margin-top:4px}',
      '.wh-edu{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;padding:10px 20px;background:var(--wh-soft);border-bottom:1px solid var(--wh-line);font-size:12px;line-height:1.5;color:#242424}',
      '.wh-edu b{font:500 10.5px/1 Jost,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--wh-ink)}',
      '.wh-edu button{padding:4px 12px;border:1px solid var(--wh-ink);border-radius:999px;background:var(--wh-ink);color:var(--wh-on);font:600 12px/1.4 inherit;cursor:pointer}',
      /* 대화 */
      '.wh-log{position:relative;flex:1;overflow-y:auto;padding:22px 20px 10px;overscroll-behavior:contain;background:#fff;scrollbar-width:thin}',
      '.wh-msg{display:flex;flex-direction:column;align-items:flex-start;margin:0 0 16px;animation:wh-up .45s ' + E + '}',
      '@keyframes wh-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '.wh-msg--me{align-items:flex-end}',
      '.wh-bubble{max-width:88%;margin:0;padding:12px 16px;border-radius:18px 18px 18px 6px;background:var(--wh-soft);color:var(--wh-ink);word-break:keep-all;overflow-wrap:anywhere}',
      '.wh-msg--me .wh-bubble{border-radius:18px 18px 6px 18px;background:var(--wh-ink);color:var(--wh-on)}',
      '.wh-bubble a{color:inherit;text-decoration:underline;text-underline-offset:3px}.wh-bubble em{font-family:inherit;font-style:normal;font-weight:600}',
      /* 첫 인사 */
      '.wh-hello{margin:2px 0 16px}',
      '.wh-hello__who{display:flex;align-items:center;gap:8px;margin:0 0 8px}',
      '.wh-hello__av{position:relative;flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--wh-ink);color:var(--wh-on)}.wh-hello__av svg{width:15px;height:15px}.wh-hello__av .wh-fab__emoji{font-size:15px}.wh-hello__av .wh-fab__img{width:70%;height:70%}',
      '.wh-hello__who b{font-size:13px;font-weight:600;letter-spacing:-.02em;color:var(--wh-ink)}',
      '.wh-hello__who em{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-size:11.5px;color:#8a8a8a}.wh-hello__who em i{width:6px;height:6px;border-radius:50%;background:#2fb36b;box-shadow:0 0 0 3px rgba(47,179,107,.15)}',
      '.wh-hello__bubble{display:inline-block;max-width:92%;padding:14px 18px;border-radius:6px 20px 20px 20px;background:var(--wh-soft);color:var(--wh-ink);word-break:keep-all}',
      '.wh-hello__bubble b{display:block;font-size:15.5px;font-weight:600;line-height:1.5;letter-spacing:-.03em}.wh-hello__bubble em{font-style:normal}',
      '.wh-hello__bubble span{display:block;margin-top:3px;font-size:13.5px;line-height:1.6;color:#6f6f6f}',
      /* 다시 온 손님 : 반겨 주는 카드 · 기억한 상품 목록 · 시크릿 쿠폰 티켓 */
      '.wh-wb{display:flex;flex-direction:column;gap:10px;margin:0 0 20px}',
      '.wh-wb.is-anim>*{animation:wh-wb-in .7s cubic-bezier(.2,.75,.2,1) both;animation-delay:calc(var(--i,0) * 180ms)}',
      '@keyframes wh-wb-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
      '.wh-wb__hero{padding:16px;border-radius:18px;background:var(--wh-soft)}',
      '.wh-wb__top{display:flex;align-items:center;gap:13px}',
      '.wh-wb__av{position:relative;flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--wh-ink);color:var(--wh-on)}.wh-wb__av svg{position:relative;width:18px;height:18px;fill:currentColor}',
      '.wh-wb__av i{position:absolute;inset:-4px;border-radius:50%;background:conic-gradient(from 0deg,var(--wh-ink) 0 22%,transparent 50% 100%);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 1.5px),#000 calc(100% - 1px));mask:radial-gradient(farthest-side,transparent calc(100% - 1.5px),#000 calc(100% - 1px));animation:wh-spin 3s linear infinite}',
      '.wh-wb.is-anim .wh-wb__av svg{animation:wh-beat 1.1s ease .5s 2}',
      '@keyframes wh-spin{to{transform:rotate(360deg)}}@keyframes wh-beat{0%,100%{transform:scale(1)}30%{transform:scale(1.2)}55%{transform:scale(.94)}}',
      '.wh-wb__hi{min-width:0}.wh-wb__hi small{display:block;font:500 10px/1 Jost,"Pretendard Variable",Pretendard,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#8a8a8a}',
      '.wh-wb__hi b{display:block;margin-top:5px;font-size:16px;font-weight:700;line-height:1.35;letter-spacing:-.035em;color:var(--wh-ink);word-break:keep-all}',
      '.wh-wb__hi em{display:block;margin-top:2px;font-style:normal;font-size:12px;color:#808080}',
      '.wh-wb__mem{margin-top:14px;padding-top:13px;border-top:1px solid rgba(0,0,0,.07)}',
      '.wh-wb__mem p{margin:0 0 10px;min-height:1.6em;font-size:14px;line-height:1.6;letter-spacing:-.02em;color:var(--wh-ink);word-break:keep-all}',
      '.wh-wb__mem p.is-typing::after{content:"";display:inline-block;width:1.5px;height:1em;margin-left:2px;vertical-align:-2px;background:var(--wh-ink);animation:wh-caret .8s steps(1) infinite}@keyframes wh-caret{50%{opacity:0}}',
      '.wh-wb__go{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px 0 14px;border:1px solid var(--wh-ink);border-radius:999px;background:transparent;color:var(--wh-ink);font:600 12.5px/1 inherit;cursor:pointer;transition:background .25s,color .25s}',
      '.wh-wb__go:hover{background:var(--wh-ink);color:var(--wh-on)}.wh-wb__go svg{width:14px;height:14px}',
      '.wh-wb__prods:empty{display:none}.wh-wb__h{margin:6px 4px 8px;font-size:12.5px;font-weight:600;letter-spacing:-.01em;color:#767676}',
      '.wh-wb__list{border:1px solid var(--wh-line);border-radius:16px;overflow:hidden;background:#fff}',
      '.wh-wb__prd{display:flex;align-items:center;gap:12px;padding:10px 14px 10px 10px;color:var(--wh-ink);text-decoration:none;transition:background .25s}.wh-wb__prd+.wh-wb__prd{border-top:1px solid var(--wh-line)}.wh-wb__prd:hover{background:var(--wh-soft)}',
      '.wh-wb__prods.is-anim .wh-wb__prd{animation:wh-wb-in .55s cubic-bezier(.2,.75,.2,1) both;animation-delay:calc(var(--j,0) * 120ms + 300ms)}',
      '.wh-wb__img{flex:none;width:52px;height:52px;border-radius:10px;overflow:hidden;background:var(--wh-soft)}.wh-wb__img img{display:block;width:100%;height:100%;object-fit:cover}',
      '.wh-wb__t{flex:1;min-width:0}.wh-wb__t small{display:block;font-size:11px;color:#8a8a8a}',
      '.wh-wb__t b{display:block;margin-top:1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:13.5px;font-weight:500;letter-spacing:-.02em}',
      '.wh-wb__t em{display:block;margin-top:2px;font-style:normal;font-size:13px;font-weight:700}',
      '.wh-wb__prd>svg{flex:none;width:16px;height:16px;color:#9a9a9a}',
      /* 시크릿 쿠폰 티켓 */
      '.wh-cp{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:0 14px;padding:14px 14px 14px 0;border-radius:16px;background:linear-gradient(120deg,#9a8471,#75614f);color:#fff;overflow:hidden;isolation:isolate}',
      '.wh-cp::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.13) 50%,transparent 62%);transform:translateX(-120%);animation:wh-shine 4.5s ease-in-out 1.5s infinite;pointer-events:none}',
      '@keyframes wh-shine{0%{transform:translateX(-120%)}30%,100%{transform:translateX(120%)}}',
      '.wh-cp__v{position:relative;flex:none;align-self:stretch;display:flex;align-items:center;justify-content:center;width:88px;margin:-14px 0;padding:14px 0;border-right:1.5px dashed rgba(255,255,255,.28)}',
      '.wh-cp__v::before,.wh-cp__v::after{content:"";position:absolute;right:-8px;width:14px;height:14px;border-radius:50%;background:#fff}.wh-cp__v::before{top:-7px}.wh-cp__v::after{bottom:-7px}',
      '.wh-cp__v strong{font:600 30px/1 Jost,"Pretendard Variable",Pretendard,sans-serif;letter-spacing:-.03em}.wh-cp__v span{padding-top:7px;font:600 16px/1 Jost,"Pretendard Variable",Pretendard,sans-serif}',
      '.wh-cp__t{flex:1;min-width:0}.wh-cp__t small{display:block;font:500 9.5px/1 Jost,"Pretendard Variable",Pretendard,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55)}',
      '.wh-cp__t b{display:block;margin-top:5px;font-size:14px;font-weight:700;letter-spacing:-.03em}',
      '.wh-cp__c{display:block;margin-top:2px;font-size:11px;color:rgba(255,255,255,.55)}',
      '.wh-cp__s{display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11.5px;color:rgba(255,255,255,.7)}.wh-cp__s svg{width:13px;height:13px}.wh-cp__s b{margin:0;font:600 12.5px/1 Jost,monospace;font-variant-numeric:tabular-nums;letter-spacing:.03em;color:#fff}',
      '.wh-cp__btn{flex:none;display:inline-flex;align-items:center;gap:4px;height:36px;padding:0 16px;border:0;border-radius:999px;background:#fff;color:#5e4d3f;font:700 13px/1 inherit;text-decoration:none;cursor:pointer;transition:transform .25s}.wh-cp__btn:hover{transform:scale(1.05)}.wh-cp__btn:disabled{opacity:.6;cursor:default;transform:none}',
      '.wh-cp__btn.is-done{padding:0 14px 0 10px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff}.wh-cp__btn svg{width:15px;height:15px}',
      '.wh-cp.is-pop{animation:wh-pop .5s cubic-bezier(.2,.9,.3,1.4)}@keyframes wh-pop{40%{transform:scale(1.025)}}',
      '.wh-cp__note{flex-basis:100%;margin:10px 0 0 16px;font-size:12px;color:rgba(255,255,255,.75)}',
      '@media (prefers-reduced-motion:reduce){.wh-wb *,.wh-cp,.wh-cp::after,.wh-wb__av i{animation:none!important;transition:none!important}}',
      '.wh-lead{margin:0 0 4px;font-size:14px;line-height:1.65;color:#242424;word-break:keep-all}',
      /* 메뉴 · 질문 목록 : 번호 · 얇은 선 · 동그라미 화살표 */
      '.wh-msg--list{align-items:stretch}',
      '.wh-menu{display:flex;flex-direction:column;margin:10px 0 0;border-top:1px solid var(--wh-ink)}',
      '.wh-item{display:flex;align-items:center;gap:14px;width:100%;padding:15px 2px 15px 0;border:0;border-bottom:1px solid var(--wh-line);background:none;color:var(--wh-ink);text-align:left;font:inherit;cursor:pointer}',
      '.wh-item__no{flex:none;width:22px;font:500 11px/1 Jost,sans-serif;letter-spacing:.06em;color:#9a9a9a;transition:color .25s}',
      '.wh-item__no--q{font:500 15px/1 Jost,sans-serif;letter-spacing:0;color:var(--wh-ink)}',
      '.wh-item__t{flex:1;min-width:0}.wh-item__t b{display:block;font-size:15px;font-weight:600;line-height:1.4;letter-spacing:-.02em}',
      '.wh-item__t small{display:block;margin-top:3px;font-size:12px;line-height:1.45;color:#8a8a8a}',
      '.wh-item__ic{flex:none;width:32px;height:32px;border-radius:50%;border:1px solid var(--wh-line);display:grid;place-items:center;transition:background .3s,border-color .3s,color .3s,transform .45s ' + E + '}',
      '.wh-item__ic svg{width:14px;height:14px}',
      '.wh-item:hover .wh-item__ic,.wh-item:focus-visible .wh-item__ic{background:var(--wh-ink);border-color:var(--wh-ink);color:var(--wh-on);transform:rotate(45deg)}',
      '.wh-item:hover .wh-item__no{color:var(--wh-ink)}',
      '.wh-menu--q .wh-item{padding:13px 2px 13px 0}.wh-menu--q .wh-item__t b{font-weight:500}',
      /* 바로가기 버튼 : 사이트 .cz-btn 과 같은 모양 */
      '.wh-links{display:flex;flex-direction:column;gap:8px;width:88%;margin-top:10px}',
      '.wh-btn{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:5px 5px 5px 20px;border:1.5px solid var(--wh-ink);border-radius:999px;background:var(--wh-ink);color:var(--wh-on)!important;text-decoration:none!important;transition:transform .35s ' + E + ',box-shadow .35s}',
      '.wh-btn b{font-size:13.5px;font-weight:600;letter-spacing:-.02em}',
      '.wh-btn__ic{flex:none;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.16);display:grid;place-items:center;transition:transform .45s ' + E + '}.wh-btn__ic svg{width:15px;height:15px}',
      '.wh-btn:hover{transform:translateY(-2px);box-shadow:0 12px 26px -16px rgba(36,36,36,.45)}.wh-btn:hover .wh-btn__ic{transform:rotate(45deg)}',
      '.wh-btn--soft{background:#fff;color:var(--wh-ink)!important;border-color:rgba(36,36,36,.14)}.wh-btn--soft .wh-btn__ic{background:var(--wh-line)}',
      /* 이어서 물어보기 */
      '.wh-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;max-width:100%}',
      '.wh-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d9d9d9;border-radius:999px;background:#fff;color:var(--wh-ink);font:500 13px/1.3 inherit;letter-spacing:-.02em;cursor:pointer;transition:border-color .2s,background .2s,color .2s}',
      '.wh-chip:hover{border-color:var(--wh-ink)}',
      '.wh-chip--home{border-color:var(--wh-ink)}.wh-chip--home:hover{background:var(--wh-ink);color:var(--wh-on)}.wh-chip--home svg{width:14px;height:14px}',
      /* 스타일 추천 상품 카드 (2열) · 상담 넘기기 미리 보기 */
      '.wh-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}',
      '.wh-card{display:flex;flex-direction:column;border:1px solid var(--wh-line);border-radius:14px;overflow:hidden;background:#fff;color:var(--wh-ink)!important;text-decoration:none!important;transition:transform .35s ' + E + ',box-shadow .35s}',
      '.wh-card:hover{transform:translateY(-2px);box-shadow:0 14px 26px -18px rgba(36,36,36,.45)}',
      '.wh-card__img{display:block;aspect-ratio:4/5;background:var(--wh-soft)}.wh-card__img img{display:block;width:100%;height:100%;object-fit:cover}',
      '.wh-card__t{display:block;padding:9px 11px 11px}.wh-card__t b{display:block;font-size:12.5px;font-weight:600;line-height:1.4;letter-spacing:-.02em;word-break:keep-all}',
      '.wh-card__t small{display:block;margin-top:3px;font:600 12.5px/1.3 inherit;color:var(--wh-ink)}',
      '.wh-preview{width:100%;max-height:190px;overflow:auto;margin:10px 0 0;padding:12px 14px;border:1px solid var(--wh-line);border-radius:12px;background:var(--wh-soft);font:12px/1.6 "Pretendard Variable",Pretendard,system-ui,sans-serif;color:#3a3a3a;white-space:pre-wrap;word-break:keep-all}',
      'button.wh-btn{width:100%;font:inherit;text-align:left;cursor:pointer}',
      '.wh-typing{display:flex;gap:4px;padding:15px 16px}.wh-typing i{width:6px;height:6px;border-radius:50%;background:#9a9a9a;animation:wh-dot 1s infinite}.wh-typing i:nth-child(2){animation-delay:.15s}.wh-typing i:nth-child(3){animation-delay:.3s}',
      '@keyframes wh-dot{0%,80%,100%{opacity:.3;transform:none}40%{opacity:1;transform:translateY(-3px)}}',
      '.wh-teach{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:#8a8a8a}',
      '.wh-teach button{padding:3px 10px;border:1px dashed var(--wh-ink);border-radius:999px;background:#fff;color:var(--wh-ink);font:600 11px/1.4 inherit;cursor:pointer}',
      /* 입력 */
      '.wh-form{flex:none;display:flex;gap:8px;padding:12px 14px 14px;border-top:1px solid var(--wh-line);background:#fff}',
      '.wh .wh-form #wh-in{flex:1;min-width:0;width:auto;height:46px!important;margin:0;padding:0 18px!important;border:1px solid var(--wh-line)!important;border-radius:999px!important;background:var(--wh-soft)!important;box-shadow:none!important;outline:none!important;-webkit-appearance:none;appearance:none;font-family:inherit;font-size:16px!important;line-height:1.4;color:var(--wh-ink);transition:border-color .2s,background .2s}',
      '.wh .wh-form #wh-in::placeholder{color:#9a9a9a}',
      '.wh .wh-form #wh-in:focus{border-color:var(--wh-ink)!important;background:#fff!important;box-shadow:none!important}',
      '.wh-form button{flex:none;width:46px;height:46px;border:0;border-radius:50%;background:var(--wh-ink);color:var(--wh-on);display:grid;place-items:center;cursor:pointer;transition:transform .35s ' + E + '}.wh-form button:hover{transform:translateY(-2px)}',
      '.wh-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
      '@media (max-width:640px),(max-height:560px){.wh{inset:auto 0 0 0;top:0;width:auto;height:100vh;height:100dvh;border-radius:0;transform:translateY(24px)}.wh.is-in{transform:none}.wh-open body{overflow:hidden}',
      '.wh-head{padding-top:max(14px,env(safe-area-inset-top))}.wh-form{padding-bottom:max(14px,env(safe-area-inset-bottom))}.wh-links{width:100%}.wh-hint{display:none}}',
      '@media (max-width:420px){.wh.is-compact .wh-head__status span{display:none}}',
      '@media (max-height:560px){.wh-head__kicker{display:none}.wh-head{padding-bottom:12px}.wh-head__title{font-size:16px;margin-top:4px}.wh-head__status{margin-top:4px}}',
      '@media (prefers-reduced-motion:reduce){.wh,.wh-msg,.wh-typing i,.wh-item__ic,.wh-btn,.wh-btn__ic{animation:none!important;transition:none!important}}'
    ].join('');
    document.head.appendChild(s);
  }

  // 본문 맨 끝(플로팅 버튼 다음)에서 불러오므로 바로 단다 — inter-cms.js 가 DOMContentLoaded 에 영역을 훑기 전에 버튼이 있어야 한다
  if (TRACK || ADMIN) { /* 기록만 · 관리자 페이지 : 챗봇 창을 띄우지 않는다 */ } else if (document.getElementById('s9Float') || document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
  // 이동 경로 남기기 · 문의 글쓰기에 상담 참고 글 넣기 (상품 이름 등이 그려진 뒤)
  function later() {
    try {
      if (ADMIN) { adminApp(); return; }   // 관리자 페이지
      if (WHLOG) { writeLog(); return; }
      if (window.top !== window) return;   // 보이지 않는 창(화면 관리 저장 등)에서는 남기지 않는다
      try { logView(); } catch (e) {}   // 상담 기록 게시판이면 한눈에 보이게
      try { visitTouch(); } catch (e) {}   // 다시 온 손님 (이동 경로를 남기기 전에)
      record(); prefill(); jumpOnLoad();
      try { qnaWatch(); qnaSend(); } catch (e) {}   // 상품 문의 글
      // 문의 남기기로 넘어온 뒤 상담 기록 남기기 · 저장 중에 화면을 옮겨 [등록]까지 못 간 기록 (한 번만 다시)
      var Q = logQueue(), go = [];
      if (SHEET) {   // 시트 저장소를 쓰면 : 게시판에 못 올라가고 남은 기록을 시트로 보낸다
        Q.filter(function (x) { return !x.sent; }).forEach(function (x) {
          var sj = parseSubject(x.subject) || {}, lg = parseLog(x.text) || {};
          sendSheet({ type: 'log', id: x.id, kind: ({ '카카오톡': 'talk', '챗봇': 'chat', '주문서': 'order', '결제 완료': 'paid', '상품 문의': 'qna' })[sj.ch] || 'ask', subject: x.subject, name: sj.name || '', uid: sj.id || '', phone: lg.phone || '', email: lg.email || '', text: x.text });
        });
        put(LOG_KEY, []); Q = [];
      }
      Q.forEach(function (x) { if (x.sent) return; if (x.pending) { x.pending = false; go.push(x.id); } else if (!x.retried && Date.now() - x.t > 3000) { x.retried = true; go.push(x.id); } });   // 앞 화면의 저장 창은 화면을 옮기면서 닫혔다
      if (go.length) { put(LOG_KEY, Q); go.forEach(function (id, i) { setTimeout(function () { logFrame(id); }, i * 4000); }); }
      var P = chatPending(); if (P) chatLogLater(Math.max(5000, 90000 - (Date.now() - P.e)));   // 앞 화면에서 묻고 넘어온 대화
      if (/^\/order\/orderform/.test(location.pathname)) setTimeout(function () { orderLog('order'); }, 2000);   // 주문서까지 온 회원
      if (/^\/order\/order_result/.test(location.pathname)) setTimeout(function () { orderLog('paid'); }, 1500);   // 결제 완료
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
}());

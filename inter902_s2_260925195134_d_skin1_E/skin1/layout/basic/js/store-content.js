/* ==========================================================================
   STORE CONTENT — 구매자 콘텐츠 설정 파일                       BUYER EDITABLE
   --------------------------------------------------------------------------
   이 파일 하나에서 메인·SALE 페이지의 브랜드명, 로고, 문구, 버튼, 링크, 이미지, 영상을 바꿉니다.
   디자인(크기·여백·글꼴·색·애니메이션)은 CSS 가 정하므로 이 파일로는 바뀌지 않습니다.

   [규칙]
   1) 따옴표 안의 값만 바꾸세요. 항목 이름(왼쪽)과 쉼표, 중괄호는 지우지 마세요.
   2) 문구 안에 {brand} 라고 쓰면 brand.name 으로 자동 치환됩니다.
   3) 문구를 '' (빈칸) 으로 두면 그 문구 자리가 사라집니다.
      링크·이미지·영상을 '' 로 두면 HTML 에 들어 있는 기본값이 그대로 쓰입니다.
   4) 항목 이름을 지우거나 오타를 내면 그 자리는 HTML 기본값(샘플)이 보입니다.
   5) 줄바꿈이 필요한 문구는 <br> 을 씁니다. (…Html 로 끝나는 항목만 HTML 을 허용)
   6) 이미지 경로는  /SkinImg/img/st/파일명.jpg  또는  카페24 파일업로더 주소(https://…)  를 씁니다.
   7) 영상(mp4)은 카페24 스킨 폴더에서 차단되므로 GitHub + jsDelivr 등 외부 주소를 씁니다.
      예) https://cdn.jsdelivr.net/gh/깃허브아이디/저장소명@main/파일명.mp4

   [이 파일로 바꿀 수 없는 것 — 카페24 관리자에서 바꿉니다]
   · 상품(이미지·이름·가격·품절·링크), 상품분류(메뉴), 메인 상품 진열
   · 쇼핑몰 이름, 고객센터, 사업자 정보, 주소 (푸터 하단)
   · 최상단 띠배너, ON STORE 배너 6장, 팝업 지도 블록 (스마트디자인 편집창)
   자세한 방법은 프로젝트 루트의 BUYER-GUIDE.md 를 보세요.
   ========================================================================== */
window.STORE_CONTENT = {

	/* ---------------------------------------------------------------------
	   1. 브랜드                                                 BUYER EDITABLE
	   --------------------------------------------------------------------- */
	brand: {
		name: 'inter',                    // 영문 브랜드명 (로고 alt, 문구의 {brand})
		logo: '/SkinImg/img/studio9/logo-studio9.png',   // 헤더·푸터 로고 (가로형 PNG, 배경 투명)
		instagramHandle: '@studio9_official' // SALE 페이지 REAL LOOK 의 인스타그램 계정 표시
	},

	/* 상단·모바일·푸터 카테고리 메뉴는 카페24 상품분류를 자동으로 읽습니다.
	   기본값 1 = 최상위 분류(최대 6개). 특정 분류의 하위만 보이려면 그 분류 번호를 넣으세요. */
	menu: {
		parentCateNo: 1,
		saleBadge: '50%',  // 상단 메뉴 SALE 위 말풍선 글자 (비우면 50%)
		editorial: true    // true 면 코드에 적어 둔 고정 메뉴, false 면 관리자 대분류로 메뉴를 만든다
	},

	/* 상단 메뉴 맨 끝의 COMMUNITY — 마우스를 올리면 게시판 4개가 드롭다운으로 나옵니다.  BUYER EDITABLE
	   COMMUNITY 글자 자체는 클릭이 안 되고(게시판 메인 페이지를 안 쓰므로), 드롭다운 항목만 이동합니다.
	   link 는 카페24 관리자(게시판 → 게시판 관리)에서 실제 확인한 이 쇼핑몰의 게시판 주소입니다.
	   - 공지사항(board_no=1), 자주묻는질문="이용안내 FAQ"(board_no=3) → 둘 다 board/free 스킨
	   - 포토리뷰="상품 사용후기"(board_no=4), 상품문의="상품 Q&A"(board_no=6) → 둘 다 board/product 스킨
	   게시판을 새로 만들거나 지우면 board_no 가 달라지니, 그때는 관리자에서 다시 확인해서 바꾸세요.
	   항목을 지우면(배열을 비우면) COMMUNITY 메뉴 자체가 나오지 않습니다. */
	community: {
		label: '커뮤니티',             // 상단 메뉴에 뜨는 글자 (마우스를 올리면 아래 게시판들이 펼쳐짐)
		items: [
			{ label: '공지사항',     link: '/board/product/list.html?board_no=1' },
			{ label: '자주묻는질문', link: '/board/product/list.html?board_no=3' },
			{ label: '상품문의',     link: '/board/product/list.html?board_no=6' }
		]
	},

	/* ---------------------------------------------------------------------
	   1-1. 게시판 화면 관리 (메인 화면의 사진·글자를 게시판 글로 바꾸기)    BUYER EDITABLE
	   메인 주소 뒤에 ?edit=1 을 붙여 열면(예: 내쇼핑몰.cafe24.com/?edit=1) 영역마다 [고치기] 버튼이 나옵니다.
	   boardNo : 화면 관리에 쓸 게시판 번호. 기본 2 = 카페24 기본 게시판 '뉴스/이벤트'(관리자만 글쓰기).
	             뉴스/이벤트 게시판을 다른 용도로 쓰고 있다면, 관리자만 글쓰기로 만든 다른 게시판 번호를 넣으세요.
	             0 이면 화면 관리를 끄고 HTML 기본값만 씁니다.
	   cacheMinutes : 방문자 브라우저가 게시판 목록을 다시 확인하는 간격(분). 새 글은 이 시간 안에, 이미 있던 글을 고친 내용은 늦어도 30분 안에 모두에게 보입니다.
	                  (관리자는 ?edit=1 편집 모드로 열면 항상 바로 보입니다. 너무 줄이면 카페24가 잦은 요청으로 접속을 잠시 막을 수 있어요)
	   --------------------------------------------------------------------- */
	cms: {
		boardNo: 2,
		cacheMinutes: 10,
		titlePrefix: '[메인 화면]'
	},

	/* ---------------------------------------------------------------------
	   2. SNS 링크 (푸터 FOLLOW US)                              BUYER EDITABLE
	   '' 이면 스마트디자인 편집창(푸터)에서 지정한 주소가 쓰입니다.
	   --------------------------------------------------------------------- */
	social: {
		instagram: '',
		/* ── 메인 하단 인스타그램 사진 ──  아래 셋 중 하나만 설정하면 됩니다. 모두 비우면 샘플 사진이 나옵니다.

		   [기본·추천] instagramFeed : Behold 피드 주소
		     1) behold.so 가입 → Instagram 계정 연결(승인) → 피드 만들기
		     2) 발급된 'JSON 피드 주소'를 아래에 붙여 넣기 → 최신 게시물이 자동으로 바뀝니다 (토큰 관리·갱신은 Behold 가 해 줍니다)
		     예) instagramFeed: 'https://feeds.behold.so/발급받은ID'
		   [직접 지정] instagramPhotos : 고른 사진을 최대 9장 지정 (자동 갱신 없음)
		     예) [{img:'/web/insta/1.jpg', link:'https://www.instagram.com/p/게시물ID/'}, ...]
		   [고급] instagramToken : 본인 인스타 계정(프로페셔널)의 액세스 토큰을 직접 넣는 방식
		     Meta 개발자센터에서 앱을 만들어 발급하고 60일마다 직접 갱신해야 합니다. 특별한 이유가 없으면 Behold 를 쓰세요.
		   ※ 계정 주인이 승인한 계정만 불러올 수 있습니다. 남의 계정 주소만으로는 사진이 나오지 않습니다. */
		instagramFeed: '',
		instagramToken: '',
		instagramPhotos: [],
		youtube: '',
		facebook: ''
	},

	/* ---------------------------------------------------------------------
	   2-1. 타임세일 기본 색 (메인 상품 카드 · 상세 페이지 카운트다운)          BUYER EDITABLE
	   비워 두면('') 기본 색(짙은 녹색 배너 · 흰색 배지)이 나옵니다. #색코드 또는 색 이름(빨강 등)을 넣으세요.
	   타임세일을 쓰는 상품의 '상품 요약설명'에  #타임세일 2026-10-31 23:59  형식으로 종료 시각(한국시간)을 적습니다.
	   상품마다 색을 따로 주려면 뒤에  배경:#e11d48 글자:#ffffff  를 덧붙이면 그 상품은 이 기본 색보다 우선합니다.
	   한 줄 만들기 : 스킨 패키지의 tools/timesale-helper.html 을 브라우저로 열어 색을 고르고 복사
	   --------------------------------------------------------------------- */
	timesale: {
		cardBg: '',      // 메인·목록 카드 배지 배경
		cardFg: '',      // 메인·목록 카드 배지 글자
		detailBg: '',    // 상세 페이지 배너·배지 배경
		detailFg: ''     // 상세 페이지 배너·배지 글자
	},

	/* ---------------------------------------------------------------------
	   2-2. 장바구니 무료배송 진행바                                          BUYER EDITABLE
	   장바구니 위에 '○○원 더 담으면 무료배송'과 진행 막대를 보여 줍니다.
	   freeOver 는 관리자 배송비 설정의 '무료배송 기준 금액'과 같게 맞추세요. freeBar: false 면 표시하지 않습니다.
	   --------------------------------------------------------------------- */
	shipping: {
		freeBar: true,
		freeOver: 50000
	},

	/* ---------------------------------------------------------------------
	   2-3. 재고 임박 표시 (상품 상세)                                        BUYER EDITABLE
	   재고가 threshold 개 이하로 남으면 가격 아래에 "3개 남음"을 보여 줍니다.
	   ※ 관리자 상품 수정 > 재고관리를 '사용'으로 하고 재고 수량을 넣은 상품에서만 나옵니다.
	   text 의 {n} 이 남은 개수로 바뀝니다. enabled: false 면 표시하지 않습니다.
	   --------------------------------------------------------------------- */
	stockAlert: {
		enabled: true,
		threshold: 5,
		text: '{n}개 남음'
	},

	/* ---------------------------------------------------------------------
	   2-4. 기간 예약 배너 (맨 위 띠배너)                                     BUYER EDITABLE
	   시작·종료 시각(한국시간)만 적어 두면 그 기간에만 띠배너 문구가 바뀌고, 끝나면 원래 띠배너로 돌아옵니다.
	   start/end 는 '2026-10-01 00:00' 형식이며 비우면 각각 '바로 시작' '계속'입니다.
	   bg/fg 는 #색코드(선택). 여러 개를 적으면 위에서부터 처음 맞는 하나가 쓰입니다.
	   예) { text:'가을 세일 최대 30%', link:'/product/list.html?cate_no=27', start:'2026-10-01 00:00', end:'2026-10-07 23:59', bg:'#e11d48', fg:'#ffffff' }
	   --------------------------------------------------------------------- */
	banners: [
	],

	/* ---------------------------------------------------------------------
	   2-5. 후기 작성 유도 (상품 상세 후기 영역 위 띠)                          BUYER EDITABLE
	   points 는 안내 문구일 뿐이며 실제 적립금은 관리자 > 적립금 설정에서 따로 지급하세요. enabled: false 면 숨깁니다.
	   --------------------------------------------------------------------- */
	reviewPromo: {
		enabled: true,
		text: '구매하신 상품의 후기를 남겨 주세요',
		points: '1,000원 적립',
		button: '후기 쓰기'
	},

	/* 푸터 SHOP MENU 4개 링크 (게시판 주소는 몰마다 다릅니다)      BUYER EDITABLE */
	footerMenu: [
		{ label: 'Shop',   link: '/product/list.html?cate_no=28' },
		{ label: 'Order',  link: '/myshop/order/list.html' },
		{ label: 'Q&A',    link: '/board/product/list.html?board_no=6' },
		{ label: 'Notice', link: '/board/product/list.html?board_no=1' }
	],

	/* ---------------------------------------------------------------------
	/* ---------------------------------------------------------------------
	   3. 메인 ① HERO — 풀블리드 캠페인 사진 (정적, 영상 없음)      BUYER EDITABLE
	   --------------------------------------------------------------------- */
	hero: {
		tag: 'FW26 CAMPAIGN',                // 제목 위 작은 문구
		title: '에어 레깅스',
		sub: '210g. 입은 줄 모르게.',
		buttonText: '컬렉션 보기',
		buttonLink: '/product/list.html?cate_no=28',
		image: '/SkinImg/inter/scene-bed.webp',
		imageMobile: '/SkinImg/inter/scene-bed.webp'
	},

	/* ---------------------------------------------------------------------
	   3-1. 메인 ② NEW ARRIVALS 제목 줄의 SEE ALL 링크            BUYER EDITABLE
	   제목·부제목·상품은 카페24(스마트디자인 편집창 / 메인 진열 관리)에서 바꿉니다.
	   --------------------------------------------------------------------- */
	arrivals: {
		seeAllText: 'SEE ALL',
		seeAllLink: '/product/list.html?cate_no=28'
	},

	/* ---------------------------------------------------------------------
	   3-1a. 메인 ③ CATEGORY 카드 4장의 마우스오버 컷              BUYER EDITABLE
	   카드 사진·제목·링크는 스마트디자인 편집창(CATEGORY 배너)에서 바꿉니다.
	   여기는 그 카드에 마우스를 올렸을 때 넘어가는 두 번째 사진입니다.
	   '' 로 두면 마우스오버 사진 없이 원본 그대로 보입니다.
	   (이 키를 지우면 st-main.css 의 기본값 = 옛 SERAPHIN 사진이 뜹니다 — 지우지 마세요)
	   --------------------------------------------------------------------- */
	onStore: {
		hoverImages: [
			'/SkinImg/img/studio9/prod-leggings.jpg?v=20260924b',
			'/SkinImg/img/studio9/prod-top.jpg?v=20260924b',
			'/SkinImg/img/studio9/prod-outer.jpg?v=20260924b',
			'/SkinImg/img/studio9/prod-mat.jpg?v=20260924b'
		]
	},

	/* ---------------------------------------------------------------------
	   3-2. 메인 ⑤ FABRIC — 좌우 분할(사진 + 잉크 패널)             BUYER EDITABLE
	   --------------------------------------------------------------------- */
	fabric: {
		image: '/SkinImg/img/studio9/fabric.jpg?v=20260924b',
		eyebrow: 'STUDIO9 FABRIC',
		titleHtml: '원단부터<br>다시 만들었습니다',
		desc: '겉감은 회복력이 좋은 나일론, 안감은 땀을 빨리 내보내는 구조로 짰습니다. 같은 패턴을 세 시즌째 다듬는 이유입니다.',
		buttonText: '소재 이야기 읽기',
		buttonLink: '/product/list.html?cate_no=28'
	},

	/* ---------------------------------------------------------------------
	   3-3. 메인 ⑦ JOURNAL — 저널 카드 3장                        BUYER EDITABLE
	   --------------------------------------------------------------------- */
	journal: {
		title: 'JOURNAL',
		subtitle: '스튜디오9의 이야기',
		seeAllText: 'SEE ALL',
		seeAllLink: '/board/free/list.html?board_no=5',
		items: [
			{ image: '/SkinImg/img/studio9/journal-1.jpg?v=20260924b', link: '/board/free/list.html?board_no=5', category: 'STYLE', title: '가을 러닝 레이어링, 세 겹이면 끝', meta: '2026.09.18 · 읽는 데 4분' },
			{ image: '/SkinImg/img/studio9/journal-2.jpg?v=20260924b', link: '/board/free/list.html?board_no=5', category: 'CARE',  title: '레깅스를 오래 입는 세탁법',       meta: '2026.09.11 · 읽는 데 3분' },
			{ image: '/SkinImg/img/studio9/journal-3.jpg?v=20260924b', link: '/board/free/list.html?board_no=5', category: 'RUN',   title: '아침 5km, 서울 코스 세 곳',       meta: '2026.09.04 · 읽는 데 5분' }
		]
	},

	/* ---------------------------------------------------------------------
	   3-4. 메인 ⑧ NEWSLETTER — 구독 배너                          BUYER EDITABLE
	   폼 제출은 실제로 전송되지 않는 자리표시입니다. 실제 수집이 필요하면
	   카페24 메일링 모듈이나 외부 폼 서비스 연동이 필요합니다.
	   --------------------------------------------------------------------- */
	newsletter: {
		title: '새 컬렉션을 가장 먼저',
		desc: '발매일과 재입고 소식만 보내드립니다. 한 달에 두 번이면 충분하니까요.',
		buttonText: '구독하기'
	},

	/* ---------------------------------------------------------------------
	   3-4a. 메인 WELCOME 쿠폰 배너                                BUYER EDITABLE
	   --------------------------------------------------------------------- */
	welcome: {
		eyebrow: 'WELCOME EVENT',
		title: '첫 쇼핑을 지원하는 3,000원 쿠폰',
		desc: '지금 가입하면 바로 사용할 수 있는 쿠폰이 지급됩니다.',
		buttonText: '회원가입하고 받기',
		buttonLink: '/member/agreement.html'
	},

	/* ---------------------------------------------------------------------
	   3-4c. 메인 이벤트 팝업 (첫 화면에 뜨는 카드 팝업)             BUYER EDITABLE
	   · 팝업 한 장 = slides 안의 { … } 한 덩어리. 덩어리를 복사해 붙이면 장이 늘고, 지우면 줄어듭니다.
	   · type : 'timer'  = 사진 아래쪽에 "이벤트 마감까지 ○일 ○○:○○:○○" 타이머가 붙는 팝업
	            'normal' = 타이머 없는 일반 팝업
	   · endAt : 타이머 종료 시각(한국시간 'YYYY-MM-DD HH:MM'). 비워 두면 아래 sale.timer.endAt 을 씁니다.
	   · image : 사진 주소. imagePosition 은 사진에서 보일 자리('가로% 세로%', 예: '75% 40%')
	   · 팝업을 끄려면 enabled: false
	   --------------------------------------------------------------------- */
	popup: {
		enabled: true,
		delay: 1.2,                          // 페이지가 열리고 몇 초 뒤에 띄울지
		interval: 4,                         // 몇 초마다 다음 장으로 넘길지 (0 이면 자동으로 넘기지 않음)
		slides: [
			{
				type: 'timer',
				badge: 'SALE EVENT',
				kicker: 'Lucky coupon',
				title: '최대 50% 쿠폰 뽑기',
				text: '세일 기간, 쿠폰을 뽑아 최대 50% 할인 혜택을 받아 보세요.',
				button: '쿠폰 뽑으러 가기 →',
				link: '/product/list.html?cate_no=27',
				image: '/SkinImg/inter/scene-chair.webp',
				imageAlt: '부클 원단의 오크 라운지 체어',
				imagePosition: '50% 60%',
				timerLabel: '이벤트 마감까지',
				endAt: '',
				endedText: '이벤트가 종료되었습니다'
			},
			{
				type: 'normal',
				badge: 'REVIEW EVENT',
				kicker: 'Share your moment',
				title: '포토리뷰 쓰면 3,000P',
				text: '상품 사진과 함께 후기를 남기면 적립금 3,000원을 드려요.',
				button: '포토리뷰 쓰러 가기 →',
				link: '/board/product/list.html?board_no=4',
				image: '/SkinImg/inter/scene-bookshelf.webp',
				imageAlt: '오크 오픈 책장이 놓인 밝은 거실',
				imagePosition: '50% 50%'
			}
		]
	},

	/* ---------------------------------------------------------------------
	   3-4b. 우측 플로팅 버튼 (인스타그램 · 카카오톡 · TOP)          BUYER EDITABLE
	   인스타그램 주소는 위 social.instagram 을 씁니다. 주소가 비어 있는 버튼은 숨겨집니다.
	   kakao 에는 카카오톡 채널 주소(예: https://pf.kakao.com/_xxxx)를 넣으세요.
	   --------------------------------------------------------------------- */
	aiNotice: '* 이 페이지의 모델 이미지와 영상은 AI로 생성된 콘텐츠입니다. 실제 상품 색상·핏과 다를 수 있으니 상세 정보를 확인해 주세요.',

	floating: {
		kakao: ''
	},

	/* ---------------------------------------------------------------------
	   3-5. 메인 ⑥ REVIEWS — 큰 후기 1개 + 목록 3개                BUYER EDITABLE
	   실제 후기가 쌓이면 아래 문구를 그 내용으로 바꾸세요.
	   목록 3개의 사진·상품명은 index.html 의 REVIEW 섹션에서 바꿉니다.
	   --------------------------------------------------------------------- */
	reviews: {
		title: 'REVIEWS',
		subtitle: '고객이 남긴 착용 후기',
		seeAllText: 'SEE ALL',
		seeAllLink: '/board/product/list.html?board_no=4',
		leadText: '첫 후기의 주인공이 되어 주세요. 입어 보신 핏과 착용감을 남겨 주시면 다른 고객님께 큰 도움이 됩니다.',
		leadMeta: '구매 후기는 상품 사용후기 게시판에서 확인할 수 있어요'
	},


	/* ---------------------------------------------------------------------
	   9. SALE 페이지 (상품분류 SALE 에서만 보이는 이벤트 화면)     BUYER EDITABLE
	   상품 목록 자체는 카페24 상품이 그대로 나옵니다. 아래는 그 위아래를 채우는 배너·문구입니다.
	   --------------------------------------------------------------------- */
	sale: {
		timer: {                             // 세일 페이지 맨 위 "이벤트 마감까지" 플립 타이머
			enabled: true,                   // false 면 숨김
			label: '이벤트 마감까지',
			endAt: '2026-10-31 23:59',       // 종료 일시(한국시간, 'YYYY-MM-DD HH:MM'). 이 시각까지 남은 시간이 흐릅니다
			endedText: '이벤트가 종료되었습니다',
			bg: '',                          // 배경색(#색코드, 비우면 기본 검정 톤)
			fg: ''                           // 글자색(#색코드, 비우면 흰색)
		},

		coupon: {                            // 세일 페이지 "랜덤 쿠폰 뽑기" (세일 아이템 바로 위)
			enabled: true,                   // false 면 숨김
			eyebrow: 'RANDOM COUPON',
			title: '최대 50% 쿠폰 뽑기',
			kicker: '뽑으면 무조건 당첨',           // 제목 위 한 줄 문구
			bubble: '5%부터 50%까지',              // 카드 위 말풍선 문구 (뒤에 강조 단어가 붙습니다)
			bubbleEm: '랜덤',                       // 말풍선의 굵은 강조 단어
			/* 쿠폰 번호는 관리자 > 프로모션 > 쿠폰 발급/조회에서 확인합니다.
			   total  = 관리자에서 정한 '발급 수량',  remain = 지금 남은 수량(막대와 뽑힐 확률에 쓰임).
			   remain 은 운영자가 관리자의 발급 현황을 보고 고치거나, 아래 remainUrl 로 자동 갱신할 수 있습니다.
			   remain 이 0 인 쿠폰은 뽑기에서 제외되고, 나머지 쿠폰이 남은 수량 비율대로 뽑힙니다. */
			coupons: [
				{ no: '6086342005700000318', label: '50% 쿠폰', total: 10,  remain: 10 },
				{ no: '6086342015600000319', label: '20% 쿠폰', total: 30,  remain: 30 },
				{ no: '6086342019800000320', label: '10% 쿠폰', total: 100, remain: 100 },
				{ no: '6086342024200000321', label: '5% 쿠폰',  total: 300, remain: 300 }
			],
			remainUrl: 'https://soft-sea-0571.senior-sujin.workers.dev',                   // (선택) 남은 수량 공용 카운터 주소. 판매자가 알려 준 주소(https://….workers.dev)만 넣으면 모든 방문자에게 같은 남은 수량이 보인다. 비워 두면 위 remain 숫자를 그대로 쓴다
			stockTitle: '남은 쿠폰',
			stockNote: '남은 수량은 주기적으로 업데이트돼요',
			hideElsewhere: true,             // true 면 이 쿠폰들을 상품 상세 등 다른 쿠폰 다운로드 칸에서 숨겨 뽑기로만 받게 합니다
			endAt: '',                       // 비우면 위 timer.endAt(이벤트 마감 시각)을 씁니다
			myCouponUrl: '/myshop/coupon/coupon.html',
			loginUrl: '/member/login.html',
			notesTitle: '이벤트 유의사항',
			notes: [                         // {period} {usecon} 은 카페24 관리자에 설정한 값으로 자동 채워집니다
				'본 이벤트는 회원 전용 이벤트로, 로그인 후 참여할 수 있어요.',
				'쿠폰 뽑기는 회원 1인당 1회만 참여할 수 있어요.',
				'뽑은 쿠폰은 바로 발급되어 마이쿠폰에서 확인할 수 있어요.',
				'쿠폰 사용기간: {period}',
				'사용 조건: {usecon}',
				'쿠폰은 주문서에서 적용할 수 있고, 사용기간이 지나면 자동으로 소멸돼요.',
				'남은 쿠폰이 모두 소진되면 뽑을 수 없어요.',
				'본 이벤트는 사정에 따라 별도 공지 없이 변경 또는 종료될 수 있어요.'
			]
		},

		categoryNo: 27,                      // 이 화면이 보일 상품분류 번호 (관리자 → 상품분류 관리에서 확인)

		hero: {
			image: '/SkinImg/inter/scene-bookshelf.webp',
			alt: '오크 오픈 책장이 놓인 밝은 거실',
			eyebrow: 'Nordic Home Edit',
			titleHtml: 'inter<br>Season Sale',
			lead: 'Good things for your home, at a special price',
			up: 'Up to 50%',
			date: 'Limited Time Only',
			buttonText: 'Shop Now',
			buttonLink: '#stSaleItems',      // #stSaleItems = 아래 상품 목록으로 스크롤
			tagHtml: 'Live Simply<br>Every Day'
		},
		strip: ['inter', 'Nordic Living', 'inter Season Sale'],   // 정보 띠 3칸

		tiles: [                             // 카테고리 3칸 (link: ?cate_no=상품분류번호)
			{ image: '/SkinImg/inter/sq-chair.webp', no: '01', name: 'Living',   sub: 'Bookshelves, shelves and chairs', link: '#stSaleItems' },
			{ image: '/SkinImg/inter/scene-bed.webp',            no: '02', name: 'Bedroom',    sub: 'Oak beds and soft linen',      link: '#stSaleItems' },
			{ image: '/SkinImg/inter/scene-bed.webp',          no: '03', name: 'Dining', sub: 'Round tables and woven chairs',  link: '#stSaleItems' }
		],
		buttonLabel: 'Shop',                 // 타일·카드 안의 작은 링크 문구

		itemsTitle: 'Sale Item',
		itemsSub: "Prices you won't see again",

		banner: {
			image: '/SkinImg/inter/scene-table.webp',
			alt: '원형 오크 식탁과 페이퍼코드 체어',
			titleHtml: 'Your Home<br>Special Price',
			subHtml: 'Everyday favourites<br>at a lighter price.',
			buttonText: 'Shop Sale',
			buttonLink: '#stSaleItems'
		},

		duo: [                               // 두 칸 카드
			{ image: '/SkinImg/inter/sq-chair.webp', titleHtml: 'Cozy Living<br>Up to 40%', sub: 'Clean lines, comfortable support', link: '#stSaleItems' },
			{ image: '/SkinImg/inter/scene-bed.webp', titleHtml: 'Rest Well<br>Special Price', sub: 'Solid oak, made to last', link: '#stSaleItems' }
		],

		realLook: {                          // 인스타그램 스타일 사진 10장 (5장씩 두 줄)
			title: 'Real Look',
			hashtag: '#{brand} With You',    // 인스타그램 해시태그
			images: [
				{ image: '/SkinImg/inter/scene-bookshelf.webp', alt: '북유럽 인테리어 연출 이미지',         link: '#stSaleItems' },
				{ image: '/SkinImg/inter/scene-table.webp', alt: '북유럽 인테리어 연출 이미지', link: '#stSaleItems' },
				{ image: '/SkinImg/inter/scene-wallshelf.webp', alt: '북유럽 인테리어 연출 이미지',              link: '#stSaleItems' },
				{ image: '/SkinImg/inter/sq-monstera.webp', alt: '북유럽 인테리어 연출 이미지',                  link: '#stSaleItems' },
				{ image: '/SkinImg/inter/scene-bed.webp',    alt: '북유럽 인테리어 연출 이미지',       link: '#stSaleItems' },
				{ image: '/SkinImg/inter/scene-wallshelf.webp',  alt: '북유럽 인테리어 연출 이미지',           link: '#stSaleItems' },
				{ image: '/SkinImg/inter/scene-bed.webp',  alt: '북유럽 인테리어 연출 이미지',           link: '#stSaleItems' },
				{ image: '/SkinImg/inter/sq-chair.webp',     alt: '북유럽 인테리어 연출 이미지',                       link: '#stSaleItems' },
				{ image: '/SkinImg/inter/scene-chair.webp',     alt: '북유럽 인테리어 연출 이미지',                      link: '#stSaleItems' },
				{ image: '/SkinImg/inter/scene-chair.webp',     alt: '북유럽 인테리어 연출 이미지',                 link: '#stSaleItems' }
			]
		},

		end: {
			title: 'Be Yourself',
			sub: 'Some pieces stay longer'
		}
	}
};

/* inter content edition. Original settings above are preserved for rollback.
   Replace catalogue data in Cafe24 admin; generated photographs are editorial assets. */
(function (c) {
  var base = '/SkinImg/inter/';
  c.brand.logo = '';
  c.brand.instagramHandle = '';
  c.intro = {enabled: false};
  c.hero = {tag:'NORDIC LIVING', title:'오래 머물 집', sub:'더 좋은 것들로.',
    buttonText:'컬렉션 보기', buttonLink:'/product/list.html?cate_no=28', image:base+'scene-bed.webp', imageMobile:base+'scene-bed.webp'};
  c.onStore.hoverImages = ['scene-bed.webp','scene-bed.webp','sq-bookshelf.webp','sq-chair.webp'].map(function (s) {return base+s});
  c.fabric = {image:base+'sq-chair.webp', eyebrow:'OAK & LINEN', titleHtml:'오크와 리넨,<br>오래 쓰는 소재',
    desc:'결이 살아 있는 밝은 오크, 빨수록 부드러워지는 리넨. 매일 손에 닿아도 편안한 소재를 고릅니다.',
    buttonText:'거실 가구 보기',buttonLink:'/product/list.html?cate_no=24'};
  c.journal.subtitle = '집이 편해지는 작은 습관';
  c.journal.items = [
    {image:base+'scene-bookshelf.webp',link:'/inter/guide.html#living',category:'LIVING',title:'가볍게, 비워 두기',meta:'거실 가구 고르기'},
    {image:base+'scene-bed.webp',link:'/inter/guide.html#bedroom',category:'BEDROOM',title:'잠이 잘 오는 방',meta:'침실 꾸미기'},
    {image:base+'scene-table.webp',link:'/inter/guide.html#dining',category:'CARE',title:'원목을 오래 쓰는 법',meta:'다이닝 · 원목 관리'}
  ];
  c.reviews.subtitle = '우리 집 이야기';
  c.sale.hero.image = base+'scene-chair.webp';
  c.sale.hero.alt = '부클 원단의 오크 라운지 체어';
  c.sale.hero.titleHtml = 'Good finds.<br>Better homes.';
  c.sale.hero.lead = '오래 머물 집을 위한 반가운 발견';
  c.sale.hero.tagHtml = 'Live simply,<br>every day.';
  c.brand.name = 'inter';
  c.sale.strip = ['inter', 'Simple things, lasting home', 'Season Sale'];
  c.sale.tiles[0].image=base+'sq-bookshelf.webp';c.sale.tiles[0].name='Living';c.sale.tiles[0].sub='책장 · 선반 · 라운지 체어';c.sale.tiles[0].link='/product/list.html?cate_no=24';
  c.sale.tiles[1].image=base+'sq-bed.webp';c.sale.tiles[1].name='Bedroom';c.sale.tiles[1].sub='오크 침대 · 리넨 침구';c.sale.tiles[1].link='/product/list.html?cate_no=25';
  c.sale.tiles[2].image=base+'sq-table.webp';c.sale.tiles[2].name='Dining';c.sale.tiles[2].sub='원형 식탁 · 테이블웨어';c.sale.tiles[2].link='/product/list.html?cate_no=26';
  c.sale.itemsTitle='The Sale Edit';c.sale.itemsSub='좋은 것들을, 반가운 가격에.';
  c.sale.end.title='Better homes, every day.';c.sale.end.sub='오래 머물 집을 위한 선택';
  c.reviews.leadText = '우리 집에 놓아 본 이야기를 나눠주세요. 공간 크기와 함께 둔 가구를 남겨주시면 다른 분의 선택에 큰 도움이 됩니다.';
  c.aiNotice = '이미지는 AI로 제작한 연출 이미지입니다. 실제 상품의 구성과 형태는 각 상품 상세페이지를 확인해주세요.';
}(window.STORE_CONTENT));

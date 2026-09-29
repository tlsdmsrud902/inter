# inter (북유럽풍 인테리어) 작업 기록 — 2026-09-29

`신규 스킨 작업.md` 절차(A. 내 PC 코드)에 따라 **eppum(K-뷰티) 스킨**을 기본 레이아웃으로 삼아 북유럽풍 인테리어 쇼핑몰 **inter** 를 만든 기록.
eppum 저장소(`tlsdmsrud902/k_eppum`)는 읽기만 하고 건드리지 않았다.

| 항목 | 값 |
|---|---|
| GitHub | `tlsdmsrud902/inter` |
| 카페24 계정 (mall_id) | `inter902` (`https://inter902.cafe24.com`) |
| 스킨 폴더 | `inter902_s2_260925195134_d_skin1_E/skin1` |
| 디자인 코드 · 번호 | `base` · `1` (`ez/ez-settings.json`) |
| 이미지 서버 번호 | `pg3424b38727055046` (파일업로더 주소 `https://ecimg.cafe24img.com/pg3424b38727055046/inter902/inter/…`) |
| 이미지 폴더 | `SkinImg/inter/` (파일업로더 폴더도 `inter`) |
| 코드 이름 | 클래스 `inter-*`, 전역 변수 `INTER_*`, 페이지 `/inter/guide.html` |

## 1. 이름 · 경로 바꾸기
- eppum 스킨을 `git archive` 로 복사 → 폴더 · 파일 이름 변경 (`eppum902_…` → `inter902_…`, `beauty/` → `inter/`, `beauty-*.css/js` → `inter-*`)
- 일괄 치환 : `node docs/tools/rebrand-inter.js` (EPPUM_ → INTER_, eppum → inter, beauty → inter, routines → rooms, skincare → living, makeup → bedroom, 이미지 이름)
- 한국어 조사 : inter(인터) 는 받침이 없어 **는 · 가 · 를 · 와** 를 쓴다

## 2. 새 이미지 (`python3 docs/tools/inter-images.py`)
저장소 루트 사진 5장 : `photo-bookshelf.jpg` · `photo-lounge-chair.jpg` · `photo-dining-table.jpg` · `photo-wall-shelf.jpg` · `photo-bed.jpg` (2000×1116)
- 사진 오른쪽 아래 구석의 ✦ 표시가 들어가지 않게 잘랐다 (장면은 높이 1016 으로 잘라 아래를 뺌)
- 가로 장면 5 · 정사각 19 · 세로 카드 2 · 세로 2 · 글자 로고 `logo-inter` · 하단 큰 글자 `wordmark-inter` = 스킨 이미지 30개
- 상품 사진 24개 (`cafe24-assets/products/p01~p24.jpg`) : 사진 속 가구 · 소품을 정사각으로 잘라 만듦

## 3. 분류 · 메뉴
| 번호 | 분류 | 목록 배너 키 |
|---|---|---|
| 28 | 전체 상품 | all |
| 24 | 거실 · 수납 | living |
| 25 | 침실 · 패브릭 | bedroom |
| 26 | 다이닝 · 소품 | dining |
| 27 | SALE | (세일 전용 화면) |

## 4. 메인 화면 (기능은 그대로, 사진 · 문구만 변경)
- `?edit=1` 편집 칸(`data-cms-*`)은 eppum 과 종류 · 개수가 같다
- 히어로 : 1 거실(영상 자리 그대로, 비면 `scene-bookshelf`) · 2 다이닝 · 3 침실
- 공간 고르기(거실 · 침실), 공간 찾기(공간 × 수납/휴식/분위기 → 검색어), 사이즈 가이드(가로 · 깊이 · 높이, 책장 그림), 3D 보기 기능 유지(`data-size-3d-model` 비어 있음)
- 장면 속 상품 4장면 : 거실 책장 · 다이닝 · 벽 선반 · 침실. `data-prd` 는 **임시 번호**(p01 = 12 … p24 = 35)
- 체크리스트 : 거실 / 침실 (localStorage `inter-starter-v1`)
- 색 : 오크 · 리넨 톤 (`--cz-accent:#8a6541`, 배경 `#faf8f4`)

## 5. 샘플 상품 `cafe24-assets/products/products.json`
24개, `group` rec/new/best 각 8개, `cates` 에 27 이 있으면 SALE(정상가 `retail`).

## 6. 로컬 미리보기
`node docs/tools/serve.js` → http://localhost:8765 (`/`, `/product/list.html?cate_no=24`, `?cate_no=27`, `/inter/guide.html`)

## 7. 남은 일
1. 카페24 `inter902` 가입 → 파일업로더에 `inter` 폴더 만들고 `SkinImg/inter/*.webp` 30개 올리기 → 이미지 주소(`pg…`) 전달 — **완료**
2. 디자인 백업 파일(`…_d_base_E.tar.gz`) 전달 → `python3 docs/pack.py <백업.tar.gz> <pg번호>` 로 복구 파일 → 관리자 "디자인 복구" — **완료**
3. 관리자 작업(분류 · 상품 · 진열 · 리뷰 · 게시판) — **완료 (9장)**
4. 실제 상품번호로 메인 "장면 속 그 상품" `data-prd` 교체 — **완료 (9-6)**
5. 디자인센터 상세페이지의 편집 화면 캡처는 적용 후 새로 찍어 넣기

## 8. 디자인 복구 파일 (2026-09-29)
- 백업 : `inter902_s2_260929211054_d_base_E.tar.gz` (카페24 기본디자인, 파일 496 · 폴더 77 · 바로가기 51)
- 만들기 : `python3 docs/pack.py <백업.tar.gz> pg3424b38727055046` → `_deploy/inter902_s2_260929211054_d_base_E.tar.gz` (git 제외)
- 결과 : 바로가기 51 그대로 · 교체 496 · 추가 38 · 0.62MB, 로컬 이미지 경로 0, 스킨이 쓰는 이미지는 모두 파일업로더에 있음
- 두 번째 복구부터는 새로 백업해서 **새 이름**으로 만든다

---

## 9. 카페24 관리자 작업 (2026-09-30)

`신규 스킨 작업.md` 9 · 9-1 절차를 따랐다. 전부 내장 브라우저 콘솔에서 처리했다.

### 9-1. 분류

새 계정 기본 분류는 패션 샘플(24 Outerwear ~ 28 Accessories, 하위 29~41)이었다.
대분류 5개는 **이름만 바꿔** 스킨 번호를 그대로 쓰고, 하위 13개는 **삭제**했다.

| 번호 | 이름 | 상품 수 |
|---|---|---|
| 24 | 거실 · 수납 | 10 |
| 25 | 침실 · 패브릭 | 8 |
| 26 | 다이닝 · 소품 | 6 |
| 27 | SALE | 8 |
| 28 | 전체 상품 | 24 |

분류 트리는 dynatree 라서 아래처럼 선택하면 오른쪽 폼이 채워진다.
(메뉴얼의 "스크립트 `click()` 으로는 선택되지 않는다" 를 이렇게 우회한다)

```js
$('.dynatree-container').parent().dynatree('getTree').getNodeByKey('24').activate();
```

이름 · 표시상태를 바꾸고 `#eSubmitBtn` 클릭 → "분류정보가 저장되었습니다."
하위 분류 삭제는 노드를 활성화한 뒤 `a.eDeleteCategoryBtn` 클릭. **깊은 것부터**(41 → 29) 지운다.
기본 샘플 상품 9 · 10번은 상품목록에서 체크 후 `a._manage_delete` 로 삭제했다.

### 9-2. 게시판 — 없는 게 아니라 꺼져 있었다

새 계정에 게시판은 **모두 이미 있다. 새로 만들 필요가 없었다.**

| 번호 | 게시판 | 처리 |
|---|---|---|
| 1 | 공지사항 | 그대로 |
| 2 | 뉴스/이벤트 | 사용 · 표시 켬 (`?edit=1` 화면 편집용, `store-content.js` 의 `cms.boardNo`) |
| 3 | 이용안내 FAQ | 사용 · 표시 켬 |
| 4 | 상품 사용후기 | **평점 기능 · 파일첨부 · 상세페이지 평점 표시** 켬 — 셋 다 꺼져 있었다 |
| 6 | 상품 Q&A | 그대로 |

- 게시판 관리 : `/admin/php/shop1/b/board_admin_l.php` · 설정 화면 `board_admin_c.php?mode=modify&board_no=N`
- 저장 : 폼 `frm` 을 `board_admin_c_a.php` 로 POST. 응답에 `location.href` 가 있으면 성공
- **`is_using_board`(사용여부) 와 `use_board`(표시여부) 는 별개다.** 둘 다 T 여야 게시판이 동작한다
- 주의 : 4번의 **평점 기능(`is_use_point`)이 기본 꺼짐**이다. 켜지 않으면 별점이 저장되지 않아
  `inter-reviews.js` 가 읽는 `point_count` 가 0 이 되고 상품 카드에 평점이 안 붙는다

### 9-3. 상품 24개

등록 화면(`/disp/admin/shop1/product/productregister`)에서 폼을 채우고
**"상품등록" 버튼이 만드는 FormData 를 가로채** `fetch` 로 보냈다.

- **등록 버튼은 페이지당 한 번만 동작한다.** 두 번째부터 `no FormData` 가 된다
  → **숨긴 iframe 에 등록 화면을 띄우면** 상품마다 새 폼을 써서 한 번의 실행으로 여러 개를 등록할 수 있다
- 빈 폼의 `new FormData(f)` 를 템플릿 삼아 값만 바꿔 보내면 **실패한다**
  ("생성된 품목의 멀티쇼핑몰별 입력 항목의 개수가 허용 범위를 초과") — 버튼이 만든 FormData 를 써야 한다
- 분류는 `CATEGORY.setSelectCategory(undefined, 번호, 이름)` 후 0.8초 대기.
  폼에는 `addCategoryNum[]` · `category_product[groupN][번호]` 로 들어간다
- **`[과세금액] 0 이상의 정수형이어야 합니다.` 로 가끔 실패한다** (판매가 입력 후 과세금액 재계산 전에 제출됨).
  같은 상품을 **다시 등록하면 성공**한다. 이번에 p12 · p21 · p24 가 한 번씩 실패해 뒤 번호를 받았다

**상품번호 (연속이 아니다)**

| code | no | code | no | code | no | code | no |
|---|---|---|---|---|---|---|---|
| p01 | 11 | p07 | 17 | p13 | 23 | p19 | 29 |
| p02 | 12 | p08 | 18 | p14 | 24 | p20 | 30 |
| p03 | 13 | p09 | 19 | p15 | 25 | p21 | **36** |
| p04 | 14 | p10 | 20 | p16 | 26 | p22 | 32 |
| p05 | 15 | p11 | 21 | p17 | 27 | p23 | 33 |
| p06 | 16 | p12 | **35** | p18 | 28 | p24 | **37** |

메인 진열은 등록할 때 `display_group[1][]` 로 함께 넣었다. 추천(2) · 신상품(3) · 인기(4) 각 8개.

### 9-4. 상품 이미지 — 파일 업로드

URL 방식은 쓰지 않았다. 실제로 저장되는 경로는 다음과 같다.

```js
// 1) 업로드 전용 엔드포인트로 파일을 보낸다 → {"Result":true,"Path":"/web/product/big/…/temp_….jpg"}
const fd = new FormData();
fd.append('img_type', 'd_image');
fd.append('file', new File([blob], 'p01.jpg', { type: 'image/jpeg' }));
const resp = await fetch('/exec/admin/shop1/Product/ProductImageUpload',
  { method:'POST', body:fd, credentials:'same-origin' }).then(r => r.text());

// 2) 상품 수정 화면(iframe)에서 페이지의 처리 함수에 응답을 넘기면 4가지 크기가 폼에 꽂힌다
w.IMAGE.sImageType = 'd_image';
w.jQuery('#sImgType').val('d_image');
w.IMAGE.uploadSuccess(null, resp, null);

// 3) "상품수정"(#eProductModify) 버튼이 만드는 FormData 를 가로채 POST → "상품이 수정되었습니다."
```

> 메뉴얼의 `#imageFiles` 에 `DataTransfer` 로 파일을 넣고 `change` 를 트리거하는 방법은 **이번에 동작하지 않았다**
> (`IMAGE.aUpload` 가 빈 채로 대기만 함). 업로드 엔드포인트를 직접 부르는 편이 확실하다.

확인 : 상품마다 상세페이지에서 `web/product/…jpg` 주소를 뽑아 `fetch` 로 불러 봤다. **24개 × 3주소 = 72개 모두 200.**

### 9-5. [연출 예시] 리뷰 24개

상품마다 1개씩, 별점 5, 사진은 그 상품 이미지(jsDelivr 커밋 고정 주소).

- 글쓰기 화면을 **`?board_no=4&product_no=<상품번호>` 로 열어야** 상품이 연결된다.
  `boardWriteForm.product_no.value` 에 넣기만 하면 **연결되지 않는다** (연결 안 된 글이 하나 생겨서 지웠다)
- 편집기(Froala)와 `content` 칸에 **둘 다** 본문을 넣고, 화면의 등록 링크를 실제로 클릭한다
- 글 삭제 : 게시물 관리(`/admin/php/shop1/b/board_admin_bulletin_l.php?sel_board_no=4`)의 폼 `frm` 에
  `mode=delete` · `bbs_no[]=<글번호>` 를 실어 `board_admin_bulletin_a.php` 로 POST

확인 : `/exec/front/board/product/4?no=N&board_no=4&pass_check=F` 로 글을 모두 읽어
제목 말머리 · `point_count=5` · 본문 `<img>` 를 검사했다. **24개 전부 통과, 중복 없음.**

### 9-6. `index.html` 상품번호 교체

임시 번호(p01 = 12 … p24 = 35)를 9-3 의 실제 번호로 바꿨다. `data-prd` 26곳 · `#cz-looks-data` 키 13개.
교체 뒤 검사 : looks 데이터의 이름 · 이미지 코드가 실제 등록 상품과 모두 일치, `data-prd` 는 전부 실제 상품번호.

### 9-7. 아직 안 한 것

- 메인 포토리뷰 영역 · 상품 카드 평점은 **스킨이 적용된 화면에서 눈으로 확인**해야 한다
- 세일 쿠폰 번호(`store-content.js` 의 `sale.coupon.coupons[].no`)는 아직 기본값

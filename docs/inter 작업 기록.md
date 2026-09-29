# inter (북유럽풍 인테리어) 작업 기록 — 2026-09-29

`신규 스킨 작업.md` 절차(A. 내 PC 코드)에 따라 **eppum(K-뷰티) 스킨**을 기본 레이아웃으로 삼아 북유럽풍 인테리어 쇼핑몰 **inter** 를 만든 기록.
eppum 저장소(`tlsdmsrud902/k_eppum`)는 읽기만 하고 건드리지 않았다.

| 항목 | 값 |
|---|---|
| GitHub | `tlsdmsrud902/inter` |
| 카페24 계정 (mall_id) | `inter902` (`https://inter902.cafe24.com`) |
| 스킨 폴더 | `inter902_s2_260925195134_d_skin1_E/skin1` |
| 디자인 코드 · 번호 | `base` · `1` (`ez/ez-settings.json`) |
| 이미지 서버 번호 | **아직 모름** → 파일업로더 주소의 `pg…` 를 받아 `ez/ez-product-display-setting.data.json` 의 `PG_NUMBER` 와 `docs/pack.py` 실행 값으로 쓴다 |
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
1. 카페24 `inter902` 가입 → 파일업로더에 `inter` 폴더 만들고 `SkinImg/inter/*.webp` 30개 올리기 → 이미지 주소(`pg…`) 전달
2. 디자인 백업 파일(`…_d_base_E.tar.gz`) 전달 → `python3 docs/pack.py <백업.tar.gz> <pg번호>` 로 복구 파일 → 관리자 "디자인 복구"
3. PC Claude 세션 : 분류 이름(24~28) → 상품 24개 등록 · 사진 파일 업로드 → 메인 진열 → [연출 예시] 리뷰 → 뉴스/이벤트(2번) 게시판 켜기
4. 실제 상품번호로 메인 "장면 속 그 상품" `data-prd` 교체
5. 디자인센터 상세페이지의 편집 화면 캡처는 적용 후 새로 찍어 넣기

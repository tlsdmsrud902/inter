/*
 * SERAPHIN 판매용 공통 설정
 * 디자인 구매 후 이 파일만 수정하면 로고, 메인 링크, 영상과 커스텀 이미지를 교체할 수 있습니다.
 * 카테고리 메뉴는 카페24 관리자 > 상품 > 상품분류 관리에서 등록한 최상위 분류를 자동으로 표시합니다.
 */
window.SERAPHIN_CONFIG = {
    brandName: 'SERAPHIN',
    logoUrl: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/logo.png',

    // 카페24 기본 최상위 분류는 1입니다. 특정 분류 아래 메뉴만 보이게 하려면 해당 분류 번호를 입력하세요.
    menuParentCateNo: 1,

    links: {
        hero: '/product/list.html',
        campaign: '/product/list.html',
        tearA: '/product/list.html',
        tearB: '/product/list.html',
        popup: '/product/list.html'
    },

    videos: {
        heroDesktop: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/hero-scrub-smooth.mp4',
        heroMobile: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/hero-scrub-smooth-m2.mp4',
        campaignDesktop: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/campaign.mp4',
        campaignMobile: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/campaign-m.mp4',
        mood01: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/cat_08.mp4',
        mood02: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/cat_09.mp4',
        mood03: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/cat_06.mp4',
        mood04: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/cat_07.mp4',
        tearA: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/tear_a.mp4',
        popup: 'https://cdn.jsdelivr.net/gh/tlsdmsrud902/seraphin-video@main/film.mp4'
    },

    images: {
        heroPoster: '/web/upload/hero_poster_closeup.jpg',
        heroPosterMobile: '/web/upload/hero_poster_closeup_m.jpg',
        tearA: '/SkinImg/img/st/tear_a.jpg',
        tearB: '/SkinImg/img/st/tear_b.jpg',
        popupPoster: '/SkinImg/img/st/film_poster.jpg'
    }
};

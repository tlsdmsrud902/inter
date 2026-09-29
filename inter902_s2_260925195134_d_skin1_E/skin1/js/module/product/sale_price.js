// 210812 서정환수정
EC$(function($) {
    var filter = "win16|win32|win64|mac|macintel";
    var device = "pc";
    if (navigator.platform) {
        if (filter.indexOf(navigator.platform.toLowerCase()) < 0) {
			device = "mobile";
		}
    }

    /**
     * 상품상세, 상품 확대보기(팝업) - 소비자가 할인표시 */
    var oPriceInfoEl = $('#ec-product-price-info');
    if (oPriceInfoEl.length > 0) {
        var salePriceEl = $('#span_product_price_text');
        percentageCul(oPriceInfoEl, salePriceEl);
    }

    /**
    * 상품목록/메인진열 - 소비자가 할인표시*/
	function sale_percent() {
		var mainEl = $("#contents");
		if (mainEl.length > 0) {
		  var productListEl = $('.xans-product-listmain, .xans-product-listrecommend, .xans-product-listnew, .xans-product-listnormal, .xans-search-result');
			for (var i = 0; i < productListEl.length; i++) {
				var prdListEl = productListEl.eq(i).find('.prdList > li');
				for (var j = 0; j < prdListEl.length; j++) {
					var priceEl = prdListEl.eq(j).find('.description'),
						salePriceEl = priceEl.parent().find('.thumbnail');
					if (device == "mobile") {
						salePriceEl = priceEl.parent().find('.thumbnail');
					}
					percentageCul(priceEl, salePriceEl);

				}
			}
		}
	}

    function percentageCul(target, salePriceEl) {
		var iCustomPrice = parseInt(String(target.attr('ec-data-custom') || '').replace(/[^0-9]/g,""), 10);
		var iPrice = parseInt(String(target.attr('ec-data-price') || '').replace(/[^0-9]/g,""), 10);
        var sDisplayAmount = 'p', // p:할인율, w:할인금액
            iOfftoFixed = 0, // 할인율 소수점자릿수
            sSaleText = '',
            regexp = /B(?=(d{3})+(?!d))/g;

        if (iCustomPrice > iPrice && iPrice > 0 && !salePriceEl.find('.sale_box').length) {
            if (sDisplayAmount == 'p') {
                sSaleText = (((iCustomPrice - iPrice) / iCustomPrice) * 100).toFixed(iOfftoFixed) + '%';
            } else if (sDisplayAmount == 'w') {
                sSaleText = parseInt(iCustomPrice - iPrice).toString().replace(regexp, ',') + '원 OFF';
            }
            salePriceEl.append("<div class='sale_box'>" + sSaleText + "</div>");
        }
    }

	/* 상품 할인율 실행 */
	setTimeout(function(){
		sale_percent();
	}, 300);

	/* [더보기] 버튼 클릭시 상품로딩되고 0.6초후 재계산 - 서정환 */
	jQuery(".btnMore").click( function( ){
		setTimeout(function(){
			sale_percent();
		}, 600);
	});
});

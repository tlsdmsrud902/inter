# 새 인테리어 사진(저장소 루트 photo-*.jpg) → 스킨용 webp / 상품 jpg / 글자 로고
#   python3 docs/tools/inter-images.py        (저장소 루트에서 실행, Pillow 필요)
# 사진 오른쪽 아래 구석의 ✦ 표시가 들어가지 않게 자른다 (x > 1850 · y > 1000 영역 피하기).
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'inter902_s2_260925195134_d_skin1_E/skin1/SkinImg/inter')
PRD = os.path.join(ROOT, 'cafe24-assets/products')
S = {'shelf': 'photo-bookshelf.jpg', 'chair': 'photo-lounge-chair.jpg', 'table': 'photo-dining-table.jpg',
     'wall': 'photo-wall-shelf.jpg', 'bed': 'photo-bed.jpg'}
_cache = {}
def photo(k):
    if k not in _cache: _cache[k] = Image.open(os.path.join(ROOT, S[k])).convert('RGB')
    return _cache[k]

def box(k, cx, cy, w, h):
    """원본 픽셀 기준 중심(cx, cy), 크기 w×h 로 자르기 (사진 밖으로 나가면 안쪽으로 밀기)"""
    im = photo(k); W, H = im.size
    w, h = min(w, W), min(h, H)
    x = min(max(0, cx - w / 2), W - w); y = min(max(0, cy - h / 2), H - h)
    return im.crop((round(x), round(y), round(x + w), round(y + h)))

def webp(name, img, size):
    img.resize(size, Image.LANCZOS).save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=82, method=6)

# 가로 장면 1672×941 : 높이 1016 로 잘라 아래 구석 표시를 뺀다
SCENES = {'scene-bookshelf': ('shelf', 960, 508), 'scene-chair': ('chair', 960, 560), 'scene-table': ('table', 960, 508),
          'scene-wallshelf': ('wall', 930, 508), 'scene-bed': ('bed', 930, 540)}
# 정사각 1254 : (사진, 중심x, 중심y, 한 변)
SQUARES = {
    'sq-bookshelf': ('shelf', 1000, 560, 1000), 'sq-vases': ('shelf', 815, 262, 360), 'sq-plant': ('shelf', 1218, 240, 330),
    'sq-books': ('shelf', 975, 400, 460), 'sq-box': ('shelf', 1175, 905, 380), 'sq-stool': ('shelf', 1000, 905, 700),
    'sq-chair': ('chair', 1000, 660, 820), 'sq-table': ('table', 980, 560, 1000), 'sq-dining-chair': ('table', 500, 560, 560),
    'sq-bowl': ('table', 880, 510, 360), 'sq-plate': ('table', 1265, 560, 400), 'sq-wallshelf': ('wall', 1130, 590, 920),
    'sq-candle': ('wall', 1195, 560, 300), 'sq-frame': ('wall', 520, 495, 440), 'sq-bed': ('bed', 1020, 600, 1000),
    'sq-pillow': ('bed', 1320, 470, 440), 'sq-sidetable': ('bed', 770, 460, 340), 'sq-monstera': ('bed', 180, 560, 440),
    'sq-pillar': ('wall', 830, 540, 330),
}
CARDS = {'card-living': ('shelf', 1000, 558), 'card-bedroom': ('bed', 1130, 558)}      # 3:4 1086×1448
PORTRAIT = {'portrait-shelf': ('shelf', 1000, 558), 'portrait-bed': ('bed', 1080, 558)}  # 4:5 1122×1402
PRODUCTS = [  # 상품 이미지 800×800 (code, 사진, 중심x, 중심y, 한 변)
    ('p01', 'shelf', 1000, 560, 1000), ('p02', 'chair', 1000, 660, 820), ('p03', 'table', 980, 560, 900),
    ('p04', 'table', 500, 560, 560), ('p05', 'wall', 1130, 600, 760), ('p06', 'bed', 1000, 620, 900),
    ('p07', 'bed', 770, 460, 340), ('p08', 'shelf', 1175, 905, 380), ('p09', 'bed', 1320, 470, 440),
    ('p10', 'bed', 870, 700, 520), ('p11', 'table', 1270, 610, 360), ('p12', 'bed', 400, 360, 420),
    ('p13', 'wall', 1900, 420, 200), ('p14', 'chair', 890, 620, 320), ('p15', 'shelf', 815, 262, 360),
    ('p16', 'shelf', 1218, 240, 330), ('p17', 'table', 880, 510, 360), ('p18', 'table', 1265, 560, 400),
    ('p19', 'table', 1170, 410, 220), ('p20', 'wall', 1195, 560, 300), ('p21', 'wall', 520, 495, 440),
    ('p22', 'shelf', 775, 420, 240), ('p23', 'wall', 830, 540, 330), ('p24', 'bed', 180, 560, 440),
]

def text_logo(name, size, text, font_px, color, font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', spacing=0.0):
    im = Image.new('RGBA', size, (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(font, font_px)
    widths = [d.textlength(c, font=f) for c in text]; gap = font_px * spacing
    total = sum(widths) + gap * (len(text) - 1)
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    x = (size[0] - total) / 2; y = (size[1] - (b - t)) / 2 - t
    for c, w in zip(text, widths): d.text((x, y), c, font=f, fill=color); x += w + gap
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', lossless=True)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); os.makedirs(PRD, exist_ok=True)
    for n, (k, cx, cy) in SCENES.items(): webp(n, box(k, cx, cy, 1016 * 16 / 9, 1016), (1672, 941))
    for n, (k, cx, cy, s) in SQUARES.items(): webp(n, box(k, cx, cy, s, s), (1254, 1254))
    for n, (k, cx, cy) in CARDS.items(): webp(n, box(k, cx, cy, 1000 * 3 / 4, 1000), (1086, 1448))
    for n, (k, cx, cy) in PORTRAIT.items(): webp(n, box(k, cx, cy, 1000 * 4 / 5, 1000), (1122, 1402))
    for code, k, cx, cy, s in PRODUCTS:
        box(k, cx, cy, s, s).resize((800, 800), Image.LANCZOS).save(os.path.join(PRD, code + '.jpg'), quality=86)
    text_logo('logo-inter', (560, 200), 'inter', 118, (58, 50, 42, 255), spacing=0.06)
    text_logo('wordmark-inter', (2146, 724), 'inter', 520, (199, 176, 146, 255), spacing=0.04)
    print('done')

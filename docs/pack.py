# 카페24 디자인 복구 파일 만들기 (신규 스킨 작업.md 9-2)
#   python3 docs/pack.py <내려받은 백업.tar.gz> <이미지 서버 번호 pg…>
#   → _deploy/<백업과 같은 이름>.tar.gz
# 원본 백업의 폴더 · 주문서 바로가기(심볼릭 링크)는 그대로 두고, 파일은 우리 스킨(skin1)으로 바꾼다.
# 스킨 이미지(/SkinImg/inter/)는 복구 파일에서 빼고, 파일업로더 주소로 바꿔 쓴다.
import io, os, re, sys, tarfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIN = os.path.join(ROOT, 'inter902_s2_260925195134_d_skin1_E', 'skin1')
ORIG, PG = sys.argv[1], sys.argv[2]
IMG = 'https://ecimg.cafe24img.com/%s/inter902/inter/' % PG
TEXT = ('.html', '.js', '.css', '.json', '.txt', '.xml')
SKIP_DIR = 'SkinImg/inter/'          # 파일업로더에 따로 올림

src = tarfile.open(ORIG)
members = src.getmembers()
TOP = members[0].name.split('/')[0]   # 원본 최상위 폴더 이름 (새 계정은 base)
out_dir = os.path.join(ROOT, '_deploy'); os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, os.path.basename(ORIG).split('-', 1)[-1] if re.match(r'^[0-9a-f]{8}-', os.path.basename(ORIG)) else os.path.basename(ORIG))

ours = {}
for d, _, fs in os.walk(SKIN):
    for f in fs:
        rel = os.path.relpath(os.path.join(d, f), SKIN).replace(os.sep, '/')
        if rel.startswith(SKIP_DIR): continue
        data = open(os.path.join(d, f), 'rb').read()
        if rel.endswith(TEXT):
            t = data.decode('utf-8')
            # jsDelivr 주소(…/skin1/SkinImg/inter/)는 그대로 두고, 스킨 경로만 파일업로더 주소로
            t = re.sub(r'(?<!skin1)/SkinImg/inter/', IMG, t)
            data = t.encode('utf-8')
        ours[rel] = data

stat = {'link': 0, 'replaced': 0, 'kept': 0, 'added': 0}
now = time.time()
with tarfile.open(out_path, 'w:gz', format=tarfile.GNU_FORMAT) as dst:
    done = set()
    for m in members:
        rel = m.name[len(TOP) + 1:]
        if m.isdir():
            dst.addfile(m); continue
        if m.issym() or m.islnk():
            dst.addfile(m); stat['link'] += 1; continue
        if rel in ours:
            m.size = len(ours[rel]); m.mtime = now
            dst.addfile(m, io.BytesIO(ours[rel])); stat['replaced'] += 1; done.add(rel)
        else:
            dst.addfile(m, src.extractfile(m)); stat['kept'] += 1
    dirs = {m.name for m in members if m.isdir()}
    for rel in sorted(set(ours) - done):
        parts = rel.split('/')
        for i in range(1, len(parts)):
            d = TOP + '/' + '/'.join(parts[:i])
            if d not in dirs:
                ti = tarfile.TarInfo(d); ti.type = tarfile.DIRTYPE; ti.mode = 0o755; ti.mtime = now
                dst.addfile(ti); dirs.add(d)
        ti = tarfile.TarInfo(TOP + '/' + rel); ti.size = len(ours[rel]); ti.mode = 0o644; ti.mtime = now
        dst.addfile(ti, io.BytesIO(ours[rel])); stat['added'] += 1
print(out_path); print(stat, '%.2fMB' % (os.path.getsize(out_path) / 1048576))

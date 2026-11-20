"""단체 히어로 합성 v3 (3200x1500): 겹(row)별 엇갈린 자리 격자 + 얼굴 가림 검사.
겹 A(맨 뒤) ~ D(왼쪽 앞), 그 앞에 부주장 3, 맨 앞 주장. 경기 카드(오른쪽 아래)와 문구(왼쪽 아래)에 얼굴이 들어가지 않게.
각 자리 = (머리 가운데 x, 머리 위 y, 배율). 자리마다 흔들림을 조금 줘 가지런하지 않게.
사용: python compose3.py <refined> <bbox.json> <out.jpg> [seed]"""
import json
import random
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REF, BBOX, OUT = Path(sys.argv[1]), json.load(open(sys.argv[2])), sys.argv[3]
rnd = random.Random(int(sys.argv[4]) if len(sys.argv) > 4 else 3)
W, H = 3200, 1500
CARD = (1807, 530)   # x 보다 오른쪽이면 얼굴 아래 끝 <= y
TEXT = (1378, 860)   # x 보다 왼쪽이면 얼굴 아래 끝 <= y
X_MIN, X_MAX = 300, 2890

CAP = ('최진규', 1600, 246, 0.96, 1.05, 0.0)
VCS = [('6번김대현', 1290, 300, 0.72, 0.99, 0.0), ('윤창욱', 1915, 286, 0.72, 0.99, 0.0), ('김종문', 2200, 262, 0.70, 0.98, 0.0)]

ROWS = {  # 이름: (배율, 머리 위 y, x 시작, x 끝, 간격, 밝기, 흐림)
    'A': (0.45, 168, 340, 2860, 128, 0.80, 0.5),
    'B': (0.50, 286, 400, 2860, 132, 0.86, 0.3),
    'C': (0.54, 420, 360, 1080, 140, 0.91, 0.0),
    'D': (0.58, 566, 420, 1060, 150, 0.95, 0.0),
}
# 사람 → 겹. 노란 GK 는 몸이 가려지는 뒤쪽으로, 양지훈(셔츠 든 포즈)은 맨 뒤
ASSIGN = {
    'A': ['양지훈', '이상욱', '김선빈', '안현국', '정우민', '이준형', '한견희', '안성혁', '부성인', '서진영', '이효수', '정대연'],
    'B': ['임우성', '오영택', '김영민', '강민원', '이지훈', '원해연', '조현웅', '문직수', '22번김종호'],
    'C': ['박재희', '김남석', '김진수', '18번김대현'],
    'D': ['김영록', '30번김종호', '이상호'],
}
assert sum(len(v) for v in ASSIGN.values()) == 28

_cache = {}


def person(name, s):
    key = (name, round(s, 3))
    if key not in _cache:
        im = Image.open(REF / f'{name}.png').convert('RGBA')
        _cache[key] = np.array(im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)).astype(np.float32)
    return _cache[key]


def geom(name, cx, top, s):
    b = BBOX[name]
    arr = person(name, s)
    x0, y0 = int(round(cx - b['head_cx'] * s)), int(round(top - b['top'] * s))
    hw = b['head_w'] * s
    face = (int(cx - hw * 0.40), int(top + hw * 0.18), int(cx + hw * 0.40), int(top + hw * 1.10))
    return arr, x0, y0, face


def paste_mask(dst, a, x0, y0):
    h, w = a.shape
    cx0, cy0, cx1, cy1 = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if cx1 > cx0 and cy1 > cy0:
        dst[cy0:cy1, cx0:cx1] = np.maximum(dst[cy0:cy1, cx0:cx1], a[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0])


def coverage(front, a, x0, y0, face):
    fx0, fy0, fx1, fy1 = max(0, face[0]), max(0, face[1]), min(W, face[2]), min(H, face[3])
    own = a[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0] > 0.5
    if own.sum() == 0:
        return 1.0
    return ((front[fy0:fy1, fx0:fx1] > 0.5) & own).sum() / own.sum()


def allowed(face):
    if face[0] < X_MIN or face[2] > X_MAX:
        return False
    if face[2] > CARD[0] and face[3] > CARD[1]:
        return False
    if face[0] < TEXT[0] and face[3] > TEXT[1]:
        return False
    return True


front = np.zeros((H, W), np.float32)
placed = []
for name, cx, top, s, br, bl in [CAP] + VCS:
    arr, x0, y0, face = geom(name, cx, top, s)
    paste_mask(front, arr[..., 3] / 255.0, x0, y0)
    placed.append((name, cx, top, s, br, bl, 'F'))

# 앞 겹부터(D → C → B → A) 자리 고르기
for row in ['D', 'C', 'B', 'A']:
    s0, top0, xa, xb, step, br, bl = ROWS[row]
    people = ASSIGN[row][:]
    rnd.shuffle(people)
    # 엇갈림: 겹마다 반 칸씩 밀기
    off = {'A': 0, 'B': step // 2, 'C': 0, 'D': step // 2}[row]
    slots = list(range(xa + off, xb + 1, step))
    rnd.shuffle(slots)
    cands = []
    for cx in slots:
        for dy in (0, -12, 12, -24, 24):
            for dx in (0, -18, 18, -36, 36):
                cands.append((cx + dx + rnd.randint(-6, 6), top0 + dy + rnd.randint(-5, 5)))
    used = []
    for name in people:
        s = s0 * rnd.uniform(0.97, 1.03)
        best = None
        for cx, top in cands:
            if any(abs(cx - u) < step * 0.72 for u in used):
                continue
            arr, x0, y0, face = geom(name, cx, top, s)
            if not allowed(face):
                continue
            cov = coverage(front, arr[..., 3] / 255.0, x0, y0, face)
            if cov > 0.06:
                continue
            score = cov * 300 + abs(top - top0) * 0.5 + rnd.random() * 5
            if best is None or score < best[0]:
                best = (score, cx, top, arr, x0, y0)
        if best is None:
            print('자리 없음', row, name)
            continue
        _, cx, top, arr, x0, y0 = best
        used.append(cx)
        paste_mask(front, arr[..., 3] / 255.0, x0, y0)
        placed.append((name, cx, top, s, br * rnd.uniform(0.97, 1.03), bl, row))
        print(f'{row} {name} cx={cx} top={top} s={s:.3f}')

# 남은 사람: 전체 빈 곳에서 (다른 얼굴과 겹치지 않고, 앞사람에 6% 넘게 가리지 않는) 자리 찾기
faces_now = [geom(n, cx, t, sc)[3] for n, cx, t, sc, *_ in placed]
missing = [n for row in ASSIGN for n in ASSIGN[row] if n not in {p[0] for p in placed}]
for name in missing:
    best = None
    for s in (0.47, 0.45, 0.43, 0.41, 0.39):
        for top in range(150, 640, 10):
            for cx in range(X_MIN + 30, X_MAX - 30, 12):
                arr, x0, y0, face = geom(name, cx, top, s)
                if not allowed(face):
                    continue
                if any(not (face[2] < f[0] + 6 or face[0] > f[2] - 6 or face[3] < f[1] + 6 or face[1] > f[3] - 6) for f in faces_now):
                    continue
                cov = coverage(front, arr[..., 3] / 255.0, x0, y0, face)
                if cov > 0.06:
                    continue
                score = cov * 300 + (0.47 - s) * 400 + abs(top - 260) * 0.2
                if best is None or score < best[0]:
                    best = (score, cx, top, s, arr, x0, y0, face)
        if best:
            break
    if best is None:
        print('끝내 자리 없음', name)
        continue
    _, cx, top, s, arr, x0, y0, face = best
    paste_mask(front, arr[..., 3] / 255.0, x0, y0)
    faces_now.append(face)
    placed.append((name, cx, top, s, 0.80, 0.4, 'E'))
    print(f'E {name} cx={cx} top={top} s={s:.3f}')

print('placed', len(placed))
json.dump(placed, open(Path(OUT).with_suffix('.layout.json'), 'w'), ensure_ascii=False)
if len(placed) < 32:
    sys.exit(1)

# ── 렌더(뒤 → 앞) ──
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
glow = np.exp(-(((xx - 1600) / 1200) ** 2 + ((yy - 470) / 480) ** 2))
canvas = glow[..., None] * np.array([10, 16, 40], np.float32)
for name, cx, top, s, br, bl, _row in reversed(placed):
    arr, x0, y0, _ = geom(name, cx, top, s)
    rgb, a = arr[..., :3].copy(), arr[..., 3] / 255.0
    if bl > 0:
        rgb = cv2.GaussianBlur(rgb, (0, 0), bl)
        a = cv2.GaussianBlur(a, (0, 0), bl * 0.6)
    h = a.shape[0]
    fy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    a = a * np.clip((1.0 - fy) / 0.38, 0, 1) ** 1.3
    rgb = rgb * br
    if br < 0.95:
        rgb = rgb * 0.92 + np.array([10, 16, 38], np.float32) * 0.08
    cx0, cy0, cx1, cy1 = max(0, x0), max(0, y0), min(W, x0 + a.shape[1]), min(H, y0 + h)
    sr = rgb[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
    sa = a[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
    shadow = cv2.GaussianBlur(sa, (0, 0), 16 * s + 4) * 0.45
    reg = canvas[cy0:cy1, cx0:cx1]
    reg *= (1 - shadow[..., None])
    reg[:] = reg * (1 - sa[..., None]) + sr * sa[..., None]

top_f = np.clip(yy / 190, 0, 1) ** 0.8
bottom_f = np.clip((H - yy) / 520, 0, 1) ** 1.4
side_f = np.clip(np.minimum(xx, W - xx) / 380, 0, 1) ** 1.2
canvas *= (top_f * bottom_f * side_f)[..., None]
Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8)).save(OUT, quality=86, optimize=True, progressive=True)
print('ok', OUT)

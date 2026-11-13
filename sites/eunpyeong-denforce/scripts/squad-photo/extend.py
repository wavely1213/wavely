"""소유자 단체 사진(1920x1080, 글자 없음)을 히어로 비율에 맞게 검정으로 확장한다.
위 T, 양옆 S, 아래 B. 원본 좌우 끝(사람이 잘린 경계)은 FADE px 동안 검정으로 서서히 이어 붙인다.
히어로는 cover + object-position center 30% (Hero.module.css) — calc.py 로 폭별 보이는 범위를 확인."""
import sys
from PIL import Image, ImageChops, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
T, S, B, FADE, FADE_TOP = (int(sys.argv[3]) if len(sys.argv) > 3 else 300), 640, (int(sys.argv[4]) if len(sys.argv) > 4 else 120), 160, 60

src = Image.open(SRC).convert('RGB')
w, h = src.size
assert (w, h) == (1920, 1080), (w, h)

# 좌우/위 경계를 검정으로 녹이는 마스크(원본 위에 곱함)
mask = Image.new('L', (w, h), 255)
d = ImageDraw.Draw(mask)
for i in range(FADE):
    v = int(255 * (i / FADE) ** 1.6)
    d.line([(i, 0), (i, h)], fill=v)
    d.line([(w - 1 - i, 0), (w - 1 - i, h)], fill=v)
top = Image.new('L', (w, h), 255)
dt = ImageDraw.Draw(top)
for i in range(FADE_TOP):
    dt.line([(0, i), (w, i)], fill=int(255 * (i / FADE_TOP)))
mask = ImageChops.darker(mask, top)  # 좌우 마스크와 위 마스크 중 어두운 쪽

black = Image.new('RGB', (w, h), (0, 0, 0))
faded = Image.composite(src, black, mask)

canvas = Image.new('RGB', (w + 2 * S, h + T + B), (0, 0, 0))
canvas.paste(faded, (S, T))
canvas.save(OUT, quality=84, optimize=True, progressive=True)
print(canvas.size)

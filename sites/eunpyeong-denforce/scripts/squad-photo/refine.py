"""누끼 테두리 다시 따기 (선수별).
문제: 반투명 테두리에 원래 밝은 배경색이 섞여(밝기 ~170) 어두운 바탕에서 빛나 보인다.
방법:
  1) 확실한 몸 영역(core) = alpha >= 0.98 을 CORE_ERODE px 깎은 것.
  2) core 밖(테두리 띠 + 반투명)의 색 = 가장 가까운 core 픽셀 색(거리 변환) → 살짝 흐려 이음매 정리.
  3) alpha 를 CHOKE 만큼 안쪽으로(반투명 낮은 값 잘라냄) + ERODE px 깎고 FEATHER 로 부드럽게.
결과: out/<이름>.png (RGBA, 원본 크기), 선수별 값은 OVERRIDES 로 조정.
사용: python refine.py <cut 폴더> <out 폴더> [이름 ...]"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

DEFAULT = dict(core_erode=2, choke=0.25, erode=1, feather=0.9)
OVERRIDES = {}  # 예: '임우성': dict(erode=2)


def refine(src: Path, dst: Path, p: dict):
    im = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    rgb, a = im[..., :3], im[..., 3] / 255.0

    core = ndimage.binary_erosion(a >= 0.98, iterations=p['core_erode'])
    # 가장 가까운 core 픽셀 색으로 바깥을 채운다
    _, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
    filled = rgb[iy, ix]
    # 이음매가 각지지 않게 바깥 띠만 살짝 흐림
    blur = cv2.GaussianBlur(filled, (0, 0), 1.2)
    band = ~core
    out_rgb = np.where(band[..., None], blur, rgb)

    # alpha 다시 따기: 낮은 반투명 잘라내고 안쪽으로 깎은 뒤 부드럽게
    a2 = np.clip((a - p['choke']) / (1 - p['choke']), 0, 1)
    if p['erode'] > 0:
        a2 = cv2.erode(a2, np.ones((3, 3), np.uint8), iterations=p['erode'])
    if p['feather'] > 0:
        a2 = cv2.GaussianBlur(a2, (0, 0), p['feather'])
    a2 = np.minimum(a2, a)  # 원래보다 넓어지지 않게

    out = np.dstack([np.clip(out_rgb, 0, 255), a2 * 255]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(dst, optimize=True)


if __name__ == '__main__':
    src_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    names = sys.argv[3:] or [f.stem for f in sorted(src_dir.glob('*.png'))]
    for n in names:
        p = {**DEFAULT, **OVERRIDES.get(n, {})}
        refine(src_dir / f'{n}.png', out_dir / f'{n}.png', p)
        print('ok', n, p)

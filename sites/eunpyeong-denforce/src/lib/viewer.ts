// 사진 크게 보기(NewsGallery) 계산 — 순수 함수 (테스트: viewer.test.ts)

/** 이만큼(px) 넘게 옆으로 밀어야 사진을 넘긴다 — 살짝 닿은 손가락·세로 스크롤과 구분 */
export const SWIPE_MIN_PX = 50;

/** count 장 중 index 에서 step 만큼 옆 사진 — 끝에서 다음은 처음, 처음에서 이전은 끝 */
export function stepIndex(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}

/**
 * 손가락으로 민 거리(끝 - 시작) → 넘길 방향. 왼쪽으로 밀면 다음(1), 오른쪽으로 밀면 이전(-1),
 * 짧거나 옆보다 위아래로 더 민 것은 0
 */
export function swipeStep(dx: number, dy: number, min = SWIPE_MIN_PX): -1 | 0 | 1 {
  if (Math.abs(dx) < min || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

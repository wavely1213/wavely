// 가로로 넘치는 탭 줄(ScrollRow) 계산 — 순수 함수 (테스트: scroll-row.test.ts)

/** 소수점 스크롤 값(고해상도 화면) 때문에 끝에 닿았는데도 덜 닿은 것으로 보지 않게 두는 여유 (px) */
const EDGE_TOLERANCE = 1;

/** 줄 양 끝 중 가려진 탭이 있는 쪽 — 그쪽을 흐리게 한다 */
export function edgeFades(scrollLeft: number, scrollWidth: number, clientWidth: number): { start: boolean; end: boolean } {
  return {
    start: scrollLeft > EDGE_TOLERANCE,
    end: scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE,
  };
}

/**
 * 고른 탭(줄 안의 start~end 위치)이 다 보이게 할 scrollLeft.
 * 이미 다 보이면 지금 값 그대로, 아니면 탭을 가운데로 (줄 처음/끝을 넘지 않게).
 * margin: 양 끝 흐림 폭 — 그 안에 걸친 탭도 가려진 것으로 본다.
 */
export function revealScrollLeft({
  start,
  end,
  scrollLeft,
  clientWidth,
  scrollWidth,
  margin = 0,
}: {
  start: number;
  end: number;
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  margin?: number;
}): number {
  const max = Math.max(0, scrollWidth - clientWidth);
  const visibleFrom = scrollLeft === 0 ? 0 : scrollLeft + margin;
  const visibleTo = scrollLeft >= max ? scrollWidth : scrollLeft + clientWidth - margin;
  if (start >= visibleFrom && end <= visibleTo) return scrollLeft;
  const centered = start - (clientWidth - (end - start)) / 2;
  return Math.min(max, Math.max(0, Math.round(centered)));
}

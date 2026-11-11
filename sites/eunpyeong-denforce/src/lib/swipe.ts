// 옆으로 넘기는 카드 줄(SwipeRow) 계산 — DOM 없이 테스트할 수 있게 분리

/**
 * 넘김 거리와 점 개수 (2단계 검토 G3).
 * - 한 칸 거리 = 첫 두 칸 offsetLeft 차이(칸 + 사이), 보이는 칸 수 = floor((보이는 폭 + 사이) / 한 칸 거리)
 * - 한 칸만 보이면(휴대폰) 칸마다 점: count = 칸 수 - 보이는 칸 수 + 1, 여러 칸이면(PC) 페이지 단위 올림
 * - 넘기지 않는 줄(PC 경기 띠, overflow-x visible)은 점 없음
 */
export function swipeMetrics(input: { clientWidth: number; pad: number; gap: number; itemStep: number; items: number; scrolls: boolean }): {
  step: number;
  count: number;
} {
  const { clientWidth, pad, gap, itemStep, items, scrolls } = input;
  if (!scrolls || items <= 1 || itemStep <= 0) return { step: Math.max(1, itemStep), count: 1 };
  const visible = Math.max(1, Math.floor((clientWidth - pad + gap + 1) / itemStep));
  if (visible >= items) return { step: itemStep, count: 1 };
  const count = visible === 1 ? items - visible + 1 : Math.ceil(items / visible);
  return { step: visible * itemStep, count };
}

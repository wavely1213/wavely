// 메인 스폰서 띠(한 줄 자동 흐름) 도우미 (D-029)

/** 띠 절반(한 바퀴)에 들어갈 최소 칸 수 — 가장 좁은 칸(정사각 로고 64 + 여백 80 = 144px)으로도 4K(3840px) 화면을 덮어 끝이 비지 않게 */
export const MARQUEE_MIN_ITEMS = 28;
/** 칸 하나가 지나가는 시간(초) — 칸 수에 비례해 속도를 일정하게 */
export const MARQUEE_SECONDS_PER_ITEM = 4;

/**
 * 끊김 없이 도는 띠의 칸 목록. 앞 절반 = 스폰서를 최소 칸 수만큼 되풀이, 뒤 절반 = 그 복제.
 * 띠를 -50% 까지 옮기면 처음과 같은 모양이 되어 이어진다.
 * 맨 앞 스폰서 수만큼만 실제 목록이고 나머지는 화면용 복제(clone — 스크린리더·탭 제외).
 */
export function marqueeLoop<T>(items: readonly T[], minItems = MARQUEE_MIN_ITEMS) {
  if (items.length === 0) return { cells: [] as Array<{ item: T; key: string; clone: boolean }>, seconds: 0 };
  const reps = Math.ceil(minItems / items.length);
  const half = Array.from({ length: reps }, () => items).flat();
  const cells = [...half, ...half].map((item, i) => ({ item, key: String(i), clone: i >= items.length }));
  return { cells, seconds: half.length * MARQUEE_SECONDS_PER_ITEM };
}

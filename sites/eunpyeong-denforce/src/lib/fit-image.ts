/** 사진 비율 ÷ 칸 비율이 이 범위면 칸을 꽉 채운다 (조금 잘려도 괜찮은 정도) — 밖이면 사진 전체를 보인다 */
export const FILL_MIN = 0.75;
export const FILL_MAX = 1.4;

/** 사진(natural)과 칸(box) 크기로 꽉 채울지 판정. 크기를 모르면 전체 보기(false) */
export function shouldFill(naturalW: number, naturalH: number, boxW: number, boxH: number): boolean {
  if (!naturalW || !naturalH || !boxW || !boxH) return false;
  const r = naturalW / naturalH / (boxW / boxH);
  return r >= FILL_MIN && r <= FILL_MAX;
}

// 주장단 표식 (D-093, 디자인 ① 파랑 면 배지 bc43899, 섹션 252:26194) — 순수 함수 (테스트: captain.test.ts)
export type Captain = "C" | "VC";

export const CAPTAINS: readonly Captain[] = ["C", "VC"];

/** 상세 포지션 옆 글자, 배지의 읽기 프로그램 이름 */
export const CAPTAIN_LABEL: Record<Captain, string> = { C: "주장", VC: "부주장" };

/** 폼/DB 값 → 주장단 (빈 값은 null, 모르는 값은 undefined = 오류) */
export function parseCaptain(raw: string | null | undefined): Captain | null | undefined {
  const v = (raw ?? "").trim();
  if (v === "") return null;
  return (CAPTAINS as readonly string[]).includes(v) ? (v as Captain) : undefined;
}

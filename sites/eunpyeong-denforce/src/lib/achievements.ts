// 연혁 화면 맨 위 성과 띠 (리디자인 3차 AchievementStrip 146:737) — 데이터에서만 만든다(없는 칸은 숨김, 지어내지 않음).
import type { HistoryItem } from "@/types";

export type Achievement = { label: string; value: string };

/** '서울은평 FS 창단' 같은 문구에서 연도 — 'YYYY-MM-DD' 또는 'YYYY' */
function yearOf(date: string | null | undefined): string | null {
  const m = date?.match(/^(\d{4})/);
  return m ? m[1] : null;
}

/**
 * 성과 띠 칸: SINCE(창단 연도) / 가장 최근 리그 우승(연혁에서 '리그'와 '우승'이 든 항목, 준우승 제외) / 배출 국가대표 수.
 * history 는 최근 먼저(연혁 화면 순서). 리그 우승 문구는 ' / ' 앞까지('FK리그 2부(드림리그) 우승 / 1부 승격' → 'FK리그 2부(드림리그) 우승').
 */
export function achievementItems(input: { foundedDate: string | null; history: HistoryItem[]; alumniCount: number }): Achievement[] {
  const items: Achievement[] = [];
  const since = yearOf(input.foundedDate);
  if (since) items.push({ label: "SINCE", value: since });
  const title = input.history.find((h) => /리그/.test(h.text) && /(^|[^준])우승/.test(h.text));
  if (title) items.push({ label: title.text.split(" / ")[0].trim(), value: title.year });
  if (input.alumniCount > 0) items.push({ label: "국가대표 배출", value: `${input.alumniCount}명` });
  return items;
}

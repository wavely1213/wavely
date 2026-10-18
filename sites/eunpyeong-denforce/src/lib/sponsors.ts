// 스폰서 도우미 — 메인 스폰서 띠(한 줄 자동 흐름, D-029)와 /sponsors 페이지. 순수 함수만 (테스트: sponsors.test.ts)
import type { SponsorTier } from "@/types";

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

// ── /sponsors 페이지 ─────────────────────────

/**
 * /sponsors 격자가 될 수 있는 칸 수 중 2칸 이상 (휴대폰 1칸 ~ PC 5칸).
 * SponsorStrip.module.css 의 칸 수별 @container 구간(칸 최소 220px, 간격 12px)과 같아야 한다.
 */
export const SPONSOR_GRID_COLUMNS: readonly number[] = [2, 3, 4, 5];

/**
 * 네이밍 스폰서 칸을 두 칸 폭으로 넓힐 격자 칸 수 — 스폰서마다 목록으로 (예: [[], [], [], [3, 5], [], []]).
 * 순서는 소유자가 정한 그대로 둔다: 줄 끝에 한 칸만 남은 자리라 넓히면 그 줄에 빈칸이 생기는 칸 수에서는 넓히지 않는다.
 * 1칸(휴대폰)은 모든 칸이 한 줄 전체라 넓힐 필요가 없다.
 */
export function wideColumns(tiers: readonly SponsorTier[], columnCounts: readonly number[] = SPONSOR_GRID_COLUMNS): number[][] {
  const out = tiers.map(() => [] as number[]);
  for (const columns of columnCounts) {
    let at = 0; // 지금 줄에서 다음 칸이 들어갈 자리 (0부터)
    tiers.forEach((tier, i) => {
      const wide = tier === "naming" && at + 2 <= columns;
      if (wide) out[i].push(columns);
      at = (at + (wide ? 2 : 1)) % columns;
    });
  }
  return out;
}

/**
 * 스폰서십 문의 상자의 리그 참가 한 줄 — 대회명(LEAGUE.currentCompetition)에서 만든다 (시즌이 바뀌면 따라 바뀜).
 * "2026-27 FK1리그" → "2026-27 시즌 FK리그 1부(FK1) 참가". 시즌 연도/부가 없는 이름(컵대회 등)이면 null (줄을 숨긴다).
 */
export function leagueEntryLine(competition: string): string | null {
  const m = competition.trim().match(/^(\d{4}-\d{2})\s+FK(\d)리그$/);
  return m ? `${m[1]} 시즌 FK리그 ${m[2]}부(FK${m[2]}) 참가` : null;
}

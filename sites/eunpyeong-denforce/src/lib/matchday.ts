// 매치데이 포스터 팝업 (D-096) — 순수 함수 (테스트: matchday.test.ts)
// 보이는 때: 경기 날(한국 시간) 0시 ≤ 지금 < 다음 날 0시, 그리고 결과 입력(종료) 전, 포스터가 있을 때. 홈(/)에서만, 하루 한 번.
// 화면은 미리 만들어 캐시하므로 '지금'은 브라우저에서 잰다(D-092 LiveGate 와 같음) — 서버는 창(시작/끝)과 포스터만 넘긴다.
// 결과가 입력되면 경기 캐시가 새로 만들어져 창이 사라진다.
import type { Match } from "@/types";

const KST_MS = 9 * 3600_000;
const DAY_MS = 24 * 3600_000;

export type PosterWindow = { matchId: string; start: number; end: number; poster: string; opponent: string };

/** 'YYYY-MM-DD' (한국 시간) */
export function kstDay(ms: number): string {
  return new Date(ms + KST_MS).toISOString().slice(0, 10);
}

/** 그 시각이 든 한국 날짜의 0시 (ms) */
function kstMidnight(ms: number): number {
  return Math.floor((ms + KST_MS) / DAY_MS) * DAY_MS - KST_MS;
}

/** 이 경기의 포스터 창. 종료 경기, 포스터 없음(https 아님), 날짜 오류면 null */
export function posterWindow(m: Pick<Match, "id" | "kickoff" | "status" | "opponent" | "matchdayPoster">): PosterWindow | null {
  if (m.status !== "scheduled") return null;
  if (!m.matchdayPoster?.startsWith("https://")) return null;
  const k = Date.parse(m.kickoff);
  if (!Number.isFinite(k)) return null;
  const start = kstMidnight(k);
  return { matchId: m.id, start, end: start + DAY_MS, poster: m.matchdayPoster, opponent: m.opponent };
}

/** 앞으로(어제 0시 이후) 포스터 창들, 시작 순 — 서버가 화면에 넘길 목록 */
export function posterWindows(matches: readonly Match[], since: number): PosterWindow[] {
  return matches
    .map(posterWindow)
    .filter((w): w is PosterWindow => w !== null && w.end > since)
    .sort((a, b) => a.start - b.start);
}

/** 지금 보일 창 (같은 날 두 경기면 먼저 시작하는 것) */
export function activePoster(windows: readonly PosterWindow[], now: number): PosterWindow | null {
  return windows.find((w) => now >= w.start && now < w.end) ?? null;
}

/** 브라우저 저장 키 — 값은 닫은 날(한국 날짜). 하루 한 번 */
export const POSTER_SEEN_KEY = "wavely.matchdayPoster.seen";

/** 저장된 값이 '오늘'이 아니면 보인다 (저장값이 없거나 읽을 수 없어도 보인다) */
export function shouldShowPoster(seen: string | null, now: number): boolean {
  return seen !== kstDay(now);
}

/** 다음에 상태가 바뀌는 때까지 남은 시간(ms) — 화면이 그때 다시 잰다. 없으면 null */
export function msUntilPosterChange(windows: readonly PosterWindow[], now: number): number | null {
  const edges = windows.flatMap((w) => [w.start, w.end]).filter((t) => t > now);
  return edges.length ? Math.min(...edges) - now : null;
}

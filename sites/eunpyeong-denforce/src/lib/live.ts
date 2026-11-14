// 경기 당일 LIVE + 생중계 보기 (D-092) — 순수 함수 (테스트: live.test.ts)
// 보이는 때: 생중계 주소(replay_url)가 있고, 킥오프 2시간 전 ≤ 지금 < 킥오프 4시간 뒤, 그리고 결과 입력(종료) 전.
// 화면은 미리 만들어 캐시하므로 '지금'은 브라우저에서 잰다(LiveGate) — 서버는 창(시작/끝)만 넘긴다.
import type { Match } from "@/types";

export const LIVE_BEFORE_MS = 2 * 3600_000;
export const LIVE_AFTER_MS = 4 * 3600_000;

export type LiveWindow = { start: number; end: number; href: string };

/** 이 경기가 LIVE 로 보일 수 있는 시간 창. 종료 경기, 주소 없음, 날짜 오류면 null */
export function liveWindow(m: Pick<Match, "kickoff" | "status" | "replayUrl">): LiveWindow | null {
  if (m.status !== "scheduled") return null;
  if (!m.replayUrl?.startsWith("https://")) return null;
  const k = Date.parse(m.kickoff);
  if (!Number.isFinite(k)) return null;
  return { start: k - LIVE_BEFORE_MS, end: k + LIVE_AFTER_MS, href: m.replayUrl };
}

export function isLive(w: LiveWindow | null, now: number): boolean {
  return w !== null && now >= w.start && now < w.end;
}

/** 다음에 상태가 바뀌는 때까지 남은 시간(ms) — 없으면 null. 화면이 그때 다시 잰다 */
export function msUntilChange(w: LiveWindow | null, now: number): number | null {
  if (!w) return null;
  if (now < w.start) return w.start - now;
  if (now < w.end) return w.end - now;
  return null;
}

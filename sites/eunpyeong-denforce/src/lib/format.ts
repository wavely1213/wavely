// 표시용 포맷터. 날짜는 항상 한국 시간 기준으로 보여준다.
import type { Match } from "@/types";

const TZ = "Asia/Seoul";

export function formatKickoff(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

/** "2026-10-15" → "2026.10.15", "2019" → "2019", "" → "" */
export function formatPostDate(date: string) {
  return date.replaceAll("-", ".");
}

export function matchResult(m: Match): "W" | "D" | "L" | null {
  if (!m.score) return null;
  if (m.score.us > m.score.them) return "W";
  if (m.score.us < m.score.them) return "L";
  return "D";
}

/** 홈팀을 왼쪽에 두는 표기 (BR-002) */
export function matchSides(m: Match, ourName: string) {
  const [home, away] = m.isHome ? [ourName, m.opponent] : [m.opponent, ourName];
  const score = m.score ? (m.isHome ? [m.score.us, m.score.them] : [m.score.them, m.score.us]) : null;
  return { home, away, score };
}

export const RESULT_LABEL = { W: "승", D: "무", L: "패" } as const;

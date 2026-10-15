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

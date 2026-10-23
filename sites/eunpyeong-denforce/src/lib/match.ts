import type { Match } from "@/types";
import { formatKickoffFull, matchSides } from "./format.ts";

/** 연속된 같은 대회끼리 묶는다 (목록 순서 유지) */
export function groupByCompetition(matches: Match[]) {
  const groups: Array<{ competition: string; matches: Match[] }> = [];
  for (const m of matches) {
    const last = groups.at(-1);
    if (last && last.competition === m.competition) last.matches.push(m);
    else groups.push({ competition: m.competition, matches: [m] });
  }
  return groups;
}

/** "2025-26 FK1리그 · 1R" — 라운드가 없으면 대회명만 */
export function matchLabel(m: Pick<Match, "competition" | "round">) {
  return m.round ? `${m.competition} / ${m.round}` : m.competition;
}

/**
 * 메인 '경기' 카드 2장 (오른쪽 위젯 옆이라 2칸, D-034):
 * 지난 경기 1 + 다음 경기 1, 지난 경기가 없으면 예정 2, 시즌 휴식기(예정 없음)에는 최근 결과 2.
 * finished 는 최근 먼저, upcoming 은 가까운 순.
 */
export function homeMatchItems(finished: Match[], upcoming: Match[], count = 2): Array<{ match: Match; label: string }> {
  if (upcoming.length === 0) return finished.slice(0, count).map((match) => ({ match, label: "지난 경기" }));
  const past = finished.slice(0, Math.min(1, count - 1)).map((match) => ({ match, label: "지난 경기" }));
  const next = upcoming.slice(0, count - past.length).map((match, i) => ({ match, label: i === 0 ? "다음 경기" : "예정" }));
  return [...past, ...next];
}

/**
 * 경기일정이 비었을 때(시즌 휴식기) 안내 문구 아래 바로가기 — 막다른 화면이 되지 않게.
 * 구단 인스타그램 주소(관리자 › 구단정보)가 없으면 '일정 발표 소식 받기'는 뺀다.
 */
export function scheduleEmptyLinks(instagramUrl: string | null): Array<{ label: string; href: string; external: boolean }> {
  return [
    { label: "리그순위", href: "/match/standings", external: false },
    { label: "지난 경기 결과", href: "/match/results", external: false },
    ...(instagramUrl ? [{ label: "일정 발표 소식 받기", href: instagramUrl, external: true }] : []),
  ];
}

export type MatchVideoKind = "highlight" | "replay";

export const MATCH_VIDEO_LABEL: Record<MatchVideoKind, string> = { highlight: "하이라이트", replay: "다시보기" };

/** 영상 주소는 https 만 — DB check(20261018100000)와 같은 기준을 화면에서도 한 번 더 */
const isHttpsUrl = (url: string | null): url is string => Boolean(url?.startsWith("https://"));

/** 경기결과 표의 득점자/영상 줄을 보일지 — 종료 경기이고 득점자나 영상 주소가 하나라도 있을 때 */
export function hasMatchDetails(m: Match): boolean {
  return m.status === "finished" && (Boolean(m.scorers) || isHttpsUrl(m.highlightUrl) || isHttpsUrl(m.replayUrl));
}

/**
 * 경기결과 영상 버튼 (하이라이트 → 다시보기, 주소가 있는 것만).
 * 화면 읽기용 이름은 버튼 글자로 시작하고 어느 경기인지 붙인다 — "하이라이트 영상 - 2025-11-15 (토) 서울은평 덴포스 vs 강원FS (새 창)"
 */
export function matchVideoLinks(m: Match, ourName: string): Array<{ kind: MatchVideoKind; url: string; label: string; ariaLabel: string }> {
  const { home, away } = matchSides(m, ourName);
  const game = `${formatKickoffFull(m.kickoff).date} ${home} vs ${away}`;
  const urls: Array<[MatchVideoKind, string | null]> = [
    ["highlight", m.highlightUrl],
    ["replay", m.replayUrl],
  ];
  return urls.flatMap(([kind, url]) =>
    isHttpsUrl(url) ? [{ kind, url, label: MATCH_VIDEO_LABEL[kind], ariaLabel: `${MATCH_VIDEO_LABEL[kind]} 영상 - ${game} (새 창)` }] : [],
  );
}

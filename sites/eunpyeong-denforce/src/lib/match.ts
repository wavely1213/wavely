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
 * 메인 경기 띠(MatchStrip, D-034 → 리디자인 D-067): [지난 경기 | 다음 경기 | 그다음 경기] 최대 3칸.
 * 지난 경기가 없으면 예정만(남은 칸이 폭을 나눔), 시즌 휴식기(예정 없음)에는 최근 결과 3칸.
 * finished 는 최근 먼저, upcoming 은 가까운 순. 다음 경기는 원정 포함.
 */
export function homeMatchItems(finished: Match[], upcoming: Match[], count = 3): Array<{ match: Match; label: string }> {
  if (upcoming.length === 0) return finished.slice(0, count).map((match) => ({ match, label: "지난 경기" }));
  const past = finished.slice(0, Math.min(1, count - 1)).map((match) => ({ match, label: "지난 경기" }));
  // 예정은 최대 count - 1 칸(다음 / 그다음) — 지난 경기가 없어도 '그다음 경기'가 두 번 붙지 않게 (G9)
  const next = upcoming.slice(0, count - 1).map((match, i) => ({ match, label: i === 0 ? "다음 경기" : "그다음 경기" }));
  return [...past, ...next];
}

/**
 * 팀 이름을 줄바꿈 후보 앞에서 나눈 조각 — 띄어쓰기 없는 긴 이름(예: 고양불스풋살클럽)이 칸이 좁을 때
 * '고양불스 / 풋살클럽'처럼 낱말 경계에서 줄바뀌게(화면은 조각 사이에 <wbr>). 띄어쓰기가 있으면 그대로 한 조각.
 */
const NAME_SUFFIX = /(풋살클럽|풋살구단|풋살단|스포츠|FS|FC)$/i;
export function teamNameSegments(team: string): string[] {
  const name = team.trim();
  if (/\s/.test(name)) return [name];
  const m = name.match(NAME_SUFFIX);
  if (!m || m.index === undefined || m.index < 2) return [name];
  return [name.slice(0, m.index), name.slice(m.index)];
}

/** 엠블럼이 없을 때 대체 방패 안 글자 — 팀 이름 앞 2글자 ('고양불스풋살클럽' → '고양', '인천ZD스포츠' → '인천') */
export function crestInitial(team: string): string {
  return Array.from(team.trim()).slice(0, 2).join("");
}

/** 표(24) 대체 방패 글자 — 한 글자. 영문으로 시작하면 첫 글자 대문자('LBFS' → 'L'), 아니면 첫 글자('경기LBFS' → '경') (MatchEmblem 24, a17af68) */
export function crestInitialShort(team: string): string {
  const first = Array.from(team.trim())[0] ?? "";
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
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

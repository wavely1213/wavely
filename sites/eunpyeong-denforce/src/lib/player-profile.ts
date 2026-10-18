// 선수 상세 — 프로필 칸, '시즌 합류' 표시, 검색 설명 (순수 함수, 테스트: player-profile.test.ts)
// 기록 시즌(LEAGUE.statsSeason) 뒤에 영입된 선수는 '출전 0경기 / 득점 0골' 대신 'OOOO-OO 시즌 합류 + 영입 소식'을 보인다.
// 오늘 날짜를 쓰지 않는다 — 소식 날짜로 시즌을 정해서, 캐시된 화면도 날이 바뀌어 틀어지지 않게.
import type { NewsPost, Player } from "@/types";
import { parseRosterNews } from "./admin/alerts.ts";

/** 이 달부터는 다음 시즌 준비(영입)로 본다 — FK리그는 가을에 시작해 봄에 끝난다 */
const SEASON_FROM_MONTH = 5;

/** 'YYYY-MM-DD' → 그 날짜가 속한 시즌 첫 해 (2026-10-16 → 2026, 2027-02-01 → 2026). 날짜를 모르면 null */
export function seasonStartYear(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  return Number(m[2]) >= SEASON_FROM_MONTH ? year : year - 1;
}

/** 시즌 첫 해 → '2026-27' */
export function seasonLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** '2025-26 FK1리그' → 2025 (시즌 표기가 없으면 null) */
export function statsSeasonStartYear(statsSeason: string): number | null {
  const m = /^(\d{4})-\d{2}/.exec(statsSeason);
  return m ? Number(m[1]) : null;
}

export type PlayerJoin = { season: string; post: NewsPost };

/**
 * 선수 이름 → 기록 시즌 뒤의 영입 소식. 없으면 null.
 * - 구단뉴스(news) 제목만 본다. 그 이름의 가장 최근 인사 소식이 영입(선수)일 때만 — 이적 소식이 더 최근이면 null
 * - 같은 이름 선수가 둘 이상이면(김대현처럼, BR-025) 누구 소식인지 몰라 null
 * posts 는 최근 글 먼저(목록 순서).
 */
export function findPlayerJoin(input: { name: string; sameNameCount: number; posts: NewsPost[]; statsSeason: string }): PlayerJoin | null {
  if (input.sameNameCount !== 1) return null;
  const statsYear = statsSeasonStartYear(input.statsSeason);
  if (statsYear == null) return null;
  for (const post of input.posts) {
    if (post.category !== "news") continue;
    const e = parseRosterNews(post.title);
    if (!e || e.staff || e.name !== input.name) continue;
    // 가장 최근 인사 소식 하나만 본다
    if (e.kind !== "join") return null;
    const year = seasonStartYear(post.date);
    return year != null && year > statsYear ? { season: seasonLabel(year), post } : null;
  }
  return null;
}

/** 프로필 칸 (이름표, 값) — 값이 없는 칸(등번호·생년월일·신장)은 뺀다. 합류 선수는 출전/득점 대신 '합류' 칸 */
export function profileRows(player: Player, positionLabel: string, join: PlayerJoin | null): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (player.number != null) rows.push(["등번호", String(player.number)]);
  rows.push(["포지션", `${positionLabel} (${player.position})`]);
  if (player.birth) rows.push(["생년월일", player.birth]);
  if (player.heightCm) rows.push(["신장", `${player.heightCm}cm`]);
  const { apps, goals, assists } = player.stats;
  if (join && apps === 0 && goals === 0) {
    rows.push(["합류", `${join.season} 시즌`]);
    return rows;
  }
  rows.push(["출전", `${apps}경기`], ["득점", `${goals}골`]);
  // 도움은 연맹이 공개하지 않아 기록이 있을 때만 보여준다
  if (assists > 0) rows.push(["도움", `${assists}개`]);
  return rows;
}

/** 검색·미리보기 설명 — '강민원 (아라) - 서울은평 덴포스 선수. 2026-27 시즌 합류' / '… 선수. 2025-26 시즌 12경기 3골' */
export function playerDescription(input: {
  player: Player;
  positionLabel: string;
  clubName: string;
  statsSeason: string;
  join: PlayerJoin | null;
}): string {
  const { player, positionLabel, clubName, statsSeason, join } = input;
  const head = `${player.name} (${positionLabel}) - ${clubName} 선수.`;
  const { apps, goals } = player.stats;
  if (apps === 0 && goals === 0) return join ? `${head} ${join.season} 시즌 합류` : head;
  const year = statsSeasonStartYear(statsSeason);
  const season = year != null ? `${seasonLabel(year)} 시즌 ` : "";
  return `${head} ${season}${apps}경기 ${goals}골`;
}

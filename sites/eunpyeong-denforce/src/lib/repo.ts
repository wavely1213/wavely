// 공개 페이지용 데이터 접근 계층. 페이지는 src/data·DB 를 직접 부르지 않고 이 함수들만 쓴다.
// - Supabase 설정이 있으면 DB, 없으면 정적 데이터 (lib/data/*-source.ts)
// - 'use cache' + 태그로 캐시하고, 관리자 저장 시 updateTag(TAGS.x) 로 즉시 갱신된다
// - cacheLife('minutes'): 태그 갱신이 다른 서버 인스턴스에 닿지 않아도 1분 안에 새 데이터로 바뀐다
import { cacheLife, cacheTag } from "next/cache";
import { POSITION_ORDER } from "@/data/people";
import { TAGS } from "@/lib/cache-tags";
import { dbSource } from "@/lib/data/db-source";
import type { DataSource } from "@/lib/data/source";
import { staticSource } from "@/lib/data/static-source";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Match, NewsCategory, NewsPost, Player, Position } from "@/types";

function source(): DataSource {
  return isSupabaseConfigured() ? dbSource : staticSource;
}

const byKickoff = (a: Match, b: Match) => a.kickoff.localeCompare(b.kickoff);

// ── 구단 정보 ─────────────────────────────────

export async function getClubSettings() {
  "use cache";
  cacheTag(TAGS.club);
  cacheLife("minutes");
  return source().clubSettings();
}

export async function getHistory() {
  "use cache";
  cacheTag(TAGS.history);
  cacheLife("minutes");
  return source().history();
}

// ── 경기 ─────────────────────────────────────

export async function getMatches(): Promise<Match[]> {
  "use cache";
  cacheTag(TAGS.matches);
  cacheLife("minutes");
  return [...(await source().matches())].sort(byKickoff);
}

export async function getUpcomingMatches(): Promise<Match[]> {
  return (await getMatches()).filter((m) => m.status === "scheduled");
}

export async function getFinishedMatches(): Promise<Match[]> {
  return (await getMatches()).filter((m) => m.status === "finished").reverse();
}

/** BR-003: 날짜가 아니라 상태값으로 판단 */
export async function getNextHomeMatch(): Promise<Match | undefined> {
  return (await getUpcomingMatches()).find((m) => m.isHome);
}

/** BR-001: 승점 → 득실차 → 다득점 */
export async function getStandings() {
  "use cache";
  cacheTag(TAGS.standings);
  cacheLife("minutes");
  return [...(await source().standings())].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

// ── 구단소식 ─────────────────────────────────

async function getAllNews(): Promise<NewsPost[]> {
  "use cache";
  cacheTag(TAGS.news);
  cacheLife("minutes");
  // 날짜 내림차순 (같은 날짜면 소스 순서 = 최신 등록 먼저)
  return [...(await source().news())].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getNews(category?: NewsCategory): Promise<NewsPost[]> {
  const list = await getAllNews();
  return category ? list.filter((n) => n.category === category) : list;
}

export async function getNewsPost(category: NewsCategory, id: string) {
  return (await getAllNews()).find((n) => n.category === category && n.id === id);
}

// ── 선수단 ───────────────────────────────────

export async function getPlayers(): Promise<Player[]> {
  "use cache";
  cacheTag(TAGS.players);
  cacheLife("minutes");
  return [...(await source().players())].sort(
    (a, b) =>
      POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) ||
      (a.number ?? 999) - (b.number ?? 999),
  );
}

export async function getPlayersByPosition(): Promise<Array<[Position, Player[]]>> {
  const players = await getPlayers();
  return POSITION_ORDER.map((p) => [p, players.filter((pl) => pl.position === p)]);
}

export async function getPlayer(slug: string) {
  return (await getPlayers()).find((p) => p.slug === slug);
}

export async function getStaff() {
  "use cache";
  cacheTag(TAGS.staff);
  cacheLife("minutes");
  return source().staff();
}

// ── 스폰서 ───────────────────────────────────

export async function getSponsors() {
  "use cache";
  cacheTag(TAGS.sponsors);
  cacheLife("minutes");
  return source().sponsors();
}

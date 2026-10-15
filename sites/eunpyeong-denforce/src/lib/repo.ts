// 데이터 접근 계층. 페이지는 src/data 를 직접 import 하지 않고 이 함수들만 쓴다.
// 나중에 DB/CMS 로 옮길 때 이 파일의 구현만 바꾸면 된다 (async 시그니처 유지).
import { MATCHES, STANDINGS } from "@/data/matches";
import { NEWS } from "@/data/news";
import { PLAYERS, POSITION_ORDER, STAFF } from "@/data/people";
import { SPONSORS } from "@/data/sponsors";
import type { Match, NewsCategory, NewsPost, Player, Position } from "@/types";

const byKickoff = (a: Match, b: Match) => a.kickoff.localeCompare(b.kickoff);

export async function getMatches(): Promise<Match[]> {
  return [...MATCHES].sort(byKickoff);
}

export async function getUpcomingMatches(): Promise<Match[]> {
  return (await getMatches()).filter((m) => m.status === "scheduled");
}

export async function getFinishedMatches(): Promise<Match[]> {
  return (await getMatches()).filter((m) => m.status === "finished").reverse();
}

export async function getNextHomeMatch(): Promise<Match | undefined> {
  return (await getUpcomingMatches()).find((m) => m.isHome);
}

export async function getStandings() {
  return [...STANDINGS].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

export async function getNews(category?: NewsCategory): Promise<NewsPost[]> {
  const list = category ? NEWS.filter((n) => n.category === category) : NEWS;
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getNewsPost(category: NewsCategory, id: string) {
  return NEWS.find((n) => n.category === category && n.id === id);
}

export async function getPlayers(): Promise<Player[]> {
  return [...PLAYERS].sort(
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
  return PLAYERS.find((p) => p.slug === slug);
}

export async function getStaff() {
  return STAFF;
}

export async function getSponsors() {
  return SPONSORS;
}

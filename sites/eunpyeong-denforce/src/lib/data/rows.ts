// DB 행(snake_case) ↔ 도메인 타입 변환. 공개 페이지와 관리자 화면이 함께 쓴다.
// 순수 함수만 둔다 (테스트: rows.test.ts).
import type {
  ClubSettings,
  HistoryItem,
  Match,
  NewsCategory,
  NewsPost,
  Player,
  Position,
  Sponsor,
  SponsorTier,
  Staff,
  StandingRow,
} from "@/types";

export type PlayerRow = {
  id: string;
  slug: string;
  number: number | null;
  name: string;
  position: Position;
  photo_url: string | null;
  birth: string | null;
  height_cm: number | null;
  apps: number;
  goals: number;
  assists: number;
  is_active: boolean;
};

export type StaffRow = { id: string; role: string; name: string; photo_url: string | null; sort_order: number };

export type MatchRow = {
  id: string;
  competition: string;
  round: string;
  kickoff: string;
  venue: string;
  is_home: boolean;
  opponent: string;
  status: "scheduled" | "finished";
  score_us: number | null;
  score_them: number | null;
};

export type StandingDbRow = {
  id: string;
  team: string;
  win: number;
  draw: number;
  loss: number;
  goals_for: number;
  goals_against: number;
  played: number;
  points: number;
  is_us: boolean;
};

export type NewsRow = {
  id: string;
  category: NewsCategory;
  title: string;
  date: string;
  thumbnail_url: string | null;
  summary: string;
  body: string;
  published: boolean;
  created_at: string;
};

export type SponsorRow = {
  id: string;
  name: string;
  tier: SponsorTier;
  logo_url: string | null;
  url: string | null;
  sort_order: number;
};

export type HistoryRow = { id: string; year: string; text: string; sort_order: number };

export type ClubSettingsRow = {
  intro: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  venue_address: string | null;
  venue_transit: string | null;
  venue_parking: string | null;
};

/** 빈 줄로 나눈 본문 → 문단 배열 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const toPlayer = (r: PlayerRow): Player => ({
  id: r.id,
  slug: r.slug,
  number: r.number,
  name: r.name,
  position: r.position,
  photo: r.photo_url,
  birth: r.birth,
  heightCm: r.height_cm,
  stats: { apps: r.apps, goals: r.goals, assists: r.assists },
});

export const toStaff = (r: StaffRow): Staff => ({ id: r.id, role: r.role, name: r.name, photo: r.photo_url });

export const toMatch = (r: MatchRow): Match => ({
  id: r.id,
  competition: r.competition,
  round: r.round,
  kickoff: r.kickoff,
  venue: r.venue,
  isHome: r.is_home,
  opponent: r.opponent,
  status: r.status,
  score:
    r.status === "finished" && r.score_us !== null && r.score_them !== null
      ? { us: r.score_us, them: r.score_them }
      : null,
});

export const toStanding = (r: StandingDbRow): StandingRow => ({
  id: r.id,
  team: r.team,
  played: r.played,
  win: r.win,
  draw: r.draw,
  loss: r.loss,
  goalsFor: r.goals_for,
  goalsAgainst: r.goals_against,
  points: r.points,
  isUs: r.is_us,
});

export const toNewsPost = (r: NewsRow): NewsPost => ({
  id: r.id,
  category: r.category,
  title: r.title,
  date: r.date,
  thumbnail: r.thumbnail_url,
  summary: r.summary,
  body: splitParagraphs(r.body),
});

export const toSponsor = (r: SponsorRow): Sponsor => ({
  id: r.id,
  name: r.name,
  tier: r.tier,
  logo: r.logo_url,
  url: r.url,
});

export const toHistoryItem = (r: HistoryRow): HistoryItem => ({ id: r.id, year: r.year, text: r.text });

export const toClubSettings = (r: ClubSettingsRow): ClubSettings => ({
  intro: splitParagraphs(r.intro),
  contactEmail: r.contact_email,
  contactPhone: r.contact_phone,
  contactAddress: r.contact_address,
  instagramUrl: r.instagram_url,
  youtubeUrl: r.youtube_url,
  venueAddress: r.venue_address,
  venueTransit: r.venue_transit,
  venueParking: r.venue_parking,
});

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
  Posting,
  PostingKind,
  PostingPlatform,
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
  season: string;
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
  images: string[];
  summary: string;
  body: string;
  video_url: string | null;
  featured: boolean;
  published: boolean;
  created_at: string;
};

export type PostingRow = {
  id: string;
  kind: PostingKind;
  platform: PostingPlatform;
  title: string;
  author: string;
  excerpt: string;
  url: string;
  thumbnail_url: string | null;
  posted_on: string;
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
  season: r.season,
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

/** BR-015: 썸네일이 없으면 첫 사진을 목록 카드에 쓴다 */
export const toNewsPost = (r: NewsRow): NewsPost => {
  const images = r.images ?? []; // 마이그레이션 전 DB 에는 열이 없다
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    date: r.date,
    thumbnail: r.thumbnail_url ?? images[0] ?? null,
    images,
    summary: r.summary,
    body: splitParagraphs(r.body),
    videoUrl: r.video_url ?? null, // 마이그레이션 전 DB 에는 열이 없다
    featured: r.featured ?? false,
  };
};

/** 공개 조회에 쓰는 열 (요약·공개 여부·등록 시각 제외) */
export type PublicPostingRow = Pick<PostingRow, "id" | "kind" | "platform" | "title" | "author" | "url" | "thumbnail_url" | "posted_on">;

export const toPosting = (r: PublicPostingRow): Posting => ({
  id: r.id,
  kind: r.kind,
  platform: r.platform,
  title: r.title,
  author: r.author,
  url: r.url,
  thumbnail: r.thumbnail_url,
  date: r.posted_on,
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

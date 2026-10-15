// 도메인 타입 — 정적 데이터(src/data)와 DB(src/lib/data/db.ts) 양쪽이 같은 모양으로 채운다.

export type Position = "GK" | "FIXO" | "ALA" | "PIVO";

export type Player = {
  id: string;
  slug: string;
  number: number | null;
  name: string;
  position: Position;
  photo: string | null;
  birth: string | null; // YYYY-MM-DD
  heightCm: number | null;
  stats: { apps: number; goals: number; assists: number };
};

export type Staff = {
  id: string;
  role: string;
  name: string;
  photo: string | null;
};

export type MatchStatus = "scheduled" | "finished";

export type Match = {
  id: string;
  competition: string;
  round: string;
  kickoff: string; // ISO 8601 (KST)
  venue: string;
  isHome: boolean;
  opponent: string;
  status: MatchStatus;
  score: { us: number; them: number } | null;
};

export type StandingRow = {
  id: string;
  team: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  isUs?: boolean;
};

export type NewsCategory = "notice" | "news" | "photo" | "video";

export type NewsPost = {
  id: string;
  category: NewsCategory;
  title: string;
  date: string; // YYYY-MM-DD · 날짜를 모르면 YYYY 또는 ""
  thumbnail: string | null;
  summary: string;
  body: string[];
};

export type SponsorTier = "naming" | "official" | "partner";

export type Sponsor = {
  id: string;
  name: string;
  tier: SponsorTier;
  logo: string | null;
  url: string | null;
};

export type HistoryItem = { id: string; year: string; text: string };

/** 관리자 화면에서 고치는 구단 정보 (단일) */
export type ClubSettings = {
  intro: string[]; // 문단 목록
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  venueAddress: string | null;
  venueTransit: string | null;
  venueParking: string | null;
};

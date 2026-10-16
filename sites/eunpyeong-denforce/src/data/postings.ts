// 포스팅 라벨. 정적 모드(DB 미설정)에는 모은 글이 없다 — 실제 글을 지어내지 않는다 (BR-004).
import type { Posting, PostingKind, PostingPlatform } from "@/types";

export const POSTING_KIND_LABEL: Record<PostingKind, string> = {
  club: "구단 포스팅",
  news: "뉴스",
  fan: "팬 포스팅",
  league: "FK리그",
};

export const POSTING_PLATFORM_LABEL: Record<PostingPlatform, string> = {
  naver_blog: "네이버 블로그",
  naver_cafe: "네이버 카페",
  article: "기사",
  youtube: "유튜브",
  instagram: "인스타그램",
  web: "웹",
};

export const POSTINGS: Posting[] = [];

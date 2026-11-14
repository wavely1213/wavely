// 관리자 › 인스타 자동 반영 (D-065) — 표시용 이름. 순수 (테스트: instagram-sync.test.ts)

export type InstagramPostRow = {
  code: string;
  kind: string;
  posted_at: string;
  status: string;
  actions: string;
  note: string | null;
  attempts: number;
};

export type InstagramSyncStateRow = {
  last_run_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
  last_warning: string | null;
  last_processed: number;
};

/** 실패한 게시물을 다시 시도하는 횟수 — 서버 함수 instagram-sync 의 MAX_ATTEMPTS 와 같다 */
export const INSTAGRAM_MAX_ATTEMPTS = 3;

const KIND_LABEL: Record<string, string> = {
  reel: "릴스",
  welcome: "영입",
  farewell: "작별",
  matchday: "매치데이",
  result: "경기결과",
  photo: "사진",
  other: "기타",
};

const STATUS_LABEL: Record<string, string> = { done: "반영함", review: "확인 필요", reviewed: "확인함", error: "실패" };

export function instagramKindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

export function instagramStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

/** 확인할 것이 남은 상태 (노란 배지) */
export function needsReview(status: string): boolean {
  return status === "review" || status === "error";
}

/**
 * '확인함' 버튼을 보여 줄지 — 실패했지만 아직 다시 시도할 게시물은 버튼 대신 '다시 시도 중'
 * (확인함을 누르면 다시 시도가 멈춘다)
 */
export function canMarkReviewed(status: string, attempts: number): boolean {
  return status === "review" || (status === "error" && attempts >= INSTAGRAM_MAX_ATTEMPTS);
}

export function instagramPostUrl(code: string): string {
  return `https://www.instagram.com/p/${encodeURIComponent(code)}/`;
}

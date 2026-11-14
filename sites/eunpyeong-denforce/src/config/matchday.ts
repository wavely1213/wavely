/**
 * 매치데이 포스터 팝업 (임시, 2026-11-15 소유자 "일단 지금은 그 포스터 팝업으로 띄워줘") — 홈(/)을 열면 맨 앞에 뜬다.
 * 정식판(D-096: 드라이브 날짜 폴더 자동 연결 + MATCH DAY / FULL TIME 전환)이 들어오면 이 상수는 지운다.
 * 시각은 서울 기준. until 은 경기 끝 무렵(킥오프 + 4시간, D-092 LIVE 창과 같음).
 */
export type MatchdayPopupConfig = { id: string; image: string; alt: string; from: string; until: string };

export const MATCHDAY_POPUP: MatchdayPopupConfig | null = {
  id: "2627-1r-matchday",
  image: "https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/content/matchday-2627-1r.jpg",
  alt: "매치데이 포스터 — 키움증권 2026-27 FK리그1 1R 노원제너FS 대 서울은평 덴포스, 2026년 11월 15일 (일) 14:00, 파주NFC풋살장",
  from: "2026-11-15T00:00:00+09:00",
  until: "2026-11-15T18:00:00+09:00",
};

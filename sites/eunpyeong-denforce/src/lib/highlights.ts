// 은평 경기 하이라이트 모아 보기 (D-091) — 순수 함수 (테스트: highlights.test.ts)
// 새 표 없이 matches.highlight_url 이 있는 우리 종료 경기, 최신순. 연맹 유튜브 자동 연결(D-090)이 채운다.
import type { Match } from "@/types";
import { formatKickoffFull, matchSides } from "./format.ts";
import { matchLabel } from "./match.ts";
import { parseVideoUrl, watchUrl } from "./video.ts";

export type HighlightItem = {
  id: string;
  /** 원본(유튜브) — 새 창 */
  href: string;
  /**
   * 유튜브 썸네일 i.ytimg.com hqdefault(480x360, 위아래 검정 띠 — 16:9 칸에 cover 로 넣으면 띠가 잘려 480x270 그림만 보인다).
   * 이미지 최적화를 쓰지 않으므로(D-073) 원본 주소 그대로. 유튜브가 아니면 null(구단 엠블럼 대체)
   */
  thumbnail: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  /** YYYY.MM.DD */
  date: string;
  competition: string;
};

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** finished: 종료 경기(아무 순서) → 하이라이트 있는 것만 킥오프 최신순, limit 개 */
export function matchHighlights(finished: Match[], ourName: string, limit?: number): HighlightItem[] {
  const items = finished
    .filter((m) => m.status === "finished" && Boolean(m.highlightUrl?.startsWith("https://")))
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .flatMap((m): HighlightItem[] => {
      const v = parseVideoUrl(m.highlightUrl);
      const href = v ? watchUrl(v) : m.highlightUrl!;
      const { home, away, score } = matchSides(m, ourName);
      return [
        {
          id: m.id,
          href,
          thumbnail: v?.provider === "youtube" ? youtubeThumbnail(v.id) : null,
          home,
          away,
          homeScore: score ? score[0] : null,
          awayScore: score ? score[1] : null,
          date: formatKickoffFull(m.kickoff).date.slice(0, 10).replaceAll("-", "."),
          competition: matchLabel(m),
        },
      ];
    });
  return limit === undefined ? items : items.slice(0, limit);
}

/** 읽기 프로그램용 카드 이름 — '하이라이트 영상 - 서울은평 덴포스 3 : 2 화성FS, 2026.11.29 (새 창)' */
export function highlightLabel(h: HighlightItem): string {
  const score = h.homeScore !== null && h.awayScore !== null ? ` ${h.homeScore} : ${h.awayScore} ` : " 대 ";
  return `하이라이트 영상 - ${h.home}${score}${h.away}, ${h.date} (새 창)`;
}

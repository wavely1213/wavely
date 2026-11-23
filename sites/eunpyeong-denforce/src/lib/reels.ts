// 홈 INSTAGRAM 릴스 줄 (D-095, 디자인 ① 정사각 254:26222 / 254:26275 / 254:26328) — 순수 함수 (테스트: reels.test.ts)
// 구단영상(video) 글 중 인스타그램 릴스 주소와 표지가 있는 최신 6개. 누르면 인스타그램 원본(새 창, D-074).
import type { NewsPost } from "@/types";
import { parseVideoUrl, watchUrl } from "./video.ts";

export type ReelTile = { id: string; href: string; thumbnail: string; title: string };

/** posts: 최신순 소식 목록 */
export function homeReels(posts: Pick<NewsPost, "id" | "category" | "title" | "thumbnail" | "videoUrl">[], limit = 6): ReelTile[] {
  const out: ReelTile[] = [];
  for (const p of posts) {
    if (out.length >= limit) break;
    if (p.category !== "video" || !p.thumbnail) continue;
    const v = parseVideoUrl(p.videoUrl);
    if (v?.provider !== "instagram") continue;
    out.push({ id: p.id, href: watchUrl(v), thumbnail: p.thumbnail, title: p.title });
  }
  return out;
}

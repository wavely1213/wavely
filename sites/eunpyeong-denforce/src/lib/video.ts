// 구단영상 주소 → 원본 재생 링크 — 순수 함수 (테스트: video.test.ts, D-035, D-074)

export type VideoRef =
  | { provider: "youtube"; id: string; vertical: boolean }
  | { provider: "instagram"; code: string; vertical: true };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const IG_CODE = /^[A-Za-z0-9_-]{5,40}$/;

/** 유튜브(watch·shorts·youtu.be·embed)·인스타그램(p·reel) 주소만 받는다. 그 밖은 null */
export function parseVideoUrl(raw: string | null | undefined): VideoRef | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") {
      const id = u.searchParams.get("v") ?? "";
      return YT_ID.test(id) ? { provider: "youtube", id, vertical: false } : null;
    }
    if ((parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") && YT_ID.test(parts[1] ?? "")) {
      return { provider: "youtube", id: parts[1], vertical: parts[0] === "shorts" };
    }
    return null;
  }
  if (host === "youtu.be") return YT_ID.test(parts[0] ?? "") ? { provider: "youtube", id: parts[0], vertical: false } : null;
  if (host === "instagram.com") {
    const i = parts.findIndex((p) => p === "p" || p === "reel" || p === "reels");
    const code = i >= 0 ? parts[i + 1] ?? "" : "";
    return IG_CODE.test(code) ? { provider: "instagram", code, vertical: true } : null;
  }
  return null;
}

/** 원본에서 보기 */
export function watchUrl(v: VideoRef): string {
  if (v.provider === "instagram") return `https://www.instagram.com/p/${v.code}/`;
  return v.vertical ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
}

export const VIDEO_PROVIDER_LABEL: Record<VideoRef["provider"], string> = { youtube: "유튜브", instagram: "인스타그램" };

/**
 * 구단영상은 사이트 안에서 재생하지 않고 원본(인스타그램, 유튜브)으로 보낸다 (소유자 2026-11-11, D-074).
 * 카드와 상세 버튼이 같이 쓴다. 주소를 읽을 수 없으면 null — 그때는 사이트 상세로 간다.
 */
export function externalPlay(raw: string | null | undefined): { href: string; label: string } | null {
  const v = parseVideoUrl(raw);
  return v ? { href: watchUrl(v), label: `${VIDEO_PROVIDER_LABEL[v.provider]}에서 재생` } : null;
}

/**
 * 목록 카드를 원본으로 보낼지 — 구단영상 분류만 (관리자 폼은 모든 분류에서 영상 주소를 받는다).
 * 공지, 구단뉴스 등은 영상 주소가 있어도 상세로 가고, 상세의 표지 버튼으로 원본에 간다 (D-074, 총괄 최종 확인)
 */
export function videoCardPlay(post: { category: string; videoUrl: string | null }): { href: string; label: string } | null {
  return post.category === "video" ? externalPlay(post.videoUrl) : null;
}

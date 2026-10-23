// 구단영상 주소 → 재생(embed) 정보 — 순수 함수 (테스트: video.test.ts, D-035)

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

/** 사이트 안에서 재생하는 iframe 주소 */
export function embedSrc(v: VideoRef): string {
  return v.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${v.id}?rel=0`
    : `https://www.instagram.com/p/${v.code}/embed/`;
}

/** 원본에서 보기 */
export function watchUrl(v: VideoRef): string {
  if (v.provider === "instagram") return `https://www.instagram.com/p/${v.code}/`;
  return v.vertical ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
}

export const VIDEO_PROVIDER_LABEL: Record<VideoRef["provider"], string> = { youtube: "유튜브", instagram: "인스타그램" };

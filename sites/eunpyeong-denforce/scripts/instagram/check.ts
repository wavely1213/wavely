// 구단 인스타그램 새 게시물 확인 (D-064) — 읽기만 한다. 사이트 반영은 BR-029 순서대로 사람이/AI 가 한다.
// 실행 (sites/eunpyeong-denforce 에서):
//   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=… \
//   node --experimental-strip-types --no-warnings scripts/instagram/check.ts [--download <폴더>]
// 출력: JSON — 최근 게시물 6개(종류·게시 시각·글·이미 넣었는지) + 새 게시물 수 + 놓쳤을 수 있다는 경고.
// --download: 새 게시물의 사진(oEmbed 표지, 640px 세로형 — 2026-10-17 이후 같은 사진)을 <폴더>/<코드>.jpg 로 받는다.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classifyPost, kstDateTime, knownCodes, parseMatchday, parseProfileEmbed, parseResult } from "../../supabase/functions/instagram-sync/embed.ts";

const ACCOUNT = "eunpyeong_denforce";
// 브라우저처럼 보내야 게시물이 담긴 HTML 을 준다 (그냥 요청하면 게시물 없는 빈 틀)
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchRetry(url: string, init: RequestInit, tries = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return res;
      last = new Error(`${res.status} ${url}`);
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
  }
  throw last;
}

/** 사이트에 넣은 인스타그램 게시물 주소 (공개 키로 읽는 포스팅 — 모든 구단 게시물이 들어간다) */
async function siteInstagramUrls(): Promise<{ urls: string[]; latest: string | null }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 가 필요합니다");
  const res = await fetchRetry(`${base}/rest/v1/postings?select=url,posted_on&url=ilike.*instagram.com*&order=posted_on.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const rows = (await res.json()) as { url: string; posted_on: string }[];
  return { urls: rows.map((r) => r.url), latest: rows[0]?.posted_on ?? null };
}

async function oembedThumbnail(code: string): Promise<string> {
  const res = await fetchRetry(`https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${code}/`, { headers: { "User-Agent": "Mozilla/5.0" } });
  const data = (await res.json()) as { thumbnail_url?: string };
  if (!data.thumbnail_url) throw new Error(`oEmbed 표지 없음: ${code}`);
  return data.thumbnail_url;
}

const downloadAt = process.argv.indexOf("--download");
const downloadDir = downloadAt > 0 ? process.argv[downloadAt + 1] : null;

const html = await (await fetchRetry(`https://www.instagram.com/${ACCOUNT}/embed/`, { headers: BROWSER_HEADERS })).text();
const posts = parseProfileEmbed(html);
const site = await siteInstagramUrls();
const known = knownCodes(site.urls);

const report = posts.map((p) => {
  const type = classifyPost(p);
  return {
    code: p.code,
    url: `https://www.instagram.com/${p.isVideo ? "reel" : "p"}/${p.code}/`,
    type,
    postedKst: kstDateTime(p.takenAt),
    onSite: known.has(p.code),
    caption: p.caption,
    ...(type === "matchday" ? { matchday: parseMatchday(p.caption) } : {}),
    ...(type === "result" ? { result: parseResult(p.caption) } : {}),
  };
});
const fresh = report.filter((r) => !r.onSite);

if (downloadDir && fresh.length) {
  mkdirSync(downloadDir, { recursive: true });
  for (const r of fresh) {
    const img = await fetchRetry(await oembedThumbnail(r.code), {});
    writeFileSync(join(downloadDir, `${r.code}.jpg`), Buffer.from(await img.arrayBuffer()));
  }
}

console.log(
  JSON.stringify(
    {
      account: ACCOUNT,
      siteLatestInstagram: site.latest,
      newCount: fresh.length,
      // 보이는 6개가 모두 새 글이면 그 사이 더 올라온 글이 가려졌을 수 있다
      maybeMissed: posts.length > 0 && fresh.length === posts.length,
      posts: report,
    },
    null,
    2,
  ),
);

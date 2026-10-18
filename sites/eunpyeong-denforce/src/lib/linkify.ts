// 본문 텍스트 속 주소를 링크로 나눈다 — 순수 함수 (테스트: linkify.test.ts).
// 관리자가 입력한 일반 텍스트가 대상이라 http(s) 링크만 만든다 (javascript: 등은 나올 수 없음).

export type TextPart = { type: "text"; value: string } | { type: "link"; value: string; href: string };

// http(s)://… · www.… · 도메인(.co.kr 등)/경로. 앞이 @·영숫자·점이면 제외 (이메일 futbol10@naver.com 등)
const URL_RE =
  /(?<![@\w.])(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?:[a-z0-9-]+\.)+(?:co\.kr|or\.kr|go\.kr|ac\.kr|com|net|org|kr|io|me)(?![\w@])(?:\/[^\s<>"']*)?)/gi;

const count = (s: string, ch: string) => s.split(ch).length - 1;

/** 주소 끝에 붙은 문장부호·닫는 괄호는 링크에서 뺀다 ("…/proshop)." → "…/proshop") */
function trimTrailing(url: string): string {
  let end = url.length;
  while (end > 0 && /[.,;:!?)\]}'"]/.test(url[end - 1])) {
    const head = url.slice(0, end);
    // 주소 안에서 짝이 맞는 괄호는 남긴다 (예: …/wiki/A_(B))
    if (url[end - 1] === ")" && count(head, "(") >= count(head, ")")) break;
    end--;
  }
  return url.slice(0, end);
}

/** 우리 홈페이지 링크에 주소 대신 보일 짧은 이름 — 위에서부터 처음 맞는 것 */
const OWN_SITE_LABELS: Array<[RegExp, string]> = [
  [/^\/team\/players\/[^/]+$/, "선수 소개 보기"],
  [/^\/news(?:\/.*)?$/, "소식 보기"],
];

/**
 * 링크가 우리 홈페이지(siteUrl 주소, www 유무·http/https 상관없이)로 가면 같은 창으로 열 사이트 안 경로와
 * 보일 이름을 준다 — 선수 상세 '선수 소개 보기', 구단소식 '소식 보기', 그 밖은 도메인을 뺀 경로
 * (첫 화면 주소만 있으면 원래 글자 그대로). 바깥 주소면 null (새 창 링크 그대로, BR-017).
 */
export function ownSiteLink(href: string, value: string, siteUrl: string): { path: string; label: string } | null {
  let url: URL;
  let site: URL;
  try {
    url = new URL(href);
    site = new URL(siteUrl);
  } catch {
    return null; // 주소 모양이 아니면 바깥 링크로 둔다 (linkify 는 http(s) 주소만 만들어 보통 여기 오지 않는다)
  }
  const bare = (host: string) => host.replace(/^www\./, "");
  if (!/^https?:$/.test(url.protocol) || bare(url.hostname) !== bare(site.hostname)) return null;
  // 끝 '/' 는 떼고 비교 ("/team/players/no-7/" = "/team/players/no-7")
  const pathname = url.pathname.replace(/(.)\/+$/, "$1");
  const path = `${pathname}${url.search}${url.hash}`;
  const named = OWN_SITE_LABELS.find(([re]) => re.test(pathname));
  return { path, label: named ? named[1] : path === "/" ? value : path };
}

export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = trimTrailing(m[0]);
    if (!raw) continue;
    const start = m.index ?? 0;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parts.push({ type: "link", value: raw, href });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

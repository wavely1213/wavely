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

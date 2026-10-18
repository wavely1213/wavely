// 연락처 링크 도우미 — 전화 걸기(tel:), 제목을 채운 메일 쓰기(mailto:), SNS 짧은 이름. 순수 함수만 (테스트: contact.test.ts)

/** 전화번호로 볼 수 있는 글자 — 숫자, 맨 앞 '+', 띄어쓰기/하이픈/점/괄호 */
const PHONE_LIKE = /^\+?[\d\s().-]+$/;
/** 국번 없는 짧은 번호(112)부터 국제 번호 최대 길이(15자리)까지 */
const PHONE_DIGITS = { min: 3, max: 15 };

/**
 * 전화번호 → 전화 걸기 주소. 띄어쓰기/하이픈 등은 빼고 숫자와 맨 앞 '+' 만 남긴다.
 * 예) '010-5135-0309' → 'tel:01051350309', '+82 10 5135 0309' → 'tel:+821051350309'.
 * 번호가 아닌 글이 섞이면(예: '02-123-4567 (내선 2)') null — 링크 없이 글자만 보인다.
 */
export function telHref(phone: string): string | null {
  const text = phone.trim();
  if (!PHONE_LIKE.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < PHONE_DIGITS.min || digits.length > PHONE_DIGITS.max) return null;
  return `tel:${text.startsWith("+") ? "+" : ""}${digits}`;
}

/** 메일 쓰기 주소 — 제목을 채워 둔다. 예) mailDraftHref('a@b.kr', '[기타]') → 'mailto:a@b.kr?subject=%5B%EA%B8%B0%ED%83%80%5D' */
export function mailDraftHref(email: string, subject: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}`;
}

/** 스폰서 페이지 '문의하기'가 쓰는 문의 분야 */
export const SPONSOR_TOPIC = "스폰서십/제휴";

/** 문의 페이지 문의 분야 기본값 (관리자 › 홈페이지 내용 › 문의에서 바꾼다) — 입단/테스트는 받지 않는다 (BR-026, 2026-10-17 소유자 지시) */
export const CONTACT_TOPICS: readonly string[] = [SPONSOR_TOPIC, "아카데미/유소년", "언론/취재", "기타"];

/** 문의 메일 제목 머리 — '[스폰서십/제휴]' */
export function topicSubject(topic: string): string {
  return `[${topic}]`;
}

/** 계정 이름으로 쓸 수 있는 글자 (인스타그램: 영문/숫자/밑줄/점, 최대 30자) */
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
/** '@' 로 시작하는 주소 경로 (youtube.com/@계정 등) */
const AT_HANDLE = /^@[A-Za-z0-9._-]{1,100}$/;

/**
 * SNS 주소 → 화면에 보일 짧은 이름 '@계정'. 링크는 주소 그대로 둔다.
 * 계정 하나만 가리키는 주소만: 인스타그램 프로필(instagram.com/계정) 또는 '@'로 시작하는 경로(youtube.com/@계정).
 * 그 밖(게시물 주소, youtube.com/channel/... 등)은 null — 주소를 그대로 보인다.
 */
export function snsHandle(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return null;
  const [name] = parts;
  if (AT_HANDLE.test(name)) return name;
  const host = u.hostname.replace(/^(www|m)\./, "");
  return host === "instagram.com" && HANDLE.test(name) ? `@${name}` : null;
}

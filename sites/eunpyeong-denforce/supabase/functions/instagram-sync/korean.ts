// 한국어 글 다듬기 (D-065) — 조사(을/를 등), 이름 → 영문 주소(slug). 순수 함수만 (테스트: instagram-sync.test.ts).

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** 마지막 글자에 받침이 있는지 (한글이 아니면 받침 없음으로 본다) */
export function hasBatchim(word: string): boolean {
  const code = word.trim().codePointAt(word.trim().length - 1) ?? 0;
  if (code < HANGUL_START || code > HANGUL_END) return false;
  return (code - HANGUL_START) % 28 !== 0;
}

const PAIRS = { 을를: ["을", "를"], 이가: ["이", "가"], 은는: ["은", "는"], 과와: ["과", "와"] } as const;

/** 이름 + 조사 — josa("김남석", "을를") → "김남석을", josa("김종호", "을를") → "김종호를" */
export function josa(word: string, pair: keyof typeof PAIRS): string {
  const [withBatchim, without] = PAIRS[pair];
  return word + (hasBatchim(word) ? withBatchim : without);
}

// 국어의 로마자 표기법(음운 변화는 반영하지 않음) — 주소용이라 읽을 수 있으면 된다
const INITIAL = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const MEDIAL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const FINAL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

/** 흔한 성씨는 관례 표기 (김 → kim, 이 → lee …). 없으면 로마자 표기법 */
const SURNAME: Record<string, string> = {
  김: "kim", 이: "lee", 박: "park", 최: "choi", 정: "jung", 강: "kang", 조: "cho", 윤: "yoon", 장: "jang", 임: "lim",
  한: "han", 오: "oh", 서: "seo", 신: "shin", 권: "kwon", 황: "hwang", 안: "ahn", 송: "song", 전: "jeon", 홍: "hong",
  유: "yoo", 고: "ko", 문: "moon", 양: "yang", 손: "son", 배: "bae", 백: "baek", 허: "heo", 남: "nam", 노: "noh",
  하: "ha", 곽: "kwak", 성: "sung", 차: "cha", 주: "joo", 우: "woo", 구: "koo", 민: "min", 류: "ryu", 나: "na",
  진: "jin", 지: "ji", 엄: "eom", 채: "chae", 원: "won", 천: "cheon", 방: "bang", 공: "kong", 현: "hyun", 함: "ham",
  변: "byun", 염: "yeom", 여: "yeo", 추: "choo", 도: "do", 소: "so", 석: "seok", 선: "sun", 설: "seol", 마: "ma",
  길: "gil", 연: "yeon", 위: "wi", 표: "pyo", 명: "myung", 기: "ki", 반: "ban", 왕: "wang", 금: "keum", 옥: "ok",
  육: "yook", 인: "in", 맹: "maeng", 제: "je", 모: "mo", 탁: "tak", 국: "kook", 은: "eun", 편: "pyun", 용: "yong",
  부: "boo",
};

function syllable(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  if (code < HANGUL_START || code > HANGUL_END) return "";
  const i = code - HANGUL_START;
  return INITIAL[Math.floor(i / 588)] + MEDIAL[Math.floor((i % 588) / 28)] + FINAL[i % 28];
}

/** 한글 이름 → 선수 주소 — "김종호" → "kim-jongho", "박재희" → "park-jaehui". 한글이 아니면 빈 문자열 */
export function nameSlug(name: string): string {
  const chars = [...name.trim()].filter((c) => syllable(c));
  if (chars.length < 2) return "";
  const surname = SURNAME[chars[0]] ?? syllable(chars[0]);
  const given = chars.slice(1).map(syllable).join("");
  return `${surname}-${given}`.replace(/[^a-z-]/g, "");
}

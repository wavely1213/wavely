// 19금(Explicit) 점검: 가사에 욕설로 흔히 보는 말이 있는지 (짧은 목록, AI 없이). 표시는 작곡가가 정한다.
// 한국어는 글자 묶음으로 찾되 흔한 말 속에 든 경우(시발점 등)는 뺀다. 영어는 단어 단위.
const KO = [
  { re: /씨발|씨바|씨빨|ㅅㅂ|ㅆㅂ/g, word: '씨발' },
  { re: /시발(?!점)/g, word: '시발' },
  { re: /좆/g, word: '좆' },
  { re: /개새끼|개새기|개색기/g, word: '개새끼' },
  { re: /병신/g, word: '병신' },
  { re: /지랄/g, word: '지랄' },
  { re: /썅/g, word: '썅' },
  { re: /엿\s*먹어/g, word: '엿 먹어' },
];
// 정해 둔 꼴만 (shitake·Dickens 같은 말에 걸리지 않게)
const EN = /\b(fuck(?:s|ed|er|ers|ing|in)?|motherfuck(?:er|ers|ing|in)?|shit(?:s|ty|ting)?|bitch(?:es|y)?|n[i1]gg(?:a|as|er|ers)|pussy|dick|cunts?|assholes?)\b/gi;

// 찾은 말 목록 (중복 없이, 소문자)
export function explicitWords(text) {
  const t = String(text || '');
  const found = new Set();
  KO.forEach(({ re, word }) => { if (t.match(re)) found.add(word); });
  (t.match(EN) || []).forEach((w) => found.add(w.toLowerCase()));
  return [...found];
}

// 제목 표기 점검: 유통사·스토어가 제목에 넣지 말라고 하는 것들 (피처링·프로듀서 표기, 홍보 문구, 이모지, 겹친 빈칸).
// 흔한 단어 속(예: Left, Product, Clean Slate, 사랑의 공식)은 걸리지 않게 좁게 잡는다 (한국어 설명어는 괄호 안만). K-pop은 대문자 제목이 흔해 대문자는 보지 않는다.
// 반환: 고칠 점 문장 목록 (없으면 [])

const FEAT = /\b(?:feat|ft)\.|\b(?:feat|ft|featuring)\s/i;
const PROD = /\bprod\.?(\s*by)?\b|프로듀스드\s*바이/i;
const PROMO = /\bofficial\s*(audio|video|music\s*video|m\/?v)\b|\((explicit|clean)( version)?\)|\b(explicit|clean)\s+version\b|\bfree\s+download\b|[(\[]\s*(공식|신곡|19금)\s*[)\]]/i;
const EMOJI = /(?![©®™])\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;

export function titleIssues(title) {
  const t = String(title || '');
  const out = [];
  if (FEAT.test(t)) out.push('제목에 피처링 표기(feat.)가 있어요. 피처링 아티스트는 제목 말고 정보·크레딧의 피처링 칸에 적어 주세요 — 플랫폼이 알아서 붙여 보여 줘요.');
  if (PROD.test(t)) out.push('제목에 프로듀서 표기(Prod. by)가 있어요. 대부분의 스토어는 제목에 넣지 못하게 해요 — 크레딧에 적어 주세요.');
  if (PROMO.test(t)) out.push('제목에 Official·Explicit·신곡 같은 설명이 있어요. 스토어 표기 규칙상 제목에는 곡 이름만 넣어요 (19금은 Explicit 표시로).');
  if (EMOJI.test(t)) out.push('제목에 이모지·그림 문자가 있어요. 스토어에 따라 반려할 수 있어요.');
  if (t !== t.trim() || /\s{2,}/.test(t)) out.push('제목 앞뒤나 중간에 빈칸이 겹쳐 있어요.');
  return out;
}

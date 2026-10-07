// 멜로디를 짧은 글로: 취향 기록(AI 초안 → 고친 멜로디)과 AI 요청에 쓴다.
// 표기: 음절+스케일 인덱스(d), ~ = 4칸(16분음표 4개) 이상 긴 음, / = 4칸 이상 쉼. 예: "불3 꺼4 진5~ / 너2"
export function melodyText(notes) {
  const ns = [...(notes || [])].sort((a, b) => a.s - b.s);
  const out = [];
  ns.forEach((n, i) => {
    const prev = ns[i - 1];
    if (prev && n.s - (prev.s + prev.l) >= 4) out.push('/');
    out.push(`${n.syl || '·'}${n.d}${n.l >= 4 ? '~' : ''}`);
  });
  return out.join(' ');
}

export const MELODY_TEXT_NOTE = '취향 예시의 멜로디 표기: 음절+스케일 인덱스(d), ~는 4칸 이상 긴 음, /는 4칸 이상 쉼.';

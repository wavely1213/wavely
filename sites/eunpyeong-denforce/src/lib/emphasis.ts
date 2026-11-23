/** 문장 속 **굵게** 표시를 굵은 조각과 보통 조각으로 나눈다 (엠블럼 설명 등). 짝이 안 맞는 ** 는 그대로 글자로 둔다 */
export type EmphasisPart = { text: string; strong: boolean };

export function emphasisParts(text: string): EmphasisPart[] {
  const parts: EmphasisPart[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), strong: false });
    parts.push({ text: m[1], strong: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), strong: false });
  return parts;
}

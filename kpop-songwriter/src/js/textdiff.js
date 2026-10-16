// 줄 단위 비교 (가장 긴 공통 부분열). 반환: [{ type: 'same' | 'del' | 'add', text }] — del은 a에만, add는 b에만 있는 줄.
export function lineDiff(a, b) {
  const x = String(a ?? '').split('\n');
  const y = String(b ?? '').split('\n');
  const n = x.length;
  const m = y.length;
  // 뒤에서부터 공통 길이 표 (가사는 수백 줄이라 n×m 표로 충분)
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ type: 'same', text: x[i] }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ type: 'del', text: x[i] }); i++; } else { out.push({ type: 'add', text: y[j] }); j++; }
  }
  while (i < n) out.push({ type: 'del', text: x[i++] });
  while (j < m) out.push({ type: 'add', text: y[j++] });
  return out;
}

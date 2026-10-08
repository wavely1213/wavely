// 시각 표시·입력: 초 ↔ "분:초" (마스터링 곡 끝 자르기·하이라이트 구간 등)
export const mmss = (t, { tenths = false } = {}) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  const ss = tenths && Math.round(s * 10) % 10 ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0');
  return `${m}:${ss}`;
};

// "3:25", "3:25.5", "205", "205.5" → 초. 빈 칸은 0(설정 안 함), 못 읽으면 NaN.
export function parseMmss(text) {
  const s = String(text ?? '').trim().replace(/：/g, ':');
  if (!s) return 0;
  const m = s.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!m) return NaN;
  const sec = Number(m[2]);
  if (m[1] !== undefined && sec >= 60) return NaN;
  return (m[1] ? Number(m[1]) * 60 : 0) + sec;
}

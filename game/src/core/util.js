/* ═══════════════════════════════════════════════
   0. 상수 · 유틸
   ═══════════════════════════════════════════════ */
export const W = 480;
export const H = 720;
export const PAD = 16;                       // 필드 여백
/* 「동작 줄이기」 설정은 타깃마다 읽는 법이 달라 host.reduced 로 받는다 */

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const rand  = (a, b) => a + Math.random() * (b - a);
export const pick  = a => a[(Math.random() * a.length) | 0];
export const dist2 = (a, b, c, d) => { const x = a - c, y = b - d; return x * x + y * y; };
export const fmt   = n => n.toLocaleString("ko-KR");

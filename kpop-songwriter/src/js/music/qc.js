// 발매 전 소리 점검 (숫자만): 스테레오 위상 상관, 원본의 하드 클리핑.
// 상관: 1 = 완전 모노, 0 근처 = 아주 넓음, 0 아래 = 좌우 위상이 반대 (모노 스피커에서 소리가 빠짐)
export function stereoCorrelation(L, R, step = 4) {
  if (!R || L === R) return 1;
  let lr = 0;
  let ll = 0;
  let rr = 0;
  for (let i = 0; i < L.length; i += step) { lr += L[i] * R[i]; ll += L[i] * L[i]; rr += R[i] * R[i]; }
  return ll && rr ? lr / Math.sqrt(ll * rr) : 1;
}

// 거의 최대값(|x| ≥ level)이 minRun개 이상 이어진 곳 = 잘린 파형. 그런 구간 수
export function clippedRuns(channels, { level = 0.999, minRun = 3 } = {}) {
  let runs = 0;
  for (const ch of channels) {
    let len = 0;
    for (let i = 0; i < ch.length; i++) {
      if (Math.abs(ch[i]) >= level) len += 1;
      else { if (len >= minRun) runs += 1; len = 0; }
    }
    if (len >= minRun) runs += 1;
  }
  return runs;
}

export const CLIP_WARN = 10; // 이보다 많으면 원본이 잘렸다고 알림

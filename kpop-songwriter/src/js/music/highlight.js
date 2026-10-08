// 숏폼 하이라이트: 마스터에서 가장 에너지가 높은 구간(코러스)을 골라 15·30초 클립으로 자른다.
// 0.25초 단위 음량으로 창을 밀어 가며 평균 에너지가 가장 큰 곳을 찾고, 시작은 조용한 순간(박 사이)에 맞춘다.
const BLOCK = 0.25;

// 0.25초마다 RMS (좌우 평균)
export function blockRms(channels, rate) {
  const n = Math.floor(BLOCK * rate);
  const len = channels[0].length;
  const out = new Float32Array(Math.floor(len / n));
  for (let b = 0; b < out.length; b++) {
    let s = 0;
    for (let i = b * n; i < (b + 1) * n; i++) {
      for (const ch of channels) s += ch[i] * ch[i];
    }
    out[b] = Math.sqrt(s / (n * channels.length));
  }
  return out;
}

// 반환: { start, end } (초). 곡이 seconds보다 짧으면 곡 전체.
export function bestWindow(channels, rate, seconds) {
  const e = blockRms(channels, rate);
  const w = Math.round(seconds / BLOCK);
  if (e.length <= w) return { start: 0, end: channels[0].length / rate };
  // 창 평균 에너지 + 시작 직후가 직전보다 커지는(코러스가 터지는) 정도를 조금 더한다
  const pre = Math.round(2 / BLOCK);
  const sum = new Float64Array(e.length + 1);
  for (let i = 0; i < e.length; i++) sum[i + 1] = sum[i] + e[i];
  const mean = (a, b) => (b > a ? (sum[b] - sum[a]) / (b - a) : 0);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i + w <= e.length; i++) {
    const rise = i >= pre ? Math.max(0, mean(i, i + pre) - mean(i - pre, i)) : 0;
    const score = mean(i, i + w) + 0.5 * rise;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  // 시작을 앞쪽 1초 안의 가장 조용한 블록으로 당긴다 (말이나 박 중간에서 시작하지 않게)
  let quiet = best;
  for (let i = best; i >= Math.max(0, best - Math.round(1 / BLOCK)); i--) if (e[i] < e[quiet]) quiet = i; // 같으면 가까운 쪽
  const start = quiet * BLOCK;
  return { start, end: Math.min(channels[0].length / rate, start + seconds) };
}

// 구간 자르기 + 페이드 인·아웃 (반환: 새 채널 배열)
export function cutClip(channels, rate, start, end, { fadeIn = 0.3, fadeOut = 1.5 } = {}) {
  const a = Math.floor(start * rate);
  const b = Math.min(channels[0].length, Math.floor(end * rate));
  const fi = Math.floor(fadeIn * rate);
  const fo = Math.floor(fadeOut * rate);
  return channels.map((ch) => {
    const out = ch.slice(a, b);
    for (let i = 0; i < fi && i < out.length; i++) out[i] *= i / fi;
    for (let i = 0; i < fo && i < out.length; i++) out[out.length - 1 - i] *= i / fo;
    return out;
  });
}

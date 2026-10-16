// 곡 사이 넘어가는 부분: 앞 곡 끝 몇 초 + 다음 곡 처음 몇 초를 이어 붙인다 (앨범 흐름·음량 차이 확인용).
export const EDGE_SECS = 6;

// channels: Float32Array[] (같은 샘플레이트). 반환: { head, tail } 각 채널 배열 (곡이 짧으면 있는 만큼)
export function edgesOf(channels, rate, secs = EDGE_SECS) {
  const n = channels[0].length;
  const k = Math.min(n, Math.round(secs * rate));
  return { head: channels.map((c) => c.slice(0, k)), tail: channels.map((c) => c.slice(n - k)) };
}

// a 다음에 b (gap초 무음 사이). 모노는 양쪽에 같은 소리. 반환: [L, R]
export function joinClips(a, b, rate, gap = 0) {
  const g = Math.round(gap * rate);
  const len = a[0].length + g + b[0].length;
  return [0, 1].map((i) => {
    const out = new Float32Array(len);
    out.set(a[i] || a[0], 0);
    out.set(b[i] || b[0], a[0].length + g);
    return out;
  });
}

// 이웃한 트랙 쌍: [{ from, to, i(앞 트랙 번호 0부터), ready(둘 다 마스터 있음), gap(LU, 다음 - 앞) }]
export function transitionPairs(tracks, masters) {
  const out = [];
  for (let i = 0; i + 1 < tracks.length; i++) {
    const a = masters[tracks[i].songId];
    const b = masters[tracks[i + 1].songId];
    const ready = !!(a?.file && b?.file);
    const gap = ready && Number.isFinite(a.lufs) && Number.isFinite(b.lufs) ? b.lufs - a.lufs : null;
    out.push({ from: tracks[i].songId, to: tracks[i + 1].songId, i, ready, gap });
  }
  return out;
}

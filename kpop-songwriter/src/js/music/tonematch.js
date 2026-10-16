// 레퍼런스 음색 맞추기: 레퍼런스 곡과 원본(Suno 결과)의 저음·고음 비율을 비교해 마스터링 EQ를 추천한다.
// 비율 차이를 dB로 바꿔 그만큼 올리거나 내린다 (한 번에 너무 많이 바꾸지 않게 범위를 묶음).
import { MASTER_PRESETS } from './master.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const half = (v) => Math.round(v * 2) / 2;
const db = (a, b) => 20 * Math.log10(a / b);

// 쓰기로 한 레퍼런스 중 오디오 분석이 있는 것의 평균. 없으면 null. high는 예전 분석이면 null.
export function referenceTone(song) {
  const rs = (song.references || []).filter((r) => r.use && r.analysis && Number.isFinite(r.analysis.bass) && r.analysis.bass > 0);
  if (!rs.length) return null;
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const highs = rs.map((r) => r.analysis.high).filter((v) => Number.isFinite(v) && v > 0);
  return { bass: avg(rs.map((r) => r.analysis.bass)), high: highs.length ? avg(highs) : null, names: rs.map((r) => r.name), n: rs.length };
}

// src, ref: { bass, high } → { eq(마스터링 설정), lowDb, highDb, note }
export function matchEq(src, ref) {
  const lowDb = clamp(half(db(ref.bass, src.bass)), -4, 4);
  const highDb = ref.high && src.high ? clamp(half(db(ref.high, src.high)), -3, 4) : null;
  const h = highDb ?? 0;
  const eq = {
    name: '레퍼런스에 맞춤',
    low: lowDb,
    mud: lowDb > 1 ? -1 : 0, // 저음을 올리면 웅웅거리는 대역은 살짝 덜어 낸다
    presence: half(h * 0.5),
    air: h,
    comp: MASTER_PRESETS.kpop.comp,
  };
  const word = (v, up, down) => (Math.abs(v) < 0.5 ? '비슷' : `${v > 0 ? up : down} ${Math.abs(v).toFixed(1)}dB`);
  const note = `저음 ${word(lowDb, '올림', '내림')}${highDb == null ? ' · 고음은 레퍼런스를 다시 분석하면 맞출 수 있어요' : ` · 고음 ${word(highDb, '올림', '내림')}`}`;
  return { eq, lowDb, highDb, note };
}

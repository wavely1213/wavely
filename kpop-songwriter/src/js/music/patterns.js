// 드럼·베이스 패턴 프리셋. 한 마디 = 16칸(16분음표).

const g = (steps) => Array.from({ length: 16 }, (_, i) => steps.includes(i));

export const DRUM_ROWS = [
  { id: 'kick', name: '킥' },
  { id: 'snare', name: '스네어' },
  { id: 'clap', name: '클랩' },
  { id: 'hat', name: '하이햇' },
  { id: 'ohat', name: '오픈햇' },
];

export const DRUM_PATTERNS = {
  pop: { name: '기본 팝 비트', grid: { kick: g([0, 7, 8]), snare: g([4, 12]), clap: g([]), hat: g([0, 2, 4, 6, 8, 10, 12, 14]), ohat: g([]) } },
  four: { name: '쿵쿵쿵쿵 하우스', grid: { kick: g([0, 4, 8, 12]), snare: g([]), clap: g([4, 12]), hat: g([2, 6, 10, 14]), ohat: g([2, 6, 10, 14]) } },
  trap: { name: '트랩 (하프타임)', grid: { kick: g([0, 6, 10]), snare: g([8]), clap: g([8]), hat: g([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]), ohat: g([]) } },
  jersey: { name: '저지 클럽 (통통 튀는)', grid: { kick: g([0, 3, 6, 10, 12]), snare: g([]), clap: g([4, 12]), hat: g([2, 6, 10, 14]), ohat: g([]) } },
  ukg: { name: 'UK 개러지 (2-step)', grid: { kick: g([0, 10]), snare: g([4, 12]), clap: g([]), hat: g([2, 5, 7, 10, 13, 15]), ohat: g([]) } },
  afro: { name: '아프로비트 (리듬감)', grid: { kick: g([0, 7, 8, 14]), snare: g([3, 10]), clap: g([]), hat: g([0, 2, 4, 6, 8, 10, 12, 14]), ohat: g([6]) } },
  ballad: { name: '발라드 (느긋하게)', grid: { kick: g([0, 10]), snare: g([8]), clap: g([]), hat: g([0, 4, 8, 12]), ohat: g([]) } },
  dembow: { name: '뎀보 (레게톤·뭄바톤)', grid: { kick: g([0, 4, 8, 12]), snare: g([3, 6, 11, 14]), clap: g([]), hat: g([0, 2, 4, 6, 8, 10, 12, 14]), ohat: g([]) } },
  funk: { name: '펑크 그루브 (시티팝·디스코)', grid: { kick: g([0, 3, 8, 11]), snare: g([4, 12]), clap: g([]), hat: g([0, 2, 4, 6, 8, 10, 12]), ohat: g([14]) } },
};

// 베이스: [시작칸, 길이칸, 옥타브 위(0/1)]
export const BASS_PATTERNS = {
  root8: { name: '8비트로 달리기', notes: [[0, 2, 0], [2, 2, 0], [4, 2, 0], [6, 2, 0], [8, 2, 0], [10, 2, 0], [12, 2, 0], [14, 2, 0]] },
  sync: { name: '엇박 그루브', notes: [[0, 3, 0], [3, 3, 0], [6, 2, 0], [10, 2, 0], [12, 3, 1]] },
  long: { name: '길게 한 음', notes: [[0, 16, 0]] },
  octave: { name: '옥타브 점프 (디스코)', notes: [[0, 2, 0], [2, 2, 1], [4, 2, 0], [6, 2, 1], [8, 2, 0], [10, 2, 1], [12, 2, 0], [14, 2, 1]] },
  halftime: { name: '묵직하게 (트랩 808)', notes: [[0, 6, 0], [6, 4, 0], [10, 6, 0]] },
  offbeat: { name: '엇박 하우스 (뒷박만)', notes: [[2, 2, 0], [6, 2, 0], [10, 2, 0], [14, 2, 0]] },
};

export function cloneGrid(grid) {
  return Object.fromEntries(DRUM_ROWS.map((r) => [r.id, [...(grid[r.id] || g([]))]]));
}

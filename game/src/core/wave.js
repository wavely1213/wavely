import { G } from "./state.js";
import { PAD, W, rand } from "./util.js";
import { host } from "./host.js";
/* ═══════════════════════════════════════════════
   7. 웨이브 생성
   ═══════════════════════════════════════════════ */
export const WAVES_PER_STAGE = 6;

/* 무기는 5레벨이 상한이다. 적 수·체력이 상한 없이 오르면 실력이 아니라 산술로 지는
   지점이 생기므로, 양쪽 다 천장을 두고 그 뒤로는 '질'(탄속·패턴 밀도)로만 올린다. */
export function hpScale(stage) { return Math.min(6, 1 + .30 * (stage - 1)); }

/* 적 탄속도 상한을 둔다 — 상한이 없으면 반응이 아니라 운이 된다 */
export function eSpd(base, k) { return Math.min(base + 130, base + k * G.stage); }

export const MAX_EXTRA = 6;                   /* 한 웨이브 동시 출현 증가분 상한 */

/* 포메이션 — 5종만 고정 순서로 돌면 몇 판 만에 외워진다.
   종류를 늘리고, 구역마다 결정적으로 다른 조합이 나오게 섞는다. */
export const FORMS = {
  /* 세로 대열 — 같은 레인으로 줄지어 내려온다 */
  vline(q, i, extra) {
    const lanes = 2 + (i % 2), n = 4 + extra;
    for (let l = 0; l < lanes; l++) {
      const x = PAD + 50 + (W - 2 * PAD - 100) * (l + .5) / lanes;
      for (let k = 0; k < n; k++) q.push({ d: k * .28 + l * .12, t: "drone", x });
    }
  },
  /* 호 — 가운데가 먼저 */
  arc(q, i, extra) {
    const n = 7 + extra;
    for (let k = 0; k < n; k++) {
      const x = PAD + 30 + (W - 2 * PAD - 60) * k / (n - 1);
      q.push({ d: Math.abs(k - (n - 1) / 2) * .12, t: "drone", x, amp: 42 });
    }
  },
  weavers(q, i, extra) {
    const n = 4 + extra;
    for (let k = 0; k < n; k++) q.push({ d: k * .55, t: "weaver", x: k % 2 ? W * .75 : W * .25 });
  },
  turrets(q, i, extra) {
    const n = 3 + Math.min(2, extra);
    for (let k = 0; k < n; k++) q.push({ d: k * .35, t: "turret", x: PAD + 60 + (W - 2 * PAD - 120) * k / Math.max(1, n - 1) });
  },
  rush(q, i, extra) {
    const n = 6 + extra * 2;
    for (let k = 0; k < n; k++) q.push({ d: k * .3, t: "rusher", x: rand(PAD + 30, W - PAD - 30) });
  },

  /* 협공 — 양쪽 끝에서 동시에 밀고 들어와 가운데로 좁힌다 */
  pincer(q, i, extra) {
    const n = 4 + extra;
    for (let k = 0; k < n; k++) {
      q.push({ d: k * .3, t: "drone", x: PAD + 34, amp: 60 });
      q.push({ d: k * .3 + .15, t: "drone", x: W - PAD - 34, amp: 60 });
    }
  },
  /* 벽 — 가로로 늘어서고 한 칸만 비어 있다. 틈을 찾아야 한다 */
  wall(q, i, extra) {
    const slots = 8, gap = 1 + (i * 3 + 2) % (slots - 2);
    for (let r = 0; r < 1 + Math.min(2, Math.floor(extra / 2)); r++) {
      for (let k = 0; k < slots; k++) {
        if (k === (gap + r * 3) % slots) continue;          /* 줄마다 틈이 옮겨간다 */
        const x = PAD + 26 + (W - 2 * PAD - 52) * k / (slots - 1);
        q.push({ d: r * 1.5, t: "drone", x, amp: 0 });
      }
    }
  },
  /* 사행 — 한 줄로 S자를 그리며 내려온다 */
  snake(q, i, extra) {
    const n = 9 + extra;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const x = W / 2 + Math.sin(t * 6.283 * 1.5) * (W / 2 - PAD - 46);
      q.push({ d: k * .22, t: "drone", x, amp: 12 });
    }
  },
  /* 고정포 + 호위 — 포대가 자리를 잡고 그 앞을 드론이 가린다 */
  bastion(q, i, extra) {
    const n = 2 + Math.min(2, extra);
    for (let k = 0; k < n; k++) {
      const x = PAD + 70 + (W - 2 * PAD - 140) * k / Math.max(1, n - 1);
      q.push({ d: k * .4, t: "turret", x });
      q.push({ d: k * .4 + .8, t: "drone", x: x - 30, amp: 20 });
      q.push({ d: k * .4 + .95, t: "drone", x: x + 30, amp: 20 });
    }
  },
  /* 혼성 돌입 — 직조기가 견제하는 사이 돌입기가 파고든다 */
  blitz(q, i, extra) {
    for (let k = 0; k < 2 + Math.min(2, extra); k++)
      q.push({ d: k * .5, t: "weaver", x: k % 2 ? W * .3 : W * .7 });
    for (let k = 0; k < 4 + extra; k++)
      q.push({ d: 1.2 + k * .26, t: "rusher", x: rand(PAD + 30, W - PAD - 30) });
  }
};

/* 구역별 편성표 — 초반은 읽기 쉬운 것부터, 뒤로 갈수록 어려운 것이 섞인다.
   구역 번호로 결정되므로 같은 구역은 늘 같은 흐름이고, 구역끼리는 확실히 다르다. */
export const EASY = ["vline", "arc", "snake", "wall"];
export const MID  = ["weavers", "pincer", "turrets", "rush"];
export const HARD = ["bastion", "blitz", "wall", "pincer"];

/* 결정적 해시 — (stage*2 + i) % 4 같은 단순 모듈러는 주기가 짧아
   10개 구역에서 조합이 4가지밖에 안 나왔다. */
export function mix(a, b) {
  let x = Math.imul(a, 73856093) ^ Math.imul(b, 19349663);
  x ^= x >>> 13; x = Math.imul(x, 1274126177); x ^= x >>> 16;
  return (x >>> 0);
}

export function waveKinds(stage) {
  if (stage <= 1) return ["vline", "arc", "snake", "weavers", "wall", "rush"];
  if (stage === 2) return ["arc", "weavers", "pincer", "turrets", "snake", "rush"];
  const out = [];
  for (let i = 0; i < 6; i++) {
    const pool = i % 3 === 0 ? EASY : i % 3 === 1 ? MID : HARD;
    out.push(pool[mix(stage, i) % pool.length]);
  }
  return out;
}

/* 한 웨이브 동시 출현 상한 — 포메이션마다 계산식이 달라 개별로 두면 새어나간다.
   여기서 한 번에 막으면 새 포메이션을 추가해도 자동으로 지켜진다. */
export const MAX_WAVE = 18;

export function genWave(stage, i) {
  const q = [];
  const kinds = waveKinds(stage);
  const kind = kinds[i % kinds.length];
  const extra = Math.min(MAX_EXTRA, Math.max(0, stage - 3));
  (FORMS[kind] || FORMS.vline)(q, i, extra);
  q.sort((a, b) => a.d - b.d);
  if (q.length > MAX_WAVE) q.length = MAX_WAVE;   /* 늦게 오는 쪽부터 잘라낸다 */
  return q;
}

export function startWave() {
  G.queue = genWave(G.stage, G.wave).map(s => ({ ...s, d: s.d + .35 }));
  G.waveT = 0;
  G.phase = "wave";
  host.hudChanged();
}

export function startBoss() {
  G.phase = "boss";
  /* 5구역까지는 가파르게, 그 뒤는 완만하게. 선형으로 두면 무한 모드의 보스가
     실력 시험이 아니라 순수 지구력 시험이 된다. */
  const s = G.stage;
  const hp = Math.round(s <= 5 ? 420 + 260 * (s - 1) : 1460 + 150 * (s - 5));
  G.boss = {
    x: W / 2, y: -110, r: 46, t: 0, atkT: 1.6, spin: 0,
    hp, max: hp,
    entered: false, dead: false, dieT: 0, warn: 2.0
  };
  G.bossIn = 0;
  host.sound.big();
  host.hudChanged();
}

import { GUARD_CD, stats } from "./data.js";
import { H, W } from "./util.js";
/* ═══════════════════════════════════════════════
   6. 게임 상태
   ═══════════════════════════════════════════════ */
export const G = {
  screen: "title",
  stage: 1, pickStage: 1, wave: 0,
  t: 0, dt: 1 / 60, shake: 0, flash: 0, over: false, stop: 0, muzzle: 0,
  score: 0, coins: 0, kills: 0, combo: 0, maxCombo: 0, comboT: 0,
  player: null, bullets: [], ebullets: [], enemies: [], parts: [], drops: [],
  queue: [], waveT: 0, phase: "idle", boss: null, bossIn: 0,
  echo: [], echoT: 0                   // echoT: 잔상 점을 찍기까지 남은 시간
};

export function newPlayer() {
  const st = stats();
  return {
    x: W / 2, y: H - 130, r: 11,
    hp: st.hp, maxHp: st.hp, bomb: st.bomb, maxBomb: st.bomb,
    cd: 0, inv: 1.2, dead: false,
    surge: 0,                                   // 과부하 셀 잔여(초)
    guard: st.guard ? GUARD_CD : 0,             // 육각 차폐 충전(GUARD_CD면 준비 완료)
    dodgeT: 0                                   // 회피 성공 연출 타이머
  };
}

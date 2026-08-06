import { FRAMES, MAXLV, PILOTS, SKINS, TRAILS } from "./data.js";
import { clamp } from "./util.js";
import { host } from "./host.js";
/* ═══════════════════════════════════════════════
   1. 저장 데이터
   ═══════════════════════════════════════════════ */
export const SAVE_KEY = "wavelength.save.v1";
export const DEFAULT_SAVE = {
  coins: 0,
  best: 0,
  cleared: 0,                          // 클리어한 최고 구역
  eq: { weapon: 1, engine: 1, shield: 1 },
  pilot: "stray",                      // 탑승자
  frame: "grail",                      // 기체
  skin: "std",
  trail: "ember",
  owned: ["std", "ember", "stray", "grail"],
  seenStory: [],
  codex: [],                           // 조우한 군체 id
  sound: true,                         // 소리 설정도 저장한다 — 껐는데 새로고침마다 켜지면 안 된다
  tips: []                             // 이미 보여준 첫 안내 id
};

export let S;
export function loadSave() {
  try {
    const raw = host.storage.get(SAVE_KEY);
    S = raw ? Object.assign(structuredClone(DEFAULT_SAVE), JSON.parse(raw)) : structuredClone(DEFAULT_SAVE);
    S.eq = Object.assign({ weapon: 1, engine: 1, shield: 1 }, S.eq);
  } catch (e) {
    S = structuredClone(DEFAULT_SAVE);
  }
  /* localStorage는 사용자가 고칠 수 있다. 범위를 벗어난 값이 들어오면
     WEAPON[99] 같은 참조가 undefined가 되어 게임이 통째로 죽고, 새로고침해도 복구되지 않는다. */
  const lv = v => clamp(Math.round(Number(v)) || 1, 1, MAXLV);
  S.eq = { weapon: lv(S.eq.weapon), engine: lv(S.eq.engine), shield: lv(S.eq.shield) };
  S.cleared = clamp(Math.round(Number(S.cleared)) || 0, 0, 99);
  S.coins = Math.max(0, Math.round(Number(S.coins)) || 0);
  S.best = Math.max(0, Math.round(Number(S.best)) || 0);
  if (!Array.isArray(S.owned)) S.owned = [...DEFAULT_SAVE.owned];
  if (!Array.isArray(S.seenStory)) S.seenStory = [];
  if (!Array.isArray(S.codex)) S.codex = [];
  /* 존재하지 않는 탑승자·기체·치장을 가리키면 기본값으로 되돌린다 */
  if (!PILOTS.some(p => p.id === S.pilot)) S.pilot = DEFAULT_SAVE.pilot;
  if (!FRAMES.some(f => f.id === S.frame)) S.frame = DEFAULT_SAVE.frame;
  if (!SKINS.some(k => k.id === S.skin))   S.skin  = DEFAULT_SAVE.skin;
  if (!TRAILS.some(t => t.id === S.trail)) S.trail = DEFAULT_SAVE.trail;
}
export function persist() {
  try { host.storage.set(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 무시 */ }
}
/* loadSave()는 호스트가 부팅 때 한 번 부른다 — 데이터 목록보다 뒤에 실행되어야 하므로 */

/* 진행 초기화. 소리 설정은 진행 기록이 아니므로 남긴다.
   여기 있어야 하는 이유: S 는 이 모듈이 소유한 바인딩이라 바깥에서는 갈아 끼울 수 없다. */
export function resetSave() {
  const keepSound = S.sound;
  S = structuredClone(DEFAULT_SAVE);
  S.sound = keepSound;
  persist();
}

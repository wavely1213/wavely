/* 소리 — 웹과 같은 신디사이저를 PCM 으로 렌더해 쓴다.

   웹은 WebAudio 로 매번 합성하지만 RN 에는 그런 게 없다. 그렇다고 음원 파일을
   가져다 붙이면 "외부 자산 0" 이 깨지고 웹과 소리가 갈린다. 그래서 같은 수식을
   그대로 JS 로 렌더해서 짧은 WAV 를 캐시에 굽고, expo-audio 로 튼다.

   파형 자체는 synth.js 에 있다 — 거기는 순수 함수라 검사가 된다.
   web/sound.js 와 파라미터가 하나라도 어긋나면 두 화면의 소리가 달라진다.
*/
import { File, Paths } from "expo-file-system";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { renderBlip, renderSweep, renderNoise, wav, mix } from "./synth";

/* ── 이름 붙은 소리 — web/sound.js 와 같은 파라미터 ── */
const RECIPES = {
  shoot: () => mix([renderNoise(1900, 9, .045, .05), renderBlip(320, .03, "square", .012)]),
  hit:   () => renderNoise(2600, 5, .05, .07),
  boom:  () => mix([renderNoise(700, 1.2, .22, .10), renderSweep(240, 45, .26, .05)]),
  big:   () => mix([renderNoise(420, .8, .55, .14), renderSweep(150, 28, .7, .08)]),
  coin:  () => mix([renderBlip(1180, .05, "triangle", .03), renderNoise(4200, 12, .03, .03)]),
  hurt:  () => mix([renderNoise(900, 2, .18, .12), renderSweep(280, 80, .22, .07)]),
  bomb:  () => mix([renderNoise(300, .6, .5, .12), renderSweep(80, 820, .35, .06)]),
  ui:    () => renderNoise(3000, 14, .025, .05),
};

/* 코어가 blip 을 파라미터째 부르는 자리들 — 미리 구워 둔다.
   목록에 없는 조합이 들어오면 그때 굽고, 그 한 번만 소리가 늦는다. */
const BLIPS = [
  [300, .05, "sawtooth", .02],    // 직조체 사격
  [240, .06, "sawtooth", .022],   // 포탑 사격
  [520, .16, "triangle", .05],    // 육각 차폐
  [760, .07, "triangle", .035],   // 회피
  [1560, .09, "triangle", .04],   // 보스 격파
  [160, .09, "sawtooth", .03],
];

const VOICES = 4;                 /* 같은 소리가 겹칠 수 있는 최대 수 */

class Voice {
  constructor(uri) {
    this.players = Array.from({ length: VOICES }, () => createAudioPlayer({ uri }));
    this.i = 0;
  }
  play(vol) {
    const p = this.players[this.i];
    this.i = (this.i + 1) % VOICES;
    try { p.volume = vol; p.seekTo(0); p.play(); } catch { /* 재생 실패는 무시한다 */ }
  }
  release() { for (const p of this.players) { try { p.remove(); } catch {} } }
}

const voices = new Map();
let dir = null;

async function bake(key, render) {
  if (voices.has(key)) return voices.get(key);
  const file = new File(dir, key.replace(/[^\w.-]/g, "_") + ".wav");
  try {
    if (!file.exists) { file.create({ overwrite: true }); file.writeBytes(wav(render())); }
    const v = new Voice(file.uri);
    voices.set(key, v);
    return v;
  } catch {
    voices.set(key, null);            /* 한 번 실패하면 다시 시도하지 않는다 */
    return null;
  }
}

export const Snd = {
  on: true,
  ready: false,

  async init() {
    if (this.ready) return;
    this.ready = true;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      dir = Paths.cache;
      for (const [k, r] of Object.entries(RECIPES)) await bake(k, r);
      for (const b of BLIPS) await bake(blipKey(...b), () => renderBlip(...b));
    } catch { this.on = false; }
  },

  release() { for (const v of voices.values()) v && v.release(); voices.clear(); },

  /* 코어는 host.sound.* 로만 부른다 — 이름은 web/sound.js 와 같다 */
  blip(freq, dur, type, vol) {
    if (!this.on) return;
    const key = blipKey(freq, dur, type, vol);
    const v = voices.get(key);
    if (v) v.play(1);
    else if (!voices.has(key)) bake(key, () => renderBlip(freq, dur, type, vol)).then(x => x && x.play(1));
  },
  shoot() { this._named("shoot"); },
  hit()   { this._named("hit"); },
  boom()  { this._named("boom"); },
  big()   { this._named("big"); },
  coin()  { this._named("coin"); },
  hurt()  { this._named("hurt"); },
  bomb()  { this._named("bomb"); },
  ui()    { this._named("ui"); },
  /* 웹에만 있는 원시 함수들 — 코어는 직접 부르지 않는다 */
  sweep() {}, noise() {},

  _named(k) { if (!this.on) return; const v = voices.get(k); if (v) v.play(1); },
};

const blipKey = (f, d, t, v) => `blip_${f}_${d}_${t}_${v}`;

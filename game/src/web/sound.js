/* ═══════════════════════════════════════════════
   3. 사운드 (WebAudio 신디사이저 — 외부 파일 없음)
   ═══════════════════════════════════════════════ */
const Snd = {
  on: true, ctx: null,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; } } },
  blip(freq, dur, type, vol) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime((vol || .05) * MASTER, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  sweep(f1, f2, dur, vol) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime((vol || .07) * MASTER, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  /* 노이즈 버퍼는 한 번만 만들어 재사용한다 — 금속성 소리의 재료 */
  noiseBuf() {
    if (!this._nb) {
      const n = this.ctx.sampleRate * .5;
      this._nb = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this._nb.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return this._nb;
  },
  /* 동시 발음 수는 예약된 '종료 시각'으로 센다.
     onended 콜백으로 카운터를 오르내리면 호출이 유실·중복되며 값이 드리프트한다
     (실측에서 -1과 +1이 모두 나왔다). 시각 비교는 그런 실패 모드가 없다. */
  _ends: [],
  active(now) {
    const e = this._ends;
    let n = 0;
    for (let i = 0; i < e.length; i++) if (e[i] > now) e[n++] = e[i];
    e.length = n;
    return n;
  },

  /* 밴드패스를 통과한 짧은 노이즈 = 장갑 타격음 */
  noise(freq, q, dur, vol) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.active(t) >= VOICE_CAP) return;     /* 연사 시 소리가 뭉치지 않게 */
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf();
    const f = this.ctx.createBiquadFilter(); f.type = "bandpass";
    f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * MASTER, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    this._ends.push(t + dur);
    src.start(t); src.stop(t + dur);
  },

  /* 이름 붙은 소리는 코어의 악보(core/audio.js SFX)에서 그대로 만든다 —
     숫자가 두 군데 있으면 웹과 앱의 소리가 언젠가 갈라진다. */
  play(name) {
    const parts = SFX[name];
    if (!parts) return;
    for (const [kind, ...a] of parts) this[kind](...a);
  }
};
for (const name of Object.keys(SFX)) Snd[name] = function () { this.play(name); };

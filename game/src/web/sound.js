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
    g.gain.setValueAtTime(vol || .05, t);
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
    g.gain.setValueAtTime(vol || .07, t);
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
    if (this.active(t) >= 8) return;            /* 연사 시 소리가 뭉치지 않게 */
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf();
    const f = this.ctx.createBiquadFilter(); f.type = "bandpass";
    f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    this._ends.push(t + dur);
    src.start(t); src.stop(t + dur);
  },

  /* 기계화 톤 — 공압식 발사, 금속 타격, 저역 임팩트, 릴레이 클릭 */
  shoot()  { this.noise(1900, 9, .045, .05); this.blip(320, .03, "square", .012); },
  hit()    { this.noise(2600, 5, .05, .07); },
  boom()   { this.noise(700, 1.2, .22, .10); this.sweep(240, 45, .26, .05); },
  big()    { this.noise(420, .8, .55, .14); this.sweep(150, 28, .7, .08); },
  coin()   { this.blip(1180, .05, "triangle", .03); this.noise(4200, 12, .03, .03); },
  hurt()   { this.noise(900, 2, .18, .12); this.sweep(280, 80, .22, .07); },
  bomb()   { this.noise(300, .6, .5, .12); this.sweep(80, 820, .35, .06); },
  ui()     { this.noise(3000, 14, .025, .05); }
};

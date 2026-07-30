/* ═══════════════════════════════════════════════
   12. 흐름 제어
   ═══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const SCREENS = ["title", "story", "pause", "result", "hangar"];
function setScreen(name) {
  G.screen = name;
  for (const s of SCREENS) $("scr-" + s).hidden = (s !== name);
  /* 정지 화면에서는 HUD를 계속 보여주되(상태 확인용) 조작은 막는다.
     오버레이가 마우스는 가리지만 키보드 포커스는 그대로 통과하므로 inert가 필요하다. */
  $("hud").classList.toggle("off", name !== "play" && name !== "pause");
  $("hud").inert = (name !== "play") || G.over;
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("on"), 1400);
}

/* 첫 안내 — 튜토리얼 벽을 세우는 대신, 그 상황이 처음 벌어질 때 한 번만 알려준다.
   콤보가 중독성의 축인데 그게 점수 배율이라는 걸 알려주는 데가 없었다. */
const TIPS = {
  combo:  "연속 처치가 점수 배율을 올린다 — 맞으면 0으로",
  bomb:   "폭탄: Space 또는 우하단 버튼 — 탄을 쓸어낸다",
  supply: "보급품은 탑승자마다 다르다 (격납고에서 확인)",
  guard:  "육각 차폐가 피탄을 막았다 — 6초마다 재충전",
  evade:  "회피 성공 — 내구도 콤보도 잃지 않는다"
};
function tip(id) {
  if (!TIPS[id] || S.tips.includes(id)) return;
  S.tips.push(id); persist();
  /* 같은 순간에 다른 알림이 떠 있으면 그걸 덮어쓰지 말고 뒤로 물러난다
     (보급품 안내가 아이템 토스트에 즉시 지워지던 문제). */
  const showing = $("toast").classList.contains("on");
  setTimeout(() => toast(TIPS[id]), showing ? 1500 : 0);
}

function maxStage() { return Math.min(S.cleared + 1, 99); }
function stageName(n) { return n <= 5 ? STAGES[n].nm : ENDLESS_NM + " " + (n - 5); }
function stageEn(n) { return n <= 5 ? STAGES[n].en : "REVERB " + (n - 5); }

function paintTitle() {
  G.pickStage = clamp(G.pickStage, 1, maxStage());
  $("stage-name").textContent = stageName(G.pickStage);
  $("stage-sub").textContent = "STAGE " + G.pickStage + " · " + stageEn(G.pickStage);
  $("stage-prev").disabled = G.pickStage <= 1;
  $("stage-next").disabled = G.pickStage >= maxStage();
  $("title-coin").textContent = fmt(S.coins);
  $("title-best").textContent = S.best ? "최고 기록 " + fmt(S.best) : "최고 기록 —";

  const lo = $("title-loadout");
  const { pilot, frame, skin, trail } = loadout();
  const st = stats();
  lo.innerHTML = "";

  const row = (k, v, pips) => {
    const r = document.createElement("div");
    r.className = "lo-row";
    r.innerHTML = '<span class="k"></span><span class="v"></span>' +
      (pips == null ? "" : '<span class="pips">' +
        Array.from({ length: MAXLV }, (_, i) => '<i class="pip' + (i < pips ? " on" : "") + '"></i>').join("") + '</span>');
    r.querySelector(".k").textContent = k;
    r.querySelector(".v").textContent = v;
    lo.appendChild(r);
  };

  row("탑승자", pilot.desig + " 「" + pilot.call + "」 · 회피 " + Math.round(pilot.evade * 100) + "% · " + pilot.dropNm);
  row("기체",   frame.desig + " " + frame.nm + " · " + frame.armNm + " · " + frame.perkNm);
  for (const it of EQUIP) row(it.nm, it.line(S.eq[it.id]), S.eq[it.id]);
  row("종합",   "위력 " + st.dmg + " · 기동 " + st.speed +
                " · 연사 " + Math.round(WEAPON[1].rate / st.rate * 100) + "%" +
                (st.pierce ? " · 관통 " + st.pierce : ""));
  row("도장",   skin.nm + " · " + trail.nm + " 궤적");
}

/* 매 프레임 호출되므로 값이 실제로 바뀔 때만 DOM을 건드린다 */
const hudCache = {};
function set(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }

function paintHud() {
  const p = G.player;
  if (!p) return;
  set("hud-stage", "STAGE " + G.stage + " · " +
    (G.phase === "boss" || G.phase === "clear" ? "CORE" : "WAVE " + Math.min(G.wave + 1, WAVES_PER_STAGE)));
  set("hud-score", fmt(G.score));
  set("hud-coin", fmt(G.coins));

  const hh = $("hud-hearts");
  if (hh.childElementCount !== p.maxHp) {
    hh.innerHTML = "";
    for (let i = 0; i < p.maxHp; i++) { const d = document.createElement("i"); d.className = "heart"; hh.appendChild(d); }
  }
  [...hh.children].forEach((el, i) => el.classList.toggle("gone", i >= p.hp));

  const bb = $("hud-bombs");
  const maxB = stats().bomb;
  if (bb.childElementCount !== maxB) {
    bb.innerHTML = "";
    for (let i = 0; i < maxB; i++) { const d = document.createElement("i"); d.className = "bomb"; bb.appendChild(d); }
  }
  [...bb.children].forEach((el, i) => el.classList.toggle("gone", i >= p.bomb));
  $("btn-bomb").disabled = p.bomb <= 0;

  const chips = [];
  if (p.surge > 0) chips.push('<span class="chip surge">과부하 ' + p.surge.toFixed(1) + 's</span>');
  if (stats().guard) chips.push('<span class="chip guard">차폐 ' + (p.guard >= GUARD_CD ? "READY" : Math.ceil(GUARD_CD - p.guard) + "s") + '</span>');
  const key = chips.join("");
  if (hudCache.chips !== key) { hudCache.chips = key; $("hud-chips").innerHTML = key; }

  /* 배율이 1일 때 "×1.0"을 크게 띄우면 정보가 아니라 소음이다.
     그때는 처치 수를 주인공으로 두고, 배율이 실제로 붙은 뒤에 배율을 앞세운다. */
  const cm = $("hud-combo");
  const on = G.combo >= 3;
  const mul = comboMul();
  cm.classList.toggle("on", on);
  cm.classList.toggle("hot", mul > 1);
  if (on) {
    const key = mul.toFixed(1) + "|" + G.combo;
    if (hudCache.combo !== key) {
      hudCache.combo = key;
      cm.innerHTML = mul > 1
        ? "×" + mul.toFixed(1) + "<br /><small>COMBO " + G.combo + "</small>"
        : G.combo + "<br /><small>연속 처치</small>";
    }
  }
}

/* — 스토리 — */
let storyThen = null;
let storyT = null;                    /* 진행 중인 출력 타이머 */

/* 대사가 한꺼번에 다 보이면 「건너뛰기」가 건너뛸 대상이 없다.
   관제 회선에 한 줄씩 올라오듯 순차 출력하고, 건너뛰기는 그걸 즉시 마친다. */
function revealStory(box) {
  clearTimeout(storyT);
  const rows = [...box.children];
  rows.forEach(r => r.classList.add("pend"));
  let i = 0;
  const step = () => {
    if (i >= rows.length) { storyT = null; return; }
    rows[i].classList.remove("pend");
    Snd.blip(420 + i * 60, .05, "triangle", .02);
    i++;
    storyT = setTimeout(step, REDUCED ? 60 : 520);
  };
  step();
}
function finishStory(box) {
  clearTimeout(storyT); storyT = null;
  [...box.children].forEach(r => r.classList.remove("pend"));
}
const storyPending = () => storyT !== null;

function showStory(stage, lines, then) {
  storyThen = then;
  $("story-head").textContent = "STAGE " + stage + " · " + stageName(stage) + " · " + stageEn(stage);
  const box = $("story-lines");
  box.innerHTML = "";
  for (const [who, say] of lines) {
    const isOps = who === "관제", isLog = who === null;
    const d = document.createElement("div");
    d.className = "line" + (isLog ? " n" : isOps ? " b" : " p");
    /* 화자를 색만으로 구분하면 탑승자가 바뀐 게 화면에서 안 읽힌다.
       관제는 계기 프레임, 탑승자는 본인 식별번호, 기록은 표식 없음. */
    const badge = isLog ? "" : isOps ? "OPS" : loadout().pilot.desig;
    d.innerHTML =
      '<div class="who">' + (badge ? '<i class="bdg"></i>' : "") + "<span></span></div>" +
      '<div class="say"></div>';
    if (badge) d.querySelector(".bdg").textContent = badge;
    d.querySelector(".who span").textContent = isLog ? "기록" : who;
    d.querySelector(".say").textContent = say;
    box.appendChild(d);
  }
  setScreen("story");
  revealStory(box);
}

/* — 런 — */
function beginRun(stage) {
  Snd.init();
  G.stage = stage; G.wave = 0;
  G.score = 0; G.coins = 0; G.kills = 0; G.combo = 0; G.maxCombo = 0;
  G.bullets.length = 0; G.ebullets.length = 0; G.enemies.length = 0;
  G.parts.length = 0; G.drops.length = 0; G.echo.length = 0;
  G.boss = null; G.t = 0; G.shake = 0; G.flash = 0; G.stop = 0; G.muzzle = 0; G.wave1 = null;
  G.over = false;
  $("hud").inert = false;
  G.player = newPlayer();
  P.tx = W / 2; P.ty = H - 130; P.active = false;
  enterStage(stage);
}

function enterStage(stage) {
  const lines = storyFor(stage);
  /* 처음 보는 구역에서만 대사를 세운다 — 재도전 흐름을 끊지 않기 위해.
     지난 대사는 격납고 › 기록에서 다시 읽을 수 있다. */
  if (lines && !S.seenStory.includes(stage)) {
    showStory(stage, lines, () => { S.seenStory.push(stage); persist(); goPlay(); });
  } else {
    goPlay();
  }
}

function goPlay() {
  if (G.player.bomb > 0) setTimeout(() => { if (G.screen === "play") tip("bomb"); }, 2500);
  G.phase = "gap"; G.waveT = .6;
  setScreen("play");
  paintHud();
}

function nextStage() {
  S.cleared = Math.max(S.cleared, G.stage);
  /* 구역 클리어 보너스 — 같은 구역을 반복하는 것보다 깊이 들어가는 쪽이 이득이어야 한다 */
  const bonus = 15 + 5 * G.stage;
  G.coins += bonus;
  toast("구역 정리 보너스 +" + bonus);
  persist();
  const end = G.stage === 5 ? storyEnd() : null;
  const p = G.player;
  p.hp = Math.min(p.maxHp, p.hp + 1);
  p.bomb = stats().bomb;
  G.stage++; G.wave = 0;
  G.boss = null;
  G.enemies.length = 0; G.ebullets.length = 0;
  if (end) { showStory(G.stage - 1, end, () => enterStage(G.stage)); }
  else enterStage(G.stage);
}

function endRun() {
  /* 중단 버튼 연타나 사망 직후 조작으로 두 번 들어올 수 있다 —
     그대로 두면 그 횟수만큼 코어가 중복 적립된다. */
  if (G.over) return;
  G.over = true;
  $("hud").inert = true;                  /* 결과 화면이 뜨기 전 700ms 동안 HUD 조작 차단 */

  S.coins += G.coins;
  const prevBest = S.best;                /* 갱신 전 값 — 눈금 위치에 쓴다 */
  const record = G.score > S.best;
  if (record) S.best = G.score;
  persist();
  G.pickStage = clamp(G.stage, 1, maxStage());   /* 재출격은 쓰러진 구역에서 */

  const lo = loadout();
  $("result-head").textContent = "기체 상실 · 회수 보고";
  $("result-title").textContent = "STAGE " + G.stage + " · " + stageName(G.stage) + " 에서 신호 소실";
  $("result-crew").textContent = lo.pilot.desig + " 「" + lo.pilot.call + "」 · " + lo.frame.desig + " " + lo.frame.nm;
  $("result-best").hidden = !record;
  $("r-score").textContent = fmt(G.score);
  $("r-coin").textContent = "+" + fmt(G.coins);
  $("r-kill").textContent = fmt(G.kills);
  $("r-combo").textContent = fmt(G.maxCombo);

  /* 최고 기록 대비 위치 — 첫 판이면 비교 대상이 없으니 눈금을 숨긴다 */
  const scale = Math.max(prevBest, G.score, 1);
  const pct = prevBest > 0 ? Math.round(G.score / prevBest * 100) : null;
  $("r-pct").textContent = record ? "경신" : pct === null ? "첫 기록" : pct + "%";
  $("r-bestlbl").textContent = prevBest ? "BEST " + fmt(prevBest) : "BEST —";
  $("r-depth").textContent = "STAGE " + G.stage + " 도달";
  const mark = $("r-mark");
  mark.style.display = prevBest > 0 && !record ? "block" : "none";
  mark.style.left = (prevBest / scale * 100) + "%";
  const bar = $("r-bar");
  bar.style.width = "0%";
  requestAnimationFrame(() => { bar.style.width = (G.score / scale * 100) + "%"; });

  setTimeout(() => setScreen("result"), 700);
}

function pause() {
  /* 멈춘 김에 현재 상황을 보여준다 — 비어 있는 정지 화면은 기회 낭비다 */
  const lo = loadout(), p = G.player, st = stats();
  const rows = [
    ["구역", "STAGE " + G.stage + " · " + stageName(G.stage) +
             (G.phase === "boss" ? " · 코어전" : " · 웨이브 " + Math.min(G.wave + 1, WAVES_PER_STAGE))],
    ["점수", fmt(G.score) + "  (처치 " + fmt(G.kills) + " · 최대 콤보 " + G.maxCombo + ")"],
    ["회수", "코어 " + fmt(G.coins)],
    ["편성", lo.pilot.desig + " 「" + lo.pilot.call + "」 · " + lo.frame.desig + " " + lo.frame.nm],
    ["상태", "내구 " + p.hp + "/" + p.maxHp + " · 폭탄 " + p.bomb +
             (st.guard ? " · 차폐 " + (p.guard >= GUARD_CD ? "준비" : "충전중") : "") +
             (p.surge > 0 ? " · 과부하 " + p.surge.toFixed(1) + "s" : "")]
  ];
  const box = $("pause-info");
  box.innerHTML = "";
  for (const [k, v] of rows) {
    const r = document.createElement("div");
    r.className = "lo-row";
    r.innerHTML = '<span class="k"></span><span class="v"></span>';
    r.querySelector(".k").textContent = k;
    r.querySelector(".v").textContent = v;
    box.appendChild(r);
  }
  setScreen("pause");
}
function resume() { setScreen("play"); last = performance.now(); }

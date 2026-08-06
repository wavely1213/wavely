/* ═══════════════════════════════════════════════
   13. 격납고 UI
   ═══════════════════════════════════════════════ */
function openHangar() {
  paintHangar();
  setScreen("hangar");
}

/* 절대 수치만 보여주면 지금 장착한 것보다 나은지 알 수 없다.
   base를 주면 그 대비 증감을 함께 띄운다(장착 중인 카드에는 표시하지 않는다). */
function statChip(label, pct, higherIsBetter, base) {
  const cls = pct === 100 ? "" : (pct > 100) === higherIsBetter ? " up" : " dn";
  const s = document.createElement("span");
  s.className = "stat" + cls;
  s.innerHTML = label + ' <b></b><i class="d"></i>';
  s.querySelector("b").textContent = pct + "%";
  const dEl = s.querySelector(".d");
  if (base != null && base !== pct) {
    const diff = pct - base;
    dEl.textContent = (diff > 0 ? " +" : " ") + diff;
    dEl.className = "d " + ((diff > 0) === higherIsBetter ? "good" : "bad");
  }
  return s;
}

function unitCard(item, kind) {
  const isPilot = kind === "pilot";
  const slot = isPilot ? "pilot" : "frame";
  /* 소유·해금·가격 판정은 코어(core/shop.js)가 한다 — 여기서 다시 쓰면 앱과 갈라진다 */
  const state = statusOf(item, S[slot]);
  const isEquipped = state === "equipped", isLocked = state === "locked";

  const row = document.createElement("div");
  row.className = "unit";

  const art = document.createElement("canvas");
  art.className = "art";
  art.width = 124; art.height = 124;
  art.setAttribute("aria-hidden", "true");   /* 옆의 글자가 같은 내용을 이미 말한다 */
  (isPilot ? paintPilotArt : paintFrameArt)(art, item);

  const body = document.createElement("div");
  body.className = "body";

  const head = document.createElement("div");
  head.className = "head";
  const idb = document.createElement("div");
  idb.innerHTML = '<div class="desig"></div><div class="nm"><span></span><small></small></div>';
  idb.querySelector(".desig").textContent = item.desig + " · " + (isPilot ? "탑승자" : item.cls);
  idb.querySelector(".nm span").textContent = isPilot ? "「" + item.call + "」" : item.nm;
  idb.querySelector(".nm small").textContent = isPilot ? item.nm : "";   /* 기체는 형식번호가 위에 이미 있다 */
  head.appendChild(idb);

  const btn = document.createElement("button");
  btn.className = "buy";
  btn.type = "button";
  if (isLocked) { btn.textContent = "STAGE " + item.need; btn.disabled = true; }
  else if (isEquipped) { btn.textContent = "탑승중"; btn.disabled = true; btn.classList.add("equipped"); }
  else {
    const has = state === "owned";
    btn.textContent = has ? "선택" : fmt(item.cost);
    if (has) btn.classList.add("owned"); else btn.disabled = state === "poor";
    btn.addEventListener("click", () => {
      const r = acquire(item, slot);
      if (r === "poor" || r === "locked") return;
      Snd.ui();
      toast(r === "bought"
        ? (isPilot ? item.call : item.nm) + " 배치"
        : (isPilot ? "탑승자 " : "기체 ") + (isPilot ? item.call : item.nm));
      paintHangar();
    });
  }
  head.appendChild(btn);
  body.appendChild(head);

  const bio = document.createElement("div");
  bio.className = "bio";
  bio.textContent = isLocked ? item.need + "구역 돌파 시 기밀 해제." : item.bio;
  body.appendChild(bio);

  const st = document.createElement("div");
  st.className = "stats";
  const cur = loadout();
  const ref = isEquipped ? null : (isPilot ? cur.pilot : cur.frame);   /* 장착 중인 것과 비교 */
  if (isPilot) {
    st.appendChild(statChip("회피", Math.round(item.evade * 100), true, ref && Math.round(ref.evade * 100)));
    st.appendChild(statChip("연사", Math.round(100 / item.rate), true, ref && Math.round(100 / ref.rate)));
  } else {
    st.appendChild(statChip("공격", Math.round(item.atk * 100), true, ref && Math.round(ref.atk * 100)));
    st.appendChild(statChip("기동", Math.round(item.spd * 100), true, ref && Math.round(ref.spd * 100)));
    st.appendChild(statChip("연사", Math.round(100 / item.rate), true, ref && Math.round(100 / ref.rate)));
  }
  body.appendChild(st);

  const addPerk = (lbl, nm, tx) => {
    const el = document.createElement("div");
    el.className = "perk";
    el.innerHTML = '<span class="lbl"></span><span class="val"><b></b> — <span class="tx"></span></span>';
    el.querySelector(".lbl").textContent = lbl;
    el.querySelector("b").textContent = nm;
    el.querySelector(".tx").textContent = tx;
    body.appendChild(el);
  };
  if (isPilot) addPerk("보급", item.dropNm, item.dropTx);
  else {
    addPerk("무장", item.armNm, item.armTx);   /* 기체마다 탄 배치가 다르다 */
    addPerk("부가", item.perkNm, item.perkTx);
  }

  row.appendChild(art); row.appendChild(body);
  return row;
}

/* 카드 아트는 코어(core/draw.js)에 있다 — 앱 격납고와 같은 그림을 쓴다 */
function paintPilotArt(canvas, p) { drawPilotPlate(canvas.getContext("2d"), p, canvas.width); }
function paintFrameArt(canvas, f) { drawFramePlate(canvas.getContext("2d"), f, canvas.width); }

function paintHangar() {
  $("hangar-coin").textContent = fmt(S.coins);

  /* 탑승자 */
  const pp = $("pn-pilot");
  pp.innerHTML = "";
  for (const p of PILOTS) pp.appendChild(unitCard(p, "pilot"));

  /* 기체 */
  const pf = $("pn-frame");
  pf.innerHTML = "";
  for (const f of FRAMES) pf.appendChild(unitCard(f, "frame"));

  /* 장비 */
  const eq = $("pn-eq");
  eq.innerHTML = "";
  for (const it of EQUIP) {
    const lv = S.eq[it.id];
    const max = lv >= MAXLV;
    const cost = max ? 0 : upCost(lv);
    const nxt = max ? null : it.line(lv + 1);

    const row = document.createElement("div");
    row.className = "row";
    const pips = Array.from({ length: MAXLV }, (_, i) => '<i class="pip' + (i < lv ? " on" : "") + '"></i>').join("");
    row.innerHTML =
      '<div class="body">' +
        '<div class="nm">' + it.nm + ' <span style="color:var(--c-dim);font-weight:400">LV ' + lv + '</span></div>' +
        '<div class="st"></div>' +
        (nxt ? '<div class="st nxt">→ <b></b></div>' : '') +
        '<div class="pips">' + pips + '</div>' +
      '</div>';
    row.querySelector(".st").textContent = it.line(lv);
    if (nxt) row.querySelector(".nxt b").textContent = nxt;

    const btn = document.createElement("button");
    btn.className = "buy";
    btn.type = "button";
    if (max) { btn.textContent = "MAX"; btn.disabled = true; btn.classList.add("owned"); }
    else {
      btn.textContent = fmt(cost);
      btn.disabled = S.coins < cost;
      btn.addEventListener("click", () => {
        if (upgrade(it.id) !== "ok") return;
        Snd.ui(); toast(it.nm + " LV " + S.eq[it.id]);
        paintHangar();
      });
    }
    row.appendChild(btn);
    eq.appendChild(row);
  }

  /* 치장 */
  const cos = $("pn-cos");
  cos.innerHTML = "";
  const section = (title) => {
    const h = document.createElement("div");
    h.className = "eyebrow";
    h.style.padding = "12px 0 4px";
    h.textContent = title;
    cos.appendChild(h);
  };
  section("기체 도장");
  for (const sk of SKINS) cos.appendChild(cosRow(sk, "skin"));
  section("배기 궤적");
  for (const tr of TRAILS) cos.appendChild(cosRow(tr, "trail"));

  /* 기록 */
  const lg = $("pn-log");
  lg.innerHTML = "";
  const h1 = document.createElement("div");
  h1.className = "eyebrow"; h1.style.padding = "12px 0 4px"; h1.textContent = "항행 기록";
  lg.appendChild(h1);
  /* 본편 5편 + 무한 모드 「잔향」의 이정표 편까지 */
  const chapters = [1, 2, 3, 4, 5, ...Object.keys(STORY_REVERB).map(Number)];
  for (const i of chapters) {
    const seen = S.seenStory.includes(i);
    const d = document.createElement("div");
    d.className = "log" + (seen ? "" : " locked");
    d.innerHTML = '<div class="nm"></div><div class="tx"></div>';
    d.querySelector(".nm").textContent = "STAGE " + i + " · " + stageName(i);
    /* 현재 탑승자의 대사로 다시 읽힌다 — 탑승자를 바꾸면 기록도 바뀐다 */
    d.querySelector(".tx").textContent = seen
      ? storyFor(i).map(l => (l[0] ? l[0] + ": " : "") + l[1]).join("  /  ")
      : "미확인 구역";
    lg.appendChild(d);
  }
  const h2 = document.createElement("div");
  h2.className = "eyebrow"; h2.style.padding = "16px 0 4px"; h2.textContent = "조우 기록";
  lg.appendChild(h2);
  for (const c of CODEX) {
    const seen = S.codex.includes(c.id);
    const d = document.createElement("div");
    d.className = "log" + (seen ? "" : " locked");
    d.innerHTML = '<div class="nm"></div><div class="tx"></div>';
    d.querySelector(".nm").textContent = seen ? c.nm : "??? · 미조우";
    d.querySelector(".tx").textContent = seen ? c.tx : "아직 만나지 않았다.";
    lg.appendChild(d);
  }
  const h3 = document.createElement("div");
  h3.className = "eyebrow"; h3.style.padding = "16px 0 8px";
  h3.textContent = "최고 " + fmt(S.best) + " · 돌파 " + S.cleared + "구역";
  lg.appendChild(h3);

  /* 진행 초기화 — 되돌릴 수 없으므로 2단계로 받는다.
     별도 확인 창을 띄우지 않고 버튼 자체가 상태를 바꾼다. */
  const rs = document.createElement("button");
  rs.type = "button";
  rs.className = "btn ghost";
  rs.style.marginTop = "6px";
  rs.textContent = "기록 초기화";
  let armed = false;
  rs.addEventListener("click", () => {
    Snd.ui();
    if (!armed) {
      armed = true;
      rs.textContent = "정말 지웁니다 — 한 번 더";
      rs.style.borderColor = "var(--c-bad)";
      rs.style.color = "var(--c-bad)";
      setTimeout(() => {
        if (!armed) return;
        armed = false;
        rs.textContent = "기록 초기화";
        rs.style.borderColor = ""; rs.style.color = "";
      }, 4000);
      return;
    }
    resetSave();                           /* 초기화 규칙은 코어(save.js)가 갖는다 */
    G.pickStage = 1;
    toast("기록을 초기화했습니다");
    paintHangar();
    paintTitle();
  });
  lg.appendChild(rs);
}

function cosRow(item, kind) {
  const slot = kind === "skin" ? "skin" : "trail";
  const state = statusOf(item, S[slot]);
  const isEquipped = state === "equipped", isLocked = state === "locked";

  const row = document.createElement("div");
  row.className = "row";

  const sw = document.createElement("canvas");
  sw.className = "swatch";
  sw.width = 80; sw.height = 80;
  sw.setAttribute("aria-hidden", "true");
  paintSwatch(sw, item, kind);

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = '<div class="nm"></div><div class="st"></div>';
  body.querySelector(".nm").textContent = item.nm;
  body.querySelector(".st").textContent = isLocked
    ? "STAGE " + item.need + " 돌파 시 해금"
    : item.sub;

  const btn = document.createElement("button");
  btn.className = "buy";
  btn.type = "button";
  if (isLocked) { btn.textContent = "잠김"; btn.disabled = true; }
  else if (isEquipped) { btn.textContent = "장착중"; btn.disabled = true; btn.classList.add("equipped"); }
  else {
    const has = state === "owned";
    btn.textContent = has ? "장착" : item.cost > 0 ? fmt(item.cost) : "수령";
    if (has) btn.classList.add("owned"); else btn.disabled = state === "poor";
    btn.addEventListener("click", () => {
      const r = acquire(item, slot);
      if (r === "poor" || r === "locked") return;
      Snd.ui(); toast(item.nm + (r === "bought" ? " 획득" : " 장착")); paintHangar();
    });
  }

  row.appendChild(sw); row.appendChild(body); row.appendChild(btn);
  return row;
}

/* 스와치도 코어(core/draw.js)에 있다 — 앱 치장 탭과 같은 그림 */
function paintSwatch(canvas, item, kind) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  drawSwatch(g, item, kind, canvas.width);
}

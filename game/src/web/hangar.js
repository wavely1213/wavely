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
  const owned = S.owned.includes(item.id);
  const equipped = (isPilot ? S.pilot : S.frame) === item.id;
  const locked = item.need && S.cleared < item.need;

  const row = document.createElement("div");
  row.className = "unit";

  const art = document.createElement("canvas");
  art.className = "art";
  art.width = 124; art.height = 124;
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
  if (locked) { btn.textContent = "STAGE " + item.need; btn.disabled = true; }
  else if (equipped) { btn.textContent = "탑승중"; btn.disabled = true; btn.classList.add("equipped"); }
  else if (owned) {
    btn.textContent = "선택"; btn.classList.add("owned");
    btn.addEventListener("click", () => {
      if (isPilot) S.pilot = item.id; else S.frame = item.id;
      persist(); Snd.ui(); toast((isPilot ? "탑승자 " : "기체 ") + (isPilot ? item.call : item.nm)); paintHangar();
    });
  } else {
    btn.textContent = fmt(item.cost);
    btn.disabled = S.coins < item.cost;
    btn.addEventListener("click", () => {
      if (S.coins < item.cost) return;
      S.coins -= item.cost; S.owned.push(item.id);
      if (isPilot) S.pilot = item.id; else S.frame = item.id;
      persist(); Snd.ui(); toast((isPilot ? item.call : item.nm) + " 배치"); paintHangar();
    });
  }
  head.appendChild(btn);
  body.appendChild(head);

  const bio = document.createElement("div");
  bio.className = "bio";
  bio.textContent = locked ? item.need + "구역 돌파 시 기밀 해제." : item.bio;
  body.appendChild(bio);

  const st = document.createElement("div");
  st.className = "stats";
  const cur = loadout();
  const ref = equipped ? null : (isPilot ? cur.pilot : cur.frame);   /* 장착 중인 것과 비교 */
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

/* 탑승자 초상 대신 계기판식 식별 표식 — 얼굴을 그리지 않고 규격으로 구분한다 */
function paintPilotArt(canvas, p) {
  const g = canvas.getContext("2d");
  const N = canvas.width;
  g.fillStyle = C.ground; g.fillRect(0, 0, N, N);

  g.strokeStyle = alpha(C.line, 1); g.lineWidth = 1;
  for (let i = 14; i < N; i += 14) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, N); g.moveTo(0, i); g.lineTo(N, i); g.stroke();
  }

  const cx = N / 2, cy = N / 2;
  const col = p.drop === "surge" ? C.signal : p.drop === "ord" ? C.dust : p.drop === "repair" ? C.moss : C.drift;

  /* 회피율만큼 링이 열려 있다 */
  g.strokeStyle = col; g.lineWidth = 4;
  g.beginPath(); g.arc(cx, cy, 36, -1.9, -1.9 + 6.283 * (1 - p.evade * 2.6)); g.stroke();

  g.strokeStyle = alpha(C.fg, .8); g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.283 - Math.PI / 2;
    const hx = cx + Math.cos(a) * 22, hy = cy + Math.sin(a) * 22;
    i ? g.lineTo(hx, hy) : g.moveTo(hx, hy);
  }
  g.closePath(); g.stroke();

  g.fillStyle = C.fg;
  g.font = "600 26px " + getComputedStyle(document.body).fontFamily;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(p.desig.split("-")[1], cx, cy + 1);
}

function paintFrameArt(canvas, f) {
  const g = canvas.getContext("2d");
  const N = canvas.width;
  g.fillStyle = C.ground; g.fillRect(0, 0, N, N);
  g.strokeStyle = alpha(C.line, 1); g.lineWidth = 1;
  for (let i = 14; i < N; i += 14) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, N); g.moveTo(0, i); g.lineTo(N, i); g.stroke();
  }
  drawFrame(g, f.id, N / 2, N / 2 + 4, 2.9, skinColor());
}

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
        if (S.coins < cost) return;
        S.coins -= cost; S.eq[it.id]++; persist();
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
    const keepSound = S.sound;
    S = structuredClone(DEFAULT_SAVE);
    S.sound = keepSound;                   /* 소리 설정은 진행 기록이 아니다 */
    persist();
    G.pickStage = 1;
    toast("기록을 초기화했습니다");
    paintHangar();
    paintTitle();
  });
  lg.appendChild(rs);
}

function cosRow(item, kind) {
  const owned = S.owned.includes(item.id);
  const equipped = (kind === "skin" ? S.skin : S.trail) === item.id;
  const locked = item.need && S.cleared < item.need;

  const row = document.createElement("div");
  row.className = "row";

  const sw = document.createElement("canvas");
  sw.className = "swatch";
  sw.width = 80; sw.height = 80;
  paintSwatch(sw, item, kind);

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = '<div class="nm"></div><div class="st"></div>';
  body.querySelector(".nm").textContent = item.nm;
  body.querySelector(".st").textContent = locked
    ? "STAGE " + item.need + " 돌파 시 해금"
    : item.sub;

  const btn = document.createElement("button");
  btn.className = "buy";
  btn.type = "button";
  if (locked) { btn.textContent = "잠김"; btn.disabled = true; }
  else if (equipped) { btn.textContent = "장착중"; btn.disabled = true; btn.classList.add("equipped"); }
  else if (owned) {
    btn.textContent = "장착"; btn.classList.add("owned");
    btn.addEventListener("click", () => {
      if (kind === "skin") S.skin = item.id; else S.trail = item.id;
      persist(); Snd.ui(); toast(item.nm + " 장착"); paintHangar();
    });
  } else {
    btn.textContent = item.cost > 0 ? fmt(item.cost) : "수령";
    btn.disabled = S.coins < item.cost;
    btn.addEventListener("click", () => {
      if (S.coins < item.cost) return;
      S.coins -= item.cost; S.owned.push(item.id);
      if (kind === "skin") S.skin = item.id; else S.trail = item.id;
      persist(); Snd.ui(); toast(item.nm + " 획득"); paintHangar();
    });
  }

  row.appendChild(sw); row.appendChild(body); row.appendChild(btn);
  return row;
}

function paintSwatch(canvas, item, kind) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, 80, 80);
  g.fillStyle = C.field; g.fillRect(0, 0, 80, 80);
  if (kind === "skin") {
    drawFrame(g, S.frame, 40, 42, 1.7, item.col(), item.col2 && item.col2());   /* 도장은 현재 기체 위에 얹혀 보인다 */
  } else {
    const col = item.id === "ion" ? C.drift : item.id === "bloom" ? C.moss : item.id === "echo" ? C.dust : C.signal;
    for (let i = 0; i < 16; i++) {
      g.globalAlpha = 1 - i / 18;
      g.fillStyle = col;
      const sz = item.id === "bloom" ? 5 - i * .2 : item.id === "echo" ? 7 - i * .35 : 4 - i * .18;
      g.fillRect(40 - sz / 2 + Math.sin(i * .8) * 7, 8 + i * 4.2, sz, item.id === "ion" ? 5 : sz);
    }
    g.globalAlpha = 1;
  }
}

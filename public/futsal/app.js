// 풋살 스튜디오 원격 — 휴대폰 화면 (mulgyeol.kr/futsal)
// PC 앱(remote.py)의 /r/* 와 ntfy 비콘만 쓴다. 와벨리 코드·데이터와는 아무 관계가 없다.
// 밖에서 온 글자(파일 이름·제목·기록)는 늘 textContent 로만 넣는다 (innerHTML 에 넣지 않음).
import * as P from "/futsal/proto.js";

const DEV = ["127.0.0.1", "localhost"].includes(location.hostname);
const DEV_NTFY = DEV ? ((document.querySelector('meta[name="futsal-dev-ntfy"]') || {}).content || "") : "";
const PAIR_NTFY = DEV && DEV_NTFY ? DEV_NTFY : P.NTFY;
const $ = id => document.getElementById(id);
const S = { cred: null, keys: null, tab: "progress", status: null, logs: [], logTotal: 0, lib: null, outs: null, choices: null,
  online: false, timer: null, connecting: false, prevJob: null, logOpen: false, notifyMoved: false, playing: {} };
const KIND = { own: "풋살사관학교", footage: "내 촬영본", unknown: "출처 모름" };
const STORE_IOS = "https://apps.apple.com/app/ntfy/id1625396347";
const STORE_ANDROID = "https://play.google.com/store/apps/details?id=io.heckel.ntfy";

// ---------- 작은 도구 ----------
const CTRL = /[\u0000-\u0008\u000b-\u001f\u007f‎‏‪-‮⁦-⁩]/g;
const clean = s => String(s == null ? "" : s).replace(CTRL, "");
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = clean(v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(typeof c === "object" ? c : document.createTextNode(clean(c)));
  return el;
}
const clock = t => new Date(t * 1000).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
function ago(t) {
  const s = Math.max(0, Date.now() / 1000 - t);
  return s < 60 ? "방금" : s < 3600 ? `${Math.floor(s / 60)}분 전` : s < 86400 ? `${Math.floor(s / 3600)}시간 전` : `${Math.floor(s / 86400)}일 전`;
}
const size = mb => mb == null ? "" : mb >= 1000 ? `${(mb / 1000).toFixed(1)}GB` : mb < 0.1 ? "0.1MB 미만" : `${mb}MB`;
function toast(msg) { const t = $("toast"); t.textContent = clean(msg); t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3500); }
function view(...cards) { const v = $("view"); v.replaceChildren(...cards.flat().filter(Boolean)); }
function dot(cls, title) { const d = $("netDot"); d.className = "dot " + (cls || ""); d.title = title || ""; }
function withTimeout(ms) { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) }; }
const NET = { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", mode: "cors" };
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("복사했어요"); return; } catch (e) { /* 아래 방법으로 */ }
  const ta = h("textarea", { readonly: true }); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.append(ta); ta.select(); try { document.execCommand("copy"); toast("복사했어요"); } catch (e) { toast("복사하지 못했어요"); } ta.remove();
}
function mediaUrl(p) {
  return typeof p === "string" && /^\/r\/m\/[A-Za-z0-9_-]{16,64}$/.test(p) && S.cred && S.cred.lastUrl ? S.cred.lastUrl + p : null;
}

// ---------- 아래에서 올라오는 창 · 묻기 ----------
function sheet(...kids) {
  const m = $("sheetMask"), s = $("sheet");
  s.replaceChildren(...kids.flat().filter(Boolean), h("button", { class: "btn close", onclick: closeSheet }, "닫기"));
  m.hidden = false;
}
function closeSheet() { $("sheetMask").hidden = true; $("sheet").replaceChildren(); }
$("sheetMask").addEventListener("click", e => { if (e.target === $("sheetMask")) closeSheet(); });
function ask(text, ok = "확인", danger = false) {
  return new Promise(res => {
    const done = v => { closeSheet(); res(v); };
    const m = $("sheetMask"), s = $("sheet");
    s.replaceChildren(h("p", { text, class: "ask" }), h("div", { class: "row" },
      h("button", { class: "btn grow", onclick: () => done(false) }, "취소"),
      h("button", { class: "btn grow " + (danger ? "danger" : "primary"), onclick: () => done(true) }, ok)));
    m.hidden = false;
  });
}

// ---------- 저장 (IndexedDB · 열쇠는 가져오기 전용 CryptoKey 로만) ----------
const DB = { db: null, mem: null };
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("futsal-remote", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function dbDo(mode, fn) {
  const db = DB.db || (DB.db = await idb());
  return new Promise((res, rej) => { const q = fn(db.transaction("kv", mode).objectStore("kv")); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function load() { try { return await dbDo("readonly", st => st.get("cred")); } catch (e) { return DB.mem; } }
async function save() { DB.mem = S.cred; try { await dbDo("readwrite", st => st.put(S.cred, "cred")); } catch (e) { /* 개인 정보 보호 모드: 이 화면을 연 동안만 */ } }
async function wipe() { DB.mem = null; try { await dbDo("readwrite", st => st.delete("cred")); } catch (e) { /* 없음 */ } }

// ---------- PC 와 말하기 ----------
async function ping(base) {
  const t = withTimeout(6000);
  try {
    const r = await fetch(base + "/r/ping", { ...NET, signal: t.signal });
    const j = r.ok ? await r.json() : null;
    return j && j.api === P.API && j.pc && /^[0-9a-f]{16}$/.test(j.pc.id) ? j : null;
  } catch (e) { return null; } finally { t.done(); }
}
class Gone extends Error {}
async function api(method, path, body, ms = 8000) {
  const c = S.cred;
  const data = body === undefined ? "" : JSON.stringify(body);
  for (let attempt = 0; attempt < 2; attempt++) {
    const auth = await P.authHeader(S.keys.auth, c.deviceId, method, path, data, Math.floor(Date.now() / 1000) + (c.skew || 0));
    const headers = body === undefined ? { Authorization: auth } : { Authorization: auth, "Content-Type": "application/json" };
    const t = withTimeout(ms);
    let r;
    try { r = await fetch(c.lastUrl + path, { ...NET, method, headers, body: body === undefined ? undefined : data, signal: t.signal }); } finally { t.done(); }
    let j = {};
    try { j = await r.json(); } catch (e) { /* 글이 아님 */ }
    if (r.status === 401 && j.code === "skew" && typeof j.time === "number" && attempt === 0) {  // 휴대폰 시계가 다르면 PC 시각에 맞춰 한 번 더
      c.skew = j.time - Math.floor(Date.now() / 1000); await save(); continue;
    }
    if (r.status === 401 && j.code === "unknown_device") { await forgetLocal("이 휴대폰은 연결이 끊겼어요 · PC에서 다시 연결해 주세요"); throw new Gone(); }
    return { status: r.status, ok: r.ok, j };
  }
}
async function latestNtfy(server, topic) {
  const t = withTimeout(8000);
  try {
    const r = await fetch(`${server}/${topic}/json?poll=1&since=latest`, { ...NET, signal: t.signal });
    if (!r.ok) return null;
    const lines = (await r.text()).split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try { const m = JSON.parse(lines[i]); if (m.event === "message" && typeof m.message === "string") return m; } catch (e) { /* 다음 줄 */ }
    }
    return null;
  } catch (e) { return null; } finally { t.done(); }
}
/** 비콘(ntfy) → 내 몫을 풀어 마지막 소식에 기억 · 옛 글(seq 가 같거나 작음)은 무시 · 주제가 옮겨졌으면 따라감 */
async function readBeacon() {
  const c = S.cred;
  for (let hop = 0; hop < 3; hop++) {
    const m = await latestNtfy(c.beaconServer, c.beaconTopic);
    const b = m && await P.openBeacon(m.message, c.deviceId, S.keys.beacon);
    if (!b || b.pc !== c.pcId || !(b.seq > (c.lastSeq || 0))) break;
    c.lastSeq = b.seq;
    c.lastBeacon = { ts: b.ts, state: b.state, reason: b.reason, url: b.url, job: b.job, ver: b.ver };
    if (b.api !== P.API) c.apiMismatch = true;
    if (b.moved && P.topicOk(b.moved.beacon) && P.topicOk(b.moved.notify)) {
      if (b.moved.notify !== c.notifyTopic) S.notifyMoved = true;
      c.beaconTopic = b.moved.beacon; c.notifyTopic = b.moved.notify;
      await save();
      continue;
    }
    await save();
    break;
  }
  return c.lastBeacon || null;
}
async function refreshStatus(ms) {
  try {
    const r = await api("GET", `/r/status?since=${S.logTotal}`, undefined, ms || 8000);
    if (!r.ok) return false;
    const j = r.j;
    if (j.api !== P.API) { S.cred.apiMismatch = true; return false; }
    S.cred.apiMismatch = false;
    if (j.logTotal < S.logTotal) S.logs = [];
    S.logs = S.logs.concat(j.log || []).slice(-200);
    S.logTotal = j.logTotal;
    const c = S.cred;
    if (j.pc && j.pc.name && j.pc.name !== c.pcName) { c.pcName = j.pc.name; await save(); }
    for (const [k, key] of [["beacon", "beaconTopic"], ["notify", "notifyTopic"]]) {
      const t = j[k] && j[k].topic;
      if (P.topicOk(t) && t !== c[key]) { if (k === "notify") S.notifyMoved = true; c[key] = t; await save(); }
    }
    if (S.prevJob && !j.job && j.last) jobEnded(j.last);
    S.prevJob = j.job ? j.job.name : null;
    S.status = j;
    return true;
  } catch (e) {
    if (e instanceof Gone) throw e;
    return false;
  }
}

// ---------- 연결 흐름 ----------
async function connect() {
  if (S.connecting || !S.cred) return;
  S.connecting = true;
  try {
    if (!S.online && !S.status) { dot("wait", "PC를 찾고 있어요"); finding(); }
    if (S.cred.lastUrl && await refreshStatus(6000)) return goOnline();
    const b = await readBeacon();
    const url = b && b.state === "on" ? P.hostOk(b.url, DEV) : null;
    if (url && url !== S.cred.lastUrl) {
      S.cred.lastUrl = url; await save();
      if (await refreshStatus(6000)) return goOnline();
    }
    goOffline();
  } catch (e) {
    if (!(e instanceof Gone)) goOffline();
  } finally { S.connecting = false; }
}
function goOnline() {
  S.online = true;
  dot("on", "PC와 연결됐어요");
  $("pcName").textContent = clean(S.cred.pcName || "내 PC") + " · 연결됨";
  $("tabs").hidden = false;
  render();
}
function goOffline() {
  S.online = false;
  $("tabs").hidden = true;
  closeSheet();
  offline();
}
function schedule() {
  clearTimeout(S.timer);
  if (document.hidden || !S.cred) return;
  S.timer = setTimeout(tick, !S.online ? 30000 : (S.status && S.status.job ? 2000 : 10000));
}
async function tick() {
  if (!S.cred) return;
  try {
    if (S.online) {
      if (await refreshStatus()) { if (S.tab === "progress") renderProgress(); else updateHead(); }
      else { S.online = false; await connect(); }
    } else await connect();
  } catch (e) { /* Gone: 이미 처리 */ }
  schedule();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.cred) tick(); else clearTimeout(S.timer); });

// ---------- 짝짓기 ----------
function deviceName() {
  const ua = navigator.userAgent;
  const d = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (/SM-|Samsung/i.test(ua) ? "Galaxy" : "Android") : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "PC" : "휴대폰";
  const b = /SamsungBrowser/.test(ua) ? "삼성 인터넷" : /Edg/.test(ua) ? "Edge" : /CriOS|Chrome/.test(ua) ? "Chrome" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "브라우저";
  const home = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone ? " · 홈 화면" : "";
  return `${d} · ${b}${home}`;
}
async function pair(code, hint) {
  dot("wait", "PC를 찾고 있어요");
  view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "PC를 찾고 있어요…" }), h("p", { class: "muted", text: "PC 화면의 코드로 연결하는 중이에요" })));
  let base = hint ? P.hintUrl(hint, DEV) : null;
  let pc = base ? await ping(base) : null;
  if (!pc) {  // QR 힌트가 없거나 닿지 않으면: 코드로 만든 비밀 주제에서 PC 주소를 찾음 (아이폰 홈 화면 앱은 코드만 침)
    base = null;
    const { topic, key } = await P.derivePair(code);
    for (let i = 0; i < 4 && !base; i++) {
      const m = await latestNtfy(PAIR_NTFY, topic);
      const msg = m && await P.openPair(m.message, topic, key);
      if (msg && msg.exp > Date.now() / 1000 - 60) base = P.hostOk(msg.url, DEV);
      if (!base) await new Promise(r => setTimeout(r, 2000));
    }
    pc = base ? await ping(base) : null;
  }
  if (!pc) return unpaired("PC를 찾지 못했어요 · PC에서 원격 접속이 켜져 있는지, 코드가 맞는지(10분 안) 확인해 주세요");
  if (S.cred && S.cred.pcId !== pc.pc.id && !await ask(`다른 PC('${clean(pc.pc.name)}')와 연결할까요?\n지금 연결된 PC('${clean(S.cred.pcName)}')와는 끊어져요.`, "연결하기")) {
    return S.cred ? (finding(), connect().then(schedule)) : unpaired();
  }
  let r;
  try {
    const t = withTimeout(20000);
    try { r = await fetch(base + "/r/pair", { ...NET, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name: deviceName() }), signal: t.signal }); } finally { t.done(); }
  } catch (e) { return unpaired("PC와 연결하지 못했어요 · 잠시 뒤 다시 해 주세요"); }
  let j = {};
  try { j = await r.json(); } catch (e) { /* 글이 아님 */ }
  if (!r.ok) return unpaired(j.error || "연결하지 못했어요 · PC 화면의 새 코드로 다시 해 주세요");
  const bs = P.ntfyOk(j.beacon && j.beacon.server, DEV), ns = P.ntfyOk(j.notify && j.notify.server, DEV);
  if (j.api !== P.API || !j.keys || !bs || !ns || !P.topicOk(j.beacon.topic) || !P.topicOk(j.notify.topic) || !/^[0-9a-f]{16}$/.test((j.device || {}).id || "")) {
    return unpaired(j.api !== P.API ? "PC 스튜디오를 업데이트해 주세요" : "PC의 대답을 읽지 못했어요 · 다시 해 주세요");
  }
  const keys = await P.importKeys(j.keys.auth, j.keys.beacon);
  j.keys = null;  // 원래 열쇠 글은 여기서 버림 (가져오기 전용 CryptoKey 만 남김)
  if (S.cred) await wipe();
  S.cred = { v: 1, pcId: j.pc.id, pcName: j.pc.name, deviceId: j.device.id, deviceName: j.device.name, auth: keys.auth, beacon: keys.beacon,
    beaconServer: bs, beaconTopic: j.beacon.topic, notifyServer: ns, notifyTopic: j.notify.topic, lastUrl: base, lastSeq: 0, lastBeacon: null,
    skew: typeof j.time === "number" ? j.time - Math.floor(Date.now() / 1000) : 0, pairedAt: Math.floor(Date.now() / 1000) };
  S.keys = keys; S.logs = []; S.logTotal = 0; S.status = null; S.lib = S.outs = S.choices = null;
  await save();
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* 선택 */ }
  toast("PC와 연결됐어요 ✓");
  await connect();
  schedule();
}
async function forgetLocal(msg) {
  await wipe();
  S.cred = S.keys = S.status = null; S.online = false; S.logs = []; S.logTotal = 0;
  clearTimeout(S.timer);
  $("tabs").hidden = true; closeSheet();
  unpaired(msg);
}

// ---------- 화면: 연결 전 · 찾는 중 · 꺼짐 ----------
function finding() {
  $("tabs").hidden = true;
  view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "PC를 찾고 있어요…" })));
}
function unpaired(err) {
  dot("", "연결 전");
  $("tabs").hidden = true;
  $("pcName").textContent = "휴대폰으로 보기";
  const inp = h("input", { class: "inp code", id: "codeIn", placeholder: "XXXX-XXXX-XX", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "14", inputmode: "text", "aria-label": "연결 코드" });
  const go = () => {
    const c = P.normCode(inp.value);
    if (!c) { toast("코드 10글자를 다시 확인해 주세요"); inp.focus(); return; }
    pair(c, "");
  };
  inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  view(
    err && h("section", { class: "card alert" }, h("p", { text: err })),
    h("section", { class: "card" }, h("h2", { text: "PC와 연결해 주세요" }),
      h("p", { text: "PC에서 하는 작업을 여기서 보고, 영상 받기·편집점 찾기·내보내기를 시킬 수 있어요." }),
      h("ol", { class: "steps" }, h("li", { text: "PC 스튜디오 왼쪽 아래 '휴대폰으로 보기'를 눌러요" }), h("li", { text: "[원격 접속 켜기] → [휴대폰 연결하기]를 눌러요" }),
        h("li", { text: "나온 QR을 휴대폰 카메라로 찍어 주세요" }))),
    h("section", { class: "card stack" }, h("h3", { text: "코드로 연결" }), h("p", { class: "muted", text: "QR을 찍기 어려우면 PC 화면의 코드를 넣어 주세요" }),
      inp, h("button", { class: "btn primary block", onclick: go }, "연결하기")),
    installCard());
}
function installCard() {
  return h("section", { class: "card" }, h("h3", { text: "홈 화면에 두고 앱처럼 쓰기" }),
    h("p", { text: "아이폰: 사파리 아래 공유 버튼 → '홈 화면에 추가'" }), h("p", { text: "안드로이드: 크롬 메뉴(⋮) → '앱 설치' 또는 '홈 화면에 추가'" }),
    h("p", { class: "muted", text: "홈 화면 앱에서는 코드로 한 번 더 연결해 주세요 (아이폰은 홈 화면 앱과 사파리가 따로 저장해요)." }));
}
function offline() {
  const b = S.cred.lastBeacon, why = b && b.state === "off" ? b.reason : null;
  let title = "PC가 꺼져 있어요", sub = "PC가 켜져 있다면 인터넷과 스튜디오가 켜져 있는지 확인해 주세요";
  if (S.cred.apiMismatch) { title = "PC 스튜디오를 업데이트해 주세요"; sub = "PC 스튜디오 왼쪽 아래 '업데이트 확인'을 눌러 주세요"; }
  else if (why === "원격 접속을 껐어요") { title = "PC에서 원격 접속을 껐어요"; sub = "다시 쓰려면 PC 스튜디오의 '휴대폰으로 보기' → [원격 접속 켜기]를 눌러 주세요"; }
  else if (why === "오래 쓰지 않아서 껐어요") { title = "오래 쓰지 않아서 원격 접속을 껐어요"; sub = "다시 쓰려면 PC 스튜디오의 '휴대폰으로 보기' → [원격 접속 켜기]를 눌러 주세요"; }
  else if (why === "연결이 끊겼어요") { title = "PC의 원격 연결에 문제가 생겼어요"; sub = "PC 화면의 '휴대폰으로 보기'를 확인해 주세요"; }
  dot("off", title);
  $("pcName").textContent = clean(S.cred.pcName || "내 PC") + " · 연결 안 됨";
  view(h("section", { class: "card offline" }, h("h2", { id: "offTitle", text: title }),
    h("p", { id: "offLast", text: b ? `마지막 소식 ${clock(b.ts)} (${ago(b.ts)})` : "마지막 소식이 아직 없어요" }),
    b && b.job ? h("p", { class: "muted", text: `마지막으로 하던 일 · ${b.job.name}${b.job.pct != null ? " " + b.job.pct + "%" : ""}` }) : null,
    h("p", { class: "muted", text: sub }),
    h("button", { class: "btn primary block", onclick: async () => { finding(); await connect(); schedule(); } }, "다시 확인")),
    h("section", { class: "card" }, h("p", { class: "muted", text: "새 PC로 바꿨거나 PC에서 이 휴대폰을 끊었다면 다시 연결해 주세요." }),
      h("button", { class: "btn block", onclick: async () => { if (await ask("이 휴대폰에 저장된 연결 정보를 지울까요?", "지우기", true)) forgetLocal(); } }, "연결 정보 지우고 다시 연결")));
}

// ---------- 집 화면 ----------
function render() {
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
  if (S.tab === "progress") renderProgress();
  else if (S.tab === "library") renderLibrary();
  else if (S.tab === "outputs") renderOutputs();
  else renderMore();
}
document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; window.scrollTo(0, 0); render(); }));
function updateHead() { if (S.online) dot("on", "PC와 연결됐어요"); }
function jobCard(j) {
  if (!j) return h("section", { class: "card", id: "jobCard" }, h("div", { class: "job-title", text: "쉬고 있어요" }), h("p", { text: "새 작업을 시킬 수 있어요 · 아래 + 버튼으로 영상 받기·스타일 배우기" }));
  const pr = j.progress || {}, pct = pr.pct;
  const bar = h("div", { class: "bar" + (pct == null ? " indet" : "") }, h("i"));
  if (pct != null) bar.firstChild.style.width = Math.max(2, Math.min(100, +pct)) + "%";
  return h("section", { class: "card", id: "jobCard" },
    h("div", { class: "job-title" }, "지금 하는 일 · ", j.name, pct != null ? h("span", { class: "pct", text: ` ${pct}%` }) : null,
      j.by ? h("span", { class: "by", text: "휴대폰에서" }) : null),
    bar,
    pr.item ? h("p", { class: "muted", text: pr.item }) : null,
    pr.detail || pr.label ? h("p", { text: [pr.label, pr.detail].filter(Boolean).join(" · ") }) : null,
    h("button", { class: "btn danger sm", onclick: stopJob }, "멈추기"));
}
async function stopJob() {
  if (!await ask("지금 작업을 멈출까요? 멈출 수 없는 작업은 끝날 때까지 기다려야 해요.", "멈추기", true)) return;
  try { const r = await api("POST", "/r/cancel", {}); toast(r.ok ? "멈추기를 보냈어요" : (r.j.error || "지금은 멈출 수 없어요")); } catch (e) { toast("PC와 연결이 끊겼어요"); }
  tick();
}
function lastCard(l) {
  if (!l) return null;
  const head = l.ok ? h("div", {}, h("span", { class: "ok", text: `${l.name} 끝 ✓` }), h("span", { class: "muted", text: ` ${clock(l.endedAt)}` }))
    : h("div", {}, h("span", { class: "bad", text: `${l.name} 멈췄어요` }), h("span", { class: "muted", text: ` ${clock(l.endedAt)}` }));
  return h("section", { class: "card" }, h("div", { class: "lbl", text: "마지막 작업" }), head,
    !l.ok && l.error ? h("details", {}, h("summary", { text: "자세히" }), h("p", { text: l.error })) : null);
}
function renderProgress() {
  if (!S.status) return;
  const st = S.status;
  const pre = h("pre", { class: "logtxt", text: S.logs.join("\n") || "아직 기록이 없어요" });
  const det = h("details", { class: "log card" }, h("summary", { text: "작업 기록" }), pre);
  det.open = S.logOpen;
  det.addEventListener("toggle", () => { S.logOpen = det.open; if (det.open) pre.scrollTop = 1e9; });
  view(jobCard(st.job), lastCard(st.last), det,
    h("button", { class: "fab", "aria-label": "새 작업", onclick: newJobSheet }, "+"));
  if (det.open) pre.scrollTop = 1e9;
}
function newJobSheet() {
  sheet(h("h2", { text: "새 작업" }),
    h("button", { class: "btn primary block", onclick: downloadSheet }, "영상 받기 (YouTube 주소)"),
    h("button", { class: "btn block", onclick: learnSheet }, "스타일 배우기 (학습용 채널)"));
}
function downloadSheet() {
  const inp = h("input", { class: "inp", type: "url", inputmode: "url", placeholder: "https://youtu.be/…", autocomplete: "off", "aria-label": "YouTube 영상 주소" });
  sheet(h("h2", { text: "영상 받기" }), h("p", { class: "muted", text: "YouTube 영상 하나의 주소를 넣어 주세요 · PC 보관함에 담아요" }), inp,
    h("button", { class: "btn primary block", onclick: () => inp.value.trim() ? doAction("download", { url: inp.value.trim() }) : toast("주소를 넣어 주세요") }, "받기"));
  inp.focus();
}
async function learnSheet() {
  const ch = await choices();
  const inp = h("input", { class: "inp", inputmode: "url", placeholder: "@채널핸들 또는 채널 주소", autocomplete: "off", "aria-label": "채널 주소" });
  let count = 5;
  const seg = h("div", { class: "seg" }, ...[3, 5, 10].map(n => h("button", { class: n === count ? "on" : "", onclick: e => { count = n; seg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === e.currentTarget)); } }, `${n}개`)));
  sheet(h("h2", { text: "스타일 배우기" }),
    h("p", { class: "muted", text: "새 채널: 인기 영상을 학습용으로 받아 '<채널> 스타일'을 배워요" }), inp, seg,
    h("button", { class: "btn primary block", onclick: () => inp.value.trim() ? doAction("add_refs", { url: inp.value.trim(), count }) : toast("채널 주소를 넣어 주세요") }, "받아서 배우기"),
    ch && ch.refChannels.length ? h("div", { class: "lbl", text: "이미 받은 채널 다시 배우기" }) : null,
    ...(ch ? ch.refChannels : []).map(c => h("button", { class: "btn block", onclick: () => doAction("learn_refs", { channel: c.key }) }, `${c.name} (${c.count}개)`)));
}
async function doAction(action, args, confirm, again) {
  let r;
  try { r = await api("POST", "/r/action", confirm ? { action, args, confirm } : { action, args }); } catch (e) { if (!(e instanceof Gone)) toast("PC와 연결이 끊겼어요"); return; }
  if (r.status === 429 && !again) {  // 작업 시작은 2초에 한 번 → 잠깐 기다렸다 한 번 더
    await new Promise(res => setTimeout(res, 2200));
    return doAction(action, args, confirm, true);
  }
  if (r.j.confirm) {
    if (await ask(r.j.confirm.text, "계속하기")) return doAction(action, args, r.j.confirm.token);
    return;
  }
  if (r.ok && r.j.ok) {
    closeSheet(); toast(`시작했어요 · ${r.j.job}`);
    S.tab = "progress"; await refreshStatus(); render(); schedule();
  } else toast(r.j.error || "지금은 할 수 없어요");
}
function jobEnded(l) {
  if (!S.notifyOn) return;
  const text = l.ok ? `작업이 끝났어요 · ${l.name}` : `작업이 멈췄어요 · ${l.name}`;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(reg => reg.showNotification("풋살 스튜디오", { body: text, icon: "/futsal/icon-192.png", tag: "fs-job" }));
    else new Notification("풋살 스튜디오", { body: text, icon: "/futsal/icon-192.png" });
  } catch (e) { /* 알림을 못 띄우는 브라우저 */ }
}

// 보관함
async function choices() {
  try { const r = await api("GET", "/r/choices"); if (r.ok) S.choices = r.j; } catch (e) { /* 아래 그대로 */ }
  return S.choices;
}
async function renderLibrary(fresh) {
  if (!S.lib || fresh) view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "보관함을 불러오는 중이에요…" })));
  if (!S.lib || fresh) {
    try { const r = await api("GET", "/r/library", undefined, 20000); if (r.ok) S.lib = r.j.videos; } catch (e) { if (e instanceof Gone) return; }
  }
  if (S.tab !== "library") return;
  const vids = S.lib || [];
  const refresh = h("button", { class: "btn sm", onclick: () => renderLibrary(true) }, "새로 고침");
  if (!vids.length) return view(h("div", { class: "row" }, h("div", { class: "lbl grow", text: "보관함" }), refresh), h("section", { class: "card empty" }, h("b", { text: "보관함이 비어 있어요" }), "진행 탭의 + → 영상 받기로 담아 보세요"));
  view(h("div", { class: "row" }, h("div", { class: "lbl grow", text: `보관함 · ${vids.length}개` }), refresh),
    h("div", { class: "list" }, ...vids.map(v => {
      const src = mediaUrl(v.poster);
      const img = src ? h("img", { class: "thumb", src, alt: "", loading: "lazy", decoding: "async" }) : h("div", { class: "thumb" });
      img.addEventListener("error", () => img.replaceWith(h("div", { class: "thumb" })));
      const kind = v.source.kind === "other" ? (v.source.channel || "다른 채널") : KIND[v.source.kind] || "출처 모름";
      return h("button", { class: "card item", onclick: () => videoSheet(v) }, img,
        h("div", {}, h("div", { class: "name", text: v.title || v.name }), h("div", { class: "sub", text: `${size(v.sizeMb)} · ${kind}` }),
          h("div", { class: "badges" }, v.analyzed ? h("span", { class: "badge ok", text: "편집점 ✓" }) : h("span", { class: "badge", text: "편집점 아직" }),
            v.sequences.length ? h("span", { class: "badge", text: `편집본 ${v.sequences.length}개` }) : null)));
    })));
}
async function videoSheet(v) {
  const ch = S.choices || await choices();
  const styles = (ch && ch.styles) || [];
  const styleSel = h("select", { class: "inp", "aria-label": "스타일" }, ...styles.map(s => h("option", { value: s, text: s })));
  const kl = h("input", { type: "checkbox", checked: true }), ks = h("input", { type: "checkbox", checked: true });
  const seqSel = h("select", { class: "inp", "aria-label": "편집본" }, ...v.sequences.map(q => h("option", { value: q.id, text: `${q.name} (${q.format === "shorts" ? "쇼츠" : "롱폼"})` })));
  let preset = "youtube";
  const pseg = h("div", { class: "seg" }, ...[["youtube", "유튜브 1080p"], ["small", "가벼운 720p"]].map(([k, t]) =>
    h("button", { class: k === preset ? "on" : "", onclick: e => { preset = k; pseg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === e.currentTarget)); } }, t)));
  sheet(h("h2", { text: v.title || v.name }), h("p", { class: "muted", text: `${size(v.sizeMb)} · ${v.analyzed ? "편집점 찾음" : "편집점 아직"}` }),
    h("button", { class: "btn primary block", onclick: () => doAction("analyze", { names: [v.name] }) }, v.analyzed ? "편집점 다시 찾기" : "편집점 찾기"),
    h("div", { class: "lbl", text: "스타일로 자동 가편집" }),
    !v.analyzed ? h("p", { class: "muted", text: "먼저 '편집점 찾기'를 해 주세요" })
      : !styles.length ? h("p", { class: "muted", text: "배운 스타일이 없어요 · 진행 탭 + → 스타일 배우기로 먼저 배워 주세요" })
        : h("div", { class: "stack" }, styleSel, h("div", { class: "row" }, h("label", { class: "chk" }, kl, "롱폼"), h("label", { class: "chk" }, ks, "쇼츠")),
          h("button", { class: "btn block", onclick: () => { const kinds = [kl.checked && "long", ks.checked && "shorts"].filter(Boolean); if (!kinds.length) return toast("롱폼·쇼츠 중 하나는 골라 주세요"); doAction("autoseq", { name: v.name, style: styleSel.value, kinds }); } }, "가편집 만들기")),
    h("div", { class: "lbl", text: "편집본 내보내기" }),
    v.sequences.length ? h("div", { class: "stack" }, seqSel, pseg, h("button", { class: "btn block", onclick: () => doAction("export", { name: v.name, seq: seqSel.value, preset }) }, "내보내기"))
      : h("p", { class: "muted", text: "아직 편집본이 없어요 · 편집점을 찾으면 가편집이 생겨요" }));
}

// 완성본
async function renderOutputs(fresh) {
  if (!S.outs || fresh) view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "완성본을 불러오는 중이에요…" })));
  if (!S.outs || fresh) {
    try { const r = await api("GET", "/r/outputs", undefined, 20000); if (r.ok) S.outs = r.j.outputs; } catch (e) { if (e instanceof Gone) return; }
  }
  if (S.tab !== "outputs") return;
  const outs = S.outs || [];
  const refresh = h("button", { class: "btn sm", onclick: () => renderOutputs(true) }, "새로 고침");
  if (!outs.length) return view(h("div", { class: "row" }, h("div", { class: "lbl grow", text: "완성본" }), refresh), h("section", { class: "card empty" }, h("b", { text: "아직 완성본이 없어요" }), "보관함에서 편집본을 내보내 보세요"));
  view(h("div", { class: "row" }, h("div", { class: "lbl grow", text: `완성본 · 최근 ${outs.length}개` }), refresh), h("div", { class: "list" }, ...outs.map(outCard)));
}
const KLABEL = { video: "영상", image: "썸네일", text: "올리기 키트", srt: "자막" };
function outCard(o) {
  const card = h("section", { class: "card out" });
  const head = h("div", { class: "head" }, h("div", { class: "name", text: o.name }));
  const sub = h("div", { class: "muted", text: `${KLABEL[o.kind] || ""} · ${size(o.sizeMb)} · ${clock(o.mtime)}` });
  card.append(head, sub);
  if (o.kind === "image") {
    const src = mediaUrl(o.url);
    if (src) card.append(h("img", { class: "full", src, alt: "", loading: "lazy" }));
  } else if (o.kind === "video") {
    const big = o.sizeMb > 100;
    const row = h("div", { class: "row" });
    const slot = h("div");
    const play = (which) => playVideo(slot, o.name, which);
    row.append(h("button", { class: "btn sm", onclick: () => play("file") }, "보기"));
    if (o.preview && o.preview.exists) row.append(h("button", { class: "btn sm primary", onclick: () => play("preview") }, "작은 미리보기로 보기"));
    else row.append(h("button", { class: "btn sm" + (big ? " primary" : ""), onclick: () => doAction("preview", { file: o.name }) }, "작은 미리보기 만들기"));
    row.append(h("button", { class: "btn sm", onclick: () => doAction("qa", { file: o.name }) }, "검수하기"));
    if (big && !(o.preview && o.preview.exists)) card.append(h("div", { class: "badges" }, h("span", { class: "badge warn", text: "용량이 커요 · 작은 미리보기를 추천해요" })));
    card.append(row, slot);
    if (o.qa) card.append(qaBox(o.qa));
  } else {
    const slot = h("div");
    card.append(h("div", { class: "row" }, h("button", { class: "btn sm", onclick: () => showText(slot, o) }, "내용 보기")), slot);
  }
  return card;
}
function qaBox(q) {
  const items = (q.items || []).filter(i => i.lv !== "ok");
  return h("div", { class: "qa" }, h("b", { text: `검수 점수 ${q.score}점` }), h("span", { class: "muted", text: q.bad || q.warn ? ` · 고칠 것 ${q.bad} · 볼 것 ${q.warn}` : " · 문제 없어요" }),
    items.length ? h("ul", {}, ...items.map(i => h("li", { text: `${i.lv === "bad" ? "✕" : "!"} ${i.title} — ${i.msg}` }))) : null);
}
function playVideo(slot, name, which) {
  const o = (S.outs || []).find(x => x.name === name);
  const src = o && mediaUrl(which === "preview" ? o.preview && o.preview.url : o.url);
  if (!src) return toast("다시 불러와 주세요");
  const v = h("video", { controls: true, playsinline: true, preload: "metadata", src });
  let retried = false;
  v.addEventListener("error", async () => {  // 표(2시간)가 지났거나 PC 가 다시 켜짐 → 목록을 새로 받아 같은 자리부터
    if (retried) return toast("영상을 열지 못했어요");
    retried = true;
    const at = v.currentTime || 0;
    try { const r = await api("GET", "/r/outputs", undefined, 20000); if (r.ok) S.outs = r.j.outputs; } catch (e) { return; }
    const n = (S.outs || []).find(x => x.name === name);
    const again = n && mediaUrl(which === "preview" ? n.preview && n.preview.url : n.url);
    if (!again) return toast("영상을 열지 못했어요");
    v.src = again;
    v.addEventListener("loadedmetadata", () => { v.currentTime = at; }, { once: true });
  });
  slot.replaceChildren(v);
}
async function showText(slot, o) {
  const src = mediaUrl(o.url);
  if (!src) return;
  try {
    const t = withTimeout(15000);
    const r = await fetch(src, { ...NET, signal: t.signal }); t.done();
    const text = await r.text();
    slot.replaceChildren(h("pre", { text }), h("button", { class: "btn sm", onclick: () => copy(text) }, "복사"));
  } catch (e) { toast("내용을 불러오지 못했어요"); }
}

// 더보기
function notifyPref() {
  try { return localStorage.getItem("fs-notify") === "1" && "Notification" in window && Notification.permission === "granted"; } catch (e) { return false; }
}
function renderMore() {
  const c = S.cred, st = S.status || {};
  const topic = c.notifyTopic, server = c.notifyServer;
  const notifyOn = S.notifyOn = notifyPref();
  const tgl = h("input", { type: "checkbox", checked: notifyOn });
  tgl.addEventListener("change", async () => {
    let on = tgl.checked;
    if (on) {
      if (!("Notification" in window)) { toast("이 브라우저는 알림을 못 띄워요"); on = false; }
      else if (Notification.permission !== "granted") on = (await Notification.requestPermission()) === "granted";
    }
    tgl.checked = on; S.notifyOn = on;
    try { localStorage.setItem("fs-notify", on ? "1" : "0"); } catch (e) { /* 저장 안 됨 */ }
  });
  view(
    S.notifyMoved ? h("section", { class: "card alert" }, h("p", { text: "알림 주제가 바뀌었어요 · ntfy 앱에서 아래 새 주제로 다시 구독해 주세요" })) : null,
    h("section", { class: "card stack" }, h("h3", { text: "알림 받기" }),
      h("p", { text: "작업이 끝나거나 멈추면 휴대폰으로 알려 드려요. 무료 ntfy 앱을 설치하고 아래 주제를 구독해 주세요." }),
      h("div", { class: "links" }, h("a", { class: "btn sm", href: STORE_IOS, target: "_blank", rel: "noopener noreferrer" }, "아이폰 ntfy 앱"),
        h("a", { class: "btn sm", href: STORE_ANDROID, target: "_blank", rel: "noopener noreferrer" }, "안드로이드 ntfy 앱")),
      server === P.NTFY ? h("a", { class: "btn primary block", href: `ntfy://ntfy.sh/${topic}` }, "ntfy 앱에서 바로 구독") : null,
      h("div", { class: "row" }, h("span", { class: "topic grow", text: topic }), h("button", { class: "btn sm", onclick: () => { copy(topic); S.notifyMoved = false; } }, "주제 복사")),
      h("p", { class: "muted", text: "앱에서 + → 주제 이름에 붙여 넣으면 돼요 (서버는 ntfy.sh 그대로). 알림에는 파일 이름이 들어가지 않아요." }),
      h("label", { class: "chk" }, tgl, "이 화면을 열어 둔 동안 브라우저 알림도 보기")),
    h("section", { class: "card" }, h("h3", { text: "PC" }),
      h("p", { text: `${c.pcName || "내 PC"}${st.ver ? " · 스튜디오 v" + st.ver : ""}` }),
      h("p", { class: "muted", text: `이 휴대폰 이름 · ${c.deviceName || ""}` }),
      st.remote && st.remote.autoOffAt ? h("p", { class: "muted", text: `쓰지 않으면 ${clock(st.remote.autoOffAt)}에 원격 접속이 저절로 꺼져요` }) : null),
    h("section", { class: "card stack" },
      h("button", { class: "btn block danger", onclick: async () => {
        if (!await ask("이 휴대폰의 연결을 끊을까요? 다시 쓰려면 PC에서 다시 연결해야 해요.", "끊기", true)) return;
        try { await api("POST", "/r/forget", {}); } catch (e) { /* 그래도 이 휴대폰 정보는 지움 */ }
        forgetLocal("이 휴대폰 연결을 끊었어요");
      } }, "이 휴대폰 연결 끊기"),
      h("button", { class: "btn block", onclick: async () => {
        if (!await ask("PC의 원격 접속을 끌까요? 다시 켜려면 PC에서 직접 켜야 해요.", "끄기", true)) return;
        try { const r = await api("POST", "/r/remote-off", {}); if (!r.ok) return toast(r.j.error || "끄지 못했어요"); } catch (e) { return; }
        S.cred.lastBeacon = { ts: Math.floor(Date.now() / 1000), state: "off", reason: "원격 접속을 껐어요" };
        await save(); goOffline(); schedule();
      } }, "원격 접속 끄기")),
    installCard());
}

// ---------- 시작 ----------
async function start() {
  S.notifyOn = notifyPref();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/futsal/sw.js", { scope: "/futsal" }).catch(() => { /* 없어도 그대로 씀 */ });
  const hp = P.parseHash(location.hash);
  if (location.hash) history.replaceState(null, "", "/futsal");  // 코드가 주소창·방문 기록에 남지 않게 바로 지움
  const saved = await load();
  if (saved && saved.v === 1 && saved.auth && saved.beacon && typeof saved.auth === "object") {
    S.cred = saved; S.keys = { auth: saved.auth, beacon: saved.beacon };
  } else if (saved) await wipe();
  if (hp.pair) return pair(hp.pair, hp.u);
  if (!S.cred) return unpaired();
  finding();
  await connect();
  schedule();
}
window.addEventListener("hashchange", () => { const hp = P.parseHash(location.hash); if (hp.pair) { history.replaceState(null, "", "/futsal"); pair(hp.pair, hp.u); } });
start();

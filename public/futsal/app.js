// 풋살 스튜디오 원격 — 휴대폰 화면 (mulgyeol.kr/futsal)
// PC 앱(remote.py)의 /r/* 와 ntfy 비콘만 쓴다. 와벨리 코드·데이터와는 아무 관계가 없다.
// 밖에서 온 글자(파일 이름·제목·기록)는 늘 textContent 로만 넣는다 (innerHTML 에 넣지 않음).
import * as P from "/futsal/proto.js";

const DEV = ["127.0.0.1", "localhost"].includes(location.hostname);
const DEV_NTFY = DEV ? ((document.querySelector('meta[name="futsal-dev-ntfy"]') || {}).content || "") : "";
const PAIR_NTFY = DEV && DEV_NTFY ? DEV_NTFY : P.NTFY;
const $ = id => document.getElementById(id);
const S = { cred: null, keys: null, tab: "progress", status: null, logs: [], logTotal: 0, lib: null, outs: null, choices: null,
  online: false, timer: null, connecting: false, prevJob: null, logOpen: false, ntfyReached: true, alertTest: null, alertTips: false };
const KIND = { own: "풋살사관학교", footage: "내 촬영본", unknown: "출처 모름" };
const STORE_IOS = "https://apps.apple.com/app/ntfy/id1625396347";
const STORE_ANDROID = "https://play.google.com/store/apps/details?id=io.heckel.ntfy";
const UA = navigator.userAgent;
const IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const ANDROID = /Android/.test(UA);
const INAPP = P.inAppBrowser(UA);
const OUT_JOBS = ["작은 미리보기 만들기", "영상 검수", "내보내기"];

// ---------- 작은 도구 ----------
// 줄바꿈·제어·방향 바꾸는 글자 + 줄을 나누는 유니코드(NEL·줄/문단 구분)·폭 없는 글자 (PC remote._CTRL 과 같음)
const CTRL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g;
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
const now = () => Math.floor(Date.now() / 1000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clock = t => new Date(t * 1000).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
function ago(t) {
  const s = Math.max(0, Date.now() / 1000 - t);
  return s < 60 ? "방금" : s < 3600 ? `${Math.floor(s / 60)}분 전` : s < 86400 ? `${Math.floor(s / 3600)}시간 전` : `${Math.floor(s / 86400)}일 전`;
}
const size = mb => mb == null ? "" : mb >= 1000 ? `${(mb / 1000).toFixed(1)}GB` : mb < 0.1 ? "0.1MB 미만" : `${mb}MB`;
/** 아래(시트가 열려 있으면 위)에 잠깐 · action {label, fn} 이면 누를 수 있는 단추도 */
function toast(msg, action) {
  const t = $("toast");
  t.replaceChildren(...[h("span", { text: msg }), action && h("button", { class: "tbtn", onclick: () => { t.classList.remove("show"); action.fn(); } }, action.label)].filter(Boolean));
  t.classList.toggle("act", !!action);
  t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), action ? 7000 : 3500);
}
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
function openSheet() { $("sheetMask").hidden = false; document.body.classList.add("sheet-open"); }
function sheet(...kids) {
  $("sheet").replaceChildren(...kids.flat().filter(Boolean), h("button", { class: "btn close", onclick: closeSheet }, "닫기"));
  openSheet();
}
function closeSheet() { $("sheetMask").hidden = true; $("sheet").replaceChildren(); document.body.classList.remove("sheet-open"); }
$("sheetMask").addEventListener("click", e => { if (e.target === $("sheetMask")) closeSheet(); });
function ask(text, ok = "확인", danger = false) {
  return new Promise(res => {
    const done = v => { closeSheet(); res(v); };
    $("sheet").replaceChildren(h("p", { text, class: "ask" }), h("div", { class: "row" },
      h("button", { class: "btn grow", onclick: () => done(false) }, "취소"),
      h("button", { class: "btn grow " + (danger ? "danger" : "primary"), onclick: () => done(true) }, ok)));
    openSheet();
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
/** 이 브라우저의 설치 번호 (비밀 아님) — 같은 휴대폰이 다시 연결하면 PC 가 옛 항목을 바꿔 끼움 (연결 정보를 지워도 남김) */
async function installId() {
  let id = null;
  try { id = await dbDo("readonly", st => st.get("install")); } catch (e) { /* 없음 */ }
  if (typeof id === "string" && /^[A-Za-z0-9_-]{22}$/.test(id)) return id;
  id = DB.install || (DB.install = P.randomB64u(16));
  try { await dbDo("readwrite", st => st.put(id, "install")); } catch (e) { /* 이 화면을 연 동안만 */ }
  return id;
}

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
    // 서명에 받는 곳(PC 주소의 host)이 들어감 → 이 서명은 이 주소에서만 맞음
    const auth = await P.authHeader(S.keys.auth, c.deviceId, P.hostOf(c.lastUrl), method, path, data, now() + (c.skew || 0));
    const headers = body === undefined ? { Authorization: auth } : { Authorization: auth, "Content-Type": "application/json" };
    const t = withTimeout(ms);
    let r;
    try { r = await fetch(c.lastUrl + path, { ...NET, method, headers, body: body === undefined ? undefined : data, signal: t.signal }); } finally { t.done(); }
    let j = {};
    try { j = await r.json(); } catch (e) { /* 글이 아님 */ }
    if (r.status === 401 && j.code === "skew" && typeof j.time === "number" && attempt === 0) {  // 휴대폰 시계가 다르면 PC 시각에 맞춰 한 번 더
      c.skew = j.time - now(); await save(); continue;
    }
    if (r.status === 401 && j.code === "unknown_device") { await forgetLocal("이 휴대폰은 연결이 끊겼어요 · PC에서 다시 연결해 주세요"); throw new Gone(); }
    return { status: r.status, ok: r.ok && j.ok !== false, j };
  }
}
/** ntfy 주제의 마지막 글 → {reached: 닿았는지, msg} (닿지 않음 = 이 휴대폰 인터넷이 안 되거나 ntfy 가 막힘) */
async function latestNtfy(server, topic) {
  const t = withTimeout(8000);
  try {
    const r = await fetch(`${server}/${topic}/json?poll=1&since=latest`, { ...NET, signal: t.signal });
    if (!r.ok) return { reached: r.status < 500, msg: null };
    const lines = (await r.text()).split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try { const m = JSON.parse(lines[i]); if (m.event === "message" && typeof m.message === "string") return { reached: true, msg: m }; } catch (e) { /* 다음 줄 */ }
    }
    return { reached: true, msg: null };
  } catch (e) { return { reached: false, msg: null }; } finally { t.done(); }
}
function topicsChanged(beacon, notify) {
  const c = S.cred;
  if (!P.topicOk(beacon) || !P.topicOk(notify)) return false;
  let moved = false;
  if (notify !== c.notifyTopic) { c.notifyMoved = true; moved = true; }
  if (beacon !== c.beaconTopic || moved) { c.beaconTopic = beacon; c.notifyTopic = notify; return true; }
  return false;
}
/** 비콘(ntfy) → 내 몫을 풀어 마지막 소식에 기억 · 옛 글(seq 가 같거나 작음)은 무시 · 주제가 옮겨졌으면 따라감 */
async function readBeacon() {
  const c = S.cred;
  for (let hop = 0; hop < 3; hop++) {
    const { reached, msg } = await latestNtfy(c.beaconServer, c.beaconTopic);
    S.ntfyReached = reached;
    const b = msg && await P.openBeacon(msg.message, c.deviceId, S.keys.beacon);
    if (!b || b.pc !== c.pcId || !(b.seq > (c.lastSeq || 0))) break;
    c.lastSeq = b.seq;
    c.lastBeacon = { ts: b.ts, state: b.state, reason: b.reason, url: b.url, job: b.job, ver: b.ver };
    if (b.api !== P.API) c.apiMismatch = true;
    if (b.moved && topicsChanged(b.moved.beacon, b.moved.notify)) { await save(); continue; }
    await save();
    break;
  }
  return c.lastBeacon || null;
}
async function refreshStatus(ms) {
  try {
    const r = await api("GET", `/r/status?since=${S.logTotal}`, undefined, ms || 8000);
    if (r.status !== 200) return false;
    const j = r.j;
    if (j.api !== P.API) { S.cred.apiMismatch = true; return false; }
    const c = S.cred;
    c.apiMismatch = false;
    if (j.logTotal < S.logTotal) S.logs = [];
    S.logs = S.logs.concat(j.log || []).slice(-200);
    S.logTotal = j.logTotal;
    let dirty = false;
    if (j.pc && j.pc.name && j.pc.name !== c.pcName) { c.pcName = j.pc.name; dirty = true; }
    const tp = j.topics ? await P.openTopics(j.topics, S.keys.beacon, c.pcId, c.deviceId) : null;  // 주제는 기기 열쇠로 잠겨 옴
    if (tp && topicsChanged(tp.beacon.topic, tp.notify.topic)) dirty = true;
    if (now() - (c.lastContact || 0) > 60) { c.lastContact = now(); dirty = true; }  // 마지막으로 PC 와 말한 때 (꺼졌을 때 '마지막 소식')
    if (dirty) await save();
    if (S.prevJob && !j.job) {  // 작업이 끝남 → 목록은 다음에 새로 받음 · 알림
      S.lib = S.outs = null;
      if (j.last) jobEnded(j.last);
    }
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
  S.online = true; S.ntfyReached = true;
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
window.addEventListener("online", () => { if (S.cred && !S.online) tick(); });  // 지하철 등에서 인터넷이 돌아오면 바로
window.addEventListener("offline", () => { if (S.cred && !S.online) offline(); });

// ---------- 짝짓기 ----------
function deviceName() {
  const d = /iPhone/.test(UA) ? "iPhone" : /iPad/.test(UA) ? "iPad" : /Android/.test(UA) ? (/SM-|Samsung/i.test(UA) ? "Galaxy" : "Android") : /Mac/.test(UA) ? "Mac" : /Windows/.test(UA) ? "PC" : "휴대폰";
  const b = INAPP || (/SamsungBrowser/.test(UA) ? "삼성 인터넷" : /Edg/.test(UA) ? "Edge" : /CriOS|Chrome/.test(UA) ? "Chrome" : /FxiOS|Firefox/.test(UA) ? "Firefox" : /Safari/.test(UA) ? "Safari" : "브라우저");
  const home = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone ? " · 홈 화면" : "";
  return `${d} · ${b}${home}`;
}
/** 한 곳(PC 주소)에 짝짓기 → {inner, base} · {error, status} · null(닿지 않거나 코드를 모르는 곳이 대답함) */
async function pairAt(base, pk) {
  const pc = await ping(base);
  if (!pc) return null;
  const skew = typeof pc.time === "number" ? pc.time - now() : 0;
  const ts = now() + skew, nonce = P.randomB64u(16);
  const body = JSON.stringify({ v: 2, nonce, ts, proof: await P.pairProof(pk.proof, nonce, ts), name: deviceName(), install: await installId() });
  let r;
  try {
    const t = withTimeout(20000);
    try { r = await fetch(base + "/r/pair", { ...NET, method: "POST", headers: { "Content-Type": "application/json" }, body, signal: t.signal }); } finally { t.done(); }
  } catch (e) { return null; }
  let j = {};
  try { j = await r.json(); } catch (e) { /* 글이 아님 */ }
  if (!r.ok) return { error: j.error || "연결하지 못했어요 · PC 화면의 새 코드로 다시 해 주세요", status: r.status };
  if (j.api !== P.API) return { error: "PC 스튜디오를 업데이트해 주세요", status: 400 };
  const inner = await P.openPairResponse(j, pk.topic, pk.key);  // 코드로 만든 열쇠로 풀려야 진짜 PC
  return inner ? { inner, base, skew: typeof j.time === "number" ? j.time - now() : skew } : null;
}
async function pair(code, hint) {
  if (S.cred && !await ask(`이 휴대폰은 이미 '${clean(S.cred.pcName || "내 PC")}'와 연결돼 있어요.\n새 코드로 다시 연결하면 지금 연결은 끊어져요. PC 화면의 QR이나 코드로 직접 연결하는 게 맞나요?`, "다시 연결하기")) {
    finding(); connect().then(schedule); return;
  }
  dot("wait", "PC를 찾고 있어요");
  $("tabs").hidden = true;
  view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "코드로 PC를 찾는 중이에요 (최대 10초)" }), h("p", { class: "muted", text: "PC 화면의 코드로 연결하는 중이에요" })));
  const pk = await P.derivePair(code);
  const hb = hint ? P.hintUrl(hint, DEV) : null;
  let res = hb ? await pairAt(hb, pk) : null;  // QR 의 힌트 주소는 빨리 찾는 길일 뿐 — 진짜인지는 잠긴 대답으로 확인
  if (!res || !res.inner) {  // 힌트가 없거나 닿지 않거나 가짜 → 코드로 만든 비밀 주제에서 PC 주소를 찾음 (아이폰 홈 화면 앱은 코드만 침)
    let base = null;
    for (let i = 0; i < 5 && !base; i++) {
      const m = await latestNtfy(PAIR_NTFY, pk.topic);
      const msg = m.msg && await P.openPair(m.msg.message, pk.topic, pk.key);
      if (msg && msg.exp > now() - 60) base = P.hostOk(msg.url, DEV);
      if (!base) await sleep(2000);
    }
    if (base && (base !== hb || !res)) res = await pairAt(base, pk);
  }
  if (!res) return unpaired("PC를 찾지 못했어요 · PC에서 원격 접속이 켜져 있는지, 코드가 맞는지(10분 안) 확인해 주세요");
  if (!res.inner) return unpaired(res.error);
  const inner = res.inner;
  const bs = P.ntfyOk(inner.beacon && inner.beacon.server, DEV), ns = P.ntfyOk(inner.notify && inner.notify.server, DEV);
  if (!bs || !ns || !P.topicOk(inner.beacon.topic) || !P.topicOk(inner.notify.topic)) return unpaired("PC의 대답을 읽지 못했어요 · 다시 해 주세요");
  const keys = await P.importKeys(inner.keys.auth, inner.keys.beacon);
  inner.keys = null;  // 원래 열쇠 글은 여기서 버림 (가져오기 전용 CryptoKey 만 남김)
  if (S.cred) await wipe();
  S.cred = { v: 2, pcId: inner.pc.id, pcName: inner.pc.name, deviceId: inner.device.id, deviceName: inner.device.name, auth: keys.auth, beacon: keys.beacon,
    beaconServer: bs, beaconTopic: inner.beacon.topic, notifyServer: ns, notifyTopic: inner.notify.topic,
    lastUrl: P.hostOk(inner.url, DEV) || res.base,  // 잠긴 대답 속 주소가 진짜 PC 주소
    lastSeq: 0, lastBeacon: null, lastContact: now(), skew: res.skew || 0, pairedAt: now(), alertSetup: "todo", notifyMoved: false };
  S.keys = keys; S.logs = []; S.logTotal = 0; S.status = null; S.lib = S.outs = S.choices = null; S.tab = "progress"; S.alertTest = null;
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

// ---------- 화면: 연결 전 · 찾는 중 · 꺼짐 · 앱 안 브라우저 ----------
function finding() {
  $("tabs").hidden = true;
  view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "PC를 찾고 있어요…" })));
}
function codeFromInput(raw) {
  let c = P.normCode(raw);
  if (!c && P.hasHangul(raw)) {  // 한국 휴대폰 기본 자판(한글)으로 친 경우 → 누른 영문 글쇠로 바꿔 봄
    c = P.normCode(P.fromHangul(raw));
    if (c) toast("한글 자판으로 입력돼서 영문으로 바꿨어요");
    else { toast("한글로 입력됐어요 · 키보드를 영문으로 바꿔 주세요"); return null; }
  }
  if (!c) toast("코드 10글자를 다시 확인해 주세요 (영어·숫자)");
  return c;
}
function unpaired(err) {
  dot("", "연결 전");
  $("tabs").hidden = true;
  $("pcName").textContent = "휴대폰으로 보기";
  const inp = h("input", { class: "inp code", id: "codeIn", placeholder: "XXXX-XXXX-XX", autocomplete: "off", autocapitalize: "characters", autocorrect: "off", spellcheck: "false", maxlength: "20", inputmode: "text", lang: "en", "aria-label": "연결 코드", "aria-describedby": "codeHint" });
  const go = () => {
    const c = codeFromInput(inp.value);
    if (!c) { inp.focus(); return; }
    inp.value = P.fmtCode(c);
    pair(c, "");
  };
  inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  view(
    err && h("section", { class: "card alert" }, h("p", { text: err })),
    INAPP ? inAppCard(false) : null,
    h("section", { class: "card" }, h("h2", { text: "PC와 연결해 주세요" }),
      h("p", { text: "PC에서 하는 작업을 여기서 보고, 영상 받기·편집점 찾기·내보내기를 시킬 수 있어요." }),
      h("ol", { class: "steps" }, h("li", { text: "PC 스튜디오 왼쪽 아래 '휴대폰으로 보기'를 눌러요" }), h("li", { text: "[원격 접속 켜기] → [휴대폰 연결하기]를 눌러요" }),
        h("li", { text: "나온 QR을 휴대폰 카메라로 찍거나 아래에 코드를 넣어요" }))),
    h("section", { class: "card stack" }, h("h3", { text: "코드로 연결" }), h("p", { class: "muted", text: "QR을 찍기 어려우면 PC 화면의 코드를 넣어 주세요" }),
      inp, h("p", { class: "muted hint", id: "codeHint", text: "영어·숫자 10글자 (예: 7K3Q-M9XD-2P) · 한글 자판이면 영문으로 바꿔 주세요" }),
      h("button", { class: "btn primary block", onclick: go }, "연결하기")),
    installCard());
}
function installCard() {
  const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  if (standalone) return null;
  return h("section", { class: "card" }, h("h3", { text: "홈 화면에 두고 앱처럼 쓰기" }),
    IOS ? h("p", { text: "아이폰: 먼저 사파리 아래 공유 버튼 → '홈 화면에 추가' → 홈 화면의 '풋살 스튜디오'를 열고, 그 안에서 PC의 [휴대폰 연결하기] 코드를 넣어 주세요." })
      : h("p", { text: "안드로이드: 크롬 메뉴(⋮) → '앱 설치' 또는 '홈 화면에 추가'. 연결은 그대로 이어져요." }),
    IOS ? h("p", { class: "muted", text: "아이폰은 홈 화면 앱과 사파리가 따로 저장해요. 사파리에서 이미 연결했다면 홈 화면 앱에서 새 코드로 한 번 더 연결하고, PC 목록에서 사파리 쪽은 [끊기] 해 주세요." }) : null);
}
/** 카카오톡·네이버 같은 앱 안 브라우저: 저장소가 따로라 연결이 남지 않을 수 있음 → 진짜 브라우저로 열기 */
function inAppCard(withPair) {
  const href = location.href;
  const kakao = INAPP === "카카오톡";
  return h("section", { class: "card alert stack" }, h("h3", { text: `${INAPP} 안에서 열렸어요` }),
    h("p", { text: `여기서는 연결이 저장되지 않을 수 있어요. ${IOS ? "사파리" : "크롬"}에서 열어 주세요${withPair ? " (QR의 코드는 그대로 넘어가요)" : ""}.` }),
    kakao ? h("a", { class: "btn primary block", href: "kakaotalk://web/openExternal?url=" + encodeURIComponent(href) }, IOS ? "사파리로 열기" : "다른 브라우저로 열기") : null,
    h("p", { class: "muted", text: IOS ? "오른쪽 아래 ⋯ 또는 공유 버튼 → 'Safari로 열기'" : "오른쪽 위 ⋮ → '다른 브라우저로 열기'" }),
    h("button", { class: "btn block", onclick: () => copy(href) }, "주소 복사 (브라우저 주소창에 붙여 넣기)"));
}
function inAppScreen(hp) {
  dot("", "연결 전");
  $("tabs").hidden = true;
  view(inAppCard(true), h("section", { class: "card" }, h("p", { class: "muted", text: "그래도 여기서 연결하려면 아래를 눌러 주세요 (이 화면을 닫으면 다시 연결해야 할 수 있어요)." }),
    h("button", { class: "btn block", onclick: () => { history.replaceState(null, "", "/futsal"); pair(hp.pair, hp.u); } }, "여기서 연결하기")));
}
function offline() {
  const c = S.cred, b = c.lastBeacon, why = b && b.state === "off" ? b.reason : null;
  const phoneOff = !navigator.onLine || S.ntfyReached === false;  // PC 도 ntfy 도 안 닿음 = 이 휴대폰 인터넷 문제
  let title = "PC가 꺼졌거나 잠들었어요", sub = "PC가 켜져 있다면 인터넷과 스튜디오가 켜져 있는지 확인해 주세요 · 밖에서 쓰려면 PC 스튜디오 '휴대폰으로 보기' → 'PC 잠들지 않게: 켜 둔 동안 항상'", cls = "off";
  if (phoneOff) { title = "이 휴대폰이 인터넷에 연결돼 있지 않아요"; sub = "와이파이나 데이터가 다시 되면 저절로 PC를 찾아요"; cls = "wait"; }
  else if (c.apiMismatch) { title = "PC 스튜디오를 업데이트해 주세요"; sub = "PC 스튜디오 왼쪽 아래 '업데이트 확인'을 눌러 주세요"; }
  else if (why === "원격 접속을 껐어요") { title = "PC에서 원격 접속을 껐어요"; sub = "다시 쓰려면 PC 스튜디오의 '휴대폰으로 보기' → [원격 접속 켜기]를 눌러 주세요"; }
  else if (why === "오래 쓰지 않아서 껐어요") { title = "오래 쓰지 않아서 원격 접속을 껐어요"; sub = "다시 쓰려면 PC 스튜디오의 '휴대폰으로 보기' → [원격 접속 켜기]를 눌러 주세요"; }
  else if (why === "앱을 껐어요") { title = "PC에서 스튜디오를 껐어요"; sub = "스튜디오를 다시 켜면 원격 접속도 저절로 켜져요 · 그때 알아서 다시 연결해요"; cls = "wait"; }
  else if (why === "연결이 끊겼어요") { title = "PC의 원격 연결에 문제가 생겼어요"; sub = "PC가 잠시 뒤 저절로 다시 연결해 봐요 · 계속 안 되면 PC 화면의 '휴대폰으로 보기'를 확인해 주세요"; }
  dot(cls, title);
  $("pcName").textContent = clean(c.pcName || "내 PC") + " · 연결 안 됨";
  const last = Math.max(c.lastContact || 0, (b && b.ts) || 0);
  const forget = h("details", { class: "card more" }, h("summary", { text: "연결이 계속 안 되나요?" }),
    h("p", { class: "muted", text: "새 PC로 바꿨거나 PC에서 이 휴대폰을 끊었을 때만 연결 정보를 지우고 다시 연결해 주세요. PC가 꺼져 있거나 잠든 거라면 지우지 마세요 — PC가 켜지면 저절로 다시 연결돼요." }),
    h("button", { class: "btn block", onclick: async () => {
      if (!await ask("지우면 PC 앞에서 새 코드를 받아야 다시 연결돼요. PC가 꺼져 있거나 잠든 거라면 지우지 마세요. 그래도 지울까요?", "지우기", true)) return;
      try { if (S.cred.lastUrl) await Promise.race([api("POST", "/r/forget", {}, 3000), sleep(3500)]); } catch (e) { /* PC 가 안 닿으면 PC 쪽 항목은 90일 뒤 저절로 정리 */ }
      forgetLocal();
    } }, "연결 정보 지우고 다시 연결"));
  view(h("section", { class: "card offline " + cls }, h("h2", { id: "offTitle", text: title }),
    h("p", { id: "offLast", text: last ? `마지막 소식 ${clock(last)} (${ago(last)})` : "마지막 소식이 아직 없어요" }),
    b && b.job ? h("p", { class: "muted", text: `마지막으로 하던 일 · ${b.job.name}${b.job.pct != null ? " " + b.job.pct + "%" : ""}` }) : null,
    h("p", { class: "muted", text: sub }),
    h("button", { class: "btn primary block", onclick: async () => { finding(); await connect(); schedule(); } }, "다시 확인")),
    forget);
}

// ---------- 알림 받기 (ntfy) ----------
function storeButtons() {
  return h("div", { class: "links" },
    !ANDROID ? h("a", { class: "btn sm", href: STORE_IOS, target: "_blank", rel: "noopener noreferrer" }, "아이폰 ntfy 앱 받기") : null,
    !IOS ? h("a", { class: "btn sm", href: STORE_ANDROID, target: "_blank", rel: "noopener noreferrer" }, "안드로이드 ntfy 앱 받기") : null);
}
function subscribeBlock(onDone) {
  const c = S.cred;
  const fin = () => { if (c.notifyMoved) { c.notifyMoved = false; save(); } if (onDone) onDone(); };
  return h("div", { class: "stack" },
    c.notifyServer === P.NTFY ? h("a", { class: "btn primary block", href: `ntfy://ntfy.sh/${c.notifyTopic}`, onclick: fin }, "ntfy 앱에서 바로 구독") : null,
    h("div", { class: "row" }, h("span", { class: "topic grow", text: c.notifyTopic }), h("button", { class: "btn sm", onclick: () => { copy(c.notifyTopic); fin(); } }, "주제 복사")),
    h("p", { class: "muted", text: "바로 구독이 안 되면: ntfy 앱 → + → 주제 이름에 붙여 넣기 (서버는 ntfy.sh 그대로)" }));
}
async function sendTest() {
  try {
    const r = await api("POST", "/r/notify-test", {});
    if (!r.ok) return toast(r.j.error || "알림 시험을 보내지 못했어요");
    S.alertTest = now(); toast("알림 시험을 보냈어요 · 휴대폰 알림을 확인해 주세요");
  } catch (e) { if (!(e instanceof Gone)) toast("PC와 연결이 끊겼어요"); return; }
  render();
}
function setAlert(v) { S.cred.alertSetup = v; save(); render(); }
function alertCard() {
  const tested = S.alertTest && now() - S.alertTest < 600;
  return h("section", { class: "card stack setup", id: "alertCard" },
    h("h3", { text: "알림 받기 설정 (처음 한 번)" }),
    h("p", { text: "작업이 끝나거나 멈추면 휴대폰 알림으로 알려 드려요. 무료 ntfy 앱으로 받아요." }),
    h("div", { class: "lbl", text: "① ntfy 앱 설치" }), storeButtons(),
    h("div", { class: "lbl", text: "② 이 PC의 알림 주제 구독" }), subscribeBlock(),
    h("div", { class: "lbl", text: "③ 시험" }),
    h("button", { class: "btn block", onclick: sendTest }, tested ? "알림 시험 다시 보내기" : "알림 시험 보내기"),
    tested ? h("div", { class: "row" }, h("button", { class: "btn grow primary", onclick: () => { setAlert("done"); toast("알림 준비 끝 ✓"); } }, "알림이 왔어요"),
      h("button", { class: "btn grow", onclick: () => { S.alertTips = true; render(); } }, "안 왔어요")) : null,
    S.alertTips ? h("p", { class: "muted", text: "ntfy 앱에서 구독한 주제가 위 주제와 같은지, 휴대폰 설정에서 ntfy 알림이 켜져 있는지 확인해 주세요. 아이폰은 ntfy 앱을 한 번 열어 알림을 허용해야 해요." }) : null,
    h("button", { class: "btn sm ghost", onclick: () => setAlert("later") }, "나중에 할게요"));
}
function movedCard() {
  return h("section", { class: "card alert stack" }, h("h3", { text: "알림 주제가 바뀌었어요" }),
    h("p", { text: "PC에서 휴대폰을 끊어서 알림 주제가 새로 바뀌었어요. ntfy 앱에서 새 주제로 다시 구독해야 알림이 와요 (옛 주제는 지워 주세요)." }),
    subscribeBlock(() => render()));
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
    j.stoppable ? h("button", { class: "btn danger sm", onclick: stopJob }, "멈추기")
      : h("p", { class: "muted", id: "noStop", text: "이 작업은 중간에 멈출 수 없어요 · 끝나면 알려 드릴게요" }));
}
async function stopJob() {
  if (!await ask("지금 작업을 멈출까요?", "멈추기", true)) return;
  try { const r = await api("POST", "/r/cancel", {}); toast(r.ok ? "멈추기를 보냈어요" : (r.j.error || "지금은 멈출 수 없어요")); } catch (e) { if (!(e instanceof Gone)) toast("PC와 연결이 끊겼어요"); }
  tick();
}
function lastCard(l) {
  if (!l) return null;
  const at = h("span", { class: "muted", text: ` ${clock(l.endedAt)}` });
  if (l.warn) {  // 확인이 필요해요 (YouTube 가 막음·못 받은 영상) — 다음에 할 일이 바로 보이게
    return h("section", { class: "card warncard" }, h("div", { class: "lbl", text: "마지막 작업" }),
      h("div", {}, h("span", { class: "warn", text: `${l.name} · 확인이 필요해요` }), at), l.error ? h("p", { text: l.error }) : null);
  }
  const head = l.ok ? h("div", {}, h("span", { class: "ok", text: `${l.name} 끝 ✓` }), at) : h("div", {}, h("span", { class: "bad", text: `${l.name} 멈췄어요` }), at);
  return h("section", { class: "card" }, h("div", { class: "lbl", text: "마지막 작업" }), head,
    !l.ok && l.error ? h("details", {}, h("summary", { text: "자세히" }), h("p", { text: l.error })) : null);
}
function renderProgress() {
  if (!S.status) return;
  const st = S.status, c = S.cred;
  const pre = h("pre", { class: "logtxt", text: S.logs.join("\n") || "아직 기록이 없어요" });
  const det = h("details", { class: "log card" }, h("summary", { text: "작업 기록" }), pre);
  det.open = S.logOpen;
  det.addEventListener("toggle", () => { S.logOpen = det.open; if (det.open) pre.scrollTop = 1e9; });
  const off = c.alertSetup === "later" ? h("button", { class: "card hintbar", onclick: () => setAlert("todo") }, h("span", { text: "알림 꺼져 있음 · 작업이 끝나도 알려 드리지 못해요" }), h("b", { text: "알림 설정" })) : null;
  view(c.notifyMoved ? movedCard() : null, c.alertSetup === "todo" ? alertCard() : off, jobCard(st.job), lastCard(st.last), det,
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
    await sleep(2200);
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
  // 휴대폰에서 시킨 완성본 작업이 끝났으면 바로 가 볼 수 있게
  if (l.ok && l.by && OUT_JOBS.includes(l.name) && S.tab !== "outputs") toast(`${l.name} 끝 ✓`, { label: "완성본에서 보기", fn: () => { S.tab = "outputs"; window.scrollTo(0, 0); render(); } });
  else if (S.tab === "library" || S.tab === "outputs") render();
  if (!S.notifyOn) return;
  const text = l.ok ? `작업이 끝났어요 · ${l.name}` : l.warn ? `확인이 필요해요 · ${l.name}` : `작업이 멈췄어요 · ${l.name}`;
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
/** 목록은 탭을 열 때마다 새로 받음 (가지고 있던 것을 먼저 보여 주고 바꿔 그림) — 작업이 끝난 뒤 새 영상·미리보기·검수 점수가 바로 보이게 */
async function renderLibrary(fresh) {
  if (S.lib && !fresh) drawLibrary();
  else view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "보관함을 불러오는 중이에요…" })));
  try { const r = await api("GET", "/r/library", undefined, 20000); if (r.ok) S.lib = r.j.videos; } catch (e) { if (e instanceof Gone) return; }
  if (S.tab === "library") drawLibrary();
}
function drawLibrary() {
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
    v.sequences.length ? h("div", { class: "stack" }, seqSel, pseg, h("p", { class: "muted", text: "다 내보내면 휴대폰에서 보기 좋은 작은 미리보기도 같이 만들어요" }),
      h("button", { class: "btn block", onclick: () => doAction("export", { name: v.name, seq: seqSel.value, preset }) }, "내보내기"))
      : h("p", { class: "muted", text: "아직 편집본이 없어요 · 편집점을 찾으면 가편집이 생겨요" }));
}

// 완성본
async function renderOutputs(fresh) {
  if (S.outs && !fresh) drawOutputs();
  else view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "완성본을 불러오는 중이에요…" })));
  try { const r = await api("GET", "/r/outputs", undefined, 20000); if (r.ok) S.outs = r.j.outputs; } catch (e) { if (e instanceof Gone) return; }
  if (S.tab === "outputs") drawOutputs(!!fresh);
}
function drawOutputs(force) {
  const outs = S.outs || [];
  const refresh = h("button", { class: "btn sm", onclick: () => renderOutputs(true) }, "새로 고침");
  if (!outs.length) return view(h("div", { class: "row" }, h("div", { class: "lbl grow", text: "완성본" }), refresh), h("section", { class: "card empty" }, h("b", { text: "아직 완성본이 없어요" }), "보관함에서 편집본을 내보내 보세요"));
  if (!force && [...$("view").querySelectorAll("video")].some(v => !v.paused && !v.ended)) return;  // 보고 있는 영상은 다시 그리지 않음 (멈추지 않게)
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
    const big = o.sizeMb > 100, pv = o.preview && o.preview.exists;
    const row = h("div", { class: "row" });
    const slot = h("div");
    const play = (which) => playVideo(slot, o.name, which);
    if (pv) row.append(h("button", { class: "btn sm primary", onclick: () => play("preview") }, "작은 미리보기로 보기"));
    row.append(h("button", { class: "btn sm", onclick: () => play("file") }, `원본 보기 (데이터 많이 씀 · ${size(o.sizeMb)})`));
    if (!pv) row.append(h("button", { class: "btn sm" + (big ? " primary" : ""), onclick: () => doAction("preview", { file: o.name }) }, "작은 미리보기 만들기"));
    row.append(h("button", { class: "btn sm", onclick: () => doAction("qa", { file: o.name }) }, "검수하기"));
    if (big && !pv) card.append(h("div", { class: "badges" }, h("span", { class: "badge warn", text: "용량이 커요 · 데이터로 볼 때는 작은 미리보기를 추천해요" })));
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
  v.addEventListener("error", async () => {  // 표(1시간)가 지났거나 휴대폰 인터넷이 바뀜(와이파이↔데이터) → 목록을 새로 받아 같은 자리부터
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
    if (!r.ok) throw new Error(String(r.status));
    const text = await r.text();
    slot.replaceChildren(h("pre", { text }), h("button", { class: "btn sm", onclick: () => copy(text) }, "복사"));
  } catch (e) { toast("내용을 불러오지 못했어요 · 새로 고침을 눌러 주세요"); }
}

// 더보기
function notifyPref() {
  try { return localStorage.getItem("fs-notify") === "1" && "Notification" in window && Notification.permission === "granted"; } catch (e) { return false; }
}
function renderMore() {
  const c = S.cred, st = S.status || {};
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
    c.notifyMoved ? h("section", { class: "card alert" }, h("p", { text: "알림 주제가 바뀌었어요 · ntfy 앱에서 아래 새 주제로 다시 구독해 주세요" })) : null,
    h("section", { class: "card stack" }, h("h3", { text: "알림 받기" }),
      h("p", { text: "작업이 끝나거나 멈추면 휴대폰으로 알려 드려요. 무료 ntfy 앱을 설치하고 아래 주제를 구독해 주세요." }),
      storeButtons(), subscribeBlock(() => render()),
      h("button", { class: "btn block", onclick: sendTest }, "알림 시험 보내기"),
      h("p", { class: "muted", text: "알림에는 파일 이름이 들어가지 않아요. 스튜디오 알림은 '작업이 끝났어요' 같은 짧은 문장뿐이에요 — 알림이 무엇을 설치하라고 하면 열지 말고 무시해 주세요." }),
      h("label", { class: "chk" }, tgl, "이 화면을 열어 둔 동안만 브라우저 알림도 보기 (화면을 닫으면 안 와요 · 아이폰 사파리는 안 돼요)")),
    h("section", { class: "card" }, h("h3", { text: "PC" }),
      h("p", { text: `${c.pcName || "내 PC"}${st.ver ? " · 스튜디오 v" + st.ver : ""}` }),
      h("p", { class: "muted", text: `이 휴대폰 이름 · ${c.deviceName || ""}` }),
      st.remote && st.remote.autoOffAt ? h("p", { class: "muted", text: `쓰지 않으면 ${clock(st.remote.autoOffAt)}에 원격 접속이 저절로 꺼져요` }) : null),
    h("section", { class: "card stack" },
      h("button", { class: "btn block danger", onclick: async () => {
        if (!await ask("이 휴대폰의 연결을 끊을까요? 다시 쓰려면 PC 앞에서 새 코드로 다시 연결해야 해요.", "끊기", true)) return;
        try { await api("POST", "/r/forget", {}); } catch (e) { /* 그래도 이 휴대폰 정보는 지움 */ }
        forgetLocal("이 휴대폰 연결을 끊었어요");
      } }, "이 휴대폰 연결 끊기"),
      h("button", { class: "btn block", onclick: async () => {
        if (!await ask("PC의 원격 접속을 끌까요? 다시 켜려면 PC에서 직접 켜야 해요.", "끄기", true)) return;
        try { const r = await api("POST", "/r/remote-off", {}); if (!r.ok) return toast(r.j.error || "끄지 못했어요"); } catch (e) { return; }
        S.cred.lastBeacon = { ts: now(), state: "off", reason: "원격 접속을 껐어요" };
        await save(); goOffline(); schedule();
      } }, "원격 접속 끄기")),
    installCard());
}

// ---------- 시작 ----------
async function start() {
  S.notifyOn = notifyPref();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/futsal/sw.js", { scope: "/futsal" }).catch(() => { /* 없어도 그대로 씀 */ });
  const hp = P.parseHash(location.hash);
  const saved = await load();
  if (saved && saved.v === 2 && saved.auth && saved.beacon && typeof saved.auth === "object") {
    S.cred = saved; S.keys = { auth: saved.auth, beacon: saved.beacon };
  } else if (saved) await wipe();
  if (hp.pair && INAPP) return inAppScreen(hp);  // 앱 안 브라우저: 코드를 쓰지 않고 남겨 둠 (다른 브라우저로 열면 그대로 연결)
  if (location.hash) history.replaceState(null, "", "/futsal");  // 코드가 주소창·방문 기록에 남지 않게 바로 지움
  if (hp.pair) return pair(hp.pair, hp.u);
  if (!S.cred) return unpaired();
  finding();
  await connect();
  schedule();
}
window.addEventListener("hashchange", () => {
  const hp = P.parseHash(location.hash);
  if (!hp.pair) return;
  if (INAPP) return inAppScreen(hp);
  history.replaceState(null, "", "/futsal"); pair(hp.pair, hp.u);
});
start();

// 풋살 스튜디오 원격 — 휴대폰 화면 (futsal.mulgyeol.kr)
// PC 앱(remote.py)의 /r/* 와 ntfy 비콘만 쓴다. 와벨리 코드·데이터와는 아무 관계가 없다.
// 밖에서 온 글자(파일 이름·제목·기록)는 늘 textContent 로만 넣는다 (innerHTML 에 넣지 않음).
import * as P from "./proto.js";

// 이 페이지가 놓인 곳 (futsal.mulgyeol.kr 은 "/") — 주소창 정리·서비스 워커 범위·알림 그림이 모두 여기서 나온다.
// 다른 앞머리(예: /alt/fs)에 놓아도 같은 파일로 돈다 (PC 는 remote.SITE 한 줄 · D-233 · D-240).
const BASE = new URL(".", import.meta.url).pathname;                     // 파일이 있는 곳 (끝에 /) — 그림·서비스 워커
const HOME = location.pathname.replace(/\/(index(\.html)?)?$/, "") || "/";  // 이 페이지 주소 (끝 / 없이 · 뿌리면 "/")
const ICON = BASE + "icon-192.png";

const DEV = ["127.0.0.1", "localhost"].includes(location.hostname);
const DEV_NTFY = DEV ? ((document.querySelector('meta[name="futsal-dev-ntfy"]') || {}).content || "") : "";
const PAIR_NTFY = DEV && DEV_NTFY ? DEV_NTFY : P.NTFY;
const $ = id => document.getElementById(id);
const S = { cred: null, keys: null, tab: "progress", status: null, logs: [], logTotal: 0, lib: null, outs: null, choices: null,
  online: false, timer: null, connecting: false, prevJob: null, logOpen: false, ntfyReached: true, alertTest: null, alertTips: false,
  resume: null, cookieHelp: false, opening: false, afterLogin: false, studioFirst: false, loginInfo: null, guestEnded: false,
  loginPrefill: null, guestLook: null };
const KIND = { own: "풋살사관학교", footage: "내 촬영본", unknown: "출처 모름" };
const STORE_IOS = "https://apps.apple.com/app/ntfy/id1625396347";
const STORE_ANDROID = "https://play.google.com/store/apps/details?id=io.heckel.ntfy";
const UA = navigator.userAgent;
const IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const ANDROID = /Android/.test(UA);
const DESKTOP = !IOS && !ANDROID && !/Mobile|Tablet/i.test(UA);  // 노트북·데스크톱 브라우저 (밖에서 작업 · PC 스튜디오 열기)
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
/** 막힌 때까지: 오늘이면 시각만 · 내일이면 '내일 오후 3:40' · 그 뒤면 '10월 14일 오후 3:40' (하루 막힘이 '벌써 지난 시각'처럼 읽히지 않게) */
function untilText(t) {
  const d = new Date(t * 1000), n = new Date(), tm = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return (d.toDateString() === n.toDateString() ? "" : d.toDateString() === tm.toDateString() ? "내일 " : `${d.getMonth() + 1}월 ${d.getDate()}일 `) + clock(t);
}
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
async function save() {
  DB.mem = S.cred;
  if (S.cred && S.cred.guest) return;  // '이번만' 기기: 이 화면 메모리에만 (IndexedDB 에 쓰지 않음 · 새로 고치면 사라짐 · D-256)
  try { await dbDo("readwrite", st => st.put(S.cred, "cred")); } catch (e) { /* 개인 정보 보호 모드: 이 화면을 연 동안만 */ }
}
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
    if (r.status === 401 && j.code === "unknown_device") {
      if (c.guest) await guestOver();
      else await forgetLocal(c.via === "login" ? "이 기기는 연결이 끊겼어요 · 아이디·비밀번호로 다시 연결해 주세요" : "이 휴대폰은 연결이 끊겼어요 · PC에서 다시 연결해 주세요");
      throw new Gone();
    }
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
  if (c.via === "login") {  // 아이디로 연결한 기기: 비콘 주제만 (알림 주제는 받지 않음 · D-255)
    if (!P.topicOk(beacon) || beacon === c.beaconTopic) return false;
    c.beaconTopic = beacon;
    return true;
  }
  if (!P.topicOk(beacon) || !P.topicOk(notify)) return false;
  let moved = false;
  if (notify !== c.notifyTopic) { c.notifyMoved = true; moved = true; }
  if (beacon !== c.beaconTopic || moved) { c.beaconTopic = beacon; c.notifyTopic = notify; return true; }
  return false;
}
/** 비콘(ntfy) → 내 몫을 풀어 마지막 소식에 기억 · 옛 글(seq 가 같거나 작음)은 무시 · 주제가 옮겨졌으면 따라감 */
async function readBeacon() {
  const c = S.cred;
  if (!c.beaconTopic || !c.beaconServer) return c.lastBeacon || null;  // 이번만 기기는 비콘이 없음
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
    if (tp && topicsChanged(tp.beacon.topic, tp.notify && tp.notify.topic)) dirty = true;
    if (tp && tp.login) S.loginInfo = tp.login;  // 아이디·비밀번호 연결 모습 (같은 봉투 · 더보기)
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
  if (S.cred.guest && S.cred.exp && now() > S.cred.exp) return guestOver();
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
    if (S.cred.guest && await guestGone()) return guestOver();
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
  if (S.resume) {  // 스튜디오에서 연결이 끝나 돌아옴 → 저절로 다시 (1분에 2번까지 · 넘으면 쿠키가 막힌 것으로 보고 안내)
    const to = S.resume; S.resume = null; S.afterLogin = false;
    if (studioAllowed()) { if (handoffBudget()) openStudio(to); else { S.cookieHelp = true; render(); } }
  } else if (S.afterLogin) {  // 아이디로 막 연결함: 넓은 화면(노트북)은 바로 PC 스튜디오 · 좁은 화면은 원격 홈(스튜디오 칸 맨 위)
    S.afterLogin = false;
    if (wideScreen() && studioAllowed()) {
      view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "PC 스튜디오를 여는 중이에요…" })));
      openStudio("/").then(ok => { if (!ok) render(); });
    }
  }
}
/** 이번만 기기는 비콘이 없어 새 주소를 못 따라감 → 아이디로 'PC 찾기' 기록을 봐서 이 PC 가 꺼졌거나 주소가 바뀌었으면 true
 *  (그때 PC 는 이번만 기기를 버림 · D-256). 기록이 그대로(같은 주소로 켜짐)거나 ntfy 에 닿지 않으면 false (잠깐 끊긴 것일 수 있음) */
async function guestGone() {
  const c = S.cred;
  if (!c || !c.guest || !c.loginShow || P.idProblem(c.loginShow) || !navigator.onLine) return false;
  try {
    const d = S.guestLook && S.guestLook.show === c.loginShow ? S.guestLook.d : await P.deriveLogin(P.canonId(c.loginShow));
    S.guestLook = { show: c.loginShow, d };
    const later = (a, b) => a.ts > b.ts || (a.ts === b.ts && a.seq > b.seq);
    let newest = null;
    for (const r of await lookupRecords(d)) if (r.pc === c.pcId && (!newest || later(r, newest))) newest = r;
    if (!newest || newest.ts < (c.pairedAt || 0) + (c.skew || 0) - 60) return false;  // 연결한 뒤로 PC 가 새로 올린 기록이 없음 (기록은 PC 시계)
    return newest.state === "off" || P.hostOk(newest.url, DEV) !== c.lastUrl;
  } catch (e) { return false; }
}
/** 이번만 기기가 끝남 → 메모리를 지우고 아이디·비밀번호 칸으로 (아이디는 채워 둠 · 비밀번호만 다시) */
function guestOver() {
  S.guestEnded = true;
  S.loginPrefill = S.cred && S.cred.loginShow;
  return forgetLocal();
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
  // 'PC' 라고 하면 PC 화면의 '밖에서 작업 중 · PC · Chrome'이 이 PC 처럼 읽힘 → 노트북은 'Windows 노트북'·'Mac'·'컴퓨터'
  const d = /iPhone/.test(UA) ? "iPhone" : /iPad/.test(UA) ? "iPad" : /Android/.test(UA) ? (/SM-|Samsung/i.test(UA) ? "Galaxy" : "Android") : /Mac/.test(UA) ? "Mac"
    : /Windows/.test(UA) ? "Windows 노트북" : /CrOS|Linux|X11/.test(UA) ? "컴퓨터" : "휴대폰";
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
  if (!r.ok) return { error: j.error || "연결하지 못했어요 · PC 화면의 새 QR로 다시 해 주세요", status: r.status };
  if (j.api !== P.API) return { error: "PC 스튜디오를 업데이트해 주세요", status: 400 };
  const inner = await P.openPairResponse(j, pk.topic, pk.key);  // 코드로 만든 열쇠로 풀려야 진짜 PC
  return inner ? { inner, base, skew: typeof j.time === "number" ? j.time - now() : skew } : null;
}
async function pair(code, hint) {
  if (S.cred && !await ask(`이 휴대폰은 이미 '${clean(S.cred.pcName || "내 PC")}'와 연결돼 있어요.\n새 QR로 다시 연결하면 지금 연결은 끊어져요. PC 화면의 QR을 직접 찍은 게 맞나요?`, "다시 연결하기")) {
    finding(); connect().then(schedule); return;
  }
  dot("wait", "PC를 찾고 있어요");
  $("tabs").hidden = true;
  view(h("section", { class: "card center" }, h("div", { class: "spin" }), h("p", { text: "QR로 PC를 찾는 중이에요 (최대 10초)" }), h("p", { class: "muted", text: "PC 화면의 QR로 연결하는 중이에요" })));
  const pk = await P.derivePair(code);
  const hb = hint ? P.hintUrl(hint, DEV) : null;
  let res = hb ? await pairAt(hb, pk) : null;  // QR 의 힌트 주소는 빨리 찾는 길일 뿐 — 진짜인지는 잠긴 대답으로 확인
  if (!res || !res.inner) {  // 힌트가 없거나 닿지 않거나 가짜 → 코드(QR 의 #pair=)로 만든 비밀 주제에서 PC 주소를 찾음
    let base = null;
    for (let i = 0; i < 5 && !base; i++) {
      const m = await latestNtfy(PAIR_NTFY, pk.topic);
      const msg = m.msg && await P.openPair(m.msg.message, pk.topic, pk.key);
      if (msg && msg.exp > now() - 60) base = P.hostOk(msg.url, DEV);
      if (!base) await sleep(2000);
    }
    if (base && (base !== hb || !res)) res = await pairAt(base, pk);
  }
  if (!res) return unpaired("PC를 찾지 못했어요 · PC에서 원격 접속이 켜져 있는지, QR이 10분 안에 만든 것인지 확인해 주세요");
  if (!res.inner) return unpaired(res.error);
  const inner = res.inner;
  const keys = await P.importKeys(inner.keys.auth, inner.keys.beacon);
  inner.keys = null;  // 원래 열쇠 글은 여기서 버림 (가져오기 전용 CryptoKey 만 남김)
  if (!await adopt(inner, keys, res.base, res.skew)) return unpaired("PC의 대답을 읽지 못했어요 · 다시 해 주세요");
  toast("PC와 연결됐어요 ✓");
  await connect();
  schedule();
}
/** 짝짓기·아이디 연결이 같이 쓰는 마무리: 풀어 낸 대답(inner) + 가져오기 전용 열쇠 → 연결 정보 · 잘못된 대답이면 false
 *  (QR·코드: 비콘·알림 주제 · 아이디 기억하기: 비콘 주제만(notify:null) · 이번만: 주제 없음 · 메모리에만 · D-256) */
async function adopt(inner, keys, base, skew) {
  const login = inner.via === "login", guest = login && inner.guest === true;
  const bs = inner.beacon ? P.ntfyOk(inner.beacon.server, DEV) : null, ns = inner.notify ? P.ntfyOk(inner.notify.server, DEV) : null;
  if (!login && (!bs || !ns || !P.topicOk(inner.beacon.topic) || !P.topicOk(inner.notify.topic))) return false;
  if (login && !guest && (!bs || !P.topicOk(inner.beacon.topic))) return false;
  if (S.cred) await wipe();
  S.cred = { v: 2, via: login ? "login" : "code", guest, exp: guest && Number.isInteger(inner.exp) ? inner.exp : null,
    loginShow: login && inner.login ? clean(inner.login.show).slice(0, 32) : null,
    pcId: inner.pc.id, pcName: inner.pc.name, deviceId: inner.device.id, deviceName: inner.device.name, auth: keys.auth, beacon: keys.beacon,
    beaconServer: bs, beaconTopic: bs ? inner.beacon.topic : null, notifyServer: ns, notifyTopic: ns ? inner.notify.topic : null,
    lastUrl: P.hostOk(inner.url, DEV) || base,  // 잠긴 대답 속 주소가 진짜 PC 주소
    lastSeq: 0, lastBeacon: null, lastContact: now(), skew: skew || 0, pairedAt: now(), alertSetup: login ? "na" : "todo", notifyMoved: false };
  S.keys = keys; S.logs = []; S.logTotal = 0; S.status = null; S.lib = S.outs = S.choices = null; S.tab = "progress"; S.alertTest = null; S.loginInfo = null;
  await save();
  if (!guest) { try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* 선택 */ } }
  return true;
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
function unpaired(err) {
  dot("", "연결 전");
  $("tabs").hidden = true;
  $("pcName").textContent = "휴대폰으로 보기";
  // 코드 입력 칸은 없음 (소유자 결정 · 스튜디오 D-259): 손으로 치는 연결은 아이디·비밀번호 하나 · PC 앞에서는 QR(#pair=)만
  view(
    err && h("section", { class: "card alert" }, h("p", { text: err })),
    INAPP ? inAppCard(false) : null,
    loginCard({ resume: !!S.resume || S.guestEnded, id: S.loginPrefill }),
    h("h3", { class: "lbl", text: "PC 앞에 있다면" }),
    h("section", { class: "card stack", id: "qrCard" }, h("p", { text: "PC 화면의 QR을 휴대폰 카메라로 찍으면 바로 연결돼요" }),
      h("p", { class: "muted", text: "QR은 PC 스튜디오 왼쪽 아래 '휴대폰으로 보기' → [원격 접속 켜기] → [휴대폰 연결하기]에 나와요" })),
    installCard());
}
function installCard() {
  const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  if (standalone) return null;
  if (DESKTOP) {  // 노트북·데스크톱: 안드로이드 안내 대신 그 브라우저의 설치·바로 열기 방법
    const how = /Edg\//.test(UA) ? "Edge: 주소창 오른쪽의 앱 설치 아이콘(⊕)을 누르면 따로 창으로 열 수 있어요."
      : /Chrome\//.test(UA) ? "크롬: 주소창 오른쪽의 설치 아이콘(⊕ 또는 컴퓨터 모양)을 누르면 따로 창으로 열 수 있어요."
        : /Safari\//.test(UA) && /Mac/.test(UA) ? "사파리: 메뉴 막대의 [파일] → [Dock에 추가]를 누르면 따로 창으로 열 수 있어요."
          : "이 주소를 즐겨찾기(북마크)에 추가해 두면 다음에 바로 열 수 있어요.";
    return h("section", { class: "card" }, h("h3", { text: "이 컴퓨터에서 바로 열 수 있게 두기" }), h("p", { text: how }),
      h("p", { class: "muted", text: `원격 홈 주소 · ${location.host}` }));
  }
  return h("section", { class: "card" }, h("h3", { text: "홈 화면에 두고 앱처럼 쓰기" }),
    IOS ? h("p", { text: "아이폰: 먼저 사파리 아래 공유 버튼 → '홈 화면에 추가' → 홈 화면의 '풋살 스튜디오'를 열고, 그 안에서 '아이디·비밀번호로 연결'로 연결해 주세요 (아이디·비밀번호는 PC '휴대폰으로 보기'에서 정해요)." })
      : h("p", { text: "안드로이드: 크롬 메뉴(⋮) → '앱 설치' 또는 '홈 화면에 추가'. 연결은 그대로 이어져요." }),
    IOS ? h("p", { class: "muted", text: "아이폰은 홈 화면 앱과 사파리가 따로 저장해요. 사파리에서 이미 연결했다면 홈 화면 앱에서 아이디·비밀번호로 한 번 더 연결하고, PC 목록에서 사파리 쪽은 [끊기] 해 주세요." }) : null);
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
    h("button", { class: "btn block", onclick: () => { history.replaceState(null, "", HOME); pair(hp.pair, hp.u); } }, "여기서 연결하기")));
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
  // 이번만 기기: 지울 연결 정보가 없음 (메모리뿐) → 아이디·비밀번호 칸으로 바로
  const forget = c.guest ? h("details", { class: "card more" }, h("summary", { text: "연결이 계속 안 되나요?" }),
    h("p", { class: "muted", text: "이번만 연결한 기기는 PC가 다시 켜지거나 연결 주소가 바뀌면 아이디·비밀번호로 다시 연결해야 해요" }),
    h("button", { class: "btn block", id: "guestRelogin", onclick: guestOver }, "아이디·비밀번호로 다시 연결")) : h("details", { class: "card more" }, h("summary", { text: "연결이 계속 안 되나요?" }),
    h("p", { class: "muted", text: "새 PC로 바꿨거나 PC에서 이 휴대폰을 끊었을 때만 연결 정보를 지우고 다시 연결해 주세요. PC가 꺼져 있거나 잠든 거라면 지우지 마세요 — PC가 켜지면 저절로 다시 연결돼요." }),
    h("button", { class: "btn block", onclick: async () => {
      if (!await ask(c.via === "login" ? "지우면 아이디·비밀번호로 다시 연결해야 해요. PC가 꺼져 있거나 잠든 거라면 지우지 마세요. 그래도 지울까요?"
        : "지우면 PC 앞에서 QR을 다시 찍거나 아이디·비밀번호로 다시 연결해야 해요. PC가 꺼져 있거나 잠든 거라면 지우지 마세요. 그래도 지울까요?", "지우기", true)) return;
      try { if (S.cred.lastUrl) await Promise.race([api("POST", "/r/forget", {}, 3000), sleep(3500)]); } catch (e) { /* PC 가 안 닿으면 PC 쪽 항목은 90일 뒤 저절로 정리 */ }
      forgetLocal();
    } }, "연결 정보 지우고 다시 연결"));
  view(h("section", { class: "card offline " + cls }, h("h2", { id: "offTitle", text: title }),
    h("p", { id: "offLast", text: last ? `마지막 소식 ${clock(last)} (${ago(last)})` : "마지막 소식이 아직 없어요" }),
    b && b.job ? h("p", { class: "muted", text: `마지막으로 하던 일 · ${b.job.name}${b.job.pct != null ? " " + b.job.pct + "%" : ""}` }) : null,
    h("p", { class: "muted", text: sub }),
    c.guest ? null : h("p", { class: "muted", id: "offPaired", text: "이 기기는 이미 PC와 연결돼 있어요 · 비밀번호는 필요 없어요" }),
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
      j.by ? h("span", { class: "by", text: String(j.by).startsWith("밖에서") ? "밖에서" : "휴대폰에서" }) : null),
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
// ---------- PC 스튜디오 열기 (밖에서 작업 · D-230) ----------
// 서명한 /r/handoff → 한 번 쓰는 표(1분) → <PC 주소>/s/hello#t=<표> 로 넘어감 (표는 # 뒤라 서버·기록에 안 남음) → PC 화면 그대로
const studioFeature = () => !!(S.status && Array.isArray(S.status.features) && S.status.features.includes("studio"));
const studioAllowed = () => studioFeature() && !!(S.status.remote && S.status.remote.studio && S.status.remote.studio.allowed);
function handoffBudget() {
  let a = [];
  try { a = JSON.parse(sessionStorage.getItem("fs-handoff") || "[]").filter(t => typeof t === "number" && Date.now() - t < 60000); } catch (e) { a = []; }
  if (a.length >= 2) return false;
  a.push(Date.now());
  try { sessionStorage.setItem("fs-handoff", JSON.stringify(a)); } catch (e) { /* 이 화면을 연 동안만 */ }
  return true;
}
async function openStudio(path) {  // → 넘어가면 true
  if (S.opening) return false;
  S.opening = true;
  try {
    const r = await api("POST", "/r/handoff", { path: P.nextOk(path) ? path : "/" }, 10000);
    if (!r.ok) {
      toast(r.j.code === "studio_off" ? "PC에서 '밖에서 작업 허용'이 꺼져 있어요 · PC의 '휴대폰으로 보기'에서 켜 주세요" : (r.j.error || "지금은 열 수 없어요 · 잠시 뒤 다시 눌러 주세요"));
      return false;
    }
    const base = P.hostOk(r.j.url, DEV);  // 받아도 되는 PC 주소만 (빠른 터널 · 개발 때만 루프백)
    if (!base || !/^[A-Za-z0-9_-]{43}$/.test(r.j.token || "")) { toast("PC의 대답을 읽지 못했어요 · 다시 눌러 주세요"); return false; }
    location.assign(base + "/s/hello#t=" + r.j.token);
    return true;
  } catch (e) {
    if (!(e instanceof Gone)) toast("PC와 연결이 끊겼어요");
    return false;
  } finally { setTimeout(() => { S.opening = false; }, 1500); }
}
const wideScreen = () => !!(window.matchMedia && matchMedia("(min-width: 760px)").matches);
function studioCard() {
  if (!studioFeature()) return null;  // 예전 PC 스튜디오 → 보이지 않음
  const ok = studioAllowed();
  return h("section", { class: "card stack studio", id: "studioCard" },
    h("h3", { text: "PC 스튜디오 열기" }),
    h("p", { text: "PC 화면 그대로 밖에서 작업해요 (노트북·태블릿 추천) · 영상 처리는 PC가 해요" }),
    S.cookieHelp ? h("p", { class: "warn", text: "브라우저 쿠키가 막혀 있어요 · 이 브라우저 설정에서 쿠키(사이트 데이터)를 허용한 뒤 다시 눌러 주세요 (시크릿·개인 정보 보호 모드라면 일반 창에서)" }) : null,
    ok ? h("button", { class: "btn primary block", id: "studioGo", onclick: () => { S.cookieHelp = false; openStudio("/"); } }, "PC 스튜디오 열기")
      : h("p", { class: "muted", id: "studioOff", text: "PC에서 '밖에서 작업 허용'이 꺼져 있어요 · PC의 '휴대폰으로 보기'에서 켜 주세요" }));
}
function renderProgress() {
  if (!S.status) return;
  const st = S.status, c = S.cred;
  const pre = h("pre", { class: "logtxt", text: S.logs.join("\n") || "아직 기록이 없어요" });
  const det = h("details", { class: "log card" }, h("summary", { text: "작업 기록" }), pre);
  det.open = S.logOpen;
  det.addEventListener("toggle", () => { S.logOpen = det.open; if (det.open) pre.scrollTop = 1e9; });
  const off = c.alertSetup === "later" ? h("button", { class: "card hintbar", onclick: () => setAlert("todo") }, h("span", { text: "알림 꺼져 있음 · 작업이 끝나도 알려 드리지 못해요" }), h("b", { text: "알림 설정" })) : null;
  // 넓은 화면(노트북·태블릿)·아이디로 막 연결한 기기는 스튜디오 열기를 맨 위로
  const wide = wideScreen() || S.studioFirst, sc = studioCard();
  view(wide ? sc : null, c.notifyMoved ? movedCard() : null, c.alertSetup === "todo" ? alertCard() : off, jobCard(st.job), wide ? null : sc, lastCard(st.last), det,
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
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(reg => reg.showNotification("풋살 스튜디오", { body: text, icon: ICON, tag: "fs-job" }));
    else new Notification("풋살 스튜디오", { body: text, icon: ICON });
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
  const code = c.via !== "login";
  view(
    c.guest ? guestCard() : null,
    c.notifyMoved ? h("section", { class: "card alert" }, h("p", { text: "알림 주제가 바뀌었어요 · ntfy 앱에서 아래 새 주제로 다시 구독해 주세요" })) : null,
    code ? h("section", { class: "card stack" }, h("h3", { text: "알림 받기" }),
      h("p", { text: "작업이 끝나거나 멈추면 휴대폰으로 알려 드려요. 무료 ntfy 앱을 설치하고 아래 주제를 구독해 주세요." }),
      storeButtons(), subscribeBlock(() => render()),
      h("button", { class: "btn block", onclick: sendTest }, "알림 시험 보내기"),
      h("p", { class: "muted", text: "알림에는 파일 이름이 들어가지 않아요. 스튜디오 알림은 '작업이 끝났어요' 같은 짧은 문장뿐이에요 — 알림이 무엇을 설치하라고 하면 열지 말고 무시해 주세요." }),
      h("label", { class: "chk" }, tgl, "이 화면을 열어 둔 동안만 브라우저 알림도 보기 (화면을 닫으면 안 와요 · 아이폰 사파리는 안 돼요)"))
      : h("section", { class: "card stack" }, h("h3", { text: "알림 받기" }), h("p", { text: "알림은 QR로 연결한 휴대폰에서 받아요" }),
        h("label", { class: "chk" }, tgl, "이 화면을 열어 둔 동안만 브라우저 알림도 보기 (화면을 닫으면 안 와요 · 아이폰 사파리는 안 돼요)")),
    loginMoreCard(),
    h("section", { class: "card" }, h("h3", { text: "PC" }),
      h("p", { text: `${c.pcName || "내 PC"}${st.ver ? " · 스튜디오 v" + st.ver : ""}` }),
      h("p", { class: "muted", text: `이 기기 이름 · ${c.deviceName || ""}` }),
      st.remote && st.remote.autoOffAt ? h("p", { class: "muted", text: `쓰지 않으면 ${clock(st.remote.autoOffAt)}에 원격 접속이 저절로 꺼져요` }) : null),
    h("section", { class: "card stack" },
      c.guest ? null : h("button", { class: "btn block danger", onclick: async () => {
        if (!await ask(code ? "이 기기의 연결을 끊을까요? 다시 쓰려면 PC 앞에서 QR을 찍거나 아이디·비밀번호로 다시 연결해야 해요."
          : "이 기기의 연결을 끊을까요? 다시 쓰려면 아이디·비밀번호로 다시 연결해요.", "끊기", true)) return;
        try { await api("POST", "/r/forget", {}); } catch (e) { /* 그래도 이 기기 정보는 지움 */ }
        forgetLocal("이 기기 연결을 끊었어요");
      } }, "이 기기 연결 끊기"),
      // 이번만 기기(빌린 기기)에는 없음 — 모두의 원격 접속을 꺼 버리지 않게 (끝낼 때는 맨 위 [이 기기에서 나가기] · PC 도 거절함)
      c.guest ? null : h("button", { class: "btn block", id: "remoteOff", onclick: async () => {
        if (!await ask("PC의 원격 접속을 끌까요? 다시 켜려면 PC에서 직접 켜야 해요.", "끄기", true)) return;
        try { const r = await api("POST", "/r/remote-off", {}); if (!r.ok) return toast(r.j.error || "끄지 못했어요"); } catch (e) { return; }
        S.cred.lastBeacon = { ts: now(), state: "off", reason: "원격 접속을 껐어요" };
        await save(); goOffline(); schedule();
      } }, "원격 접속 끄기")),
    installCard());
}

// ---------- 아이디로 연결 (D-250~D-256 · 아이디만 D-290) ----------
// 아이디 → ntfy 의 잠긴 'PC 찾기' 기록 → 후보 PC(3곳까지) → SRP-6a (비밀번호도 비밀번호에서 나온 값도 보내지 않음) → M2 확인 → 잠긴 기기 열쇠.
// 칸은 아이디 하나: 소유자 아이디(P.OWNER_ID)이고 PC 기록에 '아이디만' 표시가 있으면 비밀 = 맞춘 아이디 (비밀번호 없음 · 소유자 결정) ·
// 그 밖에는 PC 를 찾은 뒤 비밀번호 칸을 보여 줌 (다른 아이디는 '아이디만' 표시를 믿지 않음 — 남이 올린 가짜 기록으로 비밀번호를 건너뛰게 못 함).
// 비밀번호는 저장하지 않는다: 시도하는 동안과 PC 가 꺼져 있을 때 저절로 다시 해 보는 10분 동안만 메모리에 · 그 뒤 지움.
const LOGIN_RETRY_MS = 30000, LOGIN_RETRY_FOR = 600000;
const LG = { job: null, retryT: null, busy: false, badSeen: new Set() };
const RANK = { m2_fail: 4, old_pc: 3, asleep: 2, off: 1, not_found: 0 };
const VERDICT = ["bad", "locked", "suspended", "login_off", "busy", "need_pw"];
function wipeLoginSecret() {
  clearTimeout(LG.retryT); LG.retryT = null;
  if (LG.job) { LG.job.pw = null; LG.job = null; }
}
function loginCard(o = {}) {
  const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  const idIn = h("input", { class: "inp", name: "username", id: "loginId", autocomplete: "username", autocapitalize: "none", autocorrect: "off",
    spellcheck: "false", maxlength: "40", "aria-label": "아이디" });
  if (o.id) idIn.value = clean(o.id).slice(0, 40);  // 이번만 기기가 끝나 다시 연결: 아이디는 채워 둠 (아이디는 비밀이 아님 · D-252)
  idIn.addEventListener("input", () => {  // 아이디를 고치면 비밀번호 칸은 다시 숨김 (다른 PC 의 칸이 남아 아이디만 연결을 막지 않게)
    const r = $("loginPwRow"), p = $("loginPw");
    if (r && !r.hidden) { r.hidden = true; if (p) p.value = ""; }
  });
  const pwIn = h("input", { class: "inp", type: "password", name: "password", id: "loginPw", autocomplete: "current-password", maxlength: "128", "aria-label": "비밀번호" });
  const show = h("button", { type: "button", class: "btn sm", id: "loginShow", onclick: () => {
    const t = pwIn.type === "password"; pwIn.type = t ? "text" : "password"; show.textContent = t ? "숨기기" : "보기";
  } }, "보기");
  // 비밀번호 칸은 숨겨 둠: 찾은 PC 가 비밀번호를 쓰면 그때 보여 줌 (아이디만 PC 는 아이디 하나로 끝 · D-290)
  const pwRow = h("div", { class: "stack", id: "loginPwRow", hidden: true }, h("div", { class: "lbl", text: "비밀번호" }), h("div", { class: "pwrow" }, pwIn, show));
  const rem = h("input", { type: "checkbox", id: "loginRemember", checked: !!standalone });  // 홈 화면 앱이면 기억 · 브라우저 탭이면 이번만
  const form = h("form", { id: "loginForm", method: "post", autocomplete: "on", class: "stack", onsubmit: e => { e.preventDefault(); loginSubmit(form); } },
    h("div", { class: "lbl", text: "아이디" }), idIn, pwRow,
    h("label", { class: "chk" }, rem, "이 기기 기억하기"),
    h("p", { class: "muted", text: "내 휴대폰·내 노트북일 때만 · 다음부터 바로 열려요 · 남의 기기·공용 PC면 끄고, 브라우저의 '비밀번호 저장'도 누르지 마세요" }),
    h("button", { class: "btn primary block", type: "submit", id: "loginGo" }, "연결하기"),
    h("div", { id: "loginStatus", class: "stack", "aria-live": "polite" }));
  return h("section", { class: "card stack", id: "loginCard" },
    h("h2", { text: "아이디로 연결" }),
    h("p", { text: "PC 화면을 볼 수 없는 곳에서는 PC 스튜디오에서 정한 아이디로 연결해요 · 비밀번호를 쓰는 PC면 아이디 다음에 물어봐요" }),
    o.resume ? h("p", { class: "warn", id: "loginAgainNote", text: "다시 연결해 주세요 (이번만 연결한 기기예요)" }) : null,
    form,
    h("p", { class: "muted", text: "한글·영문 자판, 대문자·소문자는 가리지 않아요 · 한글 자판이 안 나오면 [보기]를 누르고 쳐 주세요" }),
    h("p", { class: "muted", text: "주소창이 futsal.mulgyeol.kr 인지 확인해 주세요 · 스튜디오는 알림이나 다른 화면에서 비밀번호를 묻지 않아요" }),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn sm ghost", onclick: () => sheet(h("h2", { text: "비밀번호를 잊었어요" }),
        h("p", { text: "비밀번호는 PC에서만 새로 정할 수 있어요 (다른 사람이 못 바꾸게) · PC 스튜디오 → 휴대폰으로 보기 → 아이디·비밀번호로 연결 → [비밀번호 바꾸기] · 옛 비밀번호는 몰라도 돼요 · 이미 연결된 휴대폰은 비밀번호 없이 그대로 써요" })) }, "비밀번호를 잊었어요"),
      h("button", { type: "button", class: "btn sm ghost", onclick: () => sheet(h("h2", { text: "아이디를 잊었어요" }),
        h("p", { text: "아이디는 이미 연결된 휴대폰의 '더보기'나 PC의 '휴대폰으로 보기'에서 볼 수 있어요" })) }, "아이디를 잊었어요")));
}
function loginStatus(o) {
  const box = $("loginStatus");
  if (!box) return;
  if (o.spin) return box.replaceChildren(h("div", { class: "center" }, h("div", { class: "spin" }), h("p", { class: "muted", id: "loginSpin", text: o.spin })));
  const kids = [h("p", { class: o.cls || "warn", id: "loginMsg", text: o.title })];
  for (const l of o.lines || []) if (l) kids.push(h("p", { class: "muted", text: l }));
  if (o.auto) kids.push(h("p", { class: "muted", id: "loginAuto", text: "이 화면을 열어 두면 PC가 켜질 때 저절로 이어서 연결해요 (10분 동안)" }));
  const btns = [];
  if (o.again) btns.push(h("button", { type: "button", class: "btn grow", id: "loginRetry", onclick: loginAgain }, "다시 찾기"));
  if (o.auto) btns.push(h("button", { type: "button", class: "btn grow", id: "loginQuit", onclick: loginStop }, "그만하기"));
  if (btns.length) kids.push(h("div", { class: "row" }, ...btns));
  box.replaceChildren(...kids);
}
function setGo(on) { const b = $("loginGo"); if (b) b.disabled = !on; }
function pwAsked() { const r = $("loginPwRow"); return !!r && !r.hidden; }
function askPw() {  // 찾은 PC 가 비밀번호를 씀 → 비밀번호 칸을 보여 주고 거기로
  const r = $("loginPwRow"), p = $("loginPw");
  if (r) r.hidden = false;
  if (p) p.focus();
}
async function loginSubmit(form) {
  if (LG.busy) return;
  const id = $("loginId").value, remember = $("loginRemember").checked, pw = (pwAsked() && $("loginPw").value) || null;  // 빈 칸 = 비밀번호 없음
  if (P.idProblem(id)) return loginStatus({ title: "아이디를 다시 확인해 주세요" });
  if (pw != null && P.pwProblem(pw)) return loginStatus({ title: "비밀번호를 다시 확인해 주세요" });
  wipeLoginSecret();
  LG.job = { id, pw, remember, started: Date.now(), form, retried: false };
  await loginAttempt(false);
}
function loginAgain() {
  if (LG.job) { clearTimeout(LG.retryT); return loginAttempt(false); }
  const f = $("loginForm"); if (f) loginSubmit(f);
}
function loginStop() {
  wipeLoginSecret();
  const p = $("loginPw"); if (p) p.value = "";
  const a = $("loginAuto"), q = $("loginQuit");
  if (a) a.remove();
  if (q) q.remove();
}
async function loginAttempt(auto) {
  const job = LG.job;
  if (!job) return;
  if (!job.pw && pwAsked()) { const v = $("loginPw").value; if (v && !P.pwProblem(v)) job.pw = v; }  // 기다리는 동안 친 비밀번호도 저절로 이어서 씀
  LG.busy = true; setGo(false);
  if (!auto) loginStatus({ spin: "PC를 찾는 중이에요…" });
  let out;
  try { out = await loginFlow(job, auto); } catch (e) { out = { kind: "net" }; }
  LG.busy = false; setGo(true);
  if (LG.job !== job) return;  // [그만하기] 를 누름
  if (out.kind === "ok") return loginDone(job, out);
  if ((out.kind === "again" || out.kind === "net") && !job.retried) { job.retried = true; return loginAttempt(auto); }  // 한 번만 저절로 다시
  if (out.kind === "bad" && job.pw) {  // 같은 비밀번호(맞춘 꼴)가 두 번 틀림 → 안내 하나 더 (값은 해시로만 기억)
    const hh = await P.sha256hex(new TextEncoder().encode(P.canonPw(job.pw)));
    out.same = LG.badSeen.has(hh);
    LG.badSeen.add(hh);
  }
  loginShow(job, out);
}
function loginTexts(out) {
  const last = out.ts ? `마지막 소식 ${clock(out.ts)} (${ago(out.ts)})` : null;
  const LOGIN_OFF = "이 PC는 지금 아이디·비밀번호 연결을 쓰지 않아요 · PC '휴대폰으로 보기'에서 켜 주세요";
  switch (out.kind) {
    case "not_found": return { title: "이 아이디로 켜진 PC를 찾지 못했어요", again: true,
      lines: ["아이디가 맞는지 확인해 주세요 (한글·영문 자판은 상관없어요)", "PC가 12시간 넘게 꺼져 있었다면 PC를 켜고 다시 해 주세요",
        "PC 스튜디오에서 '아이디·비밀번호로 연결'이 켜져 있고 최신 버전인지 확인해 주세요"] };
    case "off": {
      if (out.reason === "login_off") return { title: LOGIN_OFF, lines: [last], again: true };
      const T = { app: ["PC 스튜디오가 꺼져 있어요", "PC에서 스튜디오를 켜면 원격 접속도 저절로 켜져요"],
        idle: ["오래 쓰지 않아서 원격 접속이 꺼졌어요", "PC에서 다시 켜야 해요 · 밖에서 자주 쓰면 PC '자동으로 끄기'를 '안 함'으로 바꿔 두세요"],
        error: ["PC의 원격 연결이 잠깐 끊겼어요 · PC가 몇 분 안에 다시 켜 봐요", null] }[out.reason]
        || ["PC에서 원격 접속을 껐어요", "PC '휴대폰으로 보기' → [원격 접속 켜기]"];
      return { title: T[0], lines: [last, T[1]], again: true, auto: true };
    }
    case "asleep": return { title: `PC가 잠들었거나 인터넷이 끊긴 것 같아요${out.ts ? ` (마지막 소식 ${clock(out.ts)})` : ""}`, again: true, auto: true,
      lines: ["PC를 깨우거나 집에 있는 분께 PC를 켜 달라고 부탁해 주세요 · PC '휴대폰으로 보기' → 'PC 잠들지 않게: 켜 둔 동안 항상'이면 잠들지 않아요"] };
    case "ntfy": return { title: "PC를 찾는 서버(ntfy.sh)에 닿지 않아요 · 회사·학교 인터넷이 막았을 수 있어요 · 휴대폰 데이터로 해 보세요", again: true };
    case "old_pc": return { title: "PC 스튜디오를 업데이트해 주세요" };
    case "bad":
      if (out.until) return { title: `비밀번호를 여러 번 틀려서 ${untilText(out.until)}까지 잠겼어요` };
      return { title: `비밀번호가 맞지 않아요 · 남은 기회 ${out.left}번`, lines: [out.left <= 2 ? "다 틀리면 잠시 막혀요" : null,
        out.same ? "맞게 쳤는데도 계속 틀린다고 나오면 PC에서 비밀번호를 확인하거나 아이디를 바꿔 주세요" : null] };
    case "locked": return out.scope === "all"
      ? { title: `틀린 시도가 너무 많아 ${untilText(out.until)}까지 아이디 연결을 막았어요 · 이미 연결된 휴대폰의 '더보기'에서 풀 수 있어요` }
      : { title: `비밀번호를 여러 번 틀려서 ${untilText(out.until)}까지 잠겼어요` };
    case "suspended": return out.why === "kick"
      ? { title: "알림에서 [끊기]를 눌러 아이디 연결이 잠겨 있어요 · PC에서 새 비밀번호를 정하면 다시 돼요" }
      : { title: "비밀번호가 너무 많이 틀려서 아이디 연결이 잠겼어요 · 이미 연결된 휴대폰의 '더보기'나 PC에서 다시 켤 수 있어요" };
    case "login_off": return { title: LOGIN_OFF };
    case "busy": return { title: "지금 연결하려는 기기가 많아요 · 잠시 뒤 다시 해 주세요" };
    case "m2_fail": return { title: "PC의 대답이 맞지 않아요 · 가짜 주소가 섞여 있을 수 있어요 · 잠시 뒤 다시 해 주세요" };
    case "need_pw": return { title: "이 PC는 비밀번호도 필요해요 · 비밀번호를 넣고 [연결하기]를 눌러 주세요", cls: "muted" };
    default: return { title: "다시 해 주세요", again: true };
  }
}
function loginShow(job, out) {
  const t = loginTexts(out);
  if (out.collision) (t.lines = t.lines || []).push("같은 아이디를 쓰는 PC가 여럿 있어요 · PC에서 아이디를 바꿔 주세요");
  const auto = !!t.auto && Date.now() - job.started < LOGIN_RETRY_FOR;
  if (auto) { clearTimeout(LG.retryT); LG.retryT = setTimeout(() => loginAttempt(true), LOGIN_RETRY_MS); }
  else {
    wipeLoginSecret();
    if (t.auto) { const p = $("loginPw"); if (p) p.value = ""; }  // 10분이 지남 → 비밀번호도 지움
  }
  if (out.kind === "need_pw" || (out.needPw && (out.kind === "off" || out.kind === "asleep"))) askPw();
  if (out.kind === "bad" || out.kind === "locked") { const p = $("loginPw"); if (p) p.value = ""; askPw(); }
  loginStatus(Object.assign(t, { auto }));
}
/** 아이디 연결용 ping: 대답 · 429(요청 수 제한) · null(닿지 않음) */
async function pingLogin(base) {
  const t = withTimeout(6000);
  try {
    const r = await fetch(base + "/r/ping", { ...NET, signal: t.signal });
    if (r.status === 429) return 429;
    const j = r.ok ? await r.json() : null;
    return j && j.api === P.API && j.pc && /^[0-9a-f]{16}$/.test(j.pc.id) ? j : null;
  } catch (e) { return null; } finally { t.done(); }
}
async function lookupRecords(d) {
  const t = withTimeout(8000);
  try {
    const r = await fetch(`${PAIR_NTFY}/${d.topic}/json?poll=1&since=all`, { ...NET, signal: t.signal });
    if (!r.ok) throw new Error("ntfy " + r.status);
    const out = [];
    for (const ln of (await r.text()).split("\n")) {
      if (!ln) continue;
      let m;
      try { m = JSON.parse(ln); } catch (e) { continue; }
      if (m.event !== "message") continue;
      const rec = await P.openLookup(d.bkey, d.topic, m.message, DEV);
      if (rec) out.push(rec);
    }
    return out;
  } finally { t.done(); }
}
/** 후보 PC 주소 (3곳까지): PC 마다 가장 새 기록이 먼저 · 그다음 나머지를 새것부터 · 같은 주소는 한 번 · 그 PC 의 마지막 '꺼짐'보다 옛 '켜짐'은 뺌 */
function candidates(recs) {
  // 같은 PC 기록은 (ts, seq) 순 — 같은 초에 올라온 켜짐·꺼짐도 순번으로 가림 (꺼진 뒤의 켜짐 기록만 후보)
  const later = (a, b) => a.ts > b.ts || (a.ts === b.ts && a.seq > b.seq);
  const lastOff = {}, newest = {};
  for (const r of recs) {
    if (r.state === "off" && (!lastOff[r.pc] || later(r, lastOff[r.pc]))) lastOff[r.pc] = r;
    if (!newest[r.pc] || later(r, newest[r.pc])) newest[r.pc] = r;
  }
  const ons = recs.filter(r => r.state === "on" && (!lastOff[r.pc] || later(r, lastOff[r.pc]))).sort((a, b) => b.ts - a.ts || b.seq - a.seq);
  const first = ons.filter(r => newest[r.pc] === r), rest = ons.filter(r => newest[r.pc] !== r);
  const seen = new Set(), out = [];
  for (const r of first.concat(rest)) {
    if (seen.has(r.url) || out.length >= 3) continue;
    seen.add(r.url); out.push(r);
  }
  return out;
}
async function postJson(url, body, ms) {
  const t = withTimeout(ms);
  try {
    const r = await fetch(url, { ...NET, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: t.signal });
    let j = {};
    try { j = await r.json(); } catch (e) { /* 글이 아님 */ }
    return { ok: r.ok, status: r.status, j: j || {} };
  } catch (e) { return null; } finally { t.done(); }
}
function verdict(j, status) {
  if (status === 429 && !(j && j.code)) return { kind: "busy" };  // 요청 수 제한 (잠시 뒤)
  switch (j && j.code) {
    case "bad": return { kind: "bad", left: Number.isInteger(j.left) ? j.left : 0, until: Number.isInteger(j.until) ? j.until : null };
    case "locked": return { kind: "locked", scope: j.scope === "all" ? "all" : "net", until: Number.isInteger(j.until) ? j.until : now() + 900 };
    case "suspended": return { kind: "suspended", why: j.why === "kick" ? "kick" : "fails" };
    case "login_off": return { kind: "login_off" };
    case "busy": return { kind: "busy" };
    case "again": return { kind: "again" };
    case "not_ready": return { kind: "asleep" };
    default: return { kind: "net" };
  }
}
/** 이 후보에 쓸 비밀: 친 비밀번호 → 그것 · 아니면 소유자 아이디 + '아이디만' 표시 → 맞춘 아이디 · 없으면 null (비밀번호를 물어야 함) */
function secretFor(rec, job) {
  if (job.pw) return job.pw;  // 친 비밀번호가 먼저 (PC 에 비밀번호를 정했다면 '아이디만' 기록보다 그것을 씀)
  if (rec.idOnly === true && P.idOnlyOk(job.id)) return P.idSecret(job.id);
  return null;
}
async function loginAt(rec, d, job) {
  const base = rec.url;
  const s = P.srpStart();
  const r1 = await postJson(base + "/r/login/start", { v: 1, grp: P.GROUP, idc: d.idc, A: s.Ab64 }, 15000);
  if (!r1) return { kind: "asleep", ts: rec.ts };
  if (!r1.ok) return verdict(r1.j, r1.status);
  const remember = job.remember, name = deviceName().slice(0, 60), install = remember ? await installId() : "";
  let pr;
  try {
    pr = await P.srpProof(s, r1.j, { canonPw: P.canonPw(secretFor(rec, job)), host: P.hostOf(base), pcId: rec.pc, idc: d.idc, remember, name, install });
  } catch (e) { return { kind: "m2_fail" }; }  // 묶음·횟수·B·확인 번호가 이상한 대답
  const r2 = await postJson(base + "/r/login/finish", { v: 1, login: r1.j.login, M1: P.b64u(pr.M1), remember, name, install }, 15000);
  if (!r2) return { kind: "net" };
  if (!r2.ok) return verdict(r2.j, r2.status);
  if (!await P.verifyM2(pr.K, pr.T, pr.M1, r2.j.sealed, r2.j.M2)) return { kind: "m2_fail" };  // 비밀번호를 아는 진짜 PC 가 아님
  const opened = await P.openLoginSealed(pr.K, pr.T, r2.j.sealed, r1.j.login, rec.pc);
  if (!opened || (!remember && opened.inner.guest !== true)) return { kind: "m2_fail" };  // '이번만'이 '기억하기'로 바뀌어 오면 안 됨
  return { kind: "ok", inner: opened.inner, keys: opened.keys, base, skew: typeof r2.j.time === "number" ? r2.j.time - now() : 0,
    remembered: opened.inner.guest !== true };
}
async function loginFlow(job, auto) {
  const d = await P.deriveLogin(P.canonId(job.id));
  let recs;
  try { recs = await lookupRecords(d); } catch (e) { return { kind: "ntfy" }; }
  if (!recs.length) return { kind: "not_found" };
  const recent = new Set(recs.filter(r => r.ts >= now() - 43200).map(r => r.pc));
  const collision = recent.size > 1;
  const cands = candidates(recs);
  const newest = recs.slice().sort((a, b) => b.ts - a.ts || b.seq - a.seq)[0];
  let best = cands.length ? null : newest.state === "off" ? { kind: "off", reason: newest.reason, ts: newest.ts } : { kind: "not_found" };
  const keep = o => { if (!best || (RANK[o.kind] ?? -1) > (RANK[best.kind] ?? -1)) best = o; };
  // PC 의 대답(틀림·막힘·잠김·꺼짐·바쁨)은 그 후보의 결과일 뿐 → 다음 후보도 해 봄 (같은 아이디를 쓰는 PC 가 둘이면 맞는 PC 까지 · 연결 > 대답 >
  // 나머지 · 대답은 먼저 온 것 · '바쁨'은 다른 대답보다 뒤)
  let said = null;
  const heard = o => { if (!said || (said.kind === "busy" && o.kind !== "busy")) said = o; };
  for (const rec of cands) {
    const pc = await pingLogin(rec.url);
    if (pc === 429) { heard({ kind: "busy" }); continue; }  // 그 PC 가 잠시 막음 (잠든 게 아님)
    if (!pc) { keep({ kind: "asleep", ts: rec.ts }); continue; }
    if (pc.pc.id !== rec.pc || !Array.isArray(pc.features) || !pc.features.includes("login")) { keep({ kind: "old_pc" }); continue; }
    if (!secretFor(rec, job)) { heard({ kind: "need_pw" }); continue; }  // 비밀번호를 쓰는 PC → 칸을 보여 주고 물어봄 (요청은 보내지 않음)
    if (!auto) loginStatus({ spin: "연결하는 중이에요… (몇 초 걸려요)" });
    const r = await loginAt(rec, d, job);
    if (r.kind === "ok") return r;
    if (r.kind === "again" || r.kind === "net") return Object.assign(r, { collision });  // 다시 한 번 처음부터 (loginAttempt)
    if (VERDICT.includes(r.kind)) { heard(r); continue; }
    keep(r);
  }
  // 비밀번호를 쓰는 PC 라는 걸 기록으로 이미 앎(아이디만 표시를 믿을 수 없음) + 비밀번호를 아직 안 침 → 꺼짐·잠듦을 기다리는 동안에도
  // 비밀번호 칸을 보여 줌 (쳐 두면 PC 가 켜질 때 저절로 이어서 연결 · 아이디만 PC 는 아이디로 이어짐)
  const trusted = P.idOnlyOk(job.id) && recs.some(r => r.idOnly === true);
  return Object.assign(said || best || { kind: "not_found" }, { collision, needPw: !trusted && !job.pw });
}
async function loginDone(job, out) {
  if (job.remember && out.remembered && job.pw && window.PasswordCredential && job.form) {  // 크롬: 기억하기일 때만 비밀번호 관리자에 (futsal.mulgyeol.kr 에 묶임)
    try { await navigator.credentials.store(new PasswordCredential(job.form)); } catch (e) { /* 선택 */ }
  }
  wipeLoginSecret();
  const p = $("loginPw"); if (p) p.value = "";
  if (!await adopt(out.inner, out.keys, out.base, out.skew)) return loginStatus({ title: "PC의 대답이 맞지 않아요 · 가짜 주소가 섞여 있을 수 있어요 · 잠시 뒤 다시 해 주세요" });
  S.guestEnded = false; S.loginPrefill = null;
  toast("연결됐어요 ✓ · " + (out.remembered ? "이 기기를 기억했어요 · 다음부터 바로 열려요"
    : job.remember ? "기기가 꽉 차서(5대) 이번만 연결했어요 · PC에서 안 쓰는 기기를 끊어 주세요"
      : "이번만 연결했어요 · 다 쓰면 '더보기 → 이 기기에서 나가기'"));
  S.afterLogin = true; S.studioFirst = true;
  finding();
  await connect();
  schedule();
}

// 더보기: 이번만 기기 · 아이디로 연결한 기기 · QR 기기(아이디 연결 보기·끊기·다시 켜기)
function guestCard() {
  const c = S.cred;
  return h("section", { class: "card alert stack", id: "guestCard" },
    h("p", { text: `이번만 연결한 기기예요 · ${c.exp ? clock(c.exp) : ""}에 저절로 끊겨요` }),
    h("button", { class: "btn block danger", id: "guestOut", onclick: async () => {
      try { await Promise.race([api("POST", "/r/login/logout", {}, 4000), sleep(4500)]); } catch (e) { /* 그래도 이 화면 메모리는 지움 */ }
      S.guestEnded = false;
      forgetLocal();
    } }, "이 기기에서 나가기"));
}
function loginMoreCard() {
  const c = S.cred, L = S.loginInfo;
  if (c.guest) return null;
  if (c.via === "login") {
    return h("section", { class: "card stack", id: "loginMore" }, h("p", { text: `아이디·비밀번호로 연결한 기기예요 · 아이디 ${c.loginShow || ""}` }),
      h("p", { class: "muted", text: "알림·아이디 연결 관리는 QR로 연결한 휴대폰이나 PC에서 해요" }));
  }
  const box = h("section", { class: "card stack", id: "loginMore" });
  if (!L || !L.set || !L.on) { box.append(h("p", { text: "꺼져 있어요 · PC에서 켤 수 있어요" })); return box; }
  // 영문 자판 꼴은 한글(또는 점·-)이 든 아이디만 (영문 아이디가 두 번 나오지 않게)
  box.append(h("p", { text: `아이디·비밀번호로 연결 · 아이디 ${L.show}${String(L.show || "").toLowerCase() === String(L.keys || "") ? "" : ` (영문 자판으로는 ${L.keys})`}` }));
  const why = L.suspended ? (L.suspended.why === "kick" ? "알림에서 [끊기]를 눌렀어요" : "비밀번호가 너무 많이 틀렸어요")
    : L.lock ? `${untilText(L.lock.until)}까지 막혔어요` : null;
  if (why) {
    box.append(h("p", { class: "warn", text: `아이디 연결이 잠겨 있어요 (${why})` }), h("button", { class: "btn block", id: "loginResume", onclick: async () => {
      if (!await ask("비밀번호를 바꾸지 않고 다시 켤까요? 누가 비밀번호를 알고 있다면 다시 들어올 수 있어요", "다시 켜기")) return;
      try { const r = await api("POST", "/r/login/unlock", {}); toast(r.ok ? "다시 켰어요" : (r.j.error || "다시 켜지 못했어요")); } catch (e) { return; }
      await refreshStatus(); render();
    } }, "다시 켜기"));
  }
  const list = h("div", { class: "stack", id: "loginEvents" });
  box.append(h("div", { class: "lbl", text: "최근 아이디로 연결한 기기" }), list);
  (async () => {
    let r;
    try { r = await api("GET", "/r/login/events"); } catch (e) { return; }
    if (!r.ok) return;
    const ev = r.j.events || [];
    if (!ev.length) return list.replaceChildren(h("p", { class: "muted", text: "아직 없어요" }));
    list.replaceChildren(...ev.map(x => h("div", { class: "row" },
      h("span", { class: "grow", text: `${clean(x.vocab)} · ${new Date(x.at * 1000).getMonth() + 1}월 ${new Date(x.at * 1000).getDate()}일 ${clock(x.at)} · ${x.kind === "guest" ? "이번만" : "기억함"}${x.active ? " · 지금 쓰는 중" : ""}` }),
      x.kicked ? h("span", { class: "muted", text: "끊었어요" }) : h("button", { class: "btn sm danger", onclick: async () => {
        if (!await ask("이 기기를 끊을까요? 비밀번호가 새어 나갔을 수 있어서 아이디·비밀번호 연결도 잠가요 · 이 휴대폰은 그대로 써요", "끊기", true)) return;
        try { const k = await api("POST", "/r/login/kick", { ref: x.ref }); toast(k.ok ? "끊었어요" : (k.j.error || "끊지 못했어요")); } catch (e) { return; }
        await refreshStatus(); render();
      } }, "끊기"))));
  })();
  return box;
}

// 알림의 [끊기] 쪽 (#kill=주제.표.시각): 연결·비밀번호 없이 그 표만 ntfy [끊기] 주제로 보냄 → PC 가 그 기기를 끊고 아이디 연결을 잠금
function killPage(k) {
  dot("", "연결 전");
  $("tabs").hidden = true;
  const msg = h("p", { id: "killMsg", class: "warn" });
  const old = now() - k.at > 86400;
  const go = h("button", { class: "btn danger block", id: "killGo", onclick: async () => {
    go.disabled = true; msg.textContent = "";
    const t = withTimeout(10000);
    try {
      const r = await fetch(`${PAIR_NTFY}/${k.control}`, { ...NET, method: "POST", body: "fsk1." + k.token, signal: t.signal });
      if (!r.ok) throw new Error(String(r.status));
      view(h("section", { class: "card stack", id: "killDone" }, h("h2", { text: "끊었어요 ✓ · PC가 켜져 있으면 몇 초 안에 끊겨요 · 꼭 PC에서 비밀번호를 바꿔 주세요" }),
        h("button", { class: "btn block", onclick: afterKill }, "원격 홈으로")));
    } catch (e) {
      msg.textContent = "보내지 못했어요 · 인터넷을 확인하고 다시 눌러 주세요"; go.disabled = false;
    } finally { t.done(); }
  } }, "끊기");
  view(h("section", { class: "card stack", id: "killCard" }, h("h2", { text: "이 연결을 끊을까요?" }),
    h("p", { text: "내가 한 연결이 아니라면 [끊기]를 눌러 주세요 · 그 기기 연결을 바로 끊고 아이디·비밀번호 연결도 잠가요 (PC에서 새 비밀번호를 정하면 다시 열려요)" }),
    old ? h("p", { class: "warn", id: "killOld", text: "하루가 지난 연결은 PC의 '휴대폰으로 보기' → '최근 아이디로 연결한 기기'에서 끊어 주세요" }) : go,
    h("button", { class: "btn block", id: "killMine", onclick: afterKill }, "내가 한 거예요"), msg));
}
async function afterKill() {
  if (!S.cred) return unpaired();
  finding(); await connect(); schedule();
}

// ---------- 시작 ----------
async function start() {
  S.notifyOn = notifyPref();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(BASE + "sw.js", { scope: HOME }).catch(() => { /* 없어도 그대로 씀 */ });
    // 예전 주소(mulgyeol.kr/futsal 시절 /futsal 범위)로 시험하며 남은 서비스 워커는 지움 — 이 출처에는 이 페이지 하나뿐
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => { if (new URL(r.scope).pathname !== HOME) r.unregister(); })).catch(() => {});
  }
  const hp = P.parseHash(location.hash);
  const saved = await load();
  if (saved && saved.v === 2 && saved.auth && saved.beacon && typeof saved.auth === "object" && !saved.guest) {
    S.cred = saved; S.keys = { auth: saved.auth, beacon: saved.beacon };
  } else if (saved) await wipe();
  if (hp.kill) { history.replaceState(null, "", HOME); return killPage(hp.kill); }  // 알림의 [끊기] 쪽 (연결·비밀번호 필요 없음 · D-255)
  if (hp.pair && INAPP) return inAppScreen(hp);  // 앱 안 브라우저: 코드를 쓰지 않고 남겨 둠 (다른 브라우저로 열면 그대로 연결)
  if (location.hash) history.replaceState(null, "", HOME);  // 코드가 주소창·방문 기록에 남지 않게 바로 지움
  S.resume = hp.resume;  // PC 스튜디오 화면에서 연결이 끝나 돌아옴 → 다시 연결되면 그 화면으로 (아래 goOnline)
  if (hp.pair) return pair(hp.pair, hp.u);
  if (!S.cred) return unpaired();
  finding();
  await connect();
  schedule();
}
window.addEventListener("hashchange", () => {
  const hp = P.parseHash(location.hash);
  if (hp.kill) { history.replaceState(null, "", HOME); return killPage(hp.kill); }
  if (!hp.pair) return;
  if (INAPP) return inAppScreen(hp);
  history.replaceState(null, "", HOME); pair(hp.pair, hp.u);
});
start();

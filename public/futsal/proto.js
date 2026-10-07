// 풋살사관학교 스튜디오 원격 — 프로토콜 (PC 앱 remote.py 와 같은 계산 · 브라우저와 node ≥ 20 에서 그대로 돎)
// 열쇠는 늘 가져오기 전용(extractable=false) CryptoKey 로만 다룸 — 원래 바이트는 짝짓기 대답을 푼 순간에만 있고 저장하지 않는다.
// 짝짓기: 코드 글은 PC 로 보내지 않는다 (코드로 만든 증명만) · PC 의 대답(기기 열쇠·주제·주소)은 코드로 만든 열쇠로 잠겨 온다.
export const API = 1;
export const CROCK = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const NTFY = "https://ntfy.sh";
const PAIR_SALT = "futsal-remote/pair/v1";
const PAIR_ITER = 200000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;

export function normCode(s) {
  const c = String(s || "").replace(/[\s-]/g, "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
  return c.length === 10 && [...c].every(ch => CROCK.includes(ch)) ? c : null;
}
export const fmtCode = c => `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;

// 한글 자판(두벌식)으로 친 코드 → 누른 영문 글쇠 (예: "ㅏ3ㅂ" → "k3q") · 한글이 없으면 그대로
const CHO = "rRseEfaqQtTdwWczxvg";
const JUNG = ["k", "o", "i", "O", "j", "p", "u", "P", "h", "hk", "ho", "hl", "y", "n", "nj", "np", "nl", "b", "m", "ml", "l"];
const JONG = ["", "r", "R", "rt", "s", "sw", "sg", "e", "f", "fr", "fa", "fq", "ft", "fx", "fv", "fg", "a", "q", "qt", "t", "T", "d", "w", "c", "z", "x", "v", "g"];
// 따로 쓴 자모 (ㄱ U+3131 … ㅣ U+3163)
const COMPAT = ["r", "R", "rt", "s", "sw", "sg", "e", "E", "f", "fr", "fa", "fq", "ft", "fx", "fv", "fg", "a", "q", "Q", "qt", "t", "T", "d", "w", "W", "c", "z", "x", "v", "g",
  "k", "o", "i", "O", "j", "p", "u", "P", "h", "hk", "ho", "hl", "y", "n", "nj", "np", "nl", "b", "m", "ml", "l"];
export const hasHangul = s => /[ㄱ-ㅣ가-힣]/.test(String(s || ""));
export function fromHangul(s) {
  let out = "";
  for (const ch of String(s || "")) {
    const c = ch.codePointAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const i = c - 0xac00;
      out += CHO[Math.floor(i / 588)] + JUNG[Math.floor((i % 588) / 28)] + JONG[i % 28];
    } else if (c >= 0x3131 && c <= 0x3163) out += COMPAT[c - 0x3131];
    else out += ch;
  }
  return out;
}

export function b64u(bytes) {
  let s = "";
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(s) {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const hex = b => [...b].map(x => x.toString(16).padStart(2, "0")).join("");
export const randomB64u = n => b64u(globalThis.crypto.getRandomValues(new Uint8Array(n)));

export async function sha256hex(bytes) {
  return hex(new Uint8Array(await subtle().digest("SHA-256", bytes || new Uint8Array(0))));
}

/** 코드 → {topic, key, proof} : PBKDF2-SHA256(200,000번) 64바이트 · 주제 = "fsp" + 앞 12바이트 ·
 *  잠금 열쇠 = 16~48 (AES-GCM, 풀기만) · 증명 열쇠 = 48~64 (HMAC, 서명만) */
export async function derivePair(code) {
  const base = await subtle().importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(PAIR_SALT), iterations: PAIR_ITER }, base, 512));
  const topic = "fsp" + hex(bits.slice(0, 12));
  const key = await subtle().importKey("raw", bits.slice(16, 48), { name: "AES-GCM" }, false, ["decrypt"]);
  const proof = await subtle().importKey("raw", bits.slice(48, 64), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  bits.fill(0);
  return { topic, key, proof };
}

/** 코드를 안다는 증명: HMAC(증명 열쇠, "fsp2|nonce|ts") (base64url) — 터널·Cloudflare 는 코드를 못 봄 */
export async function pairProof(proofKey, nonce, ts) {
  return b64u(new Uint8Array(await subtle().sign("HMAC", proofKey, enc.encode(`fsp2|${nonce}|${ts}`))));
}

/** nonce(12) ‖ 암호문 ‖ 태그(16) (base64url) → 바이트 · 틀리면 예외 */
export async function gcmOpen(key, blob, aad) {
  const raw = unb64u(blob);
  if (raw.length < 28) throw new Error("short");
  return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: raw.slice(0, 12), additionalData: enc.encode(aad) }, key, raw.slice(12)));
}

/** /r/pair 대답 → 잠긴 속 {v, url, pc, device, keys, beacon, notify} · 코드를 모르는 곳이 만든 대답이면 null */
export async function openPairResponse(resp, topic, key) {
  try {
    if (!resp || typeof resp.sealed !== "string" || !resp.sealed.startsWith("fsp2.")) return null;
    const pcId = resp.pc && resp.pc.id, devId = resp.device && resp.device.id;
    if (!/^[0-9a-f]{16}$/.test(pcId || "") || !/^[0-9a-f]{16}$/.test(devId || "")) return null;
    const m = JSON.parse(dec.decode(await gcmOpen(key, resp.sealed.slice(5), `fsp2|${topic}|${pcId}|${devId}`)));
    return m && m.v === 2 && m.pc && m.pc.id === pcId && m.device && m.device.id === devId && m.keys ? m : null;
  } catch (e) { return null; }
}

/** 짝짓기 대답의 열쇠 두 개 → 가져오기 전용 CryptoKey (IndexedDB 에 이 객체만 저장) */
export async function importKeys(authB64, beaconB64) {
  const auth = await subtle().importKey("raw", unb64u(authB64), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const beacon = await subtle().importKey("raw", unb64u(beaconB64), { name: "AES-GCM" }, false, ["decrypt"]);
  return { auth, beacon };
}

/** 서명할 글 — host(보내는 PC 주소의 host)가 들어 있어 다른 주소로 보낸 서명은 PC 에서 안 맞음 */
export function canonical(host, method, path, ts, nonce, bodyHash) {
  return `FSR2\n${host}\n${method}\n${path}\n${ts}\n${nonce}\n${bodyHash}`;
}
export function hostOf(url) {
  try { return new URL(String(url)).host.toLowerCase(); } catch (e) { return ""; }
}

/** Authorization 머리글: FSR2 <기기>.<시각>.<nonce>.<서명> (path 는 실제로 보내는 경로+쿼리 그대로) */
export async function authHeader(authKey, deviceId, host, method, path, body, ts, nonce) {
  const b = typeof body === "string" ? enc.encode(body) : (body || new Uint8Array(0));
  ts = String(ts ?? Math.floor(Date.now() / 1000));
  nonce = nonce || randomB64u(16);
  const sig = new Uint8Array(await subtle().sign("HMAC", authKey, enc.encode(canonical(host, method, path, ts, nonce, await sha256hex(b)))));
  return `FSR2 ${deviceId}.${ts}.${nonce}.${b64u(sig)}`;
}

/** /r/status 의 잠긴 주제 → {beacon:{server,topic}, notify:{server,topic}} · 틀리면 null */
export async function openTopics(blob, beaconKey, pcId, deviceId) {
  try {
    const m = JSON.parse(dec.decode(await gcmOpen(beaconKey, String(blob), `fst1|${pcId}|${deviceId}`)));
    return m && m.beacon && m.notify ? m : null;
  } catch (e) { return null; }
}

/** ntfy 비콘 글 → 내 몫 풀기 · 틀리거나 남의 것이면 null */
export async function openBeacon(msg, deviceId, beaconKey) {
  if (typeof msg !== "string" || !msg.startsWith("fsb1.")) return null;
  let outer;
  try { outer = JSON.parse(dec.decode(unb64u(msg.slice(5)))); } catch (e) { return null; }
  if (!outer || outer.v !== 1 || !Array.isArray(outer.items)) return null;
  const it = outer.items.find(x => x && x.d === deviceId);
  if (!it) return null;
  try {
    const inner = JSON.parse(dec.decode(await gcmOpen(beaconKey, it.c, `fsb1|${outer.pc}|${deviceId}|${outer.seq}`)));
    return inner && inner.seq === outer.seq && inner.pc === outer.pc ? inner : null;
  } catch (e) { return null; }
}

/** 짝짓기 만남 글 → {v, url, pc, exp} · 틀리면 null */
export async function openPair(msg, topic, key) {
  if (typeof msg !== "string" || !msg.startsWith("fsp1.")) return null;
  try {
    const m = JSON.parse(dec.decode(await gcmOpen(key, msg.slice(5), "fsp1|" + topic)));
    return m && m.v === 1 ? m : null;
  } catch (e) { return null; }
}

/** PC 주소로 받아도 되는 것만: https://<이름>.trycloudflare.com (개발 때만 http://127.0.0.1:<포트>) → 기준 주소 또는 null */
export const EXTRA_HOSTS = [];  // 나중에 고정 주소(이름 있는 터널)를 쓰면 여기에
export function hostOk(url, dev) {
  let u;
  try { u = new URL(String(url)); } catch (e) { return null; }
  if (u.username || u.password || u.search || u.hash || (u.pathname !== "/" && u.pathname !== "")) return null;
  if (u.protocol === "https:" && !u.port && /^[a-z0-9-]{1,63}\.trycloudflare\.com$/.test(u.hostname)) return `https://${u.hostname}`;
  if (u.protocol === "https:" && !u.port && EXTRA_HOSTS.includes(u.hostname)) return `https://${u.hostname}`;
  if (dev && u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost") && /^\d{2,5}$/.test(u.port)) return `http://${u.hostname}:${u.port}`;
  return null;
}

/** QR 주소의 #pair=코드&u=힌트 */
export function parseHash(hash) {
  const q = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  return { pair: normCode(q.get("pair")), u: q.get("u") || "" };
}
/** 힌트 u → 주소 (빠른 터널 이름 · 개발 때만 127.0.0.1:포트) — 빨리 찾는 길일 뿐, 진짜인지는 잠긴 대답으로 확인 */
export function hintUrl(u, dev) {
  if (/^[a-z0-9-]{1,63}$/.test(u || "")) return hostOk(`https://${u}.trycloudflare.com`, dev);
  if (dev && /^(127\.0\.0\.1|localhost):\d{2,5}$/.test(u || "")) return hostOk(`http://${u}`, dev);
  return null;
}

/** ntfy 서버: 실제로는 ntfy.sh 만 · 개발 때만 짝짓기가 알려 준 곳 */
export function ntfyOk(server, dev) {
  if (server === NTFY) return NTFY;
  if (dev && /^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(server || "")) return server;
  return null;
}
export const topicOk = t => /^[-_A-Za-z0-9]{1,64}$/.test(t || "");

/** 앱 안 브라우저(카카오톡·네이버·인스타그램 …) → 이름 · 아니면 null. 이런 곳은 저장소가 따로라 연결이 남지 않을 수 있음 */
export function inAppBrowser(ua) {
  const u = String(ua || "");
  const list = [[/KAKAOTALK/i, "카카오톡"], [/NAVER\(inapp|NAVER\//, "네이버"], [/DaumApps/i, "다음"], [/Instagram/i, "인스타그램"],
    [/FBAN|FBAV|FB_IAB/, "페이스북"], [/\bLine\//i, "라인"], [/BAND\//, "밴드"], [/everytimeApp/i, "에브리타임"], [/; wv\)/, "앱 안 브라우저"]];
  for (const [re, name] of list) if (re.test(u)) return name;
  return null;
}

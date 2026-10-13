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

/** /r/status 의 잠긴 주제 → {beacon:{server,topic}, notify:{server,topic}|null, login?} · 틀리면 null
 *  (아이디로 연결한 기기는 알림 주제를 받지 않음 → notify:null · D-255) */
export async function openTopics(blob, beaconKey, pcId, deviceId) {
  try {
    const m = JSON.parse(dec.decode(await gcmOpen(beaconKey, String(blob), `fst1|${pcId}|${deviceId}`)));
    return m && m.beacon && (m.notify || m.notify === null) ? m : null;
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

/** PC 스튜디오(밖에서 작업)에서 넘겨준 뒤 갈 곳 — PC 의 rstudio.NEXT_RE · hello.js 와 같은 규칙 (그 PC 주소 안의 / · /editor · /thumb 만) */
export const NEXT_RE = /^\/(editor|thumb)?(\?[A-Za-z0-9%._~&=+\-!'()*]{0,600})?$/;
export const nextOk = p => typeof p === "string" && NEXT_RE.test(p);

/** 주소의 # 뒤: 짝짓기 QR(#pair=코드&u=힌트) · 스튜디오에서 돌아옴(#resume=갈 곳) · 알림의 [끊기] 쪽(#kill=주제.표.시각 · D-255) */
export function parseHash(hash) {
  const q = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const r = q.get("resume");
  return { pair: normCode(q.get("pair")), u: q.get("u") || "", resume: nextOk(r) ? r : null, kill: parseKill(q.get("kill")) };
}
export function parseKill(v) {
  const p = String(v || "").split(".");
  if (p.length !== 3 || !/^fsc[0-9a-f]{24}$/.test(p[0]) || !/^[A-Za-z0-9_-]{24}$/.test(p[1]) || !/^\d{1,12}$/.test(p[2])) return null;
  return { control: p[0], token: p[1], at: Number(p[2]) };
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

// ---------- 아이디·비밀번호로 연결 (PC rlogin.py 와 같은 계산 · D-250~D-253) ----------
// 글자 맞추기(canon v1): NFKC → 한글 음절·첫가끝 자모·호환 자모를 두벌식 글쇠로 · ₩ → \ · A-Z 만 작게
// (한글 자판으로 친 것 = 같은 글쇠를 영문 자판으로 친 것 · 대문자 = 소문자 · normCode·fromHangul 은 그대로)
export function keysOf(s) {
  let out = "";
  for (const ch of String(s == null ? "" : s).normalize("NFKC")) {
    const c = ch.codePointAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const i = c - 0xac00;
      out += CHO[Math.floor(i / 588)] + JUNG[Math.floor((i % 588) / 28)] + JONG[i % 28];
    } else if (c >= 0x1100 && c <= 0x1112) out += CHO[c - 0x1100];
    else if (c >= 0x1161 && c <= 0x1175) out += JUNG[c - 0x1161];
    else if (c >= 0x11a8 && c <= 0x11c2) out += JONG[c - 0x11a7];
    else if (c >= 0x3131 && c <= 0x3163) out += COMPAT[c - 0x3131];
    else if (c === 0x20a9) out += "\\";
    else out += ch;
  }
  return out.replace(/[A-Z]/g, x => x.toLowerCase());
}
export const canonPw = s => keysOf(s).replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, "");
export const canonId = s => keysOf(s).replace(/[\t\n\r .\-_]/g, "");
// 아이디만 (스튜디오 D-290 · 소유자 결정): 소유자 아이디에서만 · 비밀 = 맞춘 아이디 (rlogin.PRESET_ID · id_secret 과 같음)
export const OWNER_ID = "wavely1213";
export const idOnlyOk = s => canonId(s) === OWNER_ID;
export const idSecret = s => canonId(s);
/** 아이디 모양만 (흔한 아이디 목록은 PC 에서) → 'chars'·'short'·'long'·'digits' · 괜찮으면 null */
export function idProblem(s) {
  const c = canonId(s);
  if (!/^[a-z0-9]*$/.test(c)) return "chars";
  if (c.length < 6) return "short";
  if (c.length > 32) return "long";
  if (/^\d+$/.test(c)) return "digits";
  return null;
}
/** 비밀번호 글자·길이만 (규칙은 PC 에서 정할 때) → 'empty'·'chars'·'short'·'long' · 괜찮으면 null */
export function pwProblem(s) {
  const c = canonPw(s);
  if (!c) return "empty";
  if (!/^[\x20-\x7e]+$/.test(c)) return "chars";
  if (c.length < 8) return "short";
  if (c.length > 64) return "long";
  return null;
}

const LOOKUP_SALT = "futsal-remote/login/v1";
const LOOKUP_ITER = 100000;
/** 맞춘 아이디 → {topic, bkey(AES-GCM 풀기만), idc} : PBKDF2-SHA256(100,000번) 64바이트 (PC derive_login 과 같음) */
export async function deriveLogin(cid) {
  const base = await subtle().importKey("raw", enc.encode(cid), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(LOOKUP_SALT), iterations: LOOKUP_ITER }, base, 512));
  const topic = "fsl" + hex(bits.slice(0, 12));
  const bkey = await subtle().importKey("raw", bits.slice(16, 48), { name: "AES-GCM" }, false, ["decrypt"]);
  const idc = b64u(bits.slice(48, 64));
  bits.fill(0);
  return { topic, bkey, idc };
}
/** ntfy 'PC 찾기' 글 → {v, pc, seq, ts, state, reason, url} · 'on' 이면 받아도 되는 PC 주소일 때만 · 틀리면 null */
export async function openLookup(bkey, topic, msg, dev) {
  if (typeof msg !== "string" || !msg.startsWith("fsl1.")) return null;
  try {
    const m = JSON.parse(dec.decode(await gcmOpen(bkey, msg.slice(5), "fsl1|" + topic)));
    if (!m || m.v !== 1 || !/^[0-9a-f]{16}$/.test(m.pc || "") || !Number.isInteger(m.seq) || !Number.isInteger(m.ts) || !["on", "off"].includes(m.state)) return null;
    if (m.state === "on") {
      const u = hostOk(m.url, dev);
      if (!u) return null;
      m.url = u;
    }
    return m;
  } catch (e) { return null; }
}

// SRP-6a (RFC 5054 3072비트 · g=5 · SHA-256) — 묶음은 여기에 박혀 있음 (PC 가 고를 수 없음 · D-251)
export const GROUP = "5054-3072";
const N_HEX = "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437" +
  "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05" +
  "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B" +
  "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33" +
  "A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864" +
  "D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";
export const GROUP_3072 = { N: BigInt("0x" + N_HEX), g: 5n, len: 384 };
export const ITERS_MIN = 100000, ITERS_MAX = 2000000;
const N = GROUP_3072.N, G = GROUP_3072.g, NLEN = GROUP_3072.len;

export function modPow(b, e, m) {
  let r = 1n;
  b %= m;
  if (b < 0n) b += m;
  while (e > 0n) {
    if (e & 1n) r = r * b % m;
    b = b * b % m;
    e >>= 1n;
  }
  return r;
}
export const b2n = bytes => (bytes && bytes.length ? BigInt("0x" + hex(bytes)) : 0n);
export function n2b(n, len) {
  let h = n.toString(16);
  if (h.length % 2) h = "0" + h;
  if (len && h.length > len * 2) throw new Error("too long");
  if (len) h = h.padStart(len * 2, "0");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export const pad = n => n2b(n, NLEN);
function cat(...parts) {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const sha = async (...parts) => new Uint8Array(await subtle().digest("SHA-256", cat(...parts)));
async function hmac(keyBytes, text) {
  const k = await subtle().importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle().sign("HMAC", k, enc.encode(text)));
}
export async function srpK() { return b2n(await sha(pad(N), pad(G))); }
/** x = PBKDF2-SHA256(맞춘 비밀번호, 'fsl-x/v1|' + b64u(salt), iters, 32) — PC rlogin.srp_x 와 같음 (아이디는 넣지 않음) */
export async function srpX(canonPassword, salt, iters) {
  const base = await subtle().importKey("raw", enc.encode(canonPassword), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode("fsl-x/v1|" + b64u(salt)), iterations: iters }, base, 256));
  const x = b2n(bits);
  bits.fill(0);
  return x;
}
/** 시작: 임시 a (32바이트) → {a, A, Ab64} */
export function srpStart(aBytes) {
  const raw = aBytes || globalThis.crypto.getRandomValues(new Uint8Array(32));
  const a = b2n(raw);
  const A = modPow(G, a, N);
  return { a, A, Ab64: b64u(pad(A)) };
}
const LOGIN_RE = /^[A-Za-z0-9_-]{22}$/;
/** PC 의 start 대답 확인 → M1·T·K (묶음·횟수 범위·salt·B·u·확인 번호를 먼저 봄 — 이상하면 예외)
 *  o: {canonPw, host, pcId, idc, remember, name, install} */
export async function srpProof(s, st, o) {
  if (!st || st.grp !== GROUP) throw new Error("group");
  if (!Number.isInteger(st.iters) || st.iters < ITERS_MIN || st.iters > ITERS_MAX) throw new Error("iters");
  if (!LOGIN_RE.test(st.login || "") || !st.pc || st.pc.id !== o.pcId) throw new Error("shape");
  const salt = unb64u(st.salt), Bb = unb64u(st.B);
  if (salt.length !== 16 || Bb.length !== NLEN) throw new Error("shape");
  const B = b2n(Bb);
  if (B % N === 0n) throw new Error("B");
  const u = b2n(await sha(pad(s.A), pad(B)));
  if (u === 0n) throw new Error("u");
  const x = await srpX(o.canonPw, salt, st.iters);
  const k = await srpK();
  const S = modPow((B - k * modPow(G, x, N)) % N + N, s.a + u * x, N);
  const K = await sha(pad(S));
  const T = await sha(enc.encode(["fsl-srp/v1", String(o.host).toLowerCase(), o.pcId, o.idc, st.login, st.grp, String(st.iters), b64u(salt),
    b64u(pad(s.A)), b64u(pad(B))].join("\n")));
  const M1 = await hmac(K, `fsl-m1\n${hex(T)}\n${o.remember ? "1" : "0"}\n${o.name}\n${o.install || ""}`);
  return { M1, T, K };
}
/** PC 의 M2 확인 (봉투 열기 전에) — 비밀번호를 아는 진짜 PC 만 맞출 수 있음 */
export async function verifyM2(K, T, M1, sealed, M2b64) {
  if (typeof sealed !== "string" || typeof M2b64 !== "string") return false;
  const want = await hmac(K, `fsl-m2\n${hex(T)}\n${b64u(M1)}\n${await sha256hex(enc.encode(sealed))}`);
  let got;
  try { got = unb64u(M2b64); } catch (e) { return false; }
  if (got.length !== want.length) return false;
  let d = 0;
  for (let i = 0; i < want.length; i++) d |= want[i] ^ got[i];
  return d === 0;
}
/** 잠긴 대답 'fsl2.' → {inner(열쇠 글은 지움), keys(가져오기 전용 CryptoKey)} · 틀리면 null (HKDF → AES-GCM) */
export async function openLoginSealed(K, T, sealed, login, pcId) {
  try {
    if (typeof sealed !== "string" || !sealed.startsWith("fsl2.")) return null;
    const ikm = await subtle().importKey("raw", K, "HKDF", false, ["deriveBits"]);
    const kb = new Uint8Array(await subtle().deriveBits({ name: "HKDF", hash: "SHA-256", salt: T, info: enc.encode("fsl-seal/v1") }, ikm, 256));
    const ke = await subtle().importKey("raw", kb, { name: "AES-GCM" }, false, ["decrypt"]);
    kb.fill(0);
    const m = JSON.parse(dec.decode(await gcmOpen(ke, sealed.slice(5), `fsl2|${login}|${pcId}`)));
    if (!m || m.v !== 2 || m.via !== "login" || !m.pc || m.pc.id !== pcId || !m.device || !/^[0-9a-f]{16}$/.test(m.device.id || "") || !m.keys) return null;
    const keys = await importKeys(m.keys.auth, m.keys.beacon);
    m.keys = null;
    return { inner: m, keys };
  } catch (e) { return null; }
}

/* 호스트 연결 (앱) — 코어가 바깥 세계에 닿는 9개 지점을 RN 구현에 꽂는다.
   웹 쪽 짝은 game/src/web/host.web.js 다. 둘을 나란히 놓고 보면 무엇이 타깃별인지 바로 보인다. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccessibilityInfo, Platform } from "react-native";

import { setHost, setColors, loadSave, persist, S } from "../../src/core/index";
import { Snd } from "./sound";
import { themeFor } from "./theme";

/* AsyncStorage 는 비동기인데 코어의 저장은 동기다.
   메모리를 진짜 저장소로 두고, 디스크에는 뒤따라 쓴다 — 게임 루프가 I/O 를 기다리지 않게. */
const mem = new Map();
let flush = null;

export const storage = {
  get: k => (mem.has(k) ? mem.get(k) : null),
  set: (k, v) => {
    mem.set(k, v);
    if (flush) clearTimeout(flush);
    flush = setTimeout(() => { flush = null; AsyncStorage.setItem(k, v).catch(() => {}); }, 300);
  },
};

/* 앱이 뒤로 갈 때 쓰다 만 저장을 밀어 넣는다 */
export async function flushStorage() {
  if (flush) { clearTimeout(flush); flush = null; }
  await Promise.all([...mem].map(([k, v]) => AsyncStorage.setItem(k, v).catch(() => {})));
}

/* 코어를 켠다. 저장 데이터가 디스크에서 올라와야 하므로 비동기다. */
export async function bootCore({ scheme, notify, tip, hudChanged, runEnded, stageCleared }) {
  for (const k of ["wavelength.save.v1"]) {
    try { const v = await AsyncStorage.getItem(k); if (v != null) mem.set(k, v); } catch {}
  }

  let reduced = false;
  try { reduced = await AccessibilityInfo.isReduceMotionEnabled(); } catch {}

  setColors(themeFor(scheme));
  setHost({
    storage,
    sound: Snd,
    notify, tip, hudChanged, runEnded, stageCleared,
    reduced,
    fontFamily: Platform.select({ ios: "Helvetica Neue", android: "sans-serif", default: "sans-serif" }),
  });
  loadSave();
  Snd.on = S.sound !== false;
  return S;
}

export function applyTheme(scheme) { setColors(themeFor(scheme)); }

export function setSound(on) { S.sound = on; Snd.on = on; persist(); }

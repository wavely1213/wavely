import { S, persist } from "./save.js";
import { EQUIP, MAXLV, upCost } from "./data.js";

/* ═══════════════════════════════════════════════
   격납고 — 해금·구매·장착 규칙
   ═══════════════════════════════════════════════ */
/* 규칙이 화면마다 따로 적혀 있으면 앱과 웹의 가격이 언젠가 어긋난다.
   판정은 전부 여기서 하고, 화면은 결과만 보여준다. */

export const owned = id => S.owned.includes(id);
export const locked = item => !!(item.need && S.cleared < item.need);

/* 항목의 현재 상태 — 버튼 문구를 여기서 갈라 준다 */
export function statusOf(item, equippedId) {
  if (item.id === equippedId) return "equipped";
  if (owned(item.id)) return "owned";
  if (locked(item)) return "locked";
  return S.coins >= item.cost ? "buyable" : "poor";
}

/* 사고 바로 장착한다 — 사 놓고 안 끼우는 단계는 군더더기다.
   @returns "equipped" | "bought" | "locked" | "poor" */
export function acquire(item, slot) {
  if (owned(item.id)) { S[slot] = item.id; persist(); return "equipped"; }
  if (locked(item)) return "locked";
  if (S.coins < item.cost) return "poor";
  S.coins -= item.cost;
  S.owned.push(item.id);
  S[slot] = item.id;
  persist();
  return "bought";
}

/* 장비 강화. @returns "ok" | "max" | "poor" */
export function upgrade(slotId) {
  const lv = S.eq[slotId];
  if (lv >= MAXLV) return "max";
  const cost = upCost(lv);          /* 현재 레벨을 넣는다 — 웹 격납고와 같은 식 */
  if (S.coins < cost) return "poor";
  S.coins -= cost;
  S.eq[slotId]++;
  persist();
  return "ok";
}

/* 다음 레벨 비용 — 만렙이면 null */
export const nextCost = slotId => (S.eq[slotId] >= MAXLV ? null : upCost(S.eq[slotId]));

/* 장비 3슬롯의 현재 상태를 한 번에 (화면이 표를 그대로 그릴 수 있게) */
export const equipRows = () => EQUIP.map(it => ({
  ...it,
  lv: S.eq[it.id],
  max: S.eq[it.id] >= MAXLV,
  cost: nextCost(it.id),
}));

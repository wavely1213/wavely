import assert from "node:assert/strict";
import { test } from "node:test";
import { CAPTAIN_LABEL, parseCaptain } from "../src/lib/captain.ts";
import { toPlayer } from "../src/lib/data/rows.ts";

// 주장단 표식 (D-093)

test("폼 값: 빈 값 = 없음, C / VC, 그 밖은 오류(undefined)", () => {
  assert.equal(parseCaptain(""), null);
  assert.equal(parseCaptain(undefined), null);
  assert.equal(parseCaptain(" C "), "C");
  assert.equal(parseCaptain("VC"), "VC");
  assert.equal(parseCaptain("c"), undefined);
  assert.equal(parseCaptain("주장"), undefined);
  assert.deepEqual(CAPTAIN_LABEL, { C: "주장", VC: "부주장" });
});

test("toPlayer: captain 열이 없던 DB(마이그레이션 전)는 null", () => {
  const base = { id: "u", slug: "no-7", number: 7, name: "최진규", position: "ALA" as const, photo_url: null, birth: null, height_cm: null, apps: 0, goals: 0, assists: 0, is_active: true };
  assert.equal(toPlayer(base).captain, null);
  assert.equal(toPlayer({ ...base, captain: "C" }).captain, "C");
});

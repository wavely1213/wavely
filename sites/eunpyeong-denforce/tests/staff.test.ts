// 스태프 분류 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { isCoachingRole, splitStaff } from "../src/lib/staff.ts";

test("isCoachingRole: 감독·코치가 들어간 직책만 코칭스태프", () => {
  for (const r of ["감독", "수석코치", "코치", "코치·선수관리담당자", "골키퍼 코치"]) assert.equal(isCoachingRole(r), true, r);
  for (const r of ["단장", "부단장", "사무국장·팀매니저", "미디어"]) assert.equal(isCoachingRole(r), false, r);
});

test("splitStaff: 순서 유지", () => {
  const s = (id: string, role: string) => ({ id, role, name: id, photo: null });
  const { coaching, front } = splitStaff([s("a", "감독"), s("b", "단장"), s("c", "코치"), s("d", "미디어")]);
  assert.deepEqual(coaching.map((x) => x.id), ["a", "c"]);
  assert.deepEqual(front.map((x) => x.id), ["b", "d"]);
});

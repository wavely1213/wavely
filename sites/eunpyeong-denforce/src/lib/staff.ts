import type { Staff } from "@/types";

/** 직책에 '감독'·'코치'가 들어가면 코칭스태프, 그 밖(단장·사무국장·미디어 등)은 프런트 */
export function isCoachingRole(role: string) {
  return /감독|코치/.test(role);
}

/** 정렬 순서를 유지한 채 코칭스태프와 프런트로 나눈다 */
export function splitStaff(staff: Staff[]) {
  return {
    coaching: staff.filter((s) => isCoachingRole(s.role)),
    front: staff.filter((s) => !isCoachingRole(s.role)),
  };
}

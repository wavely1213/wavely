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

/** 직책이 정확히 role 인 첫 사람 이름 (푸터 '단장' 등). 없거나 이름이 비면 null */
export function staffNameByRole(staff: Staff[], role: string) {
  const name = staff.find((s) => s.role.trim() === role)?.name.trim();
  return name || null;
}

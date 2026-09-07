/* 입력 상태 — 게임 상태의 일부이므로 코어에 둔다.
   이벤트를 어떻게 받는지(포인터·키보드·터치·게임패드)는 타깃의 몫이고,
   타깃은 여기 있는 두 값을 채우기만 하면 된다. */

import { W, H } from "./util.js";

/* 조준점 — 필드 좌표(0..W, 0..H). active가 false면 기체는 키 입력을 따른다. */
export const P = { active: false, tx: W / 2, ty: H - 120 };

/* 눌린 키 — 전부 소문자 (`e.key.toLowerCase()`) */
export const keys = new Set();

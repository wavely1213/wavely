// AI 모듈이 상태(state.js)를 직접 import하지 않고 현재 취향을 읽게 하는 연결점.
import { promptBlock } from './taste.js';

let getTaste = () => null;

export function setTasteGetter(fn) { getTaste = fn; }
export function currentTaste() { return getTaste(); }

// kind: lyrics | hook | arrange | melody | style
export function tasteBlock(kind) {
  return promptBlock(getTaste(), kind);
}

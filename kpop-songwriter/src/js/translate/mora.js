// 부를 단위 세기: 한국어는 음절, 일본어는 모라(가나 한 글자 = 한 음, 작은 ゃゅょ는 앞 글자에 붙음), 영어는 음절.
// 번안 가사가 같은 멜로디에 들어가는지(음표 수가 비슷한지) 보는 데 쓴다.
import { countSyllables } from '../lyrictools.js';

const SMALL = new Set('ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ');
const KANA = /[ぁ-ゖァ-ヺー]/; // 히라가나·가타카나·장음(ー). っ·ん 포함

// 가나 읽기의 모라 수 (괄호 안 애드립 제외). 남은 영어 단어는 음절로 센다.
export function countMora(kana) {
  const main = String(kana ?? '').replace(/[(（][^)）]*[)）]/g, ' ');
  let n = 0;
  for (const ch of main) if (KANA.test(ch) && !SMALL.has(ch)) n += 1;
  return n + countSyllables(main);
}

// lang: 'ja'면 kana(읽기)로 모라, 그 밖은 음절
export function singCount(line, lang, kana = '') {
  return lang === 'ja' ? countMora(kana || line) : countSyllables(line);
}

// 원문과 번안의 차이가 이 이상이면 멜로디에 안 맞을 수 있다고 표시
export const FIT_TOLERANCE = 2;

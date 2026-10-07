// Claude 호출 (sample capability: 보는 사람의 Claude 사용량을 씀). API 키 없음.
import { sectionLabels } from './structure.js';
import { GROUP_TYPES } from './constants.js';
import { tasteBlock } from './learn/context.js';

let samplePromise;
export function getSample() {
  if (!samplePromise) {
    samplePromise = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
  }
  return samplePromise;
}

const ERROR_COPY = {
  not_granted: 'Claude 사용이 허용되지 않았어요. 아티팩트 메뉴의 권한에서 허용할 수 있어요.',
  sampling_disabled: '이 계정에서는 Claude 호출을 쓸 수 없어요.',
  rate_limited: '요청이 많거나 사용량 한도에 닿았어요. 잠시 후 다시 눌러 주세요.',
  session_expired: 'claude.ai에 다시 로그인해 주세요.',
  refused: 'Claude가 이 요청을 거절했어요. 요청 문구를 바꿔 보세요.',
  invalid_json: '답이 형식에 맞지 않았어요. 다시 눌러 주세요.',
  prompt_too_large: '가사가 너무 길어요. 섹션 단위로 요청해 주세요.',
  empty_completion: '빈 답이 왔어요. 요청을 조금 바꿔 보세요.',
  nothing_empty: '빈 섹션이 없어요. 섹션별 "AI로 다시 쓰기"를 쓰세요.',
};
export function errorCopy(e) {
  if (!e || e.code === 'cancelled') return '';
  return ERROR_COPY[e.code] || '연결이 끊겼어요. 다시 눌러 주세요.';
}

export function songBrief(song) {
  const labels = sectionLabels(song.sections);
  const memberName = (id) => song.members.find((m) => m.id === id);
  const c = song.concept;
  return {
    제목: song.title,
    그룹: GROUP_TYPES[c.group] || c.group,
    주제: c.theme,
    스토리: c.story,
    분위기: c.moods.join(', '),
    키워드: c.keywords,
    한국어비율: `${c.koRatio}%`,
    멤버: song.members.map((m) => `${m.name}(${m.position}, ${m.tone})`),
    구조: song.sections.map((s, i) => ({
      id: s.id,
      섹션: labels[i],
      담당: s.members.map((id) => memberName(id)?.name).filter(Boolean).join(', ') || '없음',
      현재가사: s.text.trim() || '(비어 있음)',
    })),
  };
}

export const LYRIC_RULES = `규칙:
- 한국어 중심 K-pop 가사. 영어는 전체의 약 {EN}%로, 훅·코러스·포인트 문장에 모아 쓴다.
- 코러스는 바로 따라 부를 수 있는 반복 훅을 넣는다. 같은 Chorus는 같은 가사를 쓰고, Final Chorus만 변주한다.
- 한 줄은 대략 6~12음절. 줄 끝 모음을 맞춰 라임을 만든다. 랩 섹션은 라임을 더 촘촘하게.
- 담당 멤버의 포지션과 보컬 톤에 어울리게 쓴다.
- Intro·Dance Break·Outro는 짧은 애드립 한두 줄이거나 비워 둔다. 애드립은 (괄호)로 쓴다.
- 기존 발매곡 가사를 인용하거나 흉내 내지 않는다. 실존 아티스트 이름을 쓰지 않는다.`;

// targetIds가 없으면 전체 섹션을 쓴다.
export async function writeLyrics(song, { targetIds, request, signal, onProgress }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const brief = songBrief(song);
  const ids = targetIds?.length ? targetIds : song.sections.map((s) => s.id);
  const prompt = [
    '너는 K-pop 전문 작사가다. 아래 곡 정보를 보고 지정된 섹션의 가사를 쓴다.',
    LYRIC_RULES.replace('{EN}', String(100 - song.concept.koRatio)),
    tasteBlock('lyrics'),
    request ? `작곡가의 추가 요청: ${request}` : '',
    `곡 정보(JSON):\n${JSON.stringify(brief, null, 1)}`,
    `가사를 쓸 섹션 id: ${JSON.stringify(ids)}`,
    '다른 섹션의 현재 가사는 흐름을 맞추는 참고로만 쓴다.',
    '출력은 JSON 하나만: {"sections":[{"id":"섹션 id","lines":["한 줄","한 줄"]}]}',
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, {
    signal,
    cache: false,
    onText: onProgress ? ({ text }) => onProgress(text.length) : undefined,
  });
  const out = Array.isArray(res?.sections) ? res.sections : [];
  return out
    .filter((s) => ids.includes(String(s.id)) && Array.isArray(s.lines))
    .map((s) => ({ id: String(s.id), text: s.lines.map(String).join('\n') }));
}

export async function suggestStyle(song, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const prompt = [
    '너는 K-pop 프로듀서다. 아래 곡 컨셉에 맞는 Suno 스타일 프롬프트 재료를 영어로 제안한다.',
    '실존 아티스트·곡 이름은 쓰지 않는다 (Suno가 거부함). 각 값은 짧은 영어 구문.',
    tasteBlock('style'),
    `곡 정보(JSON):\n${JSON.stringify(songBrief(song), null, 1)}`,
    '출력은 JSON 하나만: {"genre":"","subgenre":"","bpm":120,"key":"","vocals":"","instruments":"","production":"","extra":"","exclude":"","why":"한국어로 한두 문장"}',
  ].filter(Boolean).join('\n\n');
  return sample.json(prompt, { signal, cache: false });
}

export async function suggestHooks(song, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const prompt = [
    '너는 K-pop 탑라이너다. 아래 곡에 쓸 영어 훅 후보 6개를 제안한다.',
    '조건: 2~6단어, 발음이 쉽고 반복하기 좋을 것, 컨셉·키워드와 연결될 것, 기존 히트곡 훅과 겹치지 않을 것.',
    tasteBlock('hook'),
    `곡 정보(JSON):\n${JSON.stringify(songBrief(song), null, 1)}`,
    '출력은 JSON 배열 하나만: [{"hook":"영어 훅","meaning":"한국어 뜻","use":"어디에 어떻게 쓰면 좋은지 한 문장"}]',
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  return Array.isArray(res) ? res.filter((r) => r && r.hook) : [];
}

export async function reviewLyrics(song, { signal, onText }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const prompt = [
    '너는 K-pop A&R 디렉터다. 아래 가사를 검토하고 한국어로 짧게 피드백한다.',
    '항목: 1) 훅의 중독성 2) 파트 분배 균형 3) 라임·음절 흐름이 어색한 줄(줄을 인용) 4) 컨셉과 맞지 않는 표현 5) 바로 고칠 수 있는 제안 3개.',
    '각 항목 2~3줄, 마크다운 없이 번호와 줄바꿈만.',
    tasteBlock('lyrics'),
    `곡 정보(JSON):\n${JSON.stringify(songBrief(song), null, 1)}`,
  ].filter(Boolean).join('\n\n');
  return sample(prompt, { signal, cache: false, onText });
}

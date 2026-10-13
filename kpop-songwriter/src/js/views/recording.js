// 내보내기 탭 '직접 녹음해서 발매하기': Suno로 MR·가이드 보컬까지 만들고 그 MR에 직접 녹음한다. 결정: D-027.
// 커버·번안 곡은 Suno MR을 쓰지 않고 사람 편곡자·DAW로 MR을 만든다 (D-026)
import { h, toast } from '../dom.js';
import { mutate } from '../state.js';
import { keyName } from '../music/theory.js';
import { VOICE_RANGES, midiName } from '../music/range.js';
import { recordingOf, singerOf, sungMembers, fitKey, applyKey, spanText, fitHint, isCurrentKey, addSelfMember, DEFAULT_SELF_VOICE } from '../recording/model.js';
import { help } from '../help.js';

// 누른 버튼이 다시 그린 화면에서 사라지므로 이어지는 칸으로 초점을 옮긴다
const focusOn = (id) => document.getElementById(id)?.focus({ preventScroll: true });

function steps(song) {
  if (song.remake) {
    return h('ol', null,
      h('li', null, '키를 내 음역에 맞춰요.'),
      h('li', null, 'MR은 사람 편곡자나 DAW(제작 패키지의 song.mid)로 만들어요. 남의 곡이라 Suno로 만든 MR·가이드 보컬은 발매에 쓰지 않아요.'),
      h('li', null, 'DAW에 MR을 올리고 제작 패키지의 recording_sheet.txt(가사·마디표)를 보며 내 목소리로 여러 번 녹음해요. 데모 WAV의 가이드 멜로디로 연습해도 돼요.'),
      h('li', null, '내 보컬과 MR을 믹스해 WAV(24비트, 44.1kHz 이상)로 내보내요.'),
      h('li', null, '그 WAV를 마스터링 탭에 넣어 발매용으로 맞추고, "가사 맞춰 듣기"로 부른 가사를 확인해요.'),
      h('li', null, '앨범 정보·크레딧 탭의 AI 사용 표기에서 쓰지 않은 항목은 꺼요.'));
  }
  return h('ol', null,
    h('li', null, '키를 내 음역에 맞춘 뒤 위 가사·스타일로 Suno에서 곡을 만들어요. Advanced Options의 Vocal Gender를 Male로 두고, 가이드 보컬 묘사는 내 목소리에 맞춰요(스타일 탭 보컬 칸).'),
    h('li', null, ['마음에 드는 결과에서 스템(보컬·반주)을 받거나, 같은 곡을 Instrumental로 만들어 MR을 받아요 ', help('stems'), '. 상업 발매용은 유료 요금제로 만든 것만 쓸 수 있으니 약관을 확인해요.']),
    h('li', null, 'DAW에 MR과 가이드 보컬(스템)을 올리고, 가이드를 들으며 내 목소리로 여러 번 녹음해요. 제작 패키지의 recording_sheet.txt(가사·마디표)를 보면서 불러요.'),
    h('li', null, '가이드 보컬은 빼고 내 보컬과 MR만 믹스해 WAV(24비트, 44.1kHz 이상)로 내보내요.'),
    h('li', null, '그 WAV를 마스터링 탭에 넣어 발매용으로 맞추고, "가사 맞춰 듣기"로 부른 가사를 확인해요.'),
    h('li', null, '앨범 정보·크레딧 탭의 AI 사용 표기에서 "보컬(Suno 등)"을 끄고, MR을 Suno로 만들었으면 "작곡·편곡"은 켜 둬요.'));
}

function keyLine(song, k) {
  if (!k) return h('p', { class: 'muted', id: 'keyfit', tabindex: '-1' }, '멜로디 탭에서 가이드 멜로디를 만들면 내 음역에 맞는 키를 알려 줘요.');
  const now = keyName(song.music.root, song.music.mode);
  if (k.fits) return h('p', { class: 'good-text', id: 'keyfit', tabindex: '-1' }, `가이드 멜로디(${spanText(k.span)})가 내 음역(${spanText(k.range)}) 안이에요. 지금 키 ${now} 그대로 불러요.`);
  const head = `가이드 멜로디(${spanText(k.span)})가 내 음역(${spanText(k.range)})을 벗어나요. `;
  // 지금 키가 가장 덜 넘치면 옮길 것이 없다 (버튼을 두지 않음)
  if (isCurrentKey(k.best)) return h('p', { class: 'warn', id: 'keyfit', tabindex: '-1' }, `${head}지금 키 ${now}가 가장 덜 넘쳐요 — ${fitHint(k)}.`);
  const to = keyName(k.best.root, song.music.mode);
  return h('div', { class: 'stack-tight' },
    h('p', { class: 'warn', id: 'keyfit', tabindex: '-1' }, `${head}${to}${k.best.octave ? ` · 멜로디 ${k.best.octave > 0 ? '한 옥타브 위' : '한 옥타브 아래'}` : ''}로 옮기면 ${spanText(k.best.span)}${k.best.fits ? '로 맞아요.' : `로 가장 덜 넘쳐요 — ${fitHint(k)}.`}`),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn small primary', id: 'keyfit-apply', onclick: () => {
      mutate((x) => { applyKey(x, k.best); });
      toast(`키를 ${to}로 옮겼어요. 코드와 멜로디가 같이 옮겨졌어요`);
      focusOn('keyfit');
    } }, `키 옮기기 (${k.best.shift > 0 ? '+' : ''}${k.best.shift}반음)`)));
}

export function renderRecording(song) {
  const r = recordingOf(song);
  const toggle = h('label', { class: 'check' },
    h('input', { type: 'checkbox', id: 'self-record', checked: !!r, onchange: (e) => mutate((s) => {
      s.recording = e.target.checked ? { self: true, singerId: s.recording?.singerId || '', voice: s.recording?.voice || DEFAULT_SELF_VOICE } : { ...(s.recording || {}), self: false };
    }) }),
    song.remake ? '이 곡은 내가 직접 불러서 발매해요' : '이 곡은 내가 직접 불러서 발매해요 (Suno는 MR·가이드 보컬까지)');
  if (!r) {
    return h('section', { class: 'card', id: 'self-record-card' },
      h('h2', null, '직접 녹음해서 발매하기'),
      toggle,
      h('p', { class: 'muted small' }, '켜면 부를 사람 음역에 맞는 키, 녹음 순서, 녹음용 가사·마디표(제작 패키지)를 보여 줘요.'));
  }
  const s = singerOf(song);
  const sung = sungMembers(song);
  const singerRow = sung.length
    ? h('div', { class: 'row' },
      h('select', { id: 'self-singer', 'aria-label': '직접 부를 멤버', onchange: (e) => mutate((x) => { x.recording.singerId = e.target.value; }) },
        sung.map((m) => h('option', { value: m.id, selected: s.member?.id === m.id }, m.name || '이름 없음'))),
      h('span', { class: 'muted small' }, `음역 ${s.range?.name || '-'}${s.range?.low != null ? ` (${spanText(s.range)})` : ''} — 컨셉 탭 멤버 칸에서 바꿔요`))
    : h('div', { class: 'stack-tight' },
      h('div', { class: 'row' },
        h('select', { id: 'self-voice', 'aria-label': '부를 사람 음역', onchange: (e) => mutate((x) => { x.recording.voice = e.target.value; }) },
          Object.entries(VOICE_RANGES).filter(([, v]) => v.low != null).map(([key, v]) => h('option', { value: key, selected: s.voice === key }, `${v.name} ${midiName(v.low)}~${midiName(v.high)}`))),
        h('button', { type: 'button', class: 'btn small', id: 'self-add-member', onclick: () => {
          const female = (r.voice || DEFAULT_SELF_VOICE).startsWith('f-');
          let solo = false;
          mutate((x) => { solo = addSelfMember(x); });
          toast(solo ? `나를 솔로 멤버로 추가했어요. 컨셉 탭 그룹도 ${female ? '여성' : '남성'} 솔로로 바꿨어요` : '나를 멤버로 추가하고 비어 있던 섹션을 맡겼어요');
          focusOn('self-singer');
        } }, '나를 솔로 멤버로 추가')),
      h('p', { class: 'muted small' }, '멤버가 없으면 AI 멜로디가 내 음역을 몰라요. 나를 솔로 멤버로 추가하면 멜로디가 이 음역 안에서 만들어져요.'));

  return h('section', { class: 'card', id: 'self-record-card' },
    h('h2', null, '직접 녹음해서 발매하기'),
    toggle,
    h('p', { class: 'muted small' }, help('selfRecord'), song.remake
      ? 'MR(사람 편곡·DAW)에 내가 직접 녹음해서 발매해요.'
      : 'Suno로 가이드 보컬이 든 곡을 만들고, 그 MR에 내가 직접 녹음해서 발매해요.'),
    singerRow,
    keyLine(song, fitKey(song)),
    steps(song));
}

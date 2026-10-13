// 내보내기 탭 '직접 녹음해서 발매하기': Suno로 MR·가이드 보컬까지 만들고 그 MR에 직접 녹음한다. 결정: D-027.
import { h, toast, uid } from '../dom.js';
import { mutate } from '../state.js';
import { keyName } from '../music/theory.js';
import { VOICE_RANGES, midiName } from '../music/range.js';
import { autoDistribute } from '../structure.js';
import { GENRE_PROFILES } from '../music/genres.js';
import { recordingOf, singerOf, sungMembers, fitKey, applyKey, spanText, DEFAULT_SELF_VOICE } from '../recording/model.js';
import { help } from '../help.js';

const BARITONE_TONE = GENRE_PROFILES.ballad_classic.seed.vocalsBaritone;

export function renderRecording(song) {
  const r = recordingOf(song);
  const toggle = h('label', { class: 'check' },
    h('input', { type: 'checkbox', id: 'self-record', checked: !!r, onchange: (e) => mutate((s) => {
      s.recording = e.target.checked ? { self: true, singerId: s.recording?.singerId || '', voice: s.recording?.voice || DEFAULT_SELF_VOICE } : { ...(s.recording || {}), self: false };
    }) }),
    '이 곡은 내가 직접 불러서 발매해요 (Suno는 MR·가이드 보컬까지)');
  if (!r) {
    return h('section', { class: 'card', id: 'self-record-card' },
      h('h2', null, '직접 녹음해서 발매하기'),
      toggle,
      h('p', { class: 'muted small' }, '켜면 부를 사람 음역에 맞는 키, 녹음 순서, 녹음용 가사·마디표(제작 패키지)를 보여 줘요.'));
  }
  const s = singerOf(song);
  const sung = sungMembers(song);
  const k = fitKey(song);
  const singerRow = sung.length
    ? h('div', { class: 'row' },
      h('select', { id: 'self-singer', 'aria-label': '직접 부를 멤버', onchange: (e) => mutate((x) => { x.recording.singerId = e.target.value; }) },
        sung.map((m) => h('option', { value: m.id, selected: s.member?.id === m.id }, m.name || '이름 없음'))),
      h('span', { class: 'muted small' }, `음역 ${s.range?.name || '-'}${s.range?.low != null ? ` (${spanText(s.range)})` : ''} — 컨셉 탭 멤버 칸에서 바꿔요`))
    : h('div', { class: 'stack-tight' },
      h('div', { class: 'row' },
        h('select', { id: 'self-voice', 'aria-label': '부를 사람 음역', onchange: (e) => mutate((x) => { x.recording.voice = e.target.value; }) },
          Object.entries(VOICE_RANGES).filter(([, v]) => v.low != null).map(([key, v]) => h('option', { value: key, selected: s.voice === key }, `${v.name} ${midiName(v.low)}~${midiName(v.high)}`))),
        h('button', { type: 'button', class: 'btn small', id: 'self-add-member', onclick: () => mutate((x) => {
          // AI 멜로디·음역 점검이 내 음역을 보게 솔로 멤버로 추가하고 노래 섹션을 모두 맡긴다
          const voice = x.recording.voice || DEFAULT_SELF_VOICE;
          const me = { id: uid(), name: '나', position: '메인보컬', voice, tone: voice === 'm-baritone' ? BARITONE_TONE : '' };
          x.members.push(me);
          x.recording.singerId = me.id;
          x.sections = autoDistribute(x.sections, x.members);
        }) }, '나를 솔로 멤버로 추가')),
      h('p', { class: 'muted small' }, '멤버가 없으면 AI 멜로디가 내 음역을 몰라요. 나를 솔로 멤버로 추가하면 멜로디가 이 음역 안에서 만들어져요.'));

  const keyLine = !k
    ? h('p', { class: 'muted', id: 'keyfit' }, '멜로디 탭에서 가이드 멜로디를 만들면 내 음역에 맞는 키를 알려 줘요.')
    : k.fits
      ? h('p', { class: 'good-text', id: 'keyfit' }, `가이드 멜로디(${spanText(k.span)})가 내 음역(${spanText(k.range)}) 안이에요. 지금 키 ${keyName(song.music.root, song.music.mode)} 그대로 불러요.`)
      : h('div', { class: 'stack-tight' },
        h('p', { class: 'warn', id: 'keyfit' }, `가이드 멜로디(${spanText(k.span)})가 내 음역(${spanText(k.range)})을 벗어나요. `
          + `${keyName(k.best.root, song.music.mode)}${k.best.octave ? ` · 멜로디 ${k.best.octave > 0 ? '한 옥타브 위' : '한 옥타브 아래'}` : ''}로 옮기면 ${spanText(k.best.span)}${k.best.fits ? '로 맞아요.' : '로 가장 덜 넘쳐요 — 멜로디 폭이 음역보다 넓어요.'}`),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn small primary', id: 'keyfit-apply', onclick: () => {
          mutate((x) => { applyKey(x, k.best); });
          toast(`키를 ${keyName(k.best.root, song.music.mode)}로 옮겼어요. 코드와 멜로디가 같이 옮겨졌어요`);
        } }, `키 옮기기 (${k.best.shift > 0 ? '+' : ''}${k.best.shift}반음)`)));

  return h('section', { class: 'card', id: 'self-record-card' },
    h('h2', null, '직접 녹음해서 발매하기'),
    toggle,
    h('p', { class: 'muted small' }, help('selfRecord'), 'Suno로 가이드 보컬이 든 곡을 만들고, 그 MR에 내가 직접 녹음해서 발매해요.'),
    singerRow,
    keyLine,
    h('ol', null,
      h('li', null, '키를 내 음역에 맞춘 뒤 위 가사·스타일로 Suno에서 곡을 만들어요. Advanced Options의 Vocal Gender를 Male로 두고, 가이드 보컬 묘사는 내 목소리에 맞춰요(스타일 탭 보컬 칸).'),
      h('li', null, ['마음에 드는 결과에서 스템(보컬·반주)을 받거나, 같은 곡을 Instrumental로 만들어 MR을 받아요 ', help('stems'), '. 상업 발매용은 유료 요금제로 만든 것만 쓸 수 있으니 약관을 확인해요.']),
      h('li', null, 'DAW에 MR과 가이드 보컬(스템)을 올리고, 가이드를 들으며 내 목소리로 여러 번 녹음해요. 제작 패키지의 recording_sheet.txt(가사·마디표)를 보면서 불러요.'),
      h('li', null, '가이드 보컬은 빼고 내 보컬과 MR만 믹스해 WAV(24비트, 44.1kHz 이상)로 내보내요.'),
      h('li', null, '그 WAV를 마스터링 탭에 넣어 발매용으로 맞추고, "가사 맞춰 듣기"로 부른 가사를 확인해요.'),
      h('li', null, '앨범 정보·크레딧 탭의 AI 사용 표기에서 "보컬(Suno 등)"을 끄고, MR을 Suno로 만들었으면 "작곡·편곡"은 켜 둬요.')));
}

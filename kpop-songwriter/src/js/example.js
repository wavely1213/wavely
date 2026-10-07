// 처음 열었을 때 보여 줄 예시 곡. 수정하면 내 곡으로 저장된다.
import { uid } from './dom.js';
import { defaultMusic, defaultSectionMusic } from './music/arrangement.js';

export function exampleSong() {
  const m = [
    { id: uid(), name: '하린', position: '메인보컬', tone: 'airy high female vocal' },
    { id: uid(), name: '서아', position: '리드보컬', tone: 'warm mid female vocal' },
    { id: uid(), name: '유나', position: '메인래퍼', tone: 'crisp female rap' },
    { id: uid(), name: '지우', position: '서브보컬', tone: 'soft breathy female vocal' },
  ];
  const all = m.map((x) => x.id);
  const sec = (type, members, text) => ({ id: uid(), type, members, text });
  const song = {
    id: uid(),
    example: true,
    title: '예시: 새벽 신호 (Midnight Signal)',
    concept: {
      group: 'girl',
      theme: '연락이 끊긴 사람에게 새벽마다 보내는 신호',
      story: '잠들지 못한 도시의 새벽 3시, 꺼지지 않은 창문 불빛을 신호 삼아 마음을 전한다. 후반부에서 기다림이 확신으로 바뀐다.',
      moods: ['몽환', '청량'],
      keywords: '새벽 3시, 신호, 창문 불빛, 주파수',
      koRatio: 70,
    },
    members: m,
    sections: [
      sec('Intro', [], '(Can you hear me?)\n(Midnight signal)'),
      sec('Verse', [m[1].id, m[3].id], '불 꺼진 거리 위 혼자 깨어 있어\n휴대폰 화면엔 네 이름만 떠\n보내지 못한 말 별처럼 쌓여\n오늘도 나는 주파수를 맞춰'),
      sec('Pre-Chorus', [m[0].id, m[1].id], '조금만 더 가까이 와\n이 노이즈 너머로\n내 맘이 닿을 때까지\nI keep on calling'),
      sec('Chorus', all, 'Midnight signal 너를 불러\n새벽 세 시 빛이 번져\nMidnight signal 들리니 너\n꺼지지 않아 이 불빛 (oh-oh)'),
      sec('Rap', [m[2].id], '삐삐 소리처럼 짧게 또 길게\n모스 부호로 적은 내 비밀\n답이 없어도 난 안 멈춰 이제\nSignal on, 내 방은 너의 위성'),
      sec('Bridge', [m[0].id], '언젠가 너도 이 밤을 보면\n같은 불빛을 찾게 될 거야'),
      sec('Chorus', all, ''),
      sec('Outro', [], '(Midnight signal)'),
    ],
    style: {
      genre: 'K-pop dance pop',
      subgenre: 'dreamy synth-pop',
      bpm: 118,
      key: 'F# minor',
      vocals: 'airy female group vocals, crisp female rap',
      instruments: 'shimmering synth pads, plucky arps, punchy 808, crisp claps',
      production: 'wide stereo, glossy mix, beat drop into chorus',
      extra: 'night city atmosphere',
      exclude: 'heavy metal, autotune distortion',
    },
    versions: [],
    references: [],
    createdAt: Date.now(),
    updatedAt: 0,
  };
  // 예시 편곡: F# minor, 118 BPM. 첫 코러스에 가이드 멜로디 2줄.
  const music = { ...defaultMusic(), bpm: 118, root: 6, mode: 'minor' };
  song.sections.forEach((s) => { music.sections[s.id] = defaultSectionMusic(s.type, 'minor'); });
  const chorus = song.sections.find((s) => s.type === 'Chorus');
  const line = (start, sylls, ds, lens) => sylls.map((syl, i) => ({
    s: start + lens.slice(0, i).reduce((a, b) => a + b, 0), l: lens[i], d: ds[i], syl,
  }));
  music.sections[chorus.id].melody = [
    ...line(0, ['Mid', 'night', 'sig', 'nal', '너', '를', '불', '러'], [7, 7, 9, 7, 6, 5, 4, 4], [2, 2, 2, 2, 2, 2, 2, 10]),
    ...line(32, ['새', '벽', '세', '시', '빛', '이', '번', '져'], [4, 4, 5, 6, 7, 6, 5, 4], [2, 2, 2, 2, 2, 2, 2, 10]),
  ];
  song.music = music;
  return song;
}

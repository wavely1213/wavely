// 악기 목록: 앱 안 음색(variant), Suno 스타일용 영어 이름, MIDI 프로그램 번호.

export const INSTRUMENTS = [
  { id: 'drums', name: '드럼', suno: 'punchy drums', gm: null, role: 'drums',
    variants: { tight: '타이트 팝', boom: '묵직한 붐뱁', electro: '일렉트로닉' } },
  { id: 'bass', name: '베이스', suno: 'synth bass', gm: 38, role: 'bass',
    variants: { synth: '신스 베이스', round: '둥근 베이스', growl: '거친 베이스' } },
  { id: 'b808', name: '808 베이스', suno: 'deep 808 bass', gm: 38, role: 'sub',
    variants: { clean: '깨끗한 808', dirty: '찌그러진 808' } },
  { id: 'piano', name: '피아노', suno: 'piano', gm: 0, role: 'stabs',
    variants: { grand: '그랜드', electric: '일렉 피아노', lofi: '로파이' } },
  { id: 'pad', name: '신스 패드', suno: 'lush synth pads', gm: 89, role: 'sustain',
    variants: { warm: '따뜻한', airy: '공기감', dark: '어두운' } },
  { id: 'strings', name: '스트링', suno: 'cinematic strings', gm: 48, role: 'sustain',
    variants: { ensemble: '앙상블', soft: '부드러운' } },
  { id: 'guitar', name: '기타', suno: 'clean electric guitar', gm: 27, role: 'strum',
    variants: { clean: '클린 일렉', acoustic: '어쿠스틱' } },
  { id: 'pluck', name: '플럭 신스', suno: 'plucky synth', gm: 81, role: 'offbeat',
    variants: { bright: '밝은', soft: '부드러운' } },
  { id: 'arp', name: '아르페지오', suno: 'synth arpeggios', gm: 81, role: 'arp',
    variants: { bright: '반짝이는', glassy: '유리 같은' } },
  { id: 'lead', name: '가이드 멜로디', suno: '', gm: 80, role: 'melody',
    variants: { voice: '보컬 가이드', synth: '신스 리드', flute: '플루트' } },
];

export const INSTRUMENT_BY_ID = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));

// 멜로디는 섹션마다 켜고 끄지 않고, 멜로디가 있으면 항상 소리 난다
export const ARRANGE_INSTRUMENTS = INSTRUMENTS.filter((i) => i.id !== 'lead');

export function defaultSounds() {
  return Object.fromEntries(INSTRUMENTS.map((i) => [i.id, {
    variant: Object.keys(i.variants)[0],
    tone: 0.5, // 밝기 0~1
    vol: i.id === 'lead' ? 0.75 : 0.7,
    mute: false,
  }]));
}

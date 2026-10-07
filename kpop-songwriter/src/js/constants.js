// 곡 구조·스타일 선택지. 화면과 AI 프롬프트가 같은 목록을 쓴다.

export const SECTION_TYPES = [
  'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Post-Chorus',
  'Rap', 'Bridge', 'Dance Break', 'Hook', 'Outro',
];

// 멤버 없이 짧게 가는 섹션 (자동 분배에서 제외)
export const INSTRUMENTAL_TYPES = ['Intro', 'Dance Break', 'Outro'];
// 전원이 함께 부르는 섹션
export const ALL_MEMBER_TYPES = ['Chorus', 'Post-Chorus', 'Hook'];

export const TEMPLATES = {
  standard: {
    name: '표준 K-pop (3분 30초)',
    parts: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Post-Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Dance Break', 'Chorus', 'Outro'],
  },
  rap: {
    name: '랩 비중 높음 (보이그룹형)',
    parts: ['Intro', 'Rap', 'Pre-Chorus', 'Chorus', 'Verse', 'Rap', 'Pre-Chorus', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  },
  ballad: {
    name: '발라드·미디엄 템포',
    parts: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  },
  short: {
    name: '숏폼용 (2분 30초)',
    parts: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Rap', 'Chorus', 'Outro'],
  },
};

export const POSITIONS = ['메인보컬', '리드보컬', '서브보컬', '메인래퍼', '리드래퍼', '서브래퍼'];

export const GROUP_TYPES = {
  girl: '걸그룹',
  boy: '보이그룹',
  solo_f: '여성 솔로',
  solo_m: '남성 솔로',
  mixed: '혼성',
};

export const MOODS = [
  '청량', '걸크러시', '몽환', '다크', '섹시', '하이틴', '레트로', '감성', '파워풀', '키치', '서정', 'Y2K',
];

export const GENRES = [
  'K-pop dance pop', 'K-pop EDM', 'K-pop hip hop', 'K-pop R&B', 'K-pop ballad',
  'synth-pop', 'UK garage', 'Jersey club', 'Afrobeats', 'house', 'pop rock', 'moombahton',
];

// Suno 입력 한도 (v4.5 이상 Custom 모드 기준)
export const SUNO_LIMITS = {
  lyrics: 5000,
  style: 1000,
  title: 80,
};

export const MAX_VERSIONS = 30;

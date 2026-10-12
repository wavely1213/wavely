// 국내판(D-020) 발매 기준 목록: 국내 음원 플랫폼, 앨범 장르(멜론 등록 가이드 분류). 결정: D-024.
// 근거: docs/research/domestic-audit-2026-10-12.md '먼저 정할 것' 1·4번, R2, H1~H5, H15, K3, K9.

// VIBE는 2026-12-31에 서비스를 끝내서 뺀다. 스포티파이는 2026년 7월 국내 이용자가 멜론보다 많아(집계마다 다름) 넣는다.
export const DOMESTIC_PLATFORMS = ['멜론', '지니', '벅스', 'FLO', '유튜브 뮤직', '스포티파이'];
// 유통사가 신보 소개·앨범 소개·가사를 넣는 국내 음원 사이트 (유튜브 뮤직·스포티파이는 앨범 소개란이 없다)
export const DOMESTIC_STORES = ['멜론', '지니', '벅스', 'FLO'];
export const platformText = (list = DOMESTIC_PLATFORMS) => list.join('·');

// 앨범 장르: 멜론 등록 가이드(MLB) 분류. 'Pop'·'K-Pop'은 국내 분류에 없다. '인디'는 장르가 아니라 따로 붙이는 스타일 값
export const ALBUM_GENRES = ['댄스', '발라드', '랩/힙합', 'R&B/Soul', '일렉트로니카', '록/메탈', '포크/블루스', '성인가요(트로트)', 'OST'];
export const DEFAULT_ALBUM_GENRE = '댄스';

// 예전(해외 스토어식) 장르 값 → 국내 분류. 조사(R2)가 정한 것만 옮기고, 'Pop'·'Indie'는 맞는 분류를 알 수 없어 비워 둔다
// (점검표가 고르라고 알림). 'Indie'는 인디 표시로 남긴다
const LEGACY_GENRE = {
  'K-Pop': '댄스', Pop: '', Dance: '댄스', 'R&B/Soul': 'R&B/Soul', 'Hip-Hop/Rap': '랩/힙합',
  Ballad: '발라드', Electronic: '일렉트로니카', Rock: '록/메탈', Indie: '',
};

// 저장된 앨범의 장르를 국내 분류로 옮긴다 (normalizeAlbum에서, 한 번만 바뀜). 국내 분류 값이나 직접 쓴 값은 그대로.
// 옮기기 전 값은 genreFrom에 남겨, 예전에 받은 제출 패키지의 지문을 알아볼 수 있게 한다 (workflow/album-progress.js)
export function migrateAlbumGenre(a) {
  if (ALBUM_GENRES.includes(a.genre) || !(a.genre in LEGACY_GENRE)) return a;
  if (!a.genreFrom) a.genreFrom = { genre: a.genre, subgenre: a.subgenre ?? '' };
  if (a.genre === 'Indie') a.indie = true;
  a.genre = LEGACY_GENRE[a.genre];
  if (a.subgenre === 'Dance') a.subgenre = ''; // 예전 새 앨범의 기본 세부 장르 (장르만 바꾼 앨범에도 남아 있음)
  return a;
}

// 세부 장르는 쉼표로 최대 2개 (멜론 등록 가이드)
export const subgenreCount = (s) => String(s || '').split(/[,·]/).map((x) => x.trim()).filter(Boolean).length;

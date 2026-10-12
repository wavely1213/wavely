// 국내판(D-020) 발매 기준 목록: 국내 음원 플랫폼, 앨범 장르(멜론 등록 가이드 분류). 결정: D-024.
// 근거: docs/research/domestic-audit-2026-10-12.md '먼저 정할 것' 1·4번, R2, H1~H5, H15, K3, K9.

// VIBE는 2026-12-31에 서비스를 끝내서 뺀다. 스포티파이는 2026년 7월 국내 이용자가 멜론보다 많아(집계마다 다름) 넣는다.
export const DOMESTIC_PLATFORMS = ['멜론', '지니', '벅스', 'FLO', '유튜브 뮤직', '스포티파이'];
export const platformText = (list = DOMESTIC_PLATFORMS) => list.join('·');

// 앨범 장르: 멜론 등록 가이드(MLB) 분류. 'Pop'·'K-Pop'은 국내 분류에 없다. '인디'는 장르가 아니라 따로 붙이는 스타일 값
export const ALBUM_GENRES = ['댄스', '발라드', '랩/힙합', 'R&B/Soul', '일렉트로니카', '록/메탈', '포크/블루스', '성인가요(트로트)', 'OST'];
export const DEFAULT_ALBUM_GENRE = '댄스';

// 예전(해외 스토어식) 장르 값 → 국내 분류. 'Indie'는 장르 대신 인디 표시로
const LEGACY_GENRE = {
  'K-Pop': '댄스', Pop: '댄스', Dance: '댄스', 'R&B/Soul': 'R&B/Soul', 'Hip-Hop/Rap': '랩/힙합',
  Ballad: '발라드', Electronic: '일렉트로니카', Rock: '록/메탈', Indie: '댄스',
};

// 저장된 앨범의 장르를 국내 분류로 옮긴다 (normalizeAlbum에서, 한 번만 바뀜). 국내 분류 값이나 직접 쓴 값은 그대로
export function migrateAlbumGenre(a) {
  if (ALBUM_GENRES.includes(a.genre) || !(a.genre in LEGACY_GENRE)) return a;
  if (a.genre === 'Indie') a.indie = true;
  const wasDefault = a.genre === 'K-Pop' && a.subgenre === 'Dance'; // 예전 새 앨범 기본값
  a.genre = LEGACY_GENRE[a.genre];
  if (wasDefault) a.subgenre = '';
  return a;
}

// 세부 장르는 쉼표로 최대 2개 (멜론 등록 가이드)
export const subgenreCount = (s) => String(s || '').split(/[,·]/).map((x) => x.trim()).filter(Boolean).length;

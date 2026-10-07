// 이번 방문 동안만 들고 있는 큰 데이터 (저장하지 않음): 트랙별 마스터 파일, 커버 이미지.
const masters = {}; // albumId → { songId → inspectMaster 결과 }
const covers = {}; // albumId → { blob, url, width, height, source: 'template' | 'upload' }

export function mastersOf(albumId) {
  if (!masters[albumId]) masters[albumId] = {};
  return masters[albumId];
}

export function coverOf(albumId) {
  return covers[albumId] || null;
}

export function setCover(albumId, cover) {
  if (covers[albumId]?.url) URL.revokeObjectURL(covers[albumId].url);
  covers[albumId] = cover ? { ...cover, url: URL.createObjectURL(cover.blob) } : null;
}

// 앨범 작업에 쓰는 큰 데이터: 트랙별 마스터 파일, 커버 이미지, 곡별 마스터링 결과.
// 메모리에 두고, 브라우저 IndexedDB에도 보관해 새로고침해도 남게 한다 (계정 저장소에는 올리지 않음).
import { putFile, getFile, deleteFile } from '../platform/blobstore.js';

const masters = {}; // albumId → { songId → { file, name, sampleRate, bits, lufs, peak, duration, fromTab? } }
const covers = {}; // albumId → { blob, url, width, height, source: 'template' | 'upload', name? }
const songMasters = {}; // songId → 마스터링 탭 결과 (앨범 트랙에 자동 연결)
const restored = new Set();

export function mastersOf(albumId) {
  if (!masters[albumId]) masters[albumId] = {};
  return masters[albumId];
}

export function setMaster(albumId, songId, info) {
  mastersOf(albumId)[songId] = info;
  putFile(`master:${albumId}:${songId}`, info);
}

export function coverOf(albumId) {
  return covers[albumId] || null;
}

export function setCover(albumId, cover) {
  if (covers[albumId]?.url) URL.revokeObjectURL(covers[albumId].url);
  covers[albumId] = cover ? { ...cover, url: URL.createObjectURL(cover.blob) } : null;
  if (cover) putFile(`cover:${albumId}`, { blob: cover.blob, width: cover.width, height: cover.height, source: cover.source, name: cover.name || '' });
  else deleteFile(`cover:${albumId}`);
}

export function setSongMaster(songId, info) {
  songMasters[songId] = info;
  putFile(`songmaster:${songId}`, info);
}

export function songMaster(songId) {
  return songMasters[songId] || null;
}

// 앨범 트랙 중 마스터가 없는 곡에 마스터링 탭 결과를 채운다. 채운 개수를 돌려준다.
export function fillFromSongMasters(album) {
  const m = mastersOf(album.id);
  let n = 0;
  album.tracks.forEach((t) => {
    if (!m[t.songId] && songMasters[t.songId]) { setMaster(album.id, t.songId, songMasters[t.songId]); n += 1; }
  });
  return n;
}

// 앨범을 처음 열 때 한 번, 보관해 둔 마스터·커버를 불러온다. 무언가 불러왔으면 true.
export async function restoreAlbum(album) {
  if (restored.has(album.id)) return false;
  restored.add(album.id);
  let changed = false;
  const cover = covers[album.id] ? null : await getFile(`cover:${album.id}`);
  if (cover?.blob) { covers[album.id] = { ...cover, url: URL.createObjectURL(cover.blob) }; changed = true; }
  for (const t of album.tracks) {
    if (mastersOf(album.id)[t.songId]) continue;
    const m = await getFile(`master:${album.id}:${t.songId}`) || await getFile(`songmaster:${t.songId}`);
    if (m?.file) { mastersOf(album.id)[t.songId] = m; changed = true; }
  }
  return changed;
}

export function forgetAlbum(albumId) {
  Object.keys(mastersOf(albumId)).forEach((songId) => deleteFile(`master:${albumId}:${songId}`));
  deleteFile(`cover:${albumId}`);
  delete masters[albumId];
  delete covers[albumId];
}

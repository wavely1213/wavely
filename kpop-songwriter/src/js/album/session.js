// 앨범 작업에 쓰는 큰 데이터: 트랙별 마스터 파일, 커버 이미지, 곡별 마스터링 결과.
// 메모리에 두고, 브라우저 IndexedDB에도 보관해 새로고침해도 남게 한다 (계정 저장소에는 올리지 않음).
import { putFile, getFile, deleteFile, listKeys } from '../platform/blobstore.js';

const masters = {}; // albumId → { songId → { file, name, sampleRate, bits, lufs, peak, duration, fromTab? } }
const covers = {}; // albumId → { blob, url, width, height, source: 'template' | 'upload', name? }
const songMasters = {}; // songId → 마스터링 탭 결과 (앨범 트랙에 자동 연결)
const restored = new Set();
// 마스터·커버가 바뀔 때마다 올라가는 번호 (이걸로 계산한 값을 캐시하는 곳이 다시 계산하게)
let rev = 0;
export const sessionRev = () => rev;

export function mastersOf(albumId) {
  if (!masters[albumId]) masters[albumId] = {};
  return masters[albumId];
}

export function setMaster(albumId, songId, info) {
  rev += 1;
  mastersOf(albumId)[songId] = info;
  putFile(`master:${albumId}:${songId}`, info);
}

export function coverOf(albumId) {
  return covers[albumId] || null;
}

// 커버를 캔버스에 그릴 수 있는 이미지로 (SNS 카드용). 커버 Blob마다 한 번만 푼다. 없으면 null.
const bitmaps = new WeakMap();
export async function coverBitmap(albumId) {
  const c = covers[albumId];
  if (!c?.blob) return null;
  if (!bitmaps.has(c.blob)) bitmaps.set(c.blob, await createImageBitmap(c.blob).catch(() => null));
  return bitmaps.get(c.blob);
}

export function setCover(albumId, cover) {
  rev += 1;
  if (covers[albumId]?.url) URL.revokeObjectURL(covers[albumId].url);
  covers[albumId] = cover ? { ...cover, url: URL.createObjectURL(cover.blob) } : null;
  if (cover) putFile(`cover:${albumId}`, { blob: cover.blob, width: cover.width, height: cover.height, source: cover.source, name: cover.name || '', drawnWith: cover.drawnWith || null });
  else deleteFile(`cover:${albumId}`);
}

export function setSongMaster(songId, info) {
  rev += 1;
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
  // 앨범에서 뺀 곡의 마스터는 되돌리기용으로 그 세션 동안만 남겨 두고, 다음에 열 때 정리한다
  const keep = new Set(album.tracks.map((t) => `master:${album.id}:${t.songId}`));
  (await listKeys(`master:${album.id}:`)).filter((k) => !keep.has(k)).forEach((k) => deleteFile(k));
  for (const t of album.tracks) {
    if (mastersOf(album.id)[t.songId]) continue;
    const m = await getFile(`master:${album.id}:${t.songId}`) || await getFile(`songmaster:${t.songId}`);
    if (m?.file) { mastersOf(album.id)[t.songId] = m; changed = true; }
  }
  if (changed) rev += 1;
  return changed;
}

export function forgetAlbum(albumId) {
  rev += 1;
  Object.keys(mastersOf(albumId)).forEach((songId) => deleteFile(`master:${albumId}:${songId}`));
  // 이번에 불러오지 않은(앨범에서 뺀 곡의) 보관 파일까지 지운다
  listKeys(`master:${albumId}:`).then((keys) => keys.forEach((k) => deleteFile(k)));
  deleteFile(`cover:${albumId}`);
  delete masters[albumId];
  delete covers[albumId];
}

// 곡을 지울 때: 그 곡의 마스터링 결과와 앨범별 마스터 보관 파일을 지운다
export function forgetSong(songId, albumIds = []) {
  rev += 1;
  delete songMasters[songId];
  deleteFile(`songmaster:${songId}`);
  albumIds.forEach((aid) => forgetTrack(aid, songId));
}

// 앨범에서 트랙을 뺄 때
export function forgetTrack(albumId, songId) {
  rev += 1;
  delete mastersOf(albumId)[songId];
  deleteFile(`master:${albumId}:${songId}`);
}

// 곡 화면을 열 때 한 번: 마스터링 탭 결과를 보관함에서 불러온다. 불러왔으면 true.
const restoredSongs = new Set();
export async function restoreSong(songId) {
  if (restoredSongs.has(songId)) return false;
  restoredSongs.add(songId);
  if (songMasters[songId]) return false;
  const m = await getFile(`songmaster:${songId}`);
  if (m?.file) { songMasters[songId] = m; rev += 1; return true; }
  return false;
}

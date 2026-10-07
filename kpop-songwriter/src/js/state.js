// 앱 상태: 곡·앨범 목록, 지금 보는 것(곡/앨범), 자동 저장, 버전 스냅샷.
import { uid } from './dom.js';
import { sectionsFromTemplate, autoDistribute } from './structure.js';
import { MAX_VERSIONS } from './constants.js';
import { exampleSong } from './example.js';
import { normalizeMusic } from './music/arrangement.js';
import { newAlbum as makeAlbum, normalizeAlbum } from './album/model.js';
import { emptyTaste, normalizeTaste } from './learn/taste.js';
import { setTasteGetter } from './learn/context.js';
import { forgetSong } from './album/session.js';

const state = {
  store: null,
  songs: [],
  currentId: null,
  tab: 'concept',
  albums: [],
  albumId: null,
  albumTab: 'tracks',
  mode: 'song', // song | album | taste
  taste: emptyTaste(),
  saveStatus: 'saved', // saved | pending | error
};
const listeners = new Set();
const pending = new Set();
let saveTimer;

export function getState() { return state; }
export function current() { return state.songs.find((s) => s.id === state.currentId) || null; }
export function currentAlbum() { return state.albums.find((a) => a.id === state.albumId) || null; }
export function subscribe(fn) { listeners.add(fn); }
function emit(scope) { listeners.forEach((fn) => fn(scope)); }

export async function init(store) {
  state.store = store;
  let songs = [];
  try { songs = await store.list(); } catch { songs = []; }
  if (!songs.length) songs = [exampleSong()];
  songs.forEach(normalizeMusic);
  for (const song of songs) {
    try { if (await migrateVersions(song)) schedule(song.id); } catch { /* 다음에 다시 시도 */ }
  }
  songs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  state.songs = songs;
  state.currentId = songs[0].id;
  try { state.albums = (await store.listAlbums()).map(normalizeAlbum); } catch { state.albums = []; }
  try {
    state.taste = normalizeTaste(await store.loadTaste());
    state.tasteLoaded = true;
  } catch {
    state.taste = emptyTaste();
    state.tasteLoaded = false;
  }
  setTasteGetter(() => state.taste);
  state.albums.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  emit('all');
}

export function newSong() {
  const members = [];
  const song = {
    id: uid(),
    title: '제목 없는 곡',
    concept: { group: 'girl', theme: '', story: '', moods: [], keywords: '', koRatio: 70 },
    members,
    sections: autoDistribute(sectionsFromTemplate('standard'), members),
    style: { genre: 'K-pop dance pop', subgenre: '', bpm: 120, key: '', vocals: '', instruments: '', production: '', extra: '', exclude: '' },
    versions: [],
    references: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  normalizeMusic(song);
  state.songs.unshift(song);
  state.currentId = song.id;
  state.tab = 'concept';
  schedule(song.id);
  emit('all');
}

export function selectSong(id) {
  state.currentId = id;
  state.mode = 'song';
  emit('all');
}

// ---------- 앨범 ----------
// 아직 저장 안 된 예시 곡을 앨범에 넣으면 새로고침 때 사라지므로 내 곡으로 저장한다
export function keepSong(id) {
  const song = state.songs.find((s) => s.id === id);
  if (song?.example) { song.example = false; song.updatedAt = Date.now(); schedule(id); }
}

// fromSong을 주면 그 곡 하나로 싱글 앨범을 만든다 (제목도 곡 제목으로)
export function newAlbum({ fromSong } = {}) {
  const album = makeAlbum();
  // 지금 보고 있던 곡을 첫 트랙으로 넣어 준다 (예시 곡 제외)
  const song = fromSong || current();
  if (fromSong) album.title = fromSong.title.replace(/^예시:\s*/, '');
  if (song && (fromSong || !song.example)) {
    album.tracks.push({ songId: song.id, isTitle: true, isrc: '', lyricists: '', composers: '', arrangers: '', featuring: '', explicit: false });
    keepSong(song.id);
  }
  state.albums.unshift(album);
  state.albumId = album.id;
  state.mode = 'album';
  state.albumTab = 'tracks';
  schedule(album.id);
  emit('all');
}

export function selectAlbum(id) {
  state.albumId = id;
  state.mode = 'album';
  emit('all');
}

// ---------- 취향 ----------
const TASTE_ID = '_taste';

export function showTaste() {
  state.mode = 'taste';
  emit('all');
}

export function mutateTaste(fn, scope = 'all') {
  fn(state.taste);
  schedule(TASTE_ID);
  emit(scope);
}

export function setAlbumTab(tab) {
  state.albumTab = tab;
  emit('all');
}

export function mutateAlbum(fn, scope = 'all') {
  mutateAlbumById(state.albumId, fn, scope);
}

export function mutateAlbumById(id, fn, scope = 'all') {
  const album = state.albums.find((a) => a.id === id);
  if (!album) return;
  fn(album);
  normalizeAlbum(album);
  album.updatedAt = Date.now();
  schedule(album.id);
  emit(scope);
}

export async function deleteAlbum(id) {
  state.albums = state.albums.filter((a) => a.id !== id);
  pending.delete(id);
  try { await state.store.removeAlbum(id); } catch { /* 무시 */ }
  state.mode = 'song';
  state.albumId = null;
  emit('all');
}

// 저장할 변화 없이 화면만 다시 그림 (AI 진행 상태 등)
export function refresh() { emit('all'); }

export function setTab(tab) {
  state.tab = tab;
  emit('all');
}

// fn이 현재 곡을 직접 고친다. scope: 'all'이면 화면 전체 다시 그림, 'quiet'면 저장만.
export function mutate(fn, scope = 'all') {
  mutateSong(state.currentId, fn, scope);
}

// 특정 곡을 고친다. 오래 걸리는 작업(AI·복원·분석)은 시작할 때의 곡 id로 이걸 불러야
// 그 사이 다른 곡을 열어도 엉뚱한 곡을 덮어쓰지 않는다.
export function mutateSong(id, fn, scope = 'all') {
  const song = state.songs.find((s) => s.id === id);
  if (!song) return;
  fn(song);
  normalizeMusic(song);
  song.example = false;
  song.updatedAt = Date.now();
  schedule(song.id);
  emit(scope);
}

function schedule(id) {
  pending.add(id);
  state.saveStatus = 'pending';
  emit('status');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 1200);
}

let flushing = false;
async function flush() {
  if (flushing) { saveTimer = setTimeout(flush, 600); return; }
  flushing = true;
  const ids = [...pending];
  pending.clear();
  const failed = [];
  // 하나가 실패해도 나머지는 저장한다
  for (const id of ids) {
    try {
      const song = state.songs.find((s) => s.id === id);
      if (song) await state.store.save(song);
      const album = state.albums.find((a) => a.id === id);
      if (album) await state.store.saveAlbum(album);
      // 취향을 불러오지 못한 채로 저장하면 기존 기록을 빈 값으로 덮어쓰게 되므로 막는다
      if (id === TASTE_ID && state.tasteLoaded) await state.store.saveTaste(state.taste);
    } catch {
      failed.push(id);
    }
  }
  if (failed.length) {
    failed.forEach((id) => pending.add(id));
    state.saveStatus = 'error';
    // 일시적인 실패일 수 있으니 조금 뒤 다시 저장한다
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 5000);
  } else {
    state.saveStatus = pending.size ? 'pending' : 'saved';
  }
  flushing = false;
  emit('status');
}

// 곡을 지우면 앨범 트랙·버전 사본·보관 파일도 함께 정리한다
export async function deleteSong(id) {
  const song = state.songs.find((s) => s.id === id);
  const inAlbums = state.albums.filter((a) => a.tracks.some((t) => t.songId === id));
  inAlbums.forEach((a) => {
    a.tracks = a.tracks.filter((t) => t.songId !== id);
    if (a.tracks.length && !a.tracks.some((t) => t.isTitle)) a.tracks[0].isTitle = true;
    a.updatedAt = Date.now();
    schedule(a.id);
  });
  (song?.versions || []).forEach((v) => state.store.removeVersion(id, v.id).catch(() => {}));
  forgetSong(id, inAlbums.map((a) => a.id));
  state.songs = state.songs.filter((s) => s.id !== id);
  pending.delete(id);
  try { await state.store.remove(id); } catch { /* 다음 저장 때 목록에서 빠짐 */ }
  if (!state.songs.length) state.songs = [normalizeMusic(exampleSong())];
  if (state.currentId === id) state.currentId = state.songs[0].id;
  emit('all');
}

function snapshotOf(song) {
  const { versions, ...rest } = song;
  return JSON.parse(JSON.stringify(rest));
}

function versionMeta(song, note) {
  return {
    id: uid(),
    at: Date.now(),
    note: note || '메모 없음',
    filled: song.sections.filter((s) => s.text.trim()).length,
    total: song.sections.length,
  };
}

async function storeVersion(song, note) {
  const meta = versionMeta(song, note);
  await state.store.putVersion(song.id, { ...meta, data: snapshotOf(song) });
  song.versions.unshift(meta);
  const max = state.store.maxVersions || MAX_VERSIONS;
  const dropped = song.versions.slice(max);
  song.versions = song.versions.slice(0, max);
  dropped.forEach((v) => state.store.removeVersion(song.id, v.id).catch(() => {}));
}

export async function saveVersion(note) {
  const song = current();
  if (!song) return false;
  try {
    await storeVersion(song, note);
  } catch {
    return false;
  }
  mutateSong(song.id, () => {});
  return true;
}

export function loadVersion(versionId) {
  const song = current();
  return state.store.getVersion(song.id, versionId).catch(() => null);
}

export async function restoreVersion(versionId) {
  const song = current();
  if (!song) return false;
  const v = await state.store.getVersion(song.id, versionId).catch(() => null);
  if (!v?.data) return false;
  // 복원 직전 상태를 먼저 남긴다. 이게 실패하면 복원하지 않는다 (덮어쓰면 되돌릴 수 없음).
  await storeVersion(song, '복원 전 자동 저장');
  const { id, createdAt, versions, ...data } = JSON.parse(JSON.stringify(v.data));
  mutateSong(song.id, (s) => { Object.assign(s, data); });
  return true;
}

export function deleteVersion(versionId) {
  const song = current();
  state.store.removeVersion(song.id, versionId).catch(() => {});
  mutate((s) => { s.versions = s.versions.filter((v) => v.id !== versionId); });
}

// 예전 형식(버전 본문을 곡 문서 안에 둔 것)을 따로 저장하는 형식으로 옮긴다
async function migrateVersions(song) {
  const inline = (song.versions || []).filter((v) => v.data);
  if (!inline.length) return false;
  for (const v of inline) {
    await state.store.putVersion(song.id, v);
  }
  song.versions = song.versions.map(({ data, ...meta }) => ({
    ...meta,
    filled: data ? data.sections.filter((x) => x.text.trim()).length : meta.filled,
    total: data ? data.sections.length : meta.total,
  }));
  return true;
}

// 탭을 닫거나 다른 탭으로 갈 때 기다리지 않고 바로 저장한다. 저장 대기 중 닫으면 브라우저가 경고한다.
if (typeof window !== 'undefined') {
  const flushNow = () => { if (pending.size && state.store) { clearTimeout(saveTimer); flush(); } };
  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushNow(); });
  window.addEventListener('beforeunload', (e) => { if (pending.size) { flushNow(); e.preventDefault(); } });
}

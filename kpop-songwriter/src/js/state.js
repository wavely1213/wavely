// 앱 상태: 곡·앨범 목록, 지금 보는 것(곡/앨범), 자동 저장, 버전 스냅샷.
import { uid } from './dom.js';
import { sectionsFromTemplate, autoDistribute } from './structure.js';
import { MAX_VERSIONS } from './constants.js';
import { exampleSong } from './example.js';
import { normalizeMusic } from './music/arrangement.js';
import { newAlbum as makeAlbum, normalizeAlbum } from './album/model.js';

const state = {
  store: null,
  songs: [],
  currentId: null,
  tab: 'concept',
  albums: [],
  albumId: null,
  albumTab: 'tracks',
  mode: 'song', // song | album
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
export function newAlbum() {
  const album = makeAlbum();
  // 지금 보고 있던 곡을 첫 트랙으로 넣어 준다 (예시 곡 제외)
  const song = current();
  if (song && !song.example) album.tracks.push({ songId: song.id, isTitle: true, isrc: '', lyricists: '', composers: '', arrangers: '', featuring: '', explicit: false });
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

export function setAlbumTab(tab) {
  state.albumTab = tab;
  emit('all');
}

export function mutateAlbum(fn, scope = 'all') {
  const album = currentAlbum();
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
  const song = current();
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
  try {
    for (const id of ids) {
      const song = state.songs.find((s) => s.id === id);
      if (song) await state.store.save(song);
      const album = state.albums.find((a) => a.id === id);
      if (album) await state.store.saveAlbum(album);
    }
    state.saveStatus = pending.size ? 'pending' : 'saved';
  } catch {
    ids.forEach((id) => pending.add(id));
    state.saveStatus = 'error';
    // 일시적인 실패일 수 있으니 조금 뒤 다시 저장한다
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 5000);
  }
  flushing = false;
  emit('status');
}

export async function deleteSong(id) {
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
  const dropped = song.versions.slice(MAX_VERSIONS);
  song.versions = song.versions.slice(0, MAX_VERSIONS);
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
  mutate(() => {});
  return true;
}

export function loadVersion(versionId) {
  const song = current();
  return state.store.getVersion(song.id, versionId).catch(() => null);
}

export async function restoreVersion(versionId) {
  const song = current();
  const v = await loadVersion(versionId);
  if (!v?.data) return false;
  await storeVersion(song, '복원 전 자동 저장');
  const { id, createdAt, versions, ...data } = JSON.parse(JSON.stringify(v.data));
  mutate((s) => { Object.assign(s, data); });
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

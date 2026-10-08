// 앱 상태: 곡·앨범 목록, 지금 보는 것(곡/앨범), 자동 저장, 버전 스냅샷.
import { uid } from './dom.js';
import { sectionsFromTemplate, autoDistribute } from './structure.js';
import { MAX_VERSIONS } from './constants.js';
import { exampleSong } from './example.js';
import { normalizeMusic } from './music/arrangement.js';
import { newAlbum as makeAlbum, normalizeAlbum, newTrack, inheritAlbumInfo } from './album/model.js';
import { emptyTaste, normalizeTaste, mergeTaste } from './learn/taste.js';
import { setTasteGetter } from './learn/context.js';
import { forgetSong } from './album/session.js';
import { storageUsage, isQuotaError } from './storage-usage.js';

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
  saveFull: false, // 마지막 저장 실패가 저장 공간 부족 때문인지
  storageUsage: null, // 이 브라우저에 저장할 때만: { used, ratio }
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
    schedule(TASTE_ID); // 조금 뒤 다시 불러와 본다 (flush의 reloadTaste)
  }
  setTasteGetter(() => state.taste);
  state.albums.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  measureStorage();
  emit('all');
}

// from: 그룹 종류·멤버·한국어 비율·보컬 설명을 이어받을 곡 (앨범의 새 곡). 없으면 빈 곡.
export function newSong({ from = null } = {}) {
  const members = (from?.members || []).map((m) => ({ ...m, id: uid() }));
  const song = {
    id: uid(),
    title: '제목 없는 곡',
    concept: { group: from?.concept?.group || 'girl', theme: '', story: '', moods: [], keywords: '', koRatio: from?.concept?.koRatio ?? 70 },
    members,
    sections: autoDistribute(sectionsFromTemplate('standard'), members),
    style: { genre: 'K-pop dance pop', subgenre: '', bpm: 120, key: '', vocals: from?.style?.vocals || '', instruments: '', production: '', extra: '', exclude: '' },
    versions: [],
    references: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  normalizeMusic(song);
  state.songs.unshift(song);
  state.currentId = song.id;
  state.mode = 'song'; // 앨범·취향 화면에서 눌러도 새 곡으로 간다
  state.tab = 'concept';
  schedule(song.id);
  emit('all');
  return song;
}

// 앨범의 새 곡: 타이틀곡(없으면 첫 트랙)의 그룹·멤버를 이어받아 만들고 트랙 끝에 넣은 뒤 그 곡으로 간다.
// 크레딧은 곡마다 다를 수 있어 이어받지 않는다.
export function newSongInAlbum(albumId) {
  const album = state.albums.find((a) => a.id === albumId);
  if (!album) return null;
  const t = album.tracks.find((x) => x.isTitle) || album.tracks[0];
  const from = t ? state.songs.find((x) => x.id === t.songId) : null;
  remember(album, 'all');
  const song = newSong({ from });
  album.tracks.push({ ...newTrack(song.id), isTitle: !album.tracks.length });
  normalizeAlbum(album);
  album.updatedAt = Date.now();
  schedule(album.id);
  emit('all');
  return song;
}

export function selectSong(id) {
  state.currentId = id;
  state.mode = 'song';
  emit('all');
}

// 제작 패키지의 project.json(곡 백업)을 새 곡으로 가져온다. 형식이 맞지 않으면 false.
export function importSong(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.sections) || !data.concept || !data.style) return false;
  const song = JSON.parse(JSON.stringify(data));
  // 원래 곡과 겹치지 않게 새 id (섹션 id는 편곡 데이터와 묶여 있어 그대로 둔다)
  song.id = uid();
  song.title = `${String(song.title || '가져온 곡').replace(/^예시:\s*/, '')} (가져옴)`;
  song.example = false;
  song.versions = [];
  song.members = Array.isArray(song.members) ? song.members : [];
  song.references = Array.isArray(song.references) ? song.references : [];
  song.createdAt = Date.now();
  song.updatedAt = Date.now();
  song.sections = song.sections.filter((s) => s && typeof s.id === 'string').map((s) => ({ id: s.id, type: String(s.type || 'Verse'), members: Array.isArray(s.members) ? s.members : [], text: String(s.text || '') }));
  normalizeMusic(song);
  state.songs.unshift(song);
  state.currentId = song.id;
  state.mode = 'song';
  state.tab = 'concept';
  schedule(song.id);
  emit('all');
  return true;
}

// 곡 복제 (다른 버전·리믹스를 시도할 때): 섹션 id를 새로 만들어 편곡·멜로디·번안을 옮기고,
// 버전 목록·싱크 가사·Suno 생성·마스터링 진행은 새 버전에서 다시 하도록 비운다.
export function duplicateSong(id) {
  const song = copySong(id);
  if (!song) return null;
  state.currentId = song.id;
  state.mode = 'song';
  schedule(song.id);
  emit('all');
  return song;
}

// 앨범에 연주곡(Inst.) 버전 더하기: 가사·가이드 멜로디를 비운 사본을 만들어 원곡 바로 뒤 트랙으로.
// 작곡·편곡 크레딧은 같고 작사는 없음. 마스터는 Suno 연주곡(Instrumental) 결과를 따로 넣는다.
export function addInstVersion(albumId, songId) {
  const album = state.albums.find((a) => a.id === albumId);
  const at = album ? album.tracks.findIndex((t) => t.songId === songId) : -1;
  if (at < 0) return null;
  // 이미 만든 Inst. 곡(되돌리기로 트랙만 빠졌거나 다른 앨범에 든 것)이 있으면 다시 쓴다 — 같은 곡이 쌓이지 않게
  let song = state.songs.find((x) => x.instOf === songId && !album.tracks.some((t) => t.songId === x.id));
  if (song) song = refreshInst(song, songId);
  else song = copySong(songId, { suffix: ' (Inst.)', inst: true });
  remember(album, 'all');
  const src = album.tracks[at];
  album.tracks.splice(at + 1, 0, { ...src, songId: song.id, isTitle: false, isrc: '', lyricists: '', featuring: '', explicit: false, splits: { music: src.splits?.music, arrange: src.splits?.arrange } });
  normalizeAlbum(album);
  album.updatedAt = Date.now();
  schedule(song.id);
  schedule(album.id);
  emit('all');
  return song;
}

// 다시 쓰는 Inst. 사본을 원곡의 지금 상태에 맞춘다: 손대지 않은 사본은 원곡에서 새로 복사(같은 id),
// 고친 사본은 그대로 두고, 제목은 자동으로 붙인 그대로일 때만 원곡 제목을 따라가게 (작곡가가 바꾼 제목은 둔다).
function refreshInst(inst, srcId) {
  const src = state.songs.find((x) => x.id === srcId);
  if (!src) return inst;
  if (inst.updatedAt - inst.createdAt < 1000) {
    const fresh = copySong(srcId, { suffix: ' (Inst.)', inst: true });
    fresh.id = inst.id;
    state.songs = state.songs.filter((x) => x !== inst);
    return fresh;
  }
  // instTitle이 없는 예전 사본은 " (Inst.)"로 끝나면 자동 제목으로 본다
  if (inst.instTitle ? inst.title === inst.instTitle : / \(Inst\.\)$/.test(inst.title)) {
    inst.title = `${String(src.title || '제목 없음').replace(/^예시:\s*/, '')} (Inst.)`;
    inst.instTitle = inst.title;
  }
  return inst;
}

function copySong(id, { suffix = ' (사본)', inst = false } = {}) {
  const src = state.songs.find((x) => x.id === id);
  if (!src) return null;
  const { versions, ...rest } = src;
  const song = JSON.parse(JSON.stringify(rest));
  const map = {};
  song.sections.forEach((sec) => { map[sec.id] = uid(); sec.id = map[sec.id]; });
  song.music.sections = Object.fromEntries(Object.entries(song.music.sections || {}).filter(([k]) => map[k]).map(([k, v]) => [map[k], v]));
  Object.values(song.translations || {}).forEach((t) => { t.sections = Object.fromEntries(Object.entries(t.sections || {}).filter(([k]) => map[k]).map(([k, v]) => [map[k], v])); });
  Object.assign(song, {
    id: uid(),
    title: `${String(src.title || '제목 없음').replace(/^예시:\s*/, '')}${suffix}`,
    example: false,
    versions: [],
    sync: null,
    lyricCheck: null, // 가사·음원 일치 확인은 음원마다 새로
    progress: { ...(src.progress || {}), suno: false, mastered: false },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  if (inst) {
    song.instOf = src.id;
    song.instTitle = song.title; // 자동으로 붙인 제목 (작곡가가 바꿨는지 알아보려고)
    song.sections.forEach((sec) => { sec.text = ''; });
    Object.values(song.music.sections).forEach((sm) => { sm.melody = []; });
    ['translations', 'similarity', 'spelling'].forEach((k) => { delete song[k]; });
  }
  normalizeMusic(song);
  state.songs.splice(state.songs.indexOf(src) + 1, 0, song);
  return song;
}

// 전체 백업 되살리기 (backup.js planRestore의 결과를 반영). 버전 본문은 먼저 따로 저장한다.
export async function applyRestore(plan) {
  const max = state.store.maxVersions || MAX_VERSIONS;
  for (const { song, versions } of plan.songs) {
    const metas = [];
    for (const v of versions.slice(0, max)) {
      try {
        await state.store.putVersion(song.id, v);
        const { data, ...meta } = v;
        metas.push(meta);
      } catch { /* 저장 공간이 모자라면 그 버전은 건너뜀 */ }
    }
    song.versions = metas;
    normalizeMusic(song);
  }
  // 기다리는 동안 상태가 바뀌었을 수 있으니 반영할 때 다시 본다: 이미 있는 id는 넣지 않고, 취향은 지금 기록에 합친다
  const songs = plan.songs.map((x) => x.song).filter((x) => !state.songs.some((s) => s.id === x.id && !s.example));
  if (songs.length) state.songs = state.songs.filter((s) => !s.example);
  state.songs.unshift(...songs);
  songs.forEach((x) => schedule(x.id));
  plan.albums.filter((a) => !state.albums.some((b) => b.id === a.id)).forEach((a) => { normalizeAlbum(a); state.albums.unshift(a); schedule(a.id); });
  const merged = mergeTaste(state.taste, plan.taste);
  if (merged.changed) {
    state.taste = merged.taste;
    schedule(TASTE_ID);
  }
  if (songs.length) { state.currentId = songs[0].id; state.mode = 'song'; }
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
  // 가장 최근에 고친 앨범의 아티스트 정보를 이어받는다 (두 번째 앨범부터 다시 적지 않게)
  const prev = [...state.albums].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  const album = inheritAlbumInfo(makeAlbum(), prev);
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
  track(album, scope, (x) => { fn(x); normalizeAlbum(x); });
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

// ---------- 되돌리기 ----------
// 곡·앨범마다 바꾸기 전 상태를 쌓아 둔다 (버전 목록 제외, 최근 UNDO_MAX개). 타이핑은 2초 단위로 묶는다.
// 곡과 앨범은 id가 겹치지 않으므로 같은 스택 표를 쓴다.
const UNDO_MAX = 40;
const undoStacks = {};
const redoStacks = {};
const lastQuiet = {};

function snapshot(item) {
  const { versions, ...rest } = item;
  return JSON.stringify(rest);
}

function remember(item, scope) {
  const now = Date.now();
  if (scope === 'quiet') {
    if (now - (lastQuiet[item.id] || 0) < 2000) { lastQuiet[item.id] = now; return; }
    lastQuiet[item.id] = now;
  } else {
    lastQuiet[item.id] = 0;
  }
  pushUndo(item.id, snapshot(item));
}

function pushUndo(id, snap) {
  const stack = undoStacks[id] || (undoStacks[id] = []);
  if (stack[stack.length - 1] === snap) return;
  stack.push(snap);
  if (stack.length > UNDO_MAX) stack.shift();
  redoStacks[id] = [];
}

// 타이핑이 아닌 변경은 실제로 바뀐 게 있을 때만 되돌리기 단계를 남긴다.
// (칸을 벗어날 때 부르는 빈 변경이 단계를 쌓으면 첫 ↶가 아무것도 안 하고 다시 실행 목록도 지워짐)
function track(item, scope, fn) {
  if (scope === 'quiet') {
    remember(item, scope);
    fn(item);
    return;
  }
  lastQuiet[item.id] = 0; // 빈 변경이어도 타이핑 묶음은 여기서 끊는다
  const before = snapshot(item);
  try {
    fn(item);
  } finally {
    if (snapshot(item) !== before) pushUndo(item.id, before);
  }
}

// 한 번 이룬 단계(Suno로 만들기, 마스터링)는 되돌리기로 지우지 않는다
const KEEP_DONE = ['suno', 'mastered'];

// 지금 화면의 대상: 앨범 화면이면 앨범, 아니면 곡
function activeId() {
  return state.mode === 'album' ? state.albumId : state.currentId;
}

function findItem(id) {
  const song = state.songs.find((s) => s.id === id);
  if (song) return { item: song, album: false };
  const album = state.albums.find((a) => a.id === id);
  return album ? { item: album, album: true } : null;
}

function restoreSnapshot({ item, album }, snap) {
  const data = JSON.parse(snap);
  // 한 번 고쳐 내 곡이 된 곡은 되돌려도 예시 곡으로 돌아가지 않는다 (예시 곡은 저장·백업에서 빠짐)
  if (!album && item.example === false) data.example = false;
  if (!album) KEEP_DONE.forEach((k) => { if (item.progress?.[k]) data.progress = { ...(data.progress || {}), [k]: true }; });
  Object.keys(item).forEach((k) => { if (!['id', 'versions', 'createdAt'].includes(k)) delete item[k]; });
  Object.assign(item, data, { id: item.id }, album ? {} : { versions: item.versions });
  if (album) normalizeAlbum(item); else normalizeMusic(item);
  item.updatedAt = Date.now();
  schedule(item.id);
}

export function canUndo(id = activeId()) { return !!undoStacks[id]?.length; }
export function canRedo(id = activeId()) { return !!redoStacks[id]?.length; }

function step(id, from, to) {
  const found = findItem(id);
  const snap = from[id]?.pop();
  if (!found || !snap) return false;
  (to[id] = to[id] || []).push(snapshot(found.item));
  restoreSnapshot(found, snap);
  lastQuiet[id] = 0;
  emit('all');
  return true;
}

export function undo(id = activeId()) { return step(id, undoStacks, redoStacks); }
export function redo(id = activeId()) { return step(id, redoStacks, undoStacks); }

// 특정 곡을 고친다. 오래 걸리는 작업(AI·복원·분석)은 시작할 때의 곡 id로 이걸 불러야
// 그 사이 다른 곡을 열어도 엉뚱한 곡을 덮어쓰지 않는다.
export function mutateSong(id, fn, scope = 'all') {
  const song = state.songs.find((s) => s.id === id);
  if (!song) return;
  track(song, scope, (x) => { fn(x); normalizeMusic(x); });
  song.example = false;
  song.updatedAt = Date.now();
  schedule(song.id);
  emit(scope);
}

// 진행 단계 표시만 바꾼다 (되돌리기 단계를 남기지 않음)
export function markProgress(id, key) {
  const song = state.songs.find((s) => s.id === id);
  if (!song || song.progress?.[key]) return;
  song.progress = { ...(song.progress || {}), [key]: true };
  song.example = false;
  song.updatedAt = Date.now();
  schedule(song.id);
  emit('quiet');
}

function schedule(id) {
  pending.add(id);
  state.saveStatus = 'pending';
  emit('status');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 1200);
}

// 이 브라우저에 저장할 때만 사용량을 잰다 (계정 저장은 한도가 따로 있음)
function measureStorage() {
  state.storageUsage = state.store?.kind === 'local' ? storageUsage() : null;
}

let flushing = false;
async function flush() {
  if (flushing) { saveTimer = setTimeout(flush, 600); return; }
  flushing = true;
  const ids = [...pending];
  pending.clear();
  const failed = [];
  let full = false;
  // 하나가 실패해도 나머지는 저장한다
  for (const id of ids) {
    try {
      const song = state.songs.find((s) => s.id === id);
      if (song) await state.store.save(song);
      const album = state.albums.find((a) => a.id === id);
      if (album) await state.store.saveAlbum(album);
      // 취향을 불러오지 못한 채로 저장하면 기존 기록을 빈 값으로 덮어쓰게 되므로, 먼저 다시 불러와 합친다.
      // 또 실패하면 저장 실패로 남겨 다시 시도한다 (이번 세션의 반응은 버리지 않음)
      if (id === TASTE_ID) {
        if (!state.tasteLoaded) await reloadTaste();
        await state.store.saveTaste(state.taste);
      }
    } catch (e) {
      failed.push(id);
      if (isQuotaError(e)) full = true;
    }
  }
  state.saveFull = full;
  measureStorage();
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

// 처음에 못 불러온 취향을 다시 불러와, 그사이 쌓인 반응을 얹는다 (프로필은 저장된 것이 비어 있을 때만 이번 것으로).
// 기다리는 동안 생긴 반응도 넣으려고 합치기는 불러온 뒤에 한다.
async function reloadTaste() {
  const stored = await state.store.loadTaste();
  const session = state.taste;
  const { taste } = mergeTaste(stored, session, { replace: true });
  taste.enabled = taste.enabled !== false && session.enabled !== false;
  state.taste = taste;
  state.tasteLoaded = true;
  emit('all');
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

const AUTO_NOTE = '복원 전 자동 저장';
export const isAutoVersion = (v) => !!v.auto || v.note === AUTO_NOTE; // 예전 기록은 메모로 알아본다

function versionMeta(song, note, auto) {
  return {
    id: uid(),
    at: Date.now(),
    note: note || '메모 없음',
    filled: song.sections.filter((s) => s.text.trim()).length,
    total: song.sections.length,
    ...(auto ? { auto: true } : {}),
  };
}

// 버전이 max개를 넘을 때 지울 것 (list는 최신순). 방금 만든 것(0번)과 keepId(복원하는 버전)는 지우지 않고,
// 복원 전 자동 저장을 이름 붙인 버전보다 먼저, 각각 오래된 것부터 지운다.
export function versionsToDrop(list, max, keepId) {
  let extra = list.length - max;
  if (extra <= 0) return [];
  const candidates = list.slice(1).filter((v) => v.id !== keepId).reverse();
  const out = [];
  for (const pass of [isAutoVersion, () => true]) {
    for (const v of candidates) {
      if (extra <= 0) break;
      if (!out.includes(v) && pass(v)) { out.push(v); extra--; }
    }
  }
  return out;
}

async function storeVersion(song, note, { keep, auto } = {}) {
  const meta = versionMeta(song, note, auto);
  await state.store.putVersion(song.id, { ...meta, data: snapshotOf(song) });
  song.versions.unshift(meta);
  const dropped = versionsToDrop(song.versions, maxVersions(), keep);
  song.versions = song.versions.filter((v) => !dropped.includes(v));
  dropped.forEach((v) => state.store.removeVersion(song.id, v.id).catch(() => {}));
}

export function maxVersions() {
  return state.store?.maxVersions || MAX_VERSIONS;
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

// 복원한 뒤 아무것도 안 고쳤는지 보려고 곡 내용만 비교한다 (저장 시각·진행 표시는 빼고)
const restored = {}; // songId -> { id: 복원한 버전, key }
function contentKey(song) {
  const { versions, updatedAt, progress, example, ...rest } = song;
  return JSON.stringify(rest);
}

// 복원 뒤 고친 게 없고 그 버전이 아직 있으면 자동 저장이 필요 없다 (안 그러면 같은 사본이 앞선 자동 저장—저장 안 한 작업—을 밀어냄)
export function restoreNeedsAutoSave(song) {
  const r = restored[song.id];
  return !(r && song.versions.some((v) => v.id === r.id) && r.key === contentKey(song));
}

export async function restoreVersion(versionId) {
  const song = current();
  if (!song) return false;
  const v = await state.store.getVersion(song.id, versionId).catch(() => null);
  if (!v?.data) return false;
  // 복원 직전 상태를 먼저 남긴다. 이게 실패하면 복원하지 않는다 (덮어쓰면 되돌릴 수 없음).
  if (restoreNeedsAutoSave(song)) await storeVersion(song, AUTO_NOTE, { keep: versionId, auto: true });
  const { id, createdAt, versions, ...data } = JSON.parse(JSON.stringify(v.data));
  mutateSong(song.id, (s) => { Object.assign(s, data); });
  restored[song.id] = { id: versionId, key: contentKey(song) };
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

// 곡 저장소. 곡 하나 = 문서 하나, 버전 본문은 따로 저장.
// claude.ai 계정 저장소(db, 본인만 보임)를 쓰고, 안 되면 이 브라우저에 저장.

const LOCAL_KEY = 'kpop-writer-songs';
const ALBUM_KEY = 'kpop-writer-albums';
const TASTE_KEY = 'kpop-writer-taste';

function readKey(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function writeKey(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function localStore() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
  };
  // 저장 실패(용량 초과 등)는 그대로 올려 보내 "저장 실패"로 보이게 한다
  const write = (songs) => { localStorage.setItem(LOCAL_KEY, JSON.stringify(songs)); };
  return {
    kind: 'local',
    maxVersions: 8, // 브라우저 저장 공간(약 5MB)이 작아 버전 사본을 적게 둔다
    async list() { return read(); },
    async save(song) {
      const songs = read().filter((s) => s.id !== song.id);
      songs.push(song);
      write(songs);
    },
    async remove(id) { write(read().filter((s) => s.id !== id)); },
    async putVersion(songId, v) { localStorage.setItem(`${LOCAL_KEY}-v-${songId}-${v.id}`, JSON.stringify(v)); },
    async getVersion(songId, vid) {
      try { return JSON.parse(localStorage.getItem(`${LOCAL_KEY}-v-${songId}-${vid}`) || 'null'); } catch { return null; }
    },
    async removeVersion(songId, vid) {
      try { localStorage.removeItem(`${LOCAL_KEY}-v-${songId}-${vid}`); } catch { /* 무시 */ }
    },
    async listAlbums() { return readKey(ALBUM_KEY); },
    async loadTaste() { try { return JSON.parse(localStorage.getItem(TASTE_KEY) || 'null'); } catch { return null; } },
    async saveTaste(t) { localStorage.setItem(TASTE_KEY, JSON.stringify(t)); },
    async saveAlbum(album) { writeKey(ALBUM_KEY, [...readKey(ALBUM_KEY).filter((a) => a.id !== album.id), album]); },
    async removeAlbum(id) { writeKey(ALBUM_KEY, readKey(ALBUM_KEY).filter((a) => a.id !== id)); },
  };
}

async function accountStore() {
  if (!window.claude?.use) return null;
  const [db, user] = await Promise.all([
    window.claude.use('db').catch(() => null),
    window.claude.use('user').catch(() => null),
  ]);
  if (!db || !user) return null;
  const id = await user.id();
  if (!id) return null;
  const col = db.collection(`data/users/${id}`);
  const albums = col.doc('_albums').collection('items');
  const tasteDoc = col.doc('_taste').collection('items').doc('taste');
  return {
    kind: 'account',
    async list() {
      const snap = await col.get();
      return snap.docs.filter((d) => !d.id.startsWith('_')).map((d) => d.data()).filter(Boolean);
    },
    async save(song) { await col.doc(song.id).set(JSON.parse(JSON.stringify(song))); },
    async remove(songId) { await col.doc(songId).delete(); },
    // 버전 본문은 곡 문서 아래 하위 컬렉션에 따로 둔다 (곡 문서 크기 한도 256KB 때문)
    async putVersion(songId, v) { await col.doc(songId).collection('versions').doc(v.id).set(JSON.parse(JSON.stringify(v))); },
    async getVersion(songId, vid) {
      const snap = await col.doc(songId).collection('versions').doc(vid).get();
      return snap.exists ? snap.data() : null;
    },
    async removeVersion(songId, vid) { await col.doc(songId).collection('versions').doc(vid).delete(); },
    // 앨범은 곡 목록과 섞이지 않게 _albums 문서 아래 하위 컬렉션에 둔다
    async listAlbums() {
      const snap = await albums.get();
      return snap.docs.map((d) => d.data()).filter(Boolean);
    },
    async saveAlbum(album) { await albums.doc(album.id).set(JSON.parse(JSON.stringify(album))); },
    async removeAlbum(id) { await albums.doc(id).delete(); },
    // 취향 프로필·기록은 문서 하나 (기록은 최근 150개로 제한)
    async loadTaste() { const s = await tasteDoc.get(); return s.exists ? s.data() : null; },
    async saveTaste(t) { await tasteDoc.set(JSON.parse(JSON.stringify(t))); },
  };
}

export async function openStore() {
  try {
    const s = await accountStore();
    if (s) return s;
  } catch { /* 계정 저장소 실패 → 로컬 */ }
  return localStore();
}

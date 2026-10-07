// 곡 저장소. 곡 하나 = 문서 하나, 버전 본문은 따로 저장.
// claude.ai 계정 저장소(db, 본인만 보임)를 쓰고, 안 되면 이 브라우저에 저장.

const LOCAL_KEY = 'kpop-writer-songs';
const ALBUM_KEY = 'kpop-writer-albums';

function readKey(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function writeKey(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* 저장 불가: 메모리에만 */ }
}

function localStore() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
  };
  const write = (songs) => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(songs)); } catch { /* 저장 불가: 메모리에만 */ }
  };
  return {
    kind: 'local',
    async list() { return read(); },
    async save(song) {
      const songs = read().filter((s) => s.id !== song.id);
      songs.push(song);
      write(songs);
    },
    async remove(id) { write(read().filter((s) => s.id !== id)); },
    async putVersion(songId, v) {
      try { localStorage.setItem(`${LOCAL_KEY}-v-${songId}-${v.id}`, JSON.stringify(v)); } catch { /* 저장 불가 */ }
    },
    async getVersion(songId, vid) {
      try { return JSON.parse(localStorage.getItem(`${LOCAL_KEY}-v-${songId}-${vid}`) || 'null'); } catch { return null; }
    },
    async removeVersion(songId, vid) {
      try { localStorage.removeItem(`${LOCAL_KEY}-v-${songId}-${vid}`); } catch { /* 무시 */ }
    },
    async listAlbums() { return readKey(ALBUM_KEY); },
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
  return {
    kind: 'account',
    async list() {
      const snap = await col.get();
      return snap.docs.map((d) => d.data()).filter(Boolean);
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
  };
}

export async function openStore() {
  try {
    const s = await accountStore();
    if (s) return s;
  } catch { /* 계정 저장소 실패 → 로컬 */ }
  return localStore();
}

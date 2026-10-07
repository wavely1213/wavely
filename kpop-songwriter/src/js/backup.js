// 전체 백업·복원: 모든 곡(버전 포함)·앨범·취향을 파일 하나로. 마스터 WAV·커버 이미지는 빠진다(용량).
// 되살릴 때는 아무것도 덮어쓰지 않는다: 같은 id가 이미 있고 내용이 다르면 "(백업)" 사본으로 더한다.
import { uid } from './dom.js';
import { MAX_LOG } from './learn/taste.js';
import { unzip } from './music/pack.js';

export const BACKUP_FORMAT = 1;

const clone = (x) => JSON.parse(JSON.stringify(x));
const body = (x) => { const { versions, versionData, updatedAt, ...rest } = x; return JSON.stringify(rest); };

// getVersion(songId, versionId) → { ...meta, data } | null
export async function makeBackup({ songs, albums, taste }, getVersion) {
  const out = [];
  for (const s of songs.filter((x) => !x.example)) {
    const versionData = [];
    for (const v of s.versions || []) {
      const full = await getVersion(s.id, v.id).catch(() => null);
      if (full?.data) versionData.push(full);
    }
    out.push({ ...clone(s), versionData });
  }
  return { app: 'kpop-songwriter', kind: 'backup', format: BACKUP_FORMAT, at: new Date().toISOString(), songs: out, albums: clone(albums), taste: clone(taste) };
}

export function isBackup(x) {
  return !!x && x.kind === 'backup' && x.app === 'kpop-songwriter' && Array.isArray(x.songs);
}

export function backupFileName(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `kpop-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

const validSong = (s) => s && typeof s.id === 'string' && Array.isArray(s.sections) && s.concept && s.style;
const validAlbum = (a) => a && typeof a.id === 'string' && Array.isArray(a.tracks);

// 지금 상태에 백업을 합칠 계획. 반환: { songs: [{ song, versions }], albums, taste, report }
export function planRestore(now, backup) {
  const idMap = {};
  const songs = [];
  let same = 0;
  for (const s of backup.songs.filter(validSong)) {
    const { versionData = [], ...data } = clone(s);
    const existing = now.songs.find((x) => x.id === s.id && !x.example);
    if (existing && body(existing) === body(data)) { same += 1; idMap[s.id] = s.id; continue; }
    const id = existing ? uid() : s.id;
    idMap[s.id] = id;
    songs.push({
      song: { ...data, id, title: existing ? `${String(data.title || '제목 없음').replace(/^예시:\s*/, '')} (백업)` : data.title, example: false, versions: [] },
      versions: versionData.filter((v) => v && v.id && v.data),
    });
  }
  const albums = [];
  for (const a of (backup.albums || []).filter(validAlbum)) {
    const data = clone(a);
    data.tracks = data.tracks.map((t) => ({ ...t, songId: idMap[t.songId] || t.songId }));
    const existing = now.albums.find((x) => x.id === a.id);
    if (existing && body(existing) === body(data)) { same += 1; continue; }
    albums.push({ ...data, id: existing ? uid() : a.id, title: existing ? `${data.title} (백업)` : data.title });
  }
  // 취향: 기록은 합치고(같은 id는 한 번), 정리된 프로필은 지금 것이 비어 있을 때만 백업 것으로
  const cur = now.taste;
  const bt = backup.taste || {};
  const ids = new Set(cur.log.map((e) => e.id));
  const added = (Array.isArray(bt.log) ? bt.log : []).filter((e) => e && e.id && !ids.has(e.id));
  const log = [...cur.log, ...added].sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-MAX_LOG);
  const empty = !cur.profile.lyrics.trim() && !cur.profile.sound.trim() && !cur.profile.avoid.trim();
  const taste = { ...cur, log, profile: empty && bt.profile ? { ...cur.profile, ...bt.profile } : cur.profile };
  return { songs, albums, taste, report: { songs: songs.length, albums: albums.length, same, taste: added.length } };
}

// 가져오기 파일 읽기: .json 또는 (아티팩트에서 받은) .zip 안의 .json
export async function readImportFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const entries = unzip(bytes).filter((e) => /\.json$/i.test(e.name));
    const pick = entries.find((e) => /backup/i.test(e.name)) || entries.find((e) => /project\.json$/i.test(e.name)) || entries[0];
    if (!pick) throw new Error('no json');
    return JSON.parse(new TextDecoder().decode(pick.data));
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

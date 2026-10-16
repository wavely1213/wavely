// 큰 파일(마스터 WAV·커버 이미지)을 브라우저 IndexedDB에 보관한다. 새로고침해도 남는다.
// 브라우저가 막으면(사생활 모드 등) 조용히 실패하고 메모리에만 둔다. 다른 기기로는 넘어가지 않는다.
const DB = 'kpop-writer-files';
const STORE = 'files';
let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return open().then((db) => new Promise((resolve) => {
    if (!db) { resolve(null); return; }
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result ?? null);
      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch { resolve(null); }
  }));
}

export const putFile = (key, value) => run('readwrite', (s) => s.put(value, key));
export const getFile = (key) => run('readonly', (s) => s.get(key));
export const deleteFile = (key) => run('readwrite', (s) => s.delete(key));
// prefix로 시작하는 키 목록 (없거나 막혔으면 [])
export const listKeys = (prefix) => run('readonly', (s) => s.getAllKeys(IDBKeyRange.bound(prefix, `${prefix}\uffff`))).then((v) => v || []);

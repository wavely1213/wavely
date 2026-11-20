// 공개 주소 → 저장소 경로 (순수 함수, 테스트: storage-path.test.ts)
// 동기화가 올린 포스터는 캐시를 가르려고 '?v=<파일 ID>' 를 붙인다(D-096) — 쿼리/해시를 떼어야 지울 수 있다 (총괄 검토 2026-11-15).

/** prefix(…/object/public/media/) 아래 주소만 경로로. skipPrefix(드라이브 자료함 media/drive/) 아래는 뺀다 */
export function bucketPaths(urls: ReadonlyArray<string | null | undefined>, prefix: string, skipPrefix: string): string[] {
  const out: string[] = [];
  for (const u of urls) {
    if (typeof u !== "string") continue;
    const bare = u.replace(/[?#].*$/, "");
    if (!bare.startsWith(prefix) || bare.startsWith(skipPrefix)) continue;
    const path = bare.slice(prefix.length);
    if (path) out.push(path);
  }
  return out;
}

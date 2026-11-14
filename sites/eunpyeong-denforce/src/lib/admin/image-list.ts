// 여러 장 이미지 필드(ImagesField ↔ resolveImages) 계산 — 순수 함수만 둔다 (테스트: image-list.test.ts).
// 클라이언트 폼도 상한값을 쓰므로 server-only 로 두지 않는다.

/** 구단소식 상세 사진 최대 장수 — DB check news_posts_images_max 와 같다 */
export const MAX_NEWS_IMAGES = 20; // 인스타그램 한 게시물 최대 장수 (D-031)

/**
 * 한 번 저장(요청)에 보내는 파일 합계 상한 — 썸네일 포함 폼 전체 (클라이언트 차단용).
 * 서버 액션 본문 한도(next.config bodySizeLimit 6mb)와 Vercel 함수 요청 본문 한도(4.5MB)보다 작게 둔다.
 * 제출 시 AdminForm(maxUploadBytes)이 폼 전체를, 고를 때 ImagesField 가 사진 칸만 바로 검사한다.
 */
export const MAX_UPLOAD_BATCH_BYTES = 4 * 1024 * 1024;

/**
 * 기존 사진 목록에서 지울 것을 빼고 남길 것을 정한다.
 * remove 는 클라이언트가 보낸 값이라 현재 목록에 있는 URL 만 인정한다 (다른 파일을 지우게 할 수 없음).
 */
export function planImageList(current: string[], remove: string[], addCount: number, max: number) {
  const removeSet = new Set(remove);
  const kept = current.filter((u) => !removeSet.has(u));
  const removed = current.filter((u) => removeSet.has(u));
  return { kept, removed, overLimit: kept.length + addCount > max };
}

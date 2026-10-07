// 이 브라우저 저장 공간(localStorage) 사용량. 웹사이트는 곡을 여기에만 저장하므로 거의 차면 미리 알린다.
// 브라우저마다 한도가 다르지만 대개 약 5MB(글자 수 기준, Chromium 약 524만 자). 조금 일찍 알리도록 500만 자로 잡는다.
export const LOCAL_LIMIT = 5_000_000;
export const WARN_AT = 0.7;

// 반환: { used(글자 수), ratio(0~1+) } 또는 null(읽을 수 없음)
export function storageUsage(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    let used = 0;
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      used += k.length + (storage.getItem(k) || '').length;
    }
    return { used, ratio: used / LOCAL_LIMIT };
  } catch {
    return null;
  }
}

// 저장 공간이 꽉 차서 난 오류인지 (브라우저마다 이름·코드가 다르다)
export function isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014 || /quota/i.test(e.message || ''));
}

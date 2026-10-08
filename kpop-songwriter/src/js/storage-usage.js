// 이 브라우저 저장 공간(localStorage) 사용량. 웹사이트는 곡을 여기에만 저장하므로 거의 차면 미리 알린다.
// 한도는 약 5MB지만 세는 법이 다르다: Chromium·Firefox는 글자 수(약 524만 자), WebKit(Safari, iOS의 모든 브라우저)은
// UTF-16 바이트(약 262만 자). 조금 일찍 알리도록 각각 500만·250만 자로 잡는다.
export const LOCAL_LIMIT = 5_000_000;
export const WEBKIT_LIMIT = 2_500_000;
export const WARN_AT = 0.7;

export function isWebKit(ua = globalThis.navigator?.userAgent || '', touch = globalThis.navigator?.maxTouchPoints || 0) {
  if (/iPhone|iPad|iPod/.test(ua)) return true; // iOS는 크롬·파이어폭스도 WebKit
  if (/Macintosh/.test(ua) && touch > 1) return true; // 데스크톱 모드 iPad
  return /AppleWebKit/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(ua);
}

export const limitFor = (ua, touch) => (isWebKit(ua, touch) ? WEBKIT_LIMIT : LOCAL_LIMIT);

// 반환: { used(글자 수), ratio(0~1+) } 또는 null(읽을 수 없음)
export function storageUsage(storage = globalThis.localStorage, limit = limitFor()) {
  if (!storage) return null;
  try {
    let used = 0;
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      used += k.length + (storage.getItem(k) || '').length;
    }
    return { used, ratio: used / limit };
  } catch {
    return null;
  }
}

// 저장 공간이 꽉 차서 난 오류인지 (브라우저마다 이름·코드가 다르다)
export function isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014 || /quota/i.test(e.message || ''));
}

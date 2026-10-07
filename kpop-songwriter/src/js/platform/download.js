// 파일 내려받기: claude.ai 아티팩트에서는 downloads capability(허용 확장자만, zip 권장),
// 일반 웹사이트에서는 <a download>로 바로 저장한다.

let dlPromise;
function artifactDownloads() {
  if (!dlPromise) dlPromise = window.claude?.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
  return dlPromise;
}

export function isArtifact() {
  return !!window.claude?.use;
}

// 반환: 'saved' | 'declined' | 'unavailable'
export async function saveFile(filename, blob) {
  if (isArtifact()) {
    const dl = await artifactDownloads();
    if (!dl) return 'unavailable';
    try {
      await dl.save({ filename, data: blob });
      return 'saved';
    } catch (e) {
      return e?.code === 'declined' ? 'declined' : 'unavailable';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'saved';
}

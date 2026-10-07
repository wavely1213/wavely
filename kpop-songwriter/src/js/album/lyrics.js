// 태그 없는 가사지. 비워 둔 반복 섹션은 앞의 같은 섹션 가사로 채운다. (가사 파일·싱크 가사·홍보 문구에 공통)
export function plainLyrics(song) {
  return song.sections.map((s, i) => {
    let body = s.text.trim();
    if (!body) body = song.sections.slice(0, i).reverse().find((p) => p.type === s.type && p.text.trim())?.text.trim() || '';
    return body;
  }).filter(Boolean).join('\n\n');
}

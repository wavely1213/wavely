// 태그 없는 가사지. 비워 둔 반복 섹션은 앞의 같은 섹션 가사로 채운다. (가사 파일·싱크 가사·홍보 문구에 공통)
export function plainLyrics(song) {
  return song.sections.map((s, i) => {
    let body = s.text.trim();
    if (!body) body = song.sections.slice(0, i).reverse().find((p) => p.type === s.type && p.text.trim())?.text.trim() || '';
    return body;
  }).filter(Boolean).join('\n\n');
}

// 가사지의 빈 줄을 뺀 줄들 (싱크 가사·유사 표현 점검의 단위)
export function lyricLines(song) {
  return plainLyrics(song).split('\n').map((l) => l.trim()).filter(Boolean);
}

// 가사 내용 열쇠: 이게 바뀌면 가사로 만든 결과(싱크·점검)는 낡은 것
export function lyricsKey(song) {
  return lyricLines(song).join('\n');
}

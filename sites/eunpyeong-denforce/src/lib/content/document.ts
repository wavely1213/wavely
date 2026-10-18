// 관리자가 쓰는 긴 문서(개인정보처리방침 등)의 간단한 글 규칙 — 순수 함수 (테스트: document.test.ts)
// '## 제목' 줄은 소제목, '- ' 로 시작하는 줄은 목록, 빈 줄은 문단 나눔. 그 밖의 줄바꿈은 문단 안 줄바꿈으로 둔다.

export type DocBlock = { kind: "heading"; text: string } | { kind: "list"; items: string[] } | { kind: "paragraph"; text: string };

export function parseDocument(src: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "paragraph", text: para.join("\n") });
    if (list.length) blocks.push({ kind: "list", items: list });
    para = [];
    list = [];
  };
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1].trim() });
      continue;
    }
    const item = /^-\s+(.+)$/.exec(line);
    if (item) {
      // 문단 바로 뒤 목록은 문단을 먼저 닫는다
      if (para.length) {
        blocks.push({ kind: "paragraph", text: para.join("\n") });
        para = [];
      }
      list.push(item[1].trim());
      continue;
    }
    if (list.length) {
      blocks.push({ kind: "list", items: list });
      list = [];
    }
    para.push(line);
  }
  flush();
  return blocks;
}

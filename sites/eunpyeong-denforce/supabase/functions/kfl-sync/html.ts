// 연맹(futsal.or.kr) HTML 표 읽기 (D-082, 명세 KFL_RECORDS_SPEC 2.1) — 의존성 없는 표 토크나이저. 순수 함수 (테스트: kfl-html.test.ts)
// table / tr / td / th 를 스택으로 센다. 중첩 표(일정 td[2], 기록지 팀 표)는 그 칸의 tables 로 들어간다.
// 칸의 text 는 그 칸에 바로 든 글자만(중첩 표 글자 제외), html 은 칸 안 원문 전체.

export type Attrs = Record<string, string>;
export type Cell = { tag: "td" | "th"; attrs: Attrs; text: string; html: string; tables: Table[] };
export type Row = { attrs: Attrs; cells: Cell[] };
export type Table = { attrs: Attrs; rows: Row[] };

/** 응답 모양이 예상과 다름 — 일부만 반영하지 않고 멈춘다 */
export class KflShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KflShapeError";
  }
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** 엔티티 해제(세미콜론 없는 &nbsp 도), U+FEFF 제거, NFC(NFKC 아님, I-053), 공백 줄이기, trim */
export function cleanText(raw: string): string {
  return raw
    .replace(/&#x([0-9a-f]+);?/gi, (m, h) => safeCodePoint(parseInt(h, 16), m))
    .replace(/&#(\d+);?/g, (m, d) => safeCodePoint(Number(d), m))
    .replace(/&([a-z]+);?/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/﻿/g, "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function safeCodePoint(n: number, fallback: string): string {
  return Number.isInteger(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : fallback;
}

/** 속성 — 큰따옴표, 작은따옴표(colspan='22'), 따옴표 없음. 이름은 소문자 */
export function parseAttrs(src: string): Attrs {
  const out: Attrs = {};
  for (const m of src.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

type OpenTable = { table: Table; row: Row | null; cell: Cell | null; cellStart: number; textParts: string[] };

/** 문서의 바깥 표들 (중첩 표는 칸의 tables 안) */
export function parseTables(html: string): Table[] {
  const src = html.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length)).replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, (m) => " ".repeat(m.length));
  const top: Table[] = [];
  const stack: OpenTable[] = [];

  const closeCell = (t: OpenTable, end: number) => {
    if (!t.cell) return;
    t.cell.html = src.slice(t.cellStart, end);
    t.cell.text = cleanText(t.textParts.join(""));
    t.cell = null;
    t.textParts = [];
  };
  const closeRow = (t: OpenTable, end: number) => {
    closeCell(t, end);
    t.row = null;
  };

  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)|(<)/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const cur = stack[stack.length - 1];
    if (m[4] !== undefined || m[5] !== undefined) {
      if (cur?.cell) cur.textParts.push(m[4] ?? m[5]);
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (tag === "table") {
      if (!closing) {
        const table: Table = { attrs: parseAttrs(m[3]), rows: [] };
        if (cur?.cell) cur.cell.tables.push(table);
        else if (cur) {
          // 칸 밖에 놓인 표(잘못된 HTML) — 바깥 목록에 둔다
          top.push(table);
        } else top.push(table);
        stack.push({ table, row: null, cell: null, cellStart: 0, textParts: [] });
      } else if (cur) {
        closeRow(cur, m.index);
        stack.pop();
      }
      continue;
    }
    if (!cur) continue;
    if (tag === "tr") {
      if (!closing) {
        closeRow(cur, m.index);
        cur.row = { attrs: parseAttrs(m[3]), cells: [] };
        cur.table.rows.push(cur.row);
      } else closeRow(cur, m.index);
      continue;
    }
    if (tag === "td" || tag === "th") {
      if (!closing) {
        closeCell(cur, m.index);
        if (!cur.row) {
          cur.row = { attrs: {}, cells: [] };
          cur.table.rows.push(cur.row);
        }
        cur.cell = { tag, attrs: parseAttrs(m[3]), text: "", html: "", tables: [] };
        cur.row.cells.push(cur.cell);
        cur.cellStart = m.index + m[0].length;
      } else closeCell(cur, m.index);
      continue;
    }
    // 그 밖의 태그: <br> 은 줄바꿈 글자로, 나머지는 글자 없음
    if (cur.cell && tag === "br") cur.textParts.push("\n");
  }
  // 닫히지 않은 표 (방어)
  for (let i = stack.length - 1; i >= 0; i--) closeRow(stack[i], src.length);
  return top;
}

/** 표 안팎 모든 표 (깊이 우선) */
export function allTables(tables: Table[]): Table[] {
  const out: Table[] = [];
  const walk = (t: Table) => {
    out.push(t);
    for (const r of t.rows) for (const c of r.cells) c.tables.forEach(walk);
  };
  tables.forEach(walk);
  return out;
}

/** class 속성에 이 이름이 있는지 */
export function hasClass(attrs: Attrs, name: string): boolean {
  return (attrs.class ?? "").split(/\s+/).includes(name);
}

/** 응답 바이트 → 글자. UTF-8 만 받는다(euc-kr 분기 없음, 명세 2.1) */
export function decodeUtf8(bytes: Uint8Array, contentType: string | null): string {
  if (!/charset\s*=\s*utf-?8/i.test(contentType ?? "")) throw new KflShapeError(`content-type 이 UTF-8 이 아님: ${contentType ?? "(없음)"}`);
  return new TextDecoder("utf-8").decode(bytes);
}

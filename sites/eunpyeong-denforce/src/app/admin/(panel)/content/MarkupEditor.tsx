"use client";

import { useRef, useState } from "react";
import { useFieldDefault, useFieldError } from "@/components/admin/AdminForm";
import styles from "@/components/admin/admin.module.css";
import { MarkupGroups } from "@/components/ui/MarkupGroups";
import { parseMarkup, renderMarkup, serializeMarkup, type MarkupGroup } from "@/lib/content/markup";
import local from "./content.module.css";

/** 편집기에 보여 줄 값 이름 — value 는 지금 저장된 실제 값 (미리보기용), kind 는 메일 링크/전화번호로 보일 값 */
export type TokenInfo = { name: string; desc: string; value: string | null; kind?: "email" | "phone" };

const EMPTY: MarkupGroup = { label: "", value: "" };

function toEditable(src: string, multiline: boolean): MarkupGroup[][] {
  const lines = parseMarkup(src);
  if (lines.length === 0) return [[{ ...EMPTY }]];
  // 한 줄 칸에 여러 줄이 저장돼 있으면(직접 고친 DB 등) 한 줄로 합친다
  return multiline ? lines : [lines.flat()];
}

/**
 * 푸터 정보 줄 편집기 (D-048) — 줄마다 '이름표 + 값' 칸을 더하고/빼고/줄 순서를 바꾼다.
 * 저장 값은 숨은 칸(name)에 '**이름표** 값' 글로 들어간다 (서버는 일반 글 칸처럼 검사·저장).
 */
export function MarkupEditor({
  name,
  label,
  hint,
  defaultValue,
  multiline,
  tokens,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string;
  multiline: boolean;
  tokens: TokenInfo[];
}) {
  const error = useFieldError(name);
  const initial = useFieldDefault(name, defaultValue);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [lines, setLines] = useState(() => toEditable(initial, multiline));
  // 저장 후(액션이 돌려준 값) 또는 오류 후(제출한 값) 기본값이 바뀌면 편집 상태도 맞춘다
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setLines(toEditable(initial, multiline));
  }
  /** 마지막으로 고른 '값' 칸 — 값 이름 단추가 여기에 넣는다 */
  const focus = useRef<{ line: number; group: number } | null>(null);

  const update = (fn: (draft: MarkupGroup[][]) => void) =>
    setLines((cur) => {
      const draft = cur.map((l) => l.map((g) => ({ ...g })));
      fn(draft);
      return draft;
    });

  const setField = (li: number, gi: number, key: keyof MarkupGroup, v: string) =>
    update((d) => {
      d[li][gi][key] = v;
    });
  const addGroup = (li: number) =>
    update((d) => {
      d[li].push({ ...EMPTY });
    });
  const removeGroup = (li: number, gi: number) =>
    update((d) => {
      d[li].splice(gi, 1);
      if (d[li].length === 0) d.splice(li, 1);
      if (d.length === 0) d.push([{ ...EMPTY }]);
      focus.current = null;
    });
  const addLine = () =>
    update((d) => {
      d.push([{ ...EMPTY }]);
    });
  const removeLine = (li: number) =>
    update((d) => {
      d.splice(li, 1);
      if (d.length === 0) d.push([{ ...EMPTY }]);
      focus.current = null;
    });
  const moveLine = (li: number, dir: -1 | 1) =>
    update((d) => {
      const to = li + dir;
      if (to < 0 || to >= d.length) return;
      [d[li], d[to]] = [d[to], d[li]];
      focus.current = null;
    });
  const insertToken = (token: string) =>
    update((d) => {
      const at = focus.current && d[focus.current.line]?.[focus.current.group] ? focus.current : { line: d.length - 1, group: d[d.length - 1].length - 1 };
      const g = d[at.line][at.group];
      g.value = g.value ? `${g.value} {${token}}` : `{${token}}`;
    });

  const serialized = serializeMarkup(lines);
  const preview = renderMarkup(
    serialized,
    Object.fromEntries(tokens.map((t) => [t.name, t.value])),
    Object.fromEntries(tokens.flatMap((t) => (t.kind ? [[t.name, t.kind]] : []))),
  );

  return (
    <div className={styles.field} role="group" aria-labelledby={`l-${name}`}>
      <span className={styles.label} id={`l-${name}`}>
        {label}
      </span>
      <div className={local.mkLines}>
        {lines.map((groups, li) => (
          <div key={li} className={local.mkLine}>
            {multiline && (
              <div className={local.mkLineHead}>
                <strong>{li + 1}번째 줄</strong>
                <span className={local.mkTools}>
                  <button type="button" className={local.mkTool} onClick={() => moveLine(li, -1)} disabled={li === 0} aria-label={`${li + 1}번째 줄 위로`}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className={local.mkTool}
                    onClick={() => moveLine(li, 1)}
                    disabled={li === lines.length - 1}
                    aria-label={`${li + 1}번째 줄 아래로`}
                  >
                    ↓
                  </button>
                  <button type="button" className={local.mkTool} onClick={() => removeLine(li)}>
                    줄 삭제
                  </button>
                </span>
              </div>
            )}
            {groups.map((g, gi) => (
              <div key={gi} className={local.mkGroup}>
                <input
                  className={`${styles.input} ${local.mkLabel}`}
                  value={g.label}
                  maxLength={20}
                  placeholder="이름표 (예: 창단)"
                  aria-label={`${li + 1}번째 줄 ${gi + 1}번째 칸 이름표`}
                  onChange={(e) => setField(li, gi, "label", e.target.value)}
                />
                <input
                  className={styles.input}
                  value={g.value}
                  maxLength={300}
                  placeholder="값 (예: {창단연도} 또는 직접 입력)"
                  aria-label={`${li + 1}번째 줄 ${gi + 1}번째 칸 값`}
                  onFocus={() => (focus.current = { line: li, group: gi })}
                  onChange={(e) => setField(li, gi, "value", e.target.value)}
                />
                <button type="button" className={local.mkTool} onClick={() => removeGroup(li, gi)} aria-label={`${li + 1}번째 줄 ${gi + 1}번째 칸 삭제`}>
                  칸 삭제
                </button>
              </div>
            ))}
            <button type="button" className={local.mkAdd} onClick={() => addGroup(li)}>
              + 이 줄에 칸 추가
            </button>
          </div>
        ))}
      </div>
      {multiline && (
        <button type="button" className={`${styles.buttonGhost} ${styles.buttonSmall} ${local.mkAddLine}`} onClick={addLine}>
          + 줄 추가
        </button>
      )}

      <div className={local.mkTokens}>
        <span className={styles.hint}>넣을 수 있는 값 — 누르면 마지막으로 고른 &apos;값&apos; 칸에 들어가고, 홈페이지에서는 실제 값으로 바뀝니다:</span>
        <div className={local.mkTokenList}>
          {tokens.map((t) => (
            <button key={t.name} type="button" className={local.mkToken} onClick={() => insertToken(t.name)} title={t.desc}>
              {`{${t.name}}`}
            </button>
          ))}
        </div>
        <details className={local.mkHelp}>
          <summary>값 설명 보기</summary>
          <ul>
            {tokens.map((t) => (
              <li key={t.name}>
                <code>{`{${t.name}}`}</code> {t.desc} — 지금: {t.value?.trim() ? t.value : "(비어 있음 — 이 값만 있는 칸은 숨겨집니다)"}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className={local.mkPreview} aria-label={`${label} 미리보기`}>
        <span className={local.mkPreviewTitle}>미리보기</span>
        {preview.length === 0 ? (
          <p>(보이는 내용 없음)</p>
        ) : (
          preview.map((line, i) => (
            <p key={i}>
              <MarkupGroups groups={line} classes={{ group: local.pvGroup, label: local.pvLabel, nowrap: local.pvNowrap }} />
            </p>
          ))
        )}
      </div>

      <input type="hidden" name={name} value={serialized} />
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

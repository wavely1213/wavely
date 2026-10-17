"use client";

import { useState, type ReactNode } from "react";
import { useFieldDefault, useFieldError } from "./AdminForm";
import styles from "./admin.module.css";

// 관리자 폼 입력 필드 — name 이 서버 액션의 FormReader 키와 같아야 오류가 표시된다.

type Base = { name: string; label: string; hint?: string; required?: boolean };

function FieldShell({ name, label, hint, required, children }: Base & { children: ReactNode }) {
  const error = useFieldError(name);
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`f-${name}`}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && (
        <span className={styles.error} id={`e-${name}`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

export function TextField({
  type = "text",
  defaultValue,
  placeholder,
  maxLength,
  ...base
}: Base & {
  type?: "text" | "email" | "password" | "url" | "number" | "date" | "time" | "tel";
  defaultValue?: string | number | null;
  placeholder?: string;
  maxLength?: number;
}) {
  const error = useFieldError(base.name);
  const value = useFieldDefault(base.name, defaultValue == null ? "" : String(defaultValue));
  return (
    <FieldShell {...base}>
      <input
        id={`f-${base.name}`}
        name={base.name}
        type={type}
        defaultValue={type === "password" ? "" : value}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`${styles.input} ${error ? styles.invalid : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `e-${base.name}` : undefined}
      />
    </FieldShell>
  );
}

export function TextArea({
  defaultValue,
  rows = 8,
  placeholder,
  ...base
}: Base & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  const error = useFieldError(base.name);
  const value = useFieldDefault(base.name, defaultValue ?? "");
  return (
    <FieldShell {...base}>
      <textarea
        id={`f-${base.name}`}
        name={base.name}
        rows={rows}
        defaultValue={value}
        placeholder={placeholder}
        className={`${styles.textarea} ${error ? styles.invalid : ""}`}
        aria-invalid={Boolean(error)}
      />
    </FieldShell>
  );
}

export function SelectField({
  options,
  defaultValue,
  ...base
}: Base & { options: Array<{ value: string; label: string }>; defaultValue?: string }) {
  const error = useFieldError(base.name);
  const value = useFieldDefault(base.name, defaultValue ?? options[0]?.value ?? "");
  return (
    <FieldShell {...base}>
      {/* key: React 는 select 의 defaultValue 변경을 기본 선택에 반영하지 않아, 액션 후 form.reset()
          이 처음 값으로 되돌린다. 제출값이 바뀌면 다시 마운트해서 고른 값을 유지한다. */}
      <select
        key={value}
        id={`f-${base.name}`}
        name={base.name}
        defaultValue={value}
        className={`${styles.select} ${error ? styles.invalid : ""}`}
        aria-invalid={Boolean(error)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  // 제출 후에는 제출값 기준 (체크 안 한 칸은 FormData 에 없음 → "")
  const checked = useFieldDefault(name, defaultChecked ? "on" : "") === "on";
  return (
    <label className={styles.check}>
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}

/**
 * 이미지 업로드 — 서버의 resolveImage() 규약: <name> 파일, <name>_remove 체크 시 제거.
 * defaultUrl: 올린 이미지가 없을 때 대신 쓰이는 기본 이미지를 보여준다 (예: 링크 미리보기 — D-037).
 * accept: 고를 수 있는 형식 (서버 검사와 맞춘다)
 * removable: false 면 '현재 이미지 삭제'를 두지 않는다 (사진이 꼭 있어야 하는 칸 — 새 사진을 올리면 바뀐다)
 */
export function ImageField({
  currentUrl,
  defaultUrl,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  removable = true,
  ...base
}: Base & { currentUrl?: string | null; defaultUrl?: string; accept?: string; removable?: boolean }) {
  const error = useFieldError(base.name);
  const previewUrl = currentUrl || defaultUrl;
  return (
    <FieldShell {...base} hint={base.hint ?? "JPG/PNG/WEBP/GIF, 5MB 이하"}>
      {previewUrl && (
        // 관리자 미리보기는 원본 그대로 보여준다 (최적화 불필요)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={currentUrl ? "현재 이미지" : "기본 이미지"} className={styles.imagePreview} />
      )}
      {!currentUrl && defaultUrl && <span className={styles.hint}>지금은 기본 이미지를 쓰고 있습니다</span>}
      <input
        id={`f-${base.name}`}
        name={base.name}
        type="file"
        accept={accept}
        className={`${styles.input} ${error ? styles.invalid : ""}`}
        aria-invalid={Boolean(error)}
      />
      {currentUrl && removable && (
        <CheckboxField name={`${base.name}_remove`} label={defaultUrl ? "올린 이미지 삭제 (기본 이미지로)" : "현재 이미지 삭제"} />
      )}
    </FieldShell>
  );
}

/**
 * 사진 여러 장 — 서버의 resolveImages() 규약: <name> 새 파일 여러 개, <name>_remove 에 지울 기존 사진 URL.
 * 고른 파일 합계가 batchBytes 를 넘으면 선택을 비우고 안내한다 (서버 요청 본문 한도 — image-list.ts).
 */
export function ImagesField({
  currentUrls = [],
  batchBytes,
  ...base
}: Base & { currentUrls?: string[]; batchBytes: number }) {
  const error = useFieldError(base.name);
  const [tooLarge, setTooLarge] = useState(false);
  return (
    <FieldShell {...base}>
      {currentUrls.length > 0 && (
        <ul className={styles.imageList}>
          {currentUrls.map((url, i) => (
            <li key={url}>
              {/* 관리자 미리보기는 원본 그대로 보여준다 (최적화 불필요) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`현재 사진 ${i + 1}`} className={styles.imagePreview} />
              <label className={styles.check}>
                <input type="checkbox" name={`${base.name}_remove`} value={url} />
                삭제
              </label>
            </li>
          ))}
        </ul>
      )}
      <input
        id={`f-${base.name}`}
        name={base.name}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className={`${styles.input} ${error || tooLarge ? styles.invalid : ""}`}
        aria-invalid={Boolean(error) || tooLarge}
        onChange={(e) => {
          const total = Array.from(e.currentTarget.files ?? []).reduce((sum, f) => sum + f.size, 0);
          const over = total > batchBytes;
          if (over) e.currentTarget.value = "";
          setTooLarge(over);
        }}
      />
      {tooLarge && (
        <span className={styles.error} role="alert">
          한 번에 합계 {Math.floor(batchBytes / 1024 / 1024)}MB 이하로 골라 주세요. 나눠서 여러 번 저장하면 됩니다.
        </span>
      )}
    </FieldShell>
  );
}

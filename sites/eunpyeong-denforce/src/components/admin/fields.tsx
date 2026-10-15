"use client";

import type { ReactNode } from "react";
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
      <select
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

/** 이미지 업로드 — 서버의 resolveImage() 규약: <name> 파일, <name>_remove 체크 시 제거 */
export function ImageField({ currentUrl, ...base }: Base & { currentUrl?: string | null }) {
  const error = useFieldError(base.name);
  return (
    <FieldShell {...base} hint={base.hint ?? "JPG·PNG·WEBP·GIF, 5MB 이하"}>
      {currentUrl && (
        // 관리자 미리보기는 원본 그대로 보여준다 (최적화 불필요)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="현재 이미지" className={styles.imagePreview} />
      )}
      <input
        id={`f-${base.name}`}
        name={base.name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className={`${styles.input} ${error ? styles.invalid : ""}`}
        aria-invalid={Boolean(error)}
      />
      {currentUrl && <CheckboxField name={`${base.name}_remove`} label="현재 이미지 삭제" />}
    </FieldShell>
  );
}

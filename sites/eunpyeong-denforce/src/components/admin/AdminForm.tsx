"use client";

import { createContext, useActionState, useContext, useState, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/admin/form";
import styles from "./admin.module.css";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>({});

/** 필드 컴포넌트가 서버 액션의 필드 오류를 읽는다 */
export function useFieldError(name: string) {
  return useContext(FormStateContext).errors?.[name];
}

/**
 * 필드 기본값 — 제출 후(오류)에는 제출했던 값을, 처음에는 fallback 을 쓴다.
 * React 19 의 액션 후 폼 초기화가 이 값으로 되돌리므로 입력이 지워지지 않는다.
 */
export function useFieldDefault(name: string, fallback: string): string {
  const values = useContext(FormStateContext).values;
  return values ? (values[name] ?? "") : fallback;
}

/**
 * 관리자 폼 — 서버 액션 + useActionState. 성공 시 액션이 redirect 하거나 ok 메시지를 돌려준다.
 * 이미지 업로드가 있으므로 multipart 로 전송된다 (서버 액션 기본 동작).
 * maxUploadBytes: 한 번 저장에 보내는 파일 합계 상한. 넘으면 보내지 않고 안내한다 — 요청 본문 한도를
 * 넘으면 서버 액션이 실행되지 못하고 오류 화면으로 바뀌어 입력이 사라지기 때문 (D-017).
 */
export function AdminForm({
  action,
  submitLabel = "저장",
  maxUploadBytes,
  children,
  footer,
}: {
  action: Action;
  submitLabel?: string;
  maxUploadBytes?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // onSubmit 에서 preventDefault 하면 React 가 폼 액션을 실행하지 않는다
  function checkUploadSize(e: FormEvent<HTMLFormElement>) {
    if (!maxUploadBytes) return;
    let total = 0;
    new FormData(e.currentTarget).forEach((v) => {
      if (v instanceof File) total += v.size;
    });
    if (total > maxUploadBytes) {
      e.preventDefault();
      setUploadError(
        `한 번 저장에 올리는 파일(썸네일 포함)은 합계 ${Math.floor(maxUploadBytes / 1024 / 1024)}MB 이하여야 합니다. 사진을 나눠서 여러 번 저장해 주세요.`,
      );
    } else {
      setUploadError(null);
    }
  }

  const message = uploadError ?? state.message;
  return (
    <FormStateContext.Provider value={state}>
      <form action={formAction} onSubmit={checkUploadSize} className={styles.form} noValidate>
        {message && (
          <p className={`${styles.formMessage} ${!uploadError && state.ok ? styles.formMessageOk : ""}`} role="status">
            {message}
          </p>
        )}
        {children}
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={pending}>
            {pending ? "저장 중…" : submitLabel}
          </button>
          {footer}
        </div>
      </form>
    </FormStateContext.Provider>
  );
}

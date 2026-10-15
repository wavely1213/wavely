"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";
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
 */
export function AdminForm({
  action,
  submitLabel = "저장",
  children,
  footer,
}: {
  action: Action;
  submitLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <FormStateContext.Provider value={state}>
      <form action={formAction} className={styles.form} noValidate>
        {state.message && (
          <p className={`${styles.formMessage} ${state.ok ? styles.formMessageOk : ""}`} role="status">
            {state.message}
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

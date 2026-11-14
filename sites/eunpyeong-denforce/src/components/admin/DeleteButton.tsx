"use client";

import { useFormStatus } from "react-dom";
import styles from "./admin.module.css";

function Submit({ label, small }: { label: string; small: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${styles.buttonDanger} ${small ? styles.buttonSmall : ""}`} disabled={pending}>
      {pending ? "삭제 중…" : label}
    </button>
  );
}

/** 삭제 버튼 — 확인 창을 거친 뒤 서버 액션 실행. action 은 id 가 bind 된 서버 액션. small: 목록 줄 안에 넣는 작은 크기 */
export function DeleteButton({
  action,
  confirmText = "삭제하면 되돌릴 수 없습니다. 삭제할까요?",
  label = "삭제",
  small = false,
}: {
  action: () => Promise<void>;
  confirmText?: string;
  label?: string;
  small?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <Submit label={label} small={small} />
    </form>
  );
}

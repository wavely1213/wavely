"use client";

import { useEffect, useState } from "react";
import styles from "./ShareButton.module.css";

/** '링크를 복사했습니다' 가 보이는 시간 */
const MESSAGE_MS = 2500;

const MESSAGE = {
  copied: "링크를 복사했습니다",
  failed: "링크를 복사하지 못했습니다",
} as const;

/**
 * 글 공유 — 공유 창을 지원하는 기기(휴대폰 등)는 공유 창(navigator.share), 아니면 이 페이지 주소를 복사하고
 * 잠깐 '링크를 복사했습니다'를 보인다 (화면 읽기 프로그램에도 읽힌다)
 */
export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState<keyof typeof MESSAGE | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), MESSAGE_MS);
    return () => window.clearTimeout(t);
  }, [message]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // 공유 창을 닫은 것(AbortError)은 그대로 끝, 그 밖의 실패(권한 등)는 주소 복사로
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("copied");
    } catch {
      setMessage("failed"); // 클립보드 권한이 막힌 브라우저
    }
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.button} onClick={share}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        공유
      </button>
      <span className={styles.message} role="status">
        {message ? MESSAGE[message] : ""}
      </span>
    </span>
  );
}

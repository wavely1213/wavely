"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { stepIndex, swipeStep } from "@/lib/viewer";
import styles from "./NewsGallery.module.css";

// 구단소식 상세 사진 (D-017) — 자르지 않고 원본 비율로, PC 두 칸 / 모바일 한 칸.
// width·height 는 로드 전 자리 비율(인스타그램 4:5)일 뿐, 로드 후에는 실제 비율로 보인다.
// 사진을 누르면 화면 가득 크게 보기 — 이전/다음 버튼, 'n / N', 닫기(Esc), 좌우 화살표 키, 휴대폰은 옆으로 밀기.

export function NewsGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openers = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;
  const isOpen = index !== null;

  // 열 때: 모달로 띄워(뒤 페이지는 누를 수 없다) 닫기 버튼으로 초점을 옮기고, 뒤 페이지 스크롤을 잠근다
  useEffect(() => {
    const d = dialog.current;
    if (!isOpen || !d) return;
    if (!d.open) d.showModal();
    closeButton.current?.focus();
    // body 에 걸면 화면(viewport) 스크롤이 잠기고 지금 위치·상단 고정 메뉴는 그대로다
    const body = document.body;
    const before = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = before;
    };
  }, [isOpen]);

  const go = (step: number) => setIndex((i) => (i === null ? i : stepIndex(i, step, count)));

  // 닫기 버튼·Esc 모두 dialog 의 close 로 온다 — 마지막에 보던 사진으로 초점을 돌려준다
  const onClose = () => {
    const last = index;
    setIndex(null);
    if (last !== null) openers.current[last]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!step || count < 2) return;
    e.preventDefault();
    go(step);
  };

  // 한 손가락으로 옆으로 밀면 넘긴다 (두 손가락 확대는 넘기지 않는다)
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t || count < 2) return;
    const step = swipeStep(t.clientX - start.x, t.clientY - start.y);
    if (step) go(step);
  };

  return (
    <>
      <ul className={styles.grid}>
        {images.map((src, i) => (
          <li key={`${i}:${src}`}>
            <button
              type="button"
              ref={(el) => {
                openers.current[i] = el;
              }}
              className={styles.open}
              onClick={() => setIndex(i)}
              aria-label={`사진 ${i + 1} 크게 보기`}
            >
              <Image
                src={src}
                alt={`${title} 사진 ${i + 1}`}
                width={1080}
                height={1350}
                sizes="(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 600px"
                className={styles.image}
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialog} className={styles.viewer} aria-label={`${title} 사진`} onClose={onClose} onKeyDown={onKeyDown}>
        {index !== null && (
          <>
            <div className={styles.bar}>
              {count > 1 && (
                <p className={styles.counter} aria-live="polite">
                  {index + 1} / {count}
                </p>
              )}
              <button
                ref={closeButton}
                type="button"
                className={`${styles.control} ${styles.close}`}
                onClick={() => dialog.current?.close()}
                aria-label="닫기"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              </button>
            </div>
            <div className={styles.stage} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <Image
                key={images[index]}
                src={images[index]}
                alt={`${title} 사진 ${index + 1}`}
                fill
                sizes="100vw"
                loading="eager"
                className={styles.photo}
              />
              {count > 1 && (
                <>
                  <button type="button" className={`${styles.control} ${styles.prev}`} onClick={() => go(-1)} aria-label="이전 사진">
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" />
                    </svg>
                  </button>
                  <button type="button" className={`${styles.control} ${styles.next}`} onClick={() => go(1)} aria-label="다음 사진">
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

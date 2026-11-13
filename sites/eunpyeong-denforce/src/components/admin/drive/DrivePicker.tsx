"use client";

import { useRef, useState } from "react";
import type { DriveImportResult, DrivePurpose } from "@/lib/admin/drive";
import admin from "../admin.module.css";
import { DriveBrowser, type DriveAccept } from "./DriveBrowser";
import styles from "./drive.module.css";

/**
 * 폼 칸의 '드라이브에서 가져오기' (D-081) — 버튼을 누르면 선택창에서 드라이브 자료함을 열고,
 * 가져온 결과(성공한 것)를 onPick 으로 넘긴 뒤 닫는다. 실패한 파일은 선택창에 안내를 남긴다.
 */
export function DrivePicker({
  purpose,
  accept,
  max,
  label = "드라이브에서 가져오기",
  onPick,
}: {
  purpose: DrivePurpose;
  accept: readonly DriveAccept[];
  max: number;
  label?: string;
  onPick: (results: Exclude<DriveImportResult, { error: string }>[]) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);

  const show = () => {
    setOpened(true);
    setFailed([]);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" className={admin.buttonGhost} onClick={show} disabled={max < 1}>
        {label}
      </button>
      <dialog ref={ref} className={styles.dialog} aria-label={label} onClose={() => setOpened(false)}>
        <div className={styles.dialogHead}>
          <h2 className={styles.dialogTitle}>드라이브 자료함</h2>
          <button type="button" className={admin.buttonGhost} onClick={close}>
            닫기
          </button>
        </div>
        <div className={styles.dialogBody}>
          {failed.length > 0 && (
            <ul className={styles.results} role="alert">
              {failed.map((f) => (
                <li key={f} className={styles.resultError}>
                  {f}
                </li>
              ))}
            </ul>
          )}
          {/* 열 때마다 새로 읽는다 — 닫혀 있는 동안은 드라이브를 부르지 않는다 */}
          {opened && (
            <DriveBrowser
              purpose={purpose}
              accept={accept}
              max={max}
              importLabel="고른 파일 넣기"
              onImported={(results) => {
                const ok = results.filter((r): r is Exclude<DriveImportResult, { error: string }> => !("error" in r));
                const bad = results.filter((r): r is Extract<DriveImportResult, { error: string }> => "error" in r);
                if (ok.length > 0) onPick(ok);
                if (bad.length > 0) setFailed(bad.map((b) => b.error));
                else close();
              }}
            />
          )}
        </div>
      </dialog>
    </>
  );
}

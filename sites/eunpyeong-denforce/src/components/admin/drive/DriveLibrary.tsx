"use client";

import { useState } from "react";
import type { DriveImportResult } from "@/lib/admin/drive";
import { DriveBrowser } from "./DriveBrowser";
import { CopyButton } from "./RecentImports";
import styles from "./drive.module.css";

/** 자료함 화면의 탐색 + 방금 가져온 결과 (주소 복사) — D-081 */
export function DriveLibrary() {
  const [results, setResults] = useState<DriveImportResult[]>([]);
  return (
    <div className={styles.browser}>
      <DriveBrowser purpose="library" accept={["image", "video"]} max={20} onImported={setResults} />
      {results.length > 0 && (
        <ul className={styles.results} aria-live="polite">
          {results.map((r) =>
            "error" in r ? (
              <li key={r.id} className={styles.resultError}>
                {r.error}
              </li>
            ) : (
              <li key={r.id}>
                <strong>{r.name || r.id}</strong>
                {r.kind === "video" ? (
                  <>
                    영상 링크 <CopyButton text={r.viewUrl} />
                    {r.url && (
                      <>
                        표지 <CopyButton text={r.url} />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    가져옴 <CopyButton text={r.url} />
                  </>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

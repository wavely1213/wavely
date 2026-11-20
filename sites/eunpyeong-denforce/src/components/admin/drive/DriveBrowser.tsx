"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { importDrive, listDrive } from "@/lib/admin/drive-actions";
import { formatBytes, type DriveImportResult, type DriveItem, type DriveListing, type DrivePurpose } from "@/lib/admin/drive";
import { formatPostDate } from "@/lib/format";
import admin from "../admin.module.css";
import styles from "./drive.module.css";

export type DriveAccept = "image" | "video";

/**
 * 드라이브 자료함 탐색 (D-081) — 폴더 경로, 썸네일 격자, 고르기, 가져오기.
 * 자료함 화면(관리자 › 드라이브 자료함)과 폼 칸의 선택창이 같이 쓴다.
 * max: 고를 수 있는 수 (1 이면 누르면 바로 바뀐다). 가져오면 onImported 로 결과를 넘긴다 (실패한 파일은 error).
 */
export function DriveBrowser({
  purpose,
  accept,
  max,
  onImported,
  importLabel = "가져오기",
}: {
  purpose: DrivePurpose;
  accept: readonly DriveAccept[];
  max: number;
  onImported: (results: DriveImportResult[]) => void;
  importLabel?: string;
}) {
  const [listing, setListing] = useState<DriveListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DriveItem[]>([]);
  const [loading, startLoading] = useTransition();
  const [importing, startImport] = useTransition();

  const open = useCallback((folderId?: string, pageToken?: string) => {
    startLoading(async () => {
      const r = await listDrive(folderId, pageToken);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setListing((prev) => (pageToken && prev ? { ...r.data, items: [...prev.items, ...r.data.items] } : r.data));
      if (!pageToken) setSelected([]);
    });
  }, []);

  useEffect(() => {
    open();
  }, [open]);

  const items = (listing?.items ?? []).filter((i) => i.kind === "folder" || (accept as readonly string[]).includes(i.kind));

  const toggle = (item: DriveItem) => {
    setSelected((cur) => {
      if (cur.some((s) => s.id === item.id)) return cur.filter((s) => s.id !== item.id);
      if (max === 1) return [item];
      return cur.length >= max ? cur : [...cur, item];
    });
  };

  const runImport = () => {
    const ids = selected.map((s) => s.id);
    startImport(async () => {
      const r = await importDrive(ids, purpose);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setSelected([]);
      onImported(r.data.map((x) => ("error" in x ? x : { ...x, name: x.name || selected.find((s) => s.id === x.id)?.name || "" })));
    });
  };

  return (
    <div className={styles.browser}>
      {listing && (
        <nav className={styles.path} aria-label="폴더 경로">
          {listing.path.map((p, i) =>
            i === listing.path.length - 1 ? (
              <span key={p.id} className={styles.crumbNow} aria-current="location">
                {p.name || "드라이브"}
              </span>
            ) : (
              <span key={p.id} className={styles.pickRow}>
                <button type="button" className={styles.crumb} onClick={() => open(p.id)}>
                  {p.name || "드라이브"}
                </button>
                <span className={styles.sep} aria-hidden="true">
                  ›
                </span>
              </span>
            ),
          )}
        </nav>
      )}

      {error && (
        <p className={admin.formMessage} role="alert">
          {error}
        </p>
      )}
      {loading && !listing && <p className={styles.status}>드라이브를 여는 중입니다.</p>}
      {listing && items.length === 0 && !loading && <p className={styles.status}>이 폴더에 고를 수 있는 파일이 없습니다.</p>}

      {items.length > 0 && (
        <ul className={styles.grid} aria-busy={loading}>
          {items.map((item) => {
            const on = selected.some((s) => s.id === item.id);
            return (
              <li key={item.id}>
                {item.kind === "folder" ? (
                  <button type="button" className={styles.tile} onClick={() => open(item.id)}>
                    <span className={styles.thumb}>
                      <span className={`${styles.glyph} ${styles.folderGlyph}`}>폴더</span>
                    </span>
                    <span className={styles.name}>{item.name}</span>
                  </button>
                ) : (
                  <button type="button" className={styles.tile} aria-pressed={on} onClick={() => toggle(item)}>
                    <span className={styles.thumb}>
                      {item.thumbnail ? (
                        // 드라이브 썸네일 (관리자 미리보기, 최적화 불필요)
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <span className={styles.glyph}>{item.kind === "video" ? "영상" : "사진"}</span>
                      )}
                      {item.kind === "video" && <span className={styles.badge}>영상</span>}
                    </span>
                    {on && (
                      <span className={styles.check} aria-hidden="true">
                        ✓
                      </span>
                    )}
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.meta}>
                      {[formatBytes(item.size), item.modifiedTime ? formatPostDate(item.modifiedTime.slice(0, 10)) : ""].filter(Boolean).join(" / ")}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {listing?.nextPageToken && (
        <button type="button" className={admin.buttonGhost} disabled={loading} onClick={() => open(listing.folder.id, listing.nextPageToken ?? undefined)}>
          더 보기
        </button>
      )}

      <div className={styles.bar}>
        <button type="button" className={admin.button} disabled={selected.length === 0 || importing} onClick={runImport}>
          {importing ? "가져오는 중" : `${importLabel}${selected.length > 0 ? ` (${selected.length})` : ""}`}
        </button>
        <span className={styles.status} aria-live="polite">
          {max > 1 ? `최대 ${max}개까지 고를 수 있습니다.` : "하나를 고르세요."} 사진은 긴 변 1600 으로 저장소에 옮기고, 영상은 링크와 표지만 가져옵니다.
        </span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import admin from "../admin.module.css";
import { pushDriveImage } from "../fields";
import { DrivePicker } from "./DrivePicker";

/**
 * 구단영상 '드라이브에서 영상 고르기' (D-081, D-074) — 영상 파일은 옮기지 않는다.
 * 고르면 영상 주소 칸(videoField)에 드라이브 보기 링크를 넣고, 표지는 썸네일 칸(coverField)에 넣는다.
 */
export function DriveVideoPicker({ videoField, coverField }: { videoField: string; coverField: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className={admin.actions}>
      <DrivePicker
        purpose="video"
        accept={["video"]}
        max={1}
        label="드라이브에서 영상 고르기"
        onPick={(r) => {
          const v = r[0];
          if (!v || v.kind !== "video") return;
          const input = document.getElementById(`f-${videoField}`);
          if (input instanceof HTMLInputElement) input.value = v.viewUrl;
          if (v.url) pushDriveImage(coverField, v.url);
          setPicked(v.name || "영상");
        }}
      />
      {picked && <span className={admin.hint}>{picked}: 영상 주소와 썸네일을 넣었습니다. 저장하면 반영됩니다.</span>}
    </div>
  );
}

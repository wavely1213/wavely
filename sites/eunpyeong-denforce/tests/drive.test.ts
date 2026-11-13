import assert from "node:assert/strict";
import { test } from "node:test";
import { driveImportPrefix, folderIdFromLink, formatBytes, isDriveImportUrl } from "../src/lib/admin/drive.ts";
import { externalPlay, parseVideoUrl } from "../src/lib/video.ts";

// 드라이브 자료함 (D-081) — 관리자 화면 쪽

const ID = "1AbCdEfGhIjKlMnOp_q-r";

test("폴더 링크에서 ID 만 뽑는다", () => {
  assert.equal(folderIdFromLink(`https://drive.google.com/drive/folders/${ID}?usp=sharing`), ID);
  assert.equal(folderIdFromLink(`https://drive.google.com/drive/u/0/folders/${ID}`), ID);
  assert.equal(folderIdFromLink(`https://drive.google.com/open?id=${ID}`), ID);
  assert.equal(folderIdFromLink(` ${ID} `), ID);
  assert.equal(folderIdFromLink(`http://drive.google.com/drive/folders/${ID}`), null);
  assert.equal(folderIdFromLink(`https://evil.example/drive/folders/${ID}`), null);
  assert.equal(folderIdFromLink("https://drive.google.com/drive/my-drive"), null);
  assert.equal(folderIdFromLink(""), null);
});

test("폼의 드라이브 사진 값은 우리 저장소 media/drive/ 아래만", () => {
  const prefix = driveImportPrefix("https://x.supabase.co", "media");
  assert.equal(prefix, "https://x.supabase.co/storage/v1/object/public/media/drive/");
  assert.ok(isDriveImportUrl(`${prefix}${ID}.jpg`, prefix));
  assert.ok(isDriveImportUrl(`${prefix}${ID}-cover.png`, prefix));
  assert.ok(!isDriveImportUrl(`${prefix}../news/a.jpg`, prefix));
  assert.ok(!isDriveImportUrl(`https://x.supabase.co/storage/v1/object/public/media/news/${ID}.jpg`, prefix));
  assert.ok(!isDriveImportUrl("https://evil.example/a.jpg", prefix));
});

test("드라이브 영상 주소는 링크로 재생 (D-074)", () => {
  const v = parseVideoUrl(`https://drive.google.com/file/d/${ID}/view?usp=drive_link`);
  assert.deepEqual(v, { provider: "drive", id: ID, vertical: true });
  assert.deepEqual(externalPlay(`https://drive.google.com/file/d/${ID}/view`), {
    href: `https://drive.google.com/file/d/${ID}/view`,
    label: "드라이브에서 재생",
  });
  assert.equal(parseVideoUrl("https://drive.google.com/drive/folders/abc"), null);
});

test("크기 표시", () => {
  assert.equal(formatBytes(null), "");
  assert.equal(formatBytes(2048), "2KB");
  assert.equal(formatBytes(3 * 1024 * 1024), "3.0MB");
});

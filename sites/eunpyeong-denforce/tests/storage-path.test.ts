import assert from "node:assert/strict";
import { test } from "node:test";
import { bucketPaths } from "../src/lib/admin/storage-path.ts";

const P = "https://x.supabase.co/storage/v1/object/public/media/";
const D = `${P}drive/`;

test("bucketPaths: 쿼리/해시 떼기, 드라이브 자료함과 바깥 주소는 빼기", () => {
  assert.deepEqual(
    bucketPaths([`${P}matchday/m1.jpg?v=abc123`, `${P}news/a.png#x`, `${D}f.jpg`, "/photos/a.webp", null, undefined, `${P}`], P, D),
    ["matchday/m1.jpg", "news/a.png"],
  );
});

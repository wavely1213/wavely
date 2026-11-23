// 인스타그램 게시물 사진을 운영 저장소(media)에 올린다 (D-064) — 관리자 로그인으로 (비밀 키는 쓰지 않는다, SECURITY_GUIDELINES).
// 실행 (sites/eunpyeong-denforce 에서):
//   SB_EMAIL=… SB_PASS=… NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=… \
//   node --experimental-strip-types --no-warnings scripts/instagram/upload.ts <로컬 파일>=<저장 경로> …
//   예: /tmp/x/DerArQ-TWEJ.jpg=players/kim-jongho-instagram.jpg
// 로그인 정보는 환경 변수로만 받는다 — 파일·저장소에 적지 않는다. 같은 경로가 있으면 덮어쓰지 않고 실패한다.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const STORAGE_PATH = /^(players|news|postings)\/[A-Za-z0-9_-]+\.jpg$/;

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SB_EMAIL;
const password = process.env.SB_PASS;
if (!base || !key || !email || !password) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SB_EMAIL / SB_PASS 가 필요합니다");

const pairs = process.argv.slice(2).map((arg) => {
  const at = arg.lastIndexOf("=");
  const [file, path] = [arg.slice(0, at), arg.slice(at + 1)];
  if (at < 1 || !STORAGE_PATH.test(path)) throw new Error(`형식: <로컬 파일>=<players|news|postings>/<이름>.jpg — ${arg}`);
  return { file, path };
});
if (!pairs.length) throw new Error("올릴 파일이 없습니다");

const sb = createClient(base, key, { auth: { persistSession: false } });
const { error: loginError } = await sb.auth.signInWithPassword({ email, password });
if (loginError) throw new Error(`로그인 실패: ${loginError.message}`);

let failed = 0;
try {
  for (const { file, path } of pairs) {
    const { error } = await sb.storage.from("media").upload(path, readFileSync(file), { contentType: "image/jpeg", upsert: false });
    if (error) failed++;
    console.log(error ? `실패 ${path}: ${error.message}` : `올림 ${base}/storage/v1/object/public/media/${path}`);
  }
} finally {
  await sb.auth.signOut();
}
if (failed) process.exitCode = 1;

#!/usr/bin/env node
/* src/ 의 모듈들을 하나의 <script> 로 이어 붙여 game/index.html 을 만든다.

   왜 번들러를 쓰지 않는가: 이 게임의 배포 형태는 "외부 요청 0인 파일 하나"다.
   그 제약을 지키는 데 필요한 일은 import/export 를 걷어내고 순서대로 잇는 것뿐이라,
   의존성을 하나 더 다는 대신 40줄을 직접 쓴다.

   실행: node game/build.mjs        (검사만: --check)
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DIR, "src");

/* 이어 붙이는 순서 = 실행 순서. 위쪽이 아래쪽보다 먼저 평가된다.
   host.web.js 가 색·소리보다 뒤, 게임 데이터보다 앞에 오는 것이 핵심이다. */
const ORDER = [
  "core/host.js",
  "core/util.js",
  "core/color.js",
  "web/theme.js",       // CSS 변수 → setColors()
  "web/sound.js",       // Snd
  "core/data.js",
  "core/save.js",
  "web/host.web.js",    // setHost() + loadSave()
  "core/state.js",
  "core/input.js",
  "core/wave.js",
  "core/entity.js",
  "core/run.js",
  "core/shop.js",
  "core/update.js",
  "core/draw.js",
  "web/canvas.js",
  "web/loop.js",
  "web/flow.js",
  "web/hangar.js",
  "web/bind.js",
];

/* 한 스코프로 합치므로 모듈 문법만 걷어내면 된다.
   import 는 통째로 지우고, export 는 선언 앞의 키워드만 뗀다. */
const strip = s => s
  .replace(/^import\s[^\n]*\n/gm, "")
  .replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm, "")
  .replace(/^export\s*\{[^}]*\}[^\n]*\n/gm, "")
  .replace(/^export\s*\*[^\n]*\n/gm, "");

/* 모듈은 자동으로 strict 지만, 이어 붙이면 클래식 스크립트가 되므로 직접 선언해 준다 —
   빠뜨리면 코어가 모듈로 돌 때와 웹에서 돌 때의 의미가 달라진다. */
const bundle = '"use strict";\n\n' + ORDER
  .map(f => strip(fs.readFileSync(path.join(SRC, f), "utf8")).replace(/\s+$/, ""))
  .join("\n\n");

const tpl = fs.readFileSync(path.join(SRC, "index.template.html"), "utf8");
if (!tpl.includes("/*@BUNDLE@*/")) throw new Error("템플릿에 /*@BUNDLE@*/ 자리표시자가 없다");
const out = tpl.replace("/*@BUNDLE@*/", bundle);

const dest = path.join(DIR, "index.html");
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : "";
  if (cur !== out) { console.error("index.html 이 src/ 와 어긋나 있다 — node game/build.mjs 를 실행할 것"); process.exit(1); }
  console.log("index.html 최신");
} else {
  fs.writeFileSync(dest, out);
  console.log(`index.html ${(out.length / 1024).toFixed(0)}KB · JS ${bundle.split("\n").length}줄`);
}

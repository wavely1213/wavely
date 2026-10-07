// 모듈 소스(src/js, src/styles.css)를 한 페이지로 묶는다.
//   node build.mjs        → dist/index.html (claude.ai 아티팩트용, 문서 뼈대는 발행 시 붙음)
//   node build.mjs web    → dist-web/music/index.html (mulgyeol.kr/music 웹사이트용, 완성된 HTML 문서)
// 둘 다 악기 샘플을 samples/ 아래에 함께 둔다 (fetch('samples/…')로 불러옴).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';

const target = process.argv[2] === 'web' ? 'web' : 'artifact';
const BASE = '/music/';

// 마스터링 계산 워커를 먼저 묶어 문자열로 만든다 (blob URL로 띄움)
const workerBuild = await build({
  entryPoints: ['src/js/music/dsp-worker.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  minify: true,
  legalComments: 'none',
  tsconfigRaw: '{}',
});

const result = await build({
  entryPoints: ['src/js/app.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
  minify: target === 'web',
  define: { __WEB__: String(target === 'web'), __DSP_WORKER__: JSON.stringify(workerBuild.outputFiles[0].text) },
  tsconfigRaw: '{}', // 상위 폴더(wavely)의 tsconfig를 읽지 않게
});
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const body = readFileSync('src/index.template.html', 'utf8')
  .replace('/*STYLES*/', () => css)
  .replace('/*SCRIPT*/', () => script);

let outDir;
let html;
if (target === 'web') {
  outDir = `dist-web${BASE}`;
  rmSync('dist-web', { recursive: true, force: true });
  const head = readFileSync('src/web-head.html', 'utf8').replace(/__BASE__/g, BASE);
  // 아티팩트 발행 때 붙던 문서 뼈대·기본 리셋을 웹에서는 직접 넣는다. <title>은 head로.
  const webBody = body.replace(/<title>[^<]*<\/title>\n?/, '');
  html = `<!doctype html><html lang="ko"><head><title>물결 뮤직 — K-pop 작곡 노트</title>${head}</head><body>${webBody}</body></html>`;
} else {
  outDir = 'dist/';
  html = body;
}
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}index.html`, html);
cpSync('assets/samples', `${outDir}samples`, { recursive: true, filter: (p) => !p.endsWith('.md') });
console.log(`${outDir}index.html ${(html.length / 1024).toFixed(1)} KB (${target})`);

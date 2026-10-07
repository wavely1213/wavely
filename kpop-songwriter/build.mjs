// 모듈 소스(src/js, src/styles.css)를 아티팩트용 단일 index.html로 묶는다.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/js/app.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
  tsconfigRaw: '{}', // 상위 폴더(wavely)의 tsconfig를 읽지 않게
});
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const html = readFileSync('src/index.template.html', 'utf8')
  .replace('/*STYLES*/', () => css)
  .replace('/*SCRIPT*/', () => script);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
// 악기 샘플은 페이지와 함께 발행하는 별도 파일 (fetch('samples/…')로 불러옴)
cpSync('assets/samples', 'dist/samples', { recursive: true, filter: (p) => !p.endsWith('.md') });
console.log(`dist/index.html ${(html.length / 1024).toFixed(1)} KB`);

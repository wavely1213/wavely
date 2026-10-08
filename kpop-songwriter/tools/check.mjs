// 의존성 없는 간단 점검 (린터 대신, I-004): 안 쓰는 import, 남은 console.log, 문법 오류.
// 실행: npm run check
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})(join(ROOT, 'src/js'));

const problems = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  try { execFileSync(process.execPath, ['--check', '--input-type=module'], { input: src, stdio: ['pipe', 'ignore', 'pipe'] }); } catch (e) { problems.push(`${rel}: 문법 오류 ${String(e.stderr).split('\n').find((l) => l.includes('Error')) || ''}`); }
  // import { a, b as c } from '...'; / import x from '...';
  const body = src.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?$/gm, '');
  for (const m of src.matchAll(/^import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+['"][^'"]+['"]/gm)) {
    const names = [m[1], ...(m[2] || '').split(',').map((x) => x.trim().split(/\s+as\s+/).pop())].filter(Boolean);
    for (const n of names) if (!new RegExp(`\\b${n}\\b`).test(body)) problems.push(`${rel}: 안 쓰는 import '${n}'`);
  }
  src.split('\n').forEach((line, i) => { if (/^\s*console\.log\(/.test(line)) problems.push(`${rel}:${i + 1}: console.log가 남아 있음`); });
}
if (problems.length) { console.log(problems.join('\n')); console.log(`check FAILED (${problems.length})`); process.exitCode = 1; } else console.log(`check OK (${files.length}개 파일)`);

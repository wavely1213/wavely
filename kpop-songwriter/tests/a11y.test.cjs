// 접근성 점검: 모든 화면(곡 탭·앨범 탭·내 취향)에서 이름(label·aria-label) 없는 입력 칸·빈 버튼이 없는지. 실행: npm run build && npm run test:a11y
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('.tab');
  const audit = () => p.evaluate(() => {
    const bad = [];
    document.querySelectorAll('input:not([type=hidden]):not(.visually-hidden), select, textarea').forEach((el) => {
      const labelled = el.getAttribute('aria-label') || el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.getAttribute('aria-labelledby');
      if (!labelled) bad.push(`${el.tagName.toLowerCase()}#${el.id || '?'} placeholder="${(el.placeholder || '').slice(0, 20)}"`);
    });
    document.querySelectorAll('button').forEach((el) => { if (!el.textContent.trim() && !el.getAttribute('aria-label')) bad.push(`button(empty) ${el.className}`); });
    return bad;
  });
  const all = new Set();
  const tabs = await p.$$eval('.tab', (els) => els.map((e) => e.textContent));
  for (const t of tabs) { await p.click(`.tab:text-is("${t}")`); (await audit()).forEach((x) => all.add(`[${t}] ${x}`)); }
  await p.click('text=+ 새 앨범');
  const atabs = await p.$$eval('.tab', (els) => els.map((e) => e.textContent));
  for (const t of atabs) { await p.click(`.tab:text-is("${t}")`); (await audit()).forEach((x) => all.add(`[앨범 ${t}] ${x}`)); }
  await p.click('.song-item:has-text("내 취향")');
  (await audit()).forEach((x) => all.add(`[취향] ${x}`));
  if (all.size) { console.log([...all].join('\n')); console.log('a11y FAILED'); process.exitCode = 1; } else console.log('a11y OK');
  await b.close();
})();

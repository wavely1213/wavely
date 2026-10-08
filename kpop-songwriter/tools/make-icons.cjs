// 앱 아이콘 PNG 만들기 (아이콘을 바꿀 때만): node tools/make-icons.cjs src/web/icon.svg assets/web — 192·512, iOS 180, 마스커블 512(여백)
const fs = require('fs');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const svg = fs.readFileSync(process.argv[2], 'utf8');
  const b = await chromium.launch();
  for (const [size, name, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [180, 'apple-touch-icon.png', 0], [512, 'icon-maskable-512.png', 0.12]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    const inner = Math.round(size * (1 - pad * 2));
    const html = pad
      ? `<body style="margin:0;background:#c91f66;display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body>`
      : `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`;
    await p.setContent(html);
    await p.screenshot({ path: `${process.argv[3]}/${name}`, omitBackground: !pad });
    await p.close();
  }
  await b.close();
})();

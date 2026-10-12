// tools/icon.html を 1024px の PNG に書き出す（通常版とマスカブル版）
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  const file = 'file://' + path.resolve(__dirname, 'icon.html');
  for (const [hash, out] of [['', 'assets/icon-master.png'], ['#mask', 'assets/icon-master-maskable.png']]) {
    await p.goto(file + hash); await p.reload(); await p.waitForTimeout(1500);
    await p.screenshot({ path: path.resolve(__dirname, '..', out) });
  }
  await b.close();
})();

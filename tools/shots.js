// 紹介ページ用のアプリ画面スクリーンショットを撮る（npm run shots）
// 事前に www/ をビルドし、http://localhost:8765 で配信しておくこと
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const path = require('path');
const out = process.argv[2] || 'site/about/img';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  // 練習記録のデモデータ（直近14日）
  await p.addInitScript(() => {
    try {
      if (localStorage.getItem('fretlab.log')) return;
      const pad = n => String(n).padStart(2, '0'), d0 = new Date(), log = [];
      const mins = [20, 35, 0, 45, 30, 25, 50, 0, 30, 40, 15, 35, 60, 30], cats = ['コード進行', 'スケール', 'リズム・メトロノーム', '曲の練習'];
      mins.forEach((m, i) => { if (!m) return; const d = new Date(d0); d.setDate(d.getDate() - (13 - i));
        log.push({ id: i + 1, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, min: m, cat: cats[i % 4], memo: i === 13 ? '王道進行 BPM 100 まで' : '' }); });
      localStorage.setItem('fretlab.log', JSON.stringify(log));
      // チューナー用：5弦A（110Hz、ほぼぴったり）を鳴らす仮想マイク
      navigator.mediaDevices.getUserMedia = async () => { const c = new AudioContext(), o = c.createOscillator(), g = c.createGain(), d = c.createMediaStreamDestination();
        o.type = 'sawtooth'; o.frequency.value = 110.1; g.gain.value = 0.3; o.connect(g); g.connect(d); o.start(); return d.stream; };
      localStorage.setItem('fretlab.cRoot', '9'); localStorage.setItem('fretlab.cType', '"m7"');
    } catch (e) {}
  });
  const base = 'http://localhost:8765/';
  const shot = async (name, clip) => p.screenshot({ path: path.join(out, name + '.png'), clip: clip || { x: 0, y: 0, width: 390, height: 844 } });
  const scrollTo = async sel => { await p.evaluate(s => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70); }, sel); await p.waitForTimeout(300); };

  await p.goto(base + '#metronome'); await p.waitForTimeout(1500);
  await p.selectOption('#rhythmSel', '16beat'); await p.click('#metroPlay'); await p.waitForTimeout(900);
  await scrollTo('[data-panel="metronome"] .panel-head'); await shot('metronome');
  await scrollTo('#soundSel'); await shot('drums');
  await p.click('#metroPlay');

  await p.click('[data-tab="progressions"]'); await p.click('.prog-item:nth-child(2)');
  await p.selectOption('#progRhythm', '8beat'); await p.click('#progPlay'); await p.waitForTimeout(4200);
  await scrollTo('#progTitle'); await shot('progressions'); await p.click('#progPlay');

  await p.click('[data-tab="tuner"]'); await p.click('#micBtn'); await p.waitForTimeout(1500);
  await scrollTo('[data-panel="tuner"] .panel-head'); await shot('tuner'); await p.click('#micBtn');

  await p.click('[data-tab="chords"]'); await p.waitForTimeout(300); await scrollTo('#chordName'); await shot('chords');
  await p.click('[data-tab="scales"]'); await p.waitForTimeout(300); await scrollTo('[data-panel="scales"] .panel-head'); await shot('scales');
  await p.click('[data-tab="log"]'); await p.waitForTimeout(300); await scrollTo('#logStats'); await shot('log');
  await b.close();
})();

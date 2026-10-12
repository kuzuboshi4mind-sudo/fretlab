#!/usr/bin/env bash
# fretlab.html（アプリ本体）から PWA 一式を www/ に生成する
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(date +%Y%m%d%H%M%S)
rm -rf www && mkdir -p www/icons
python3 tools/make_icons.py www/icons
{
  cat <<'HEAD'
<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f7f7f3">
<meta name="description" content="ギタリストのための練習アプリ。メトロノーム、ドラム、チューナー、コード、コード進行、指板、スケール、練習記録。">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Fretlab">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>
</head><body>
HEAD
  cat fretlab.html
  printf '\n</body></html>\n'
} > www/index.html
cat > www/manifest.webmanifest <<'MAN'
{
  "name": "Fretlab ギター練習帳",
  "short_name": "Fretlab",
  "description": "メトロノーム・ドラム・チューナー・コード・コード進行・指板・スケール・練習記録",
  "lang": "ja",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#f7f7f3",
  "theme_color": "#f7f7f3",
  "categories": ["music", "education"],
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
    {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ],
  "shortcuts": [
    {"name": "メトロノーム", "url": "./#metronome"},
    {"name": "チューナー", "url": "./#tuner"},
    {"name": "コード進行", "url": "./#progressions"}
  ]
}
MAN
sed "s/__VERSION__/$VERSION/" tools/sw.template.js > www/sw.js
# 紹介ページなど、アプリ以外の静的ページ
cp -R site/. www/
echo "built www/ (cache fretlab-$VERSION)"

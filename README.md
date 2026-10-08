# Fretlab ギター練習帳

ギタリストのための練習アプリ。1つのHTML（`fretlab.html`）から、Web版（PWA）・Android・iOS アプリを作ります。

## 機能
- **メトロノーム**：BPM 30〜260、タップテンポ、拍子・細分、クリック音色10種、スピードトレーナー
- **ドラムパターン**：8ビート／16ビート／ファンク／シャッフル／スウィング／ボサノヴァ／レゲエ／ワルツ／6/8 など15種
- **チューナー**：マイクで音程測定（±セント表示）、基準音、7種のチューニング、A4=430〜450Hz
- **コード一覧**：12ルート×17タイプ、1コードにつき2〜4通りの押さえ方、度数表示
- **コード進行**：定番100パターン、全キーに移調、ドラム＋伴奏（ストローク／アルペジオ）に合わせて再生
- **指板音程表**：音名／度数表示、指板クイズ
- **スケール表**：13スケール、ポジション別表示
- **練習記録**：タイマー、手入力、14日間グラフ、連続日数、バックアップ
- **練習Tips**：コツと30分メニュー

## ファイル構成
| パス | 内容 |
|---|---|
| `fretlab.html` | アプリ本体（ここを編集する） |
| `tools/build.sh` | `www/` に PWA 一式（index.html・manifest・service worker・アイコン）を生成 |
| `tools/sw.template.js` | service worker（オフライン対応） |
| `tools/make_icons.py` | アイコン画像の生成（Pillow） |
| `android/` `ios/` | Capacitor のネイティブプロジェクト（マイク権限設定済み） |
| `.github/workflows/` | GitHub Pages 公開、Android APK ビルド |

## 使い方

### Web版（PWA）
```bash
npm run serve        # http://localhost:8080 で確認
```
GitHub に push すると `pages.yml` が GitHub Pages に公開します（リポジトリの Settings → Pages → Source を「GitHub Actions」に）。
公開URLをスマホで開き、「ホーム画面に追加」（iPhone は Safari の共有メニュー）でアプリとして使えます。一度開けばオフラインでも動きます。
マイクは https か localhost でのみ使えます。

### Android
```bash
npm install
npm run android      # Android Studio が開く → ▶ で実機/エミュレータに転送
```
Android Studio がなくても、GitHub の Actions → 「Build Android APK」→ Run workflow で APK を作れます（Artifacts からダウンロード）。

### iOS
macOS と Xcode が必要です。
```bash
npm install
npm run ios          # Xcode が開く → Signing で自分の Apple ID を選び ▶
```
App Store で配布するには Apple Developer Program（年額）への登録が必要です。Google Play も開発者登録（初回のみ）が必要です。

## 更新の流れ
`fretlab.html` を編集 → `npm run cap:sync`（ネイティブ）または push（Web版）。

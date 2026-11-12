# アチーブメント・壁紙・録音の簡略表示
T={
' <span title="自動で消されにくい設定がオン">🔒</span>':' <span title="Protected from automatic deletion">🔒</span>',
'・空き ${fmtSize(Math.max(0,e.quota-(e.usage||0)))}':' · ${fmtSize(Math.max(0,e.quota-(e.usage||0)))} free',
'${REC.items.length}件・${fmtSize(sum)}':'${REC.items.length} items · ${fmtSize(sum)}',
'<button class="btn pbtn" type="button" id="recPersist" title="自動で消されにくくする">🔓 保護する</button>':'<button class="btn pbtn" type="button" id="recPersist" title="Protect from automatic deletion">🔓 Protect</button>',
'<input type="checkbox" class="ck" aria-label="選ぶ"><div><div class="rn"></div><div class="rd"><span class="kd">${vid?\'動画\':\'音声\'}</span>${recFmt(it.dur)}・${fmtSize(it.size||it.blob.size)}</div></div><div class="ra"><button class="btn sv" aria-label="書き出す・共有">⤴</button><button class="btn dl" aria-label="削除">🗑</button></div>${vid?\'<video controls playsinline preload="metadata"></video>\':\'<audio controls preload="none"></audio>\'}':
'<input type="checkbox" class="ck" aria-label="Select"><div><div class="rn"></div><div class="rd"><span class="kd">${vid?\'Video\':\'Audio\'}</span>${recFmt(it.dur)} · ${fmtSize(it.size||it.blob.size)}</div></div><div class="ra"><button class="btn sv" aria-label="Export / share">⤴</button><button class="btn dl" aria-label="Delete">🗑</button></div>${vid?\'<video controls playsinline preload="metadata"></video>\':\'<audio controls preload="none"></audio>\'}',
'削除する':'Delete?','⤴ ${n}件を書き出す':'⤴ Export ${n}','⤴ 書き出す':'⤴ Export',
'アチーブメント':'Achievements','タイマーの壁紙':'Timer wallpapers','壁紙 ':'Wallpaper ',
'ホーム画面に追加して使うと消されにくくなります。':'Add the app to your Home Screen to make deletion less likely.',
'壁紙「${SKINS[x[2]].name}」':'wallpaper “${SKINS[x[2]].name}”',
'空きが足りず保存できませんでした。⤴ で書き出してください':'Not enough space to save. Export it with ⤴.',
'累計 ${fmtHM(t)}。すべてのアチーブメントを達成しました！':'Total ${fmtHM(t)}. You have unlocked every achievement!',
'累計 ${fmtHM(totalMin())}':'Total ${fmtHM(totalMin())}','達成':'Unlocked','選択をやめる':'Clear selection',
'🎙 音声':'🎙 Audio','🎥 動画':'🎥 Video',
'🏆 アチーブメント達成！ 累計 ${msLabel(x[0])}。${rewardName(x)}が使えるようになりました':'🏆 Achievement unlocked! ${msLabel(x[0])} total. You unlocked the ${rewardName(x)}.',
'✓ 保存しました（${recFmt(dur)}）':'✓ Saved (${recFmt(dur)})','すべて':'All',
}
T['アプリの版 __VERSION__']='App version __VERSION__'

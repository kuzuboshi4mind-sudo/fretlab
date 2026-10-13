"""本物の楽器音（FluidR3_GM サウンドフォント、MIT License）を FluidSynth で1音ずつ書き出し、MP3 にする。

必要なもの：fluidsynth、FluidR3_GM.sf2（Ubuntu なら apt install fluidsynth fluid-soundfont-gm）、ffmpeg、pip install mido
使い方：python3 tools/render_samples.py  →  site/audio/ に書き出し
"""
import os, re, subprocess, tempfile, json
import mido

SF2 = os.environ.get("SF2", "/usr/share/sounds/sf2/FluidR3_GM.sf2")
OUT = os.path.join(os.path.dirname(__file__), "..", "site", "audio")
os.makedirs(OUT, exist_ok=True)

def render(name, program, note, vel=100, dur=2.4, tail=0.6, channel=0):
    mid = mido.MidiFile(ticks_per_beat=480)
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage("set_tempo", tempo=500000))   # 120 BPM → 960 ticks/秒
    if channel != 9:
        tr.append(mido.Message("program_change", program=program, channel=channel, time=0))
    tr.append(mido.Message("note_on", note=note, velocity=vel, channel=channel, time=0))
    tr.append(mido.Message("note_off", note=note, velocity=0, channel=channel, time=int(dur * 960)))
    tr.append(mido.MetaMessage("end_of_track", time=int(tail * 960)))
    with tempfile.TemporaryDirectory() as d:
        m, w = os.path.join(d, "a.mid"), os.path.join(d, "a.wav")
        mid.save(m)
        subprocess.run(["fluidsynth", "-ni", "-q", "-R", "0", "-C", "0", "-g", "0.8", "-r", "44100", "-F", w, SF2, m], check=True)
        peak = subprocess.run(["ffmpeg", "-hide_banner", "-i", w, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        mx = float(re.search(r"max_volume: (-?[\d.]+) dB", peak).group(1))
        gain = -1.0 - mx
        af = f"volume={gain}dB,silenceremove=stop_periods=-1:stop_duration=0.25:stop_threshold=-60dB,afade=t=out:st={dur + tail - 0.15}:d=0.15"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", w, "-ac", "1", "-af", af,
                        "-c:a", "libmp3lame", "-b:a", "96k", os.path.join(OUT, name + ".mp3")], check=True)

manifest = {"guitar": [], "bass": [], "nylon": [], "marimba": [], "drums": {}}
# アコースティックギター（スチール弦）：E2〜A5 を3半音ごと（間は再生速度で補間）
for n in range(40, 84, 3):
    render(f"guitar-{n}", 25, n, vel=96, dur=2.6); manifest["guitar"].append(n)
# エレキベース（指弾き）：B0〜C3
for n in range(23, 50, 3):
    render(f"bass-{n}", 33, n, vel=100, dur=2.4); manifest["bass"].append(n)
# ナイロン弦ギター（ウクレレの基準音用）
for n in range(55, 80, 3):
    render(f"nylon-{n}", 24, n, vel=96, dur=2.2); manifest["nylon"].append(n)
# マリンバ（メトロノーム音色）
for n in (76, 79, 84):
    render(f"marimba-{n}", 12, n, vel=110, dur=0.8, tail=0.3); manifest["marimba"].append(n)
# ドラム（GM スタンダードキット）
DR = {"kick": 36, "snare": 38, "sidestick": 37, "clap": 39, "hat": 42, "openhat": 46, "ride": 51, "tom": 45,
      "shaker": 82, "cowbell": 56, "woodhi": 76, "woodlo": 77, "claves": 75, "triopen": 81, "trimute": 80,
      "metroclick": 33, "metrobell": 34}
for k, n in DR.items():
    render(f"drum-{k}", 0, n, vel=110, dur=1.2 if k in ("ride", "openhat", "triopen", "metrobell") else 0.5, tail=0.3, channel=9)
    manifest["drums"][k] = n
with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, ensure_ascii=False)
with open(os.path.join(OUT, "CREDITS.txt"), "w") as f:
    f.write("音源: Fluid (R3) General MIDI SoundFont by Frank Wen\n"
            "Released under the MIT license (\"I hereby release Fluid under the MIT license\").\n"
            "Rendered with FluidSynth by tools/render_samples.py.\n")
print("done", {k: (len(v) if isinstance(v, list) else len(v)) for k, v in manifest.items()})

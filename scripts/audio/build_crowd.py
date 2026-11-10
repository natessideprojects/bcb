"""Cuts Nate's crowd recordings into game effects and adds them to the sfx manifest.

cheer      short cheer (doubles, laps, Rusty bounty, new leader)
cheer-big  long cheer for the finish
aww        disappointed crowd (you get bashed, sit out, lose tickets, lose the race)
roar-1..3  quick crowd reactions for bashes
crowd-1    seamless crowd-noise bed that loops quietly under each round
"""
import json, os, subprocess, sys
SRC, OUT = sys.argv[1], sys.argv[2]  # folder with crowd-*.mp3, public/audio
def run(args): subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)
def peak(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(err.split("max_volume:")[1].split("dB")[0])
def finish(tmp, dest, target=-1.5):
    run(["-i", tmp, "-af", f"volume={target - peak(tmp):.2f}dB", "-ar", "44100", "-ac", "2", "-codec:a", "libmp3lame", "-b:a", "112k", dest])
    os.remove(tmp)
def cut(src, start, dur, dest, fade_in=0.05, fade_out=0.5):
    tmp = dest + ".wav"
    run(["-ss", str(start), "-t", str(dur), "-i", f"{SRC}/{src}.mp3", "-af",
         f"aresample=44100,afade=t=in:d={fade_in},afade=t=out:st={dur - fade_out:.2f}:d={fade_out}", "-ac", "2", tmp])
    finish(tmp, dest)

sfx = f"{OUT}/sfx"
cut("crowd-cheering", 1.2, 4.0, f"{sfx}/cheer-1.mp3", 0.15, 1.2)
cut("crowd-cheering", 1.2, 9.4, f"{sfx}/cheer-big-1.mp3", 0.15, 2.6)
cut("crowd-disappointment", 0.25, 2.75, f"{sfx}/aww-1.mp3", 0.04, 0.7)
for n, start in enumerate([14.3, 28.2, 5.3], 1):
    cut("crowd-shouting", start, 1.7, f"{sfx}/roar-{n}.mp3", 0.06, 0.7)

# Seamless loop: 30 s of crowd, the last 2 s crossfaded into the first 2 s.
tmp = f"{sfx}/crowd-1.wav"
run(["-i", f"{SRC}/crowd-shouting.mp3", "-filter_complex",
     "[0:a]aresample=44100,atrim=1:33,asetpts=PTS-STARTPTS,asplit=3[a][b][c];"
     "[a]atrim=2:30,asetpts=PTS-STARTPTS[body];"
     "[b]atrim=30:32,asetpts=PTS-STARTPTS,afade=t=out:d=2[tail];"
     "[c]atrim=0:2,asetpts=PTS-STARTPTS,afade=t=in:d=2[head];"
     "[tail][head]amix=inputs=2:normalize=0[xf];[body][xf]concat=n=2:v=0:a=1[out]",
     "-map", "[out]", "-ac", "2", tmp])
finish(tmp, f"{sfx}/crowd-1.mp3", -3)

manifest_path = f"{sfx}/manifest.json"
manifest = json.load(open(manifest_path))
manifest.pop("doubles-crowd", None)
manifest.update({"cheer": ["/audio/sfx/cheer-1.mp3"], "cheer-big": ["/audio/sfx/cheer-big-1.mp3"], "aww": ["/audio/sfx/aww-1.mp3"],
                 "roar": [f"/audio/sfx/roar-{n}.mp3" for n in (1, 2, 3)], "crowd": ["/audio/sfx/crowd-1.mp3"]})
json.dump(manifest, open(manifest_path, "w"), indent=1)
for f in ["cheer-1", "cheer-big-1", "aww-1", "roar-1", "roar-2", "roar-3", "crowd-1"]:
    p = f"{sfx}/{f}.mp3"
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip()
    print(f, d, os.path.getsize(p) // 1024, "KB")

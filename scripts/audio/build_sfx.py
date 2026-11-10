"""Builds the game's sound effects from FilmCow recordings, plus the music loop.

Each effect is trimmed, faded, peak-normalised and exported as a small mono mp3
into public/audio/sfx/<name>-<n>.mp3. A JSON manifest lists variants per name.
"""
import json
import os
import subprocess
import sys

SRC = "/mnt/user-data/uploads/FilmCow Recorded SFX"
OUT = sys.argv[1]            # .../public/audio
MUSIC_SRC = sys.argv[2]      # Fairground Fun.mp3
os.makedirs(f"{OUT}/sfx", exist_ok=True)
os.makedirs(f"{OUT}/music", exist_ok=True)

# name -> list of (source file, start s, duration s)  [one entry per variant]
# A variant can also be a list of parts that are mixed in sequence: [(src, start, dur, delay), ...]
SFX = {
    "tap":        [("clicky button 2", 0.02, 0.3), ("button pressed 1", 0.0, 0.3)],
    "select":     [("button pressed 3", 0.0, 0.22), ("button pressed 2", 0.0, 0.3)],
    "lock":       [("metal latch 2", 0.12, 0.35), ("metal button pop up 2", 0.0, 0.42)],
    "flip":       [("flag 1", 0.08, 0.42), ("book flopping around 2", 0.0, 0.32)],
    "shuffle":    [("book flopping around 2", 0.0, 1.7)],
    "draw":       [("flag 1", 0.1, 0.35)],
    "go":         [[("light switch on", 0.0, 0.18, 0.0), ("fan friction 1", 0.05, 1.0, 0.08)]],
    "drive":      [("cold storage fan", 4.0, 3.0)],
    "squeak":     [("chair squeak 2", 0.0, 0.75), ("chair squeak 3", 0.0, 0.85)],
    "bash":       [("body hits metal 4", 0.04, 0.9), ("body hits metal 5", 0.05, 1.3), ("body hits metal 6", 0.03, 1.0),
                   ("body hits metal 1", 0.04, 1.4)],
    "bonk":       [("inflatable hammer hit 1", 0.0, 0.3), ("inflatable hammer hit 7", 0.0, 0.3), ("inflatable hammer hit 2", 0.0, 0.3)],
    "bash-big":   [("crashing through debris 1", 0.02, 1.1), ("crashing through debris 2", 0.0, 0.8)],
    "anvil":      [("anvil hit 2", 0.03, 0.9)],
    "rusty-move": [[("metal dragged on floor 2", 0.2, 1.6, 0.0), ("chain 1", 0.08, 1.2, 0.2)]],
    "rusty-bash": [("metal bonk distorted", 0.06, 1.7)],
    "grease":     [[("gas splash 4", 0.02, 0.45, 0.0), ("glass sliding 1", 0.06, 0.85, 0.25)],
                   [("gas splash 3", 0.03, 0.45, 0.0), ("glass sliding 2", 0.05, 0.85, 0.25)]],
    "tilt":       [("metal spinning 3", 0.04, 2.0), ("metal spinning 6", 0.05, 1.7)],
    "dead":       [[("light switch off", 0.0, 0.2, 0.0), ("gas leak", 0.5, 0.9, 0.12)]],
    "ticket":     [("knob clicky turn 6", 0.05, 0.75)],
    "ticket-lose":[("gulp 1", 0.0, 0.5)],
    "lap":        [("ding 3", 0.0, 1.4)],
    "chime":      [("glass ding 1", 0.0, 0.9), ("glass ding 4", 0.0, 0.7)],
    "sparkle":    [("glass full of beads 4", 0.1, 0.6)],
    "sign":       [("hit with melodic resonance 6", 0.0, 1.2)],
    "beep":       [("beep 3", 0.0, 0.18)],
    "alarm":      [[("beep 1", 0.0, 0.3, 0.0), ("beep 1", 0.0, 0.3, 0.38), ("beep 1", 0.0, 0.3, 0.76)]],
    "stall":      [[("metal clang 5", 0.0, 0.5, 0.0), ("air duster 1", 0.02, 0.35, 0.2)]],
    "pileup":     [("crashing through debris 2", 0.0, 0.8)],
    "finish":     [("ding 1", 0.08, 2.6)],
    "m01":        [("balloon let out air", 0.28, 2.3)],
    "m01-grow":   [("air duster 2", 0.02, 0.4)],
    "m02":        [("ambience - motorcycle speeding off", 0.0, 2.6)],
    "m03":        [("feedback 2", 0.0, 0.95)],
    "m04":        [("light switch off", 0.0, 0.25)],
    "m05":        [("clothes ruffle 1", 0.15, 1.2)],
    "m06":        [[("metal spinning 6", 0.05, 1.0, 0.0), ("metal clang 5", 0.0, 0.5, 0.85)]],
    "m07":        [[("beep 1", 0.0, 0.3, 0.0), ("beep 1", 0.0, 0.3, 0.38), ("beep 1", 0.0, 0.3, 0.76)]],
    "m08":        [("glass full of beads 2", 0.1, 1.5)],
    "m09":        [("measuring tape contract 1", 0.14, 0.7)],
    "m10":        [("feedback 1", 0.05, 0.95)],
    "m11":        [("hit with melodic resonance 6", 0.0, 1.1)],
    "m12":        [("car sedan door shut 1", 0.04, 0.4)],
    "m13":        [[("knob clicky turn 1", 0.15, 1.1, 0.0), ("glass ding 3", 0.0, 0.4, 1.0)]],
    "m14":        [("gulp 2", 0.0, 0.36)],
    "m15":        [[("cough 1", 0.06, 0.75, 0.0), ("liquid hit ground 1", 0.1, 1.2, 0.55)]],
    "m16":        [("crashing through debris 1", 0.02, 1.1)],
    "m17":        [("anvil hit 3", 0.08, 0.9)],
    "m18":        [("liquid pouring 3", 0.06, 2.2)],
    "m19":        [("metal dinging underwater 1", 0.16, 1.5)],
    "m20":        [("metal spinning 1", 0.18, 2.9)],
    "doubles":    [[("glass ding 1", 0.0, 0.8, 0.0), ("ding 3", 0.0, 1.3, 0.12), ("glass full of beads 4", 0.1, 0.6, 0.2)]],
}

def run(args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)

def render(parts, dest):
    """parts: list of (src, start, dur, delay). Mixes them, fades the tail, peak-normalises."""
    inputs, filters = [], []
    for i, (src, start, dur, delay) in enumerate(parts):
        inputs += ["-ss", str(start), "-t", str(dur), "-i", f"{SRC}/{src}.wav"]
        fade = min(0.12, dur * 0.3)
        filters.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,afade=t=in:d=0.006,"
                       f"afade=t=out:st={max(0, dur - fade):.3f}:d={fade:.3f},adelay={int(delay * 1000)}[p{i}]")
    mix = "".join(f"[p{i}]" for i in range(len(parts)))
    filters.append(f"{mix}amix=inputs={len(parts)}:normalize=0,alimiter=limit=0.95[m]")
    tmp = dest + ".wav"
    run([*inputs, "-filter_complex", ";".join(filters), "-map", "[m]", tmp])
    peak = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", "volumedetect", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    mx = float(peak.split("max_volume:")[1].split("dB")[0])
    run(["-i", tmp, "-af", f"volume={-1.5 - mx:.2f}dB", "-ac", "1", "-ar", "44100",
         "-codec:a", "libmp3lame", "-b:a", "96k", dest])
    os.remove(tmp)

manifest = {}
for name, variants in SFX.items():
    files = []
    for n, v in enumerate(variants, 1):
        parts = v if isinstance(v, list) else [(v[0], v[1], v[2], 0.0)]
        dest = f"{OUT}/sfx/{name}-{n}.mp3"
        render(parts, dest)
        files.append(f"/audio/sfx/{name}-{n}.mp3")
    manifest[name] = files

# Music: loudness-normalised loop for quiet background play
run(["-i", MUSIC_SRC, "-map", "0:a", "-af", "loudnorm=I=-18:TP=-2:LRA=11", "-ac", "2", "-ar", "44100",
     "-codec:a", "libmp3lame", "-b:a", "128k", f"{OUT}/music/fairground-fun.mp3"])

with open(f"{OUT}/sfx/manifest.json", "w") as f:
    json.dump(manifest, f, indent=1)
total = sum(os.path.getsize(os.path.join(f"{OUT}/sfx", x)) for x in os.listdir(f"{OUT}/sfx"))
print(len(manifest), "effects,", sum(len(v) for v in manifest.values()), "files,", total // 1024, "KB")

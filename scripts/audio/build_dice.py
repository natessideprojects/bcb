"""Builds the dice-roll effect (dice-1..3.mp3) from FilmCow recordings.

FilmCow has no dice, so each roll is a bead rattle (a cup being shaken) followed by
plastic clicks spaced like a die bouncing to a stop. Same mixing, peak level and
encoding as build_sfx.py.
Usage: python build_dice.py "<FilmCow Recorded SFX folder>" <public/audio>
"""
import os, subprocess, sys

SRC, OUT = sys.argv[1], sys.argv[2]
RATTLE = {2: ("glass full of beads 2", 0.12, 0.33), 3: ("glass full of beads 3", 0.13, 0.40), 4: ("glass full of beads 4", 0.12, 0.36)}
CLACK = {  # (file, start, duration) of one sharp plastic click
    "a": ("clicky button 1", 0.035, 0.07),
    "b": ("clicky button 3", 0.045, 0.06),
    "c": ("button pressed 3", 0.05, 0.10),
    "d": ("knob clicky turn 1", 0.155, 0.04),
}
# (rattle, [(clack, delay s, volume, pitch)])
VARIANTS = [
    (4, [("a", .40, 1.0, 1.0), ("b", .55, .75, 1.08), ("c", .66, .55, .95), ("d", .74, .4, 1.1), ("a", .79, .25, 1.15)]),
    (2, [("b", .34, 1.0, .96), ("a", .50, .7, 1.05), ("d", .62, .5, 1.0), ("c", .70, .35, 1.1), ("b", .76, .2, 1.2)]),
    (3, [("c", .45, 1.0, 1.02), ("a", .58, .7, .97), ("b", .67, .5, 1.1), ("d", .73, .3, 1.05)]),
]

def run(args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)

for n, (rattle, clacks) in enumerate(VARIANTS, 1):
    parts = [(*RATTLE[rattle], 0.0, 0.8, 1.0)] + [(*CLACK[k], delay, vol, pitch) for k, delay, vol, pitch in clacks]
    inputs, filters = [], []
    for i, (src, start, dur, delay, vol, pitch) in enumerate(parts):
        inputs += ["-ss", str(start), "-t", str(dur), "-i", f"{SRC}/{src}.wav"]
        fade = min(0.08, dur * 0.3)
        filters.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,asetrate={int(44100 * pitch)},aresample=44100,"
                       f"volume={vol},afade=t=in:d=0.003,afade=t=out:st={max(0, dur / pitch - fade):.3f}:d={fade:.3f},adelay={int(delay * 1000)}[p{i}]")
    filters.append("".join(f"[p{i}]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,alimiter=limit=0.95[m]")
    tmp = f"{OUT}/sfx/dice-{n}.wav"
    run([*inputs, "-filter_complex", ";".join(filters), "-map", "[m]", tmp])
    peak = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    mx = float(peak.split("max_volume:")[1].split("dB")[0])
    run(["-i", tmp, "-af", f"volume={-1.5 - mx:.2f}dB", "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "96k", f"{OUT}/sfx/dice-{n}.mp3"])
    os.remove(tmp)
    print("dice", n)

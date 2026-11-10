"""Force-align the announcer script to the ElevenLabs recording with PocketSphinx.

Writes a JSON list of {clip, start, end} in seconds, one per cue-sheet line.
Usage: python align_vo.py full.raw(16k mono s16le) cue_sheet.csv out.json
"""
import csv
import json
import os
import re
import sys

from pocketsphinx import Decoder, get_model_path

raw_path, cue_path, out_path = sys.argv[1:4]
model = get_model_path()
dict_path = os.path.join(model, "en-us", "cmudict-en-us.dict")
known = set()
with open(dict_path, encoding="utf-8") as f:
    for line in f:
        w = line.split(" ", 1)[0]
        known.add(re.sub(r"\(\d+\)$", "", w))

EXTRA = {  # pronunciations for words the CMU dictionary lacks
    "sauron": "S AO R AA N",
    "baaash": "B AE SH",
    "er": "ER",
    "ew": "IY UW",
    "rusty's": "R AH S T IY Z",
    "carnie": "K AA R N IY",
    "knockback": "N AA K B AE K",
    "knockbacks": "N AA K B AE K S",
}
REPLACE = {"tilt-a-whirl": "tilt a whirl", "bumper-to-bumper": "bumper to bumper"}

def words(text):
    t = text.lower().replace("’", "'")
    for a, b in REPLACE.items():
        t = t.replace(a, b)
    t = re.sub(r"[^a-z' ]+", " ", t)
    out = []
    for w in t.split():
        w = w.strip("'")
        if w == "er" or w:
            out.append(w)
    return out

with open(cue_path, newline="", encoding="utf-8") as f:
    cues = list(csv.DictReader(f))
line_words = [words(c["line"]) for c in cues]

extra_dict = os.path.join(os.path.dirname(out_path), "extra.dict")
oov = sorted({w for ws in line_words for w in ws if w not in known})
with open(extra_dict, "w") as f:
    for w in oov:
        if w not in EXTRA:
            raise SystemExit(f"No pronunciation for: {w}")
        f.write(f"{w} {EXTRA[w]}\n")

config = Decoder.default_config()
config.set_string("-hmm", os.path.join(model, "en-us", "en-us"))
config.set_string("-dict", dict_path)
config.set_string("-loglevel", "ERROR")
config.set_float("-beam", 1e-80)
config.set_float("-wbeam", 1e-60)
dec = Decoder(config)
for w in oov:
    dec.add_word(w, EXTRA[w], False)

flat = [w for ws in line_words for w in ws]
dec.set_align_text(" ".join(flat))
with open(raw_path, "rb") as f:
    audio = f.read()
dec.start_utt()
dec.process_raw(audio, full_utt=True)
dec.end_utt()

segs = [(s.word, s.start_frame / 100.0, s.end_frame / 100.0) for s in dec.seg()]
spoken = [s for s in segs if s[0] not in ("<s>", "</s>", "<sil>", "[NOISE]")]
print("aligned words", len(spoken), "expected", len(flat))
if len(spoken) != len(flat):
    raise SystemExit("word count mismatch")

result, k = [], 0
for cue, ws in zip(cues, line_words):
    first, last = spoken[k], spoken[k + len(ws) - 1]
    result.append({"clip": cue["clip_file"], "start": first[1], "end": last[2] + 0.01, "line": cue["line"]})
    k += len(ws)
with open(out_path, "w") as f:
    json.dump(result, f, indent=1)
print("wrote", len(result))

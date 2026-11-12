# Audio build scripts (Nov 2026)

- `build_sfx.py` cuts the FilmCow Recorded SFX into `public/audio/sfx/<name>-<n>.mp3` and writes `manifest.json`.
- `build_crowd.py` cuts Nate's crowd recordings (BCB\Sounds\crowd-*.mp3) into cheer, cheer-big, aww, roar and the looping crowd bed.
- `align_vo.py` force-aligns the ElevenLabs announcer take to the cue sheet (PocketSphinx) so each line becomes `public/audio/vo/<clip>.mp3`.
- `src/lib/audio-manifest.ts` lists effect variant counts and announcer clip lengths; regenerate it after changing the audio.

Paths inside the scripts point at the build machine; pass your own source folders as arguments.
- `driver-callouts-elevenlabs.txt` is the script for the driver callouts (`who_1` … `who_6` = "Driver one!" … "Driver six!", and `pay_up`). They were cut from `ElevenLabs_Driver.mp3` (Nov 11) at the silences, checked with PocketSphinx, set 2.5 dB quieter to match the other lines and encoded as 80 kbps mono MP3. The leading laugh before "Pay up!" was left out to keep the line short. The colour lines `lead_<colour>` and `win_<colour>` were retired because a skin can change a car's colour.
- `variety-elevenlabs.txt` / `variety-cue-sheet.csv` (Nov 12) are the 37 extra announcer takes (knockbacks, Karma forward, Rusty, Doubles, short bash/pay/lap/hazard/pick lines, Midway alternates from the 2017 card flavor text). They were recorded as `extra lines.mp3`, force-aligned with `align_vo.py` (the take had almost no pauses), cut at the quietest point between lines, checked with PocketSphinx against all 37 lines (the two takes that open with a laugh were checked from the first word), set 2.4 dB quieter to match and encoded as 80 kbps mono MP3. `src/lib/announcer.ts` picks among the takes; a take missing from the manifest is skipped.

# Audio build scripts (Nov 2026)

- `build_sfx.py` cuts the FilmCow Recorded SFX into `public/audio/sfx/<name>-<n>.mp3` and writes `manifest.json`.
- `build_crowd.py` cuts Nate's crowd recordings (BCB\Sounds\crowd-*.mp3) into cheer, cheer-big, aww, roar and the looping crowd bed.
- `align_vo.py` force-aligns the ElevenLabs announcer take to the cue sheet (PocketSphinx) so each line becomes `public/audio/vo/<clip>.mp3`.
- `src/lib/audio-manifest.ts` lists effect variant counts and announcer clip lengths; regenerate it after changing the audio.

Paths inside the scripts point at the build machine; pass your own source folders as arguments.

# Synth Forest — MIDI discovery rewards patch

## What changed
- Discovery rewards now load **Standard MIDI Files (.mid)** from the repository library; prerecorded MP3/WAV upload has been removed.
- Added reward playback settings: tempo (50–150%), transpose (±12 semitones), level, and synth voice (crystal chime / nature pad).
- Playback preferences persist in this browser using localStorage.
- Play/stop controls appear after the daily discovery is completed.
- MIDI notes are triggered through Synth Forest's existing synth voices and effects routing; no recorded audio is decoded.

## Add your own MIDI rewards
1. Put each original `.mid` file in `public/rewards/melodies/`.
2. Edit `public/rewards/manifest.json` and add an entry:
   ```json
   {
     "rewards": [
       {
         "id": "moonlit-pond",
         "name": "Moonlit Pond",
         "file": "/rewards/melodies/moonlit-pond.mid"
       }
     ]
   }
   ```
3. Commit and deploy. Only repository maintainers can add or replace reward files; players have no upload control.

## MIDI compatibility
- Standard MIDI File, format 0 or 1, PPQ timing.
- SMPTE time division is not supported.
- Tempo meta-events, note-on, note-off and velocity are read.
- MIDI program changes and per-track instrument assignments are not mapped; the in-app voice setting selects the playback timbre.
- The current synth voices have their own natural envelopes, so MIDI note durations influence event timing but do not create a full MIDI-style sustain/release envelope.

## Validation
This patch was applied to the uploaded source archive. A full Vite/TypeScript build was not run in this environment; run `npm install` and `npm run build` before deploying.

# Film audio — sources & licenses

All audio below was downloaded 2026-10-13 from Pixabay. Everything is under the **Pixabay Content License**:
free for commercial and non-commercial use, no attribution required, not to be sold or redistributed
as standalone audio files. Summary: https://pixabay.com/service/license-summary/
None of these items is marked "AI generated" on its Pixabay page.

## Score — `film-score.mp3`

198.0 s, 112 kbps CBR, 44.1 kHz stereo. An edit of one track:

| Title | Artist | Source page | License | Notes |
|-------|--------|-------------|---------|-------|
| Reflected Light | SergePavkinMusic | https://pixabay.com/music/beautiful-plays-reflected-light-147979/ | Pixabay Content License | Marked **"Content ID Registered"**: no effect on the website. If the film is uploaded to YouTube or another Content ID platform, dispute any claim with the free Pixabay license certificate. |

The edit is phrase-aligned (13.71 s phrases), with levels and filters automated. The exact recipe is in
`src/lib/sfx/score.ts` and `.omc/score/cands/reflected.json`. It was rendered with an
OfflineAudioContext (Chromium) and encoded with LAME (lameenc).

## Sound effects — `sfx/film-sfx.mp3` + `sfx/film-sfx.json`

The sprite is mono, 128 kbps. Each sample was trimmed, pitched to the score's key where tonal, band-limited,
faded and normalized (`.omc/score/v3/sprite.mjs`).

| Sprite key | Title | Creator | Source page |
|------------|-------|---------|-------------|
| tick | Soft UI Click | Universfield | https://pixabay.com/sound-effects/film-special-effects-soft-ui-click-147352/ |
| type | UI Click Soft | SoundShelfStudio | https://pixabay.com/sound-effects/technology-ui-click-soft-512213/ |
| beep | UI Futuristic HUD Beep | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-futuristic-hud-beep-525658/ |
| data | UI Data Processing Beep | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-data-processing-beep-527474/ |
| scan | UI Tactical Scan Beep | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-tactical-scan-beep-537294/ |
| lock | UI Target Locked Beep | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-target-locked-beep-535369/ |
| confirm | Navigation Confirm Beep | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-navigation-confirm-beep-535096/ |
| chime | Soft Notification | Universfield | https://pixabay.com/sound-effects/film-special-effects-soft-notification-146623/ |
| chime2 | Soft Notification | Universfield | https://pixabay.com/sound-effects/film-special-effects-soft-notification-131438/ |
| pop | Bubble Pop 04 | Universfield | https://pixabay.com/sound-effects/people-bubble-pop-04-323580/ |
| whoosh | Slow Swoosh | Universfield | https://pixabay.com/sound-effects/film-special-effects-slow-swoosh-567191/ |
| swish | Thin Swoosh | Universfield | https://pixabay.com/sound-effects/film-special-effects-thin-swoosh-352756/ |
| impact | Cinematic Impact Hit | Universfield | https://pixabay.com/sound-effects/film-special-effects-cinematic-impact-hit-352702/ |
| thud | Cinematic Impact Boom 05 | Universfield | https://pixabay.com/sound-effects/film-special-effects-cinematic-impact-boom-05-352465/ |
| glitch | Glitch Transition 1 | AleXZavesa | https://pixabay.com/sound-effects/glitch-transition-1-463623/ |
| riser | Short Sweep 01 - BRVHRTZ | BRVHRTZ | https://pixabay.com/sound-effects/film-special-effects-short-sweep-01-brvhrtz-224283/ |

The `cut`, `boot`, `reject`, `pulse` and `crack` sounds, and the scene-event palette voices `air`, `keys`,
`shimmer`, `sweep`, `dull`, `buzz`, `open` and `warm` (see `src/lib/sfx/eventMap.ts`), are synthesized in
`src/lib/sfx/engine.ts` — no third-party audio.
That file also has a synthesized fallback for every sample, used if the sprite fails to load.

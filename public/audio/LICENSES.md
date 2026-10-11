# Film score — audio sources & licenses

`film-score.mp3` (172.5 s, 128 kbps CBR, 44.1 kHz stereo) is an edit of two tracks,
downloaded 2026-10-12 from Pixabay Music. Both are under the **Pixabay Content License**
(free for commercial and non-commercial use, no attribution required; not to be sold or
redistributed as a standalone music file): https://pixabay.com/service/license-summary/
Neither track is marked "Content ID Registered" or "AI generated" on its Pixabay page.

| # | Title | Artist | Source page | License | Used |
|---|-------|--------|-------------|---------|------|
| 1 | Tension Documentary | AtlasAudio | https://pixabay.com/music/ambient-tension-documentary-519912/ | Pixabay Content License | film 0 – 82.5 s (track 0 s →), −2.5 dB, fade-out from 80.0 s |
| 2 | Light Atmosphere Garage | soundoffreedom | https://pixabay.com/music/upbeat-light-atmosphere-garage-465156/ | Pixabay Content License | film 81.54 – 172.5 s (track 87.126 s →), −10 dB (+6 dB through the breakdown until the drop at film 111.0 s), fade-out 164.0 → 172.5 s |

Edit recipe (exact parameters): `src/lib/sfx/score.ts` header. The edit was rendered with an
OfflineAudioContext (Chromium) and encoded with LAME (lameenc 1.8.4) — no audio files other
than the two above are included.

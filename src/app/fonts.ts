// ─────────────────────────────────────────────────────────────────────────
// FONT LOADING — single source of truth for every self-hosted web font face.
//
// Self-hosted (replaces render-blocking CDN @import). Each package ships
// @font-face with the LITERAL family names referenced by globals.css tokens,
// scene `--mono/--kr/--sans` stacks, and canvas `ctx.font` strings.
//
// Import this module ONCE (from app/layout.tsx), BEFORE globals.css, so the
// @font-face rules are registered before any token/style references them.
//
// To change which faces ship, edit THIS file only. The FONTS table below
// documents family → loaded weights → where it's referenced (keep in sync).
// ─────────────────────────────────────────────────────────────────────────

// Pretendard — primary KR/sans (variable subset). Family: 'Pretendard Variable'.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'

// JetBrains Mono — primary code/mono. Family: 'JetBrains Mono'.
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/jetbrains-mono/800.css'

// Share Tech Mono — terminal/HUD accent. Family: 'Share Tech Mono'.
import '@fontsource/share-tech-mono/400.css'

// DM Mono — instrument/label mono. Family: 'DM Mono'.
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'

// IBM Plex Sans KR — KR UI. Family: 'IBM Plex Sans KR'.
import '@fontsource/ibm-plex-sans-kr/400.css'
import '@fontsource/ibm-plex-sans-kr/500.css'
import '@fontsource/ibm-plex-sans-kr/600.css'
import '@fontsource/ibm-plex-sans-kr/700.css'

// IBM Plex Mono — secondary mono. Family: 'IBM Plex Mono'.
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'

// Oswald — condensed display. Family: 'Oswald'.
import '@fontsource/oswald/400.css'
import '@fontsource/oswald/600.css'
import '@fontsource/oswald/700.css'

// Inter — UI sans. Family: 'Inter'.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

// Cormorant Garamond — editorial serif. Family: 'Cormorant Garamond'.
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/cormorant-garamond/600-italic.css'

// Noto Serif KR — KR serif. Family: 'Noto Serif KR'.
import '@fontsource/noto-serif-kr/500.css'
import '@fontsource/noto-serif-kr/600.css'
import '@fontsource/noto-serif-kr/700.css'

// Playfair Display — hero serif. Family: 'Playfair Display'.
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/500-italic.css'
import '@fontsource/playfair-display/600-italic.css'

// Family/weight inventory is documented inline above (one comment per family).

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

// NOTE: 씬 전용 디스플레이 폰트(Share Tech Mono · DM Mono · IBM Plex Sans KR ·
// IBM Plex Mono · Oswald)는 여기서 제거하고 src/scenes/_styles/scene-fonts.ts 로 옮겼다.
// SceneHost 와 함께 씬 청크에 실려, 씬을 마운트하는 라우트에서만 로드된다(랜딩/resume 제외).

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

// Noto Serif KR — KR serif. Family: 'Noto Serif KR'. Weight 600 only (Playfair fallback; one weight sufficient).
import '@fontsource/noto-serif-kr/600.css'

// Playfair Display — hero serif. Family: 'Playfair Display'.
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/500-italic.css'
import '@fontsource/playfair-display/600-italic.css'

// Family/weight inventory is documented inline above (one comment per family).

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
// NOTE: pretendard 패키지 원본 CSS 는 src 힌트가 format('woff2-variations') 인데,
// 이 비표준 힌트를 인식 못 하는 브라우저(Firefox·일부 Windows 빌드)는 소스를 통째로
// 건너뛰어 시스템 폰트(Windows=Malgun)로 fallback → "폰트가 안 먹는" 증상이 난다.
// 그래서 dynamic-subset woff2 를 public/fonts/pretendard 로 self-host 하고, 힌트를
// 표준 format('woff2') 로 바꾼 로컬 CSS(app/pretendard.css)를 대신 로드한다.
// (재생성: pretendard 패키지 CSS 에서 url→/fonts/pretendard, woff2-variations→woff2 치환)
import './pretendard.css'

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

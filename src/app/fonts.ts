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
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/jetbrains-mono/800.css'

// NOTE: 씬 전용 디스플레이 폰트(Share Tech Mono · DM Mono · IBM Plex Sans KR ·
// IBM Plex Mono · Oswald)는 여기서 제거하고 src/scenes/_styles/scene-fonts.ts 로 옮겼다.
// SceneHost 와 함께 씬 청크에 실려, 씬을 마운트하는 라우트에서만 로드된다(랜딩/resume 제외).

// Inter 는 제거 — Pretendard 의 라틴 글리프가 Inter 기반이라 중복.

// Cormorant Garamond(/projects 전용)·Noto Serif KR 600(랜딩 '박양하' + /projects 한글 세리프)은
// 전역에서 빼서 쓰는 라우트에서만 로드한다 — Noto Serif KR CSS 만 ~92KB(유니코드 서브셋 @font-face
// 수백 개)라 씬/필름/이력서 라우트의 렌더 블로킹 CSS 를 키우고 있었다.
//   - app/page.tsx            → noto-serif-kr/600
//   - app/projects/layout.tsx → cormorant-garamond/* + noto-serif-kr/600
// (전역 토큰 --font-serif/--font-display 의 스택에는 그대로 남아 있어, 미로드 라우트에선 Pretendard 로 폴백.)

// Playfair Display — hero serif. Family: 'Playfair Display'.
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/500-italic.css'
import '@fontsource/playfair-display/600-italic.css'

// Family/weight inventory is documented inline above (one comment per family).

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 시안은 public/lab 의 self-contained HTML 로 그대로 서빙(하이브리드 임베드).
  // distDir 을 env 로 덮어쓸 수 있게 해, dev 서버(.next)를 깨지 않고 별도 폴더로
  // build 검증할 수 있다. 예: NEXT_DIST_DIR=.next-verify next build
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // Project screenshots go through next/image — serve AVIF first, WebP fallback.
  images: { formats: ['image/avif', 'image/webp'], minimumCacheTTL: 31536000 },
  // Spline runtime ships ESM-only exports (no `require`/`default` condition);
  // transpiling lets Next resolve it cleanly from the client component.
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime'],
  typescript: { ignoreBuildErrors: false },
  // 32개 포팅 씬은 의도적 명령형 스타일(raw JSX 따옴표·react-compiler 힌트 등)이라
  // 기존 lint 위반이 다수 — 배포(build)를 막지 않게 빌드 중 lint 게이트는 끈다.
  // lint 는 `npm run lint`/CI 의 별도(비차단) 단계로만 돌린다. tsc(타입)는 계속 차단 게이트.
  eslint: { ignoreDuringBuilds: true },
  // React Compiler — 셸/오케스트레이션(Film 비트 전환·갤러리 그리드·테마 스위칭)의
  // 리렌더를 자동 메모이즈. 32개 포팅 씬 컴포넌트의 useMemo/useCallback 수작업 제거(DX).
  // 캔버스 rAF 루프는 effect/ref 안이라 컴파일러가 bail-out → 안전. Babel 패스가 추가돼
  // build 가 느려지는 비용이 있음. (Next 16 승격 시 experimental → 최상위로 이동)
  // (experimental.inlineCss was measured and rejected: it also embeds the CSS in
  // every RSC prefetch payload — 4KB → 26KB each — and mobile FCP got worse.)
  experimental: { reactCompiler: true },
  // The film clock drives an imperative rAF loop; StrictMode's dev-only double
  // invocation spins up a second loop and races the scene timeline (prod, which
  // never double-invokes, is unaffected). Disable so dev matches prod timing.
  reactStrictMode: false,

  // 은퇴한 레거시 씬 / three.js 후보(x-*) 슬러그 → 승격된 씬 슬러그. 구 링크·북마크 보존.
  // /lab/<key>.html 은 x-* 씬과 은퇴 씬 모두 정적 HTML 이 없으므로 단독 라우트로 보낸다.
  async redirects() {
    const retired: Record<string, string> = {
      'radar-sonar': 'work-radar',
      graphrag: 'kip-evidence',
      'mes-console': 'mes-line',
      'digital-twin': 'smart-factory',
      'sonar-waterfall': 'weld-doe',
      'cmm-metrology': 'vision-inspection',
      oscilloscope: 'vision-inspection',
      'ai-latent': 'sn-trace',
    }
    const promoted: Record<string, string> = {
      'x-work-radar-rails': 'work-radar',
      'x-kip-evidence': 'kip-evidence',
      'x-mes-line': 'mes-line',
      'x-smart-factory': 'smart-factory',
      'x-weld-doe': 'weld-doe',
      'x-vision-reverse': 'vision-inspection',
      'x-sn-trace': 'sn-trace',
      'x-excel-to-db': 'excel-to-db',
      'x-lob-balance': 'line-balance',
    }
    const all = { ...retired, ...promoted }
    return [
      ...Object.entries(all).map(([from, to]) => ({ source: `/s/${from}`, destination: `/s/${to}`, permanent: true })),
      ...Object.entries(all).map(([from, to]) => ({ source: `/lab/${from}.html`, destination: `/s/${to}`, permanent: true })),
      { source: '/candidates', destination: '/scenes', permanent: true },
    ]
  },

  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    // CSP notes:
    //   script-src: 'unsafe-inline' kept — scenes use dangerouslySetInnerHTML +
    //     inline <script> blocks; Spline loads WASM via blob: workers.
    //     esm.sh / cdn.jsdelivr.net serve Three.js / D3 in lab HTML pages.
    //     Vercel Speed Insights injects an inline script bootstrapper.
    //   style-src: 'unsafe-inline' kept — scenes apply styles via style props /
    //     dangerouslySetInnerHTML; Spline injects inline styles at runtime.
    //   font-src: data: covers base64-embedded font faces; cdn.jsdelivr.net
    //     serves Pretendard variable font across all lab pages.
    //   img-src: blob: for canvas.toBlob() snapshots; data: for inline SVG/PNG.
    //   connect-src: prod.spline.design + *.spline.design for WASM / scene assets;
    //     *.vercel-insights.com for Speed Insights beacon.
    //   worker-src: blob: required — Spline spawns WASM workers via blob: URLs.
    //   frame-ancestors: SAMEORIGIN (mirrors X-Frame-Options below).
    const csp = [
      "default-src 'self'",
      // 'wasm-unsafe-eval': Spline 런타임이 WebAssembly(물리/렌더)를 컴파일 — 없으면 CSP 가 차단해 랜딩 로봇이 안 뜬다.
      // 'unsafe-eval'(dev 전용): Next dev 의 Fast Refresh(react-refresh)가 eval 을 써서, 없으면 dev 페이지가 통째로 깨진다.
      //   프로덕션 빌드는 eval 을 쓰지 않으므로 prod CSP 에서는 제외(엄격 유지).
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} https://esm.sh https://cdn.jsdelivr.net https://prod.spline.design https://*.vercel-insights.com https://va.vercel-scripts.com`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https://cdn.jsdelivr.net",
      "img-src 'self' data: blob:",
      "media-src 'self' data: blob:", // 일부 씬이 data:video/mp4 를 인라인 임베드

      // unpkg.com: Spline 런타임이 modelling-wasm(process.wasm)을 unpkg 에서 fetch — 없으면 랜딩 로봇이 안 뜬다.
      "connect-src 'self' https://prod.spline.design https://*.spline.design https://unpkg.com https://*.vercel-insights.com",
      "frame-ancestors 'self'",
      "worker-src 'self' blob:",
    ].join('; ')

    // public/ assets are not content-hashed, so they can't be `immutable` the way
    // /_next/static is — but fonts/brand/screenshots only change on deploy. A day of fresh
    // cache plus a week of stale-while-revalidate removes repeat-visit refetches.
    const assetCache = { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }

    return [
      { source: '/fonts/:path*', headers: [assetCache] },
      { source: '/brand/:path*', headers: [assetCache] },
      // two segments = public/projects/<slug>/<file> screenshots; /projects/<slug> pages have one.
      { source: '/projects/:slug/:file', headers: [assetCache] },
      { source: '/:file(favicon.ico|favicon.svg|icons.svg|apple-touch-icon.png|icon-192.png|icon-512.png|site.webmanifest)', headers: [assetCache] },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 시안은 public/lab 의 self-contained HTML 로 그대로 서빙(하이브리드 임베드).
  // distDir 을 env 로 덮어쓸 수 있게 해, dev 서버(.next)를 깨지 않고 별도 폴더로
  // build 검증할 수 있다. 예: NEXT_DIST_DIR=.next-verify next build
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Spline runtime ships ESM-only exports (no `require`/`default` condition);
  // transpiling lets Next resolve it cleanly from the client component.
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime'],
  typescript: { ignoreBuildErrors: false },
  // React Compiler — 셸/오케스트레이션(Film 비트 전환·갤러리 그리드·테마 스위칭)의
  // 리렌더를 자동 메모이즈. 32개 포팅 씬 컴포넌트의 useMemo/useCallback 수작업 제거(DX).
  // 캔버스 rAF 루프는 effect/ref 안이라 컴파일러가 bail-out → 안전. Babel 패스가 추가돼
  // build 가 느려지는 비용이 있음. (Next 16 승격 시 experimental → 최상위로 이동)
  experimental: { reactCompiler: true },
  // The film clock drives an imperative rAF loop; StrictMode's dev-only double
  // invocation spins up a second loop and races the scene timeline (prod, which
  // never double-invokes, is unaffected). Disable so dev matches prod timing.
  reactStrictMode: false,
}

export default nextConfig

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 시안은 public/lab 의 self-contained HTML 로 그대로 서빙(하이브리드 임베드).
  // distDir 을 env 로 덮어쓸 수 있게 해, dev 서버(.next)를 깨지 않고 별도 폴더로
  // build 검증할 수 있다. 예: NEXT_DIST_DIR=.next-verify next build
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: { ignoreBuildErrors: false },
  // The film clock drives an imperative rAF loop; StrictMode's dev-only double
  // invocation spins up a second loop and races the scene timeline (prod, which
  // never double-invokes, is unaffected). Disable so dev matches prod timing.
  reactStrictMode: false,
}

export default nextConfig

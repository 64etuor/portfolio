import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 27 시안은 public/lab 의 self-contained HTML 로 그대로 서빙(하이브리드 임베드).
  typescript: { ignoreBuildErrors: false },
}

export default nextConfig

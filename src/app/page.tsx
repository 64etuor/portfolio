// 히어로 이름(한글 세리프) 전용 — 전역이 아니라 랜딩 라우트에서만 로드(~92KB CSS).
import '@fontsource/noto-serif-kr/600.css'
import { Landing } from '@/components/landing/Landing'

// Home = the landing page (Spline robot + actions). "Projects Portfolio" plays
// the autoplay film at /film; the film returns here when it ends.
//
// The robot pulls from two third-party origins at runtime — the scene from
// prod.spline.design and the modelling WASM from unpkg.com — each costing a DNS +
// TLS round trip before its first byte. Warming both here (only on this route, the
// only one that mounts Spline) takes those handshakes off the critical path. It does
// not fix the robot's ~2.4s WASM/WebGL init, which is CPU-bound, not network-bound —
// see Landing for how the hero is composed so a late robot is never a broken frame.
export default function Home() {
  return (
    <>
      <link rel="preconnect" href="https://prod.spline.design" crossOrigin="" />
      <link rel="preconnect" href="https://unpkg.com" crossOrigin="" />
      <Landing />
    </>
  )
}

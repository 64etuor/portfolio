// Noto Serif KR 은 여기서 로드하지 않는다: 랜딩 히어로 카피(SITE.landing.hero)는 KO/EN 모두
// 라틴 문자뿐이라 Playfair Display 로 전부 그려지고, 한글 세리프 폴백이 쓰일 글리프가 없다.
// 그런데 그 CSS(~90KB, 유니코드 서브셋 @font-face 수백 개)는 렌더 블로킹이라 FCP 만 늦췄다.
// 한글 히어로 카피를 다시 넣으면 이 import 를 되살릴 것.
import { Landing } from '@/components/landing/Landing'
import { SITE } from '@content/site'
import { pageMetadata } from './seo'

export const metadata = pageMetadata({
  title: SITE.metadata.title.ko,
  description: SITE.metadata.description.ko,
  path: '/',
})

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

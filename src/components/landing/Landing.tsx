'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Application } from '@splinetool/runtime'
import { PretextText } from './PretextText'
import { LandingAmbientWords } from './LandingAmbientWords'
import { SITE } from '@content/site'

// The Spline 3D runtime (~the whole landing JS budget) is loaded client-only and
// mounted on idle, so it never blocks the landing's FCP/LCP/TTI. The dark CRT-noir
// backdrop (.lp-root + veil/scan) is already the placeholder; the robot fades in.
const Spline = dynamic(() => import('./SplineClient'), { ssr: false })

const [HERO_PORTFOLIO, HERO_ITS_ME, HERO_NAME, HERO_TAGLINE] = SITE.landing.hero

// Runtime scene (.splinecode) — replaces the old cross-origin iframe embed, so we
// can drive the camera on navigation.
const SPLINE_SCENE = 'https://prod.spline.design/7zWwWxRuaxqIZXDE/scene.splinecode'

// Thin line icons that match the film's technical HUD aesthetic.
const ICON: Record<string, ReactNode> = {
  projects: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="3" y1="4" x2="10" y2="4" />
      <line x1="3" y1="8" x2="13" y2="8" />
      <line x1="3" y1="12" x2="7" y2="12" />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" stroke="none">
      <path d="M5 3.2 L12.5 8 L5 12.8 Z" />
    </svg>
  ),
  scenes: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.6" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.6" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.6" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="0.6" />
    </svg>
  ),
  skills: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M8 2 L14 5.4 L8 8.8 L2 5.4 Z" />
      <path d="M2.4 9.3 L8 12.6 L13.6 9.3" />
    </svg>
  ),
  resume: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M4 2.3 H9.5 L12.7 5.5 V13.7 H4 Z" />
      <line x1="6" y1="8" x2="11" y2="8" />
      <line x1="6" y1="10.6" x2="11" y2="10.6" />
    </svg>
  ),
  contact: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <rect x="2.2" y="3.6" width="11.6" height="8.8" rx="1" />
      <path d="M2.6 4.4 L8 8.6 L13.4 4.4" />
    </svg>
  ),
}

type NavItem = { href: string; label: string; icon: ReactNode; primary?: boolean; external?: boolean; mail?: boolean }

const NAV: NavItem[] = [
  { href: '/film', label: 'Portfolio', icon: ICON.portfolio, primary: true },
  { href: '/s/gantt-cpm', label: 'Projects', icon: ICON.projects, external: false },
  { href: '/scenes', label: 'Scenes', icon: ICON.scenes, external: false },
  { href: '/skills', label: 'Skills', icon: ICON.skills, external: false },
  { href: '/resume', label: 'Resume', icon: ICON.resume },
]

const TX_MS = 720

/**
 * Landing — the portfolio home. A full-screen Spline robot (runtime) under the
 * film's dark CRT-noir tone. Pressing a nav button fires a transition: the robot
 * camera warps toward the scene while a glitch/bloom overlay sweeps, then we
 * navigate. The pretext title/tagline and ambient words sit over the scene.
 */
export function Landing() {
  const router = useRouter()
  const splineRef = useRef<Application | null>(null)
  const navigatingRef = useRef(false)
  const [leaving, setLeaving] = useState(false)
  // Reveal from black on mount — continues the film's iris-out collapse so the handoff
  // from /film reads as one continuous shot (also a gentle intro on direct loads).
  const [entering, setEntering] = useState(true)
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntering(false))
    return () => cancelAnimationFrame(r)
  }, [])

  // Defer mounting the heavy Spline 3D runtime until the browser is idle (or a
  // 1.5s cap), so the landing paints + becomes interactive on the lightweight
  // content first. The robot then loads off the critical path.
  const [showSpline, setShowSpline] = useState(false)
  useEffect(() => {
    type RIC = (cb: () => void, opts?: { timeout: number }) => number
    const ric = (window as unknown as { requestIdleCallback?: RIC }).requestIdleCallback
    if (ric) {
      const id = ric(() => setShowSpline(true), { timeout: 1500 })
      return () => (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id)
    }
    const t = window.setTimeout(() => setShowSpline(true), 300)
    return () => clearTimeout(t)
  }, [])

  function onLoad(app: Application) {
    splineRef.current = app
    // expose for scene inspection (objects / variables / events) during dev
    ;(window as unknown as { __spline?: Application }).__spline = app
  }

  // Scene warp on navigation: dolly the camera ("Camera 2", z≈1000) in toward the
  // robot while the robot leans/bows forward — so it feels like the robot pulls us
  // into the page. pauseGameControls() stops the look-at from fighting the lean.
  function cameraWarp() {
    const app = splineRef.current
    if (!app) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    try {
      ;(app as { pauseGameControls?: () => void }).pauseGameControls?.()
      const cam = app.findObjectByName('Camera 2')
      const torso = app.findObjectByName('Top part')
      const head = app.findObjectByName('Head')
      const z0 = cam ? cam.position.z : 1000
      const z1 = z0 * 0.55 // dive in
      const tx0 = torso ? torso.rotation.x : 0
      const hx0 = head ? head.rotation.x : 0
      const t0 = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / TX_MS)
        const e = k * k // ease-in: accelerate into the scene
        if (cam) cam.position.z = z0 + (z1 - z0) * e
        if (torso) torso.rotation.x = tx0 + 0.42 * e // lean the upper body in
        if (head) head.rotation.x = hx0 + 0.34 * e // bow the head
        if (k < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch {
      /* never block navigation on a camera hiccup */
    }
  }

  function handleNav(e: React.MouseEvent, item: NavItem) {
    if (item.mail) return // let mailto open the mail client normally
    e.preventDefault()
    if (navigatingRef.current) return
    navigatingRef.current = true
    setLeaving(true)
    cameraWarp()
    window.setTimeout(() => {
      if (item.external) window.location.href = item.href
      else router.push(item.href)
    }, TX_MS)
  }

  return (
    <main className="lp-root">
      {showSpline && <Spline scene={SPLINE_SCENE} onLoad={onLoad} className="lp-spline" />}

      {/* vignette + bottom fade for legibility + faint scanlines over the scene */}
      <div className="lp-veil" aria-hidden />
      <div className="lp-scan" aria-hidden />

      {/* mask the runtime's "Built with Spline" badge (bottom-right) */}
      <div className="lp-mask" aria-hidden />

      {/* descriptor words flickering at random spots behind the scene */}
      <LandingAmbientWords />

      <div className="lp-content">
        {/* all landing text rendered with the pretext letter-physics, 2.5s in */}
        <PretextText
          text={HERO_PORTFOLIO}
          fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight={500}
          fontPx={11}
          letterSpacing={5}
          color="#8d8d8d"
          width={280}
          height={18}
          delay={2400}
          style={{ margin: '0 0 12px' }}
        />
        {/* film ends on "미래를 만드는 사람" → lands here: "It's me." 우아한 이탤릭 세리프,
            이름 위에서 같은 pretext 등장 효과로 조립 (필름 엔딩과 자연스럽게 연결) */}
        <PretextText
          text={HERO_ITS_ME}
          fontFamily="'Playfair Display', 'Noto Serif KR', serif"
          fontStyle="italic"
          fontWeight={500}
          fontPx={33}
          letterSpacing={1}
          color="#cfe9e3"
          width={300}
          height={48}
          delay={2500}
          style={{ margin: '0 0 4px' }}
        />
        <PretextText
          text={HERO_NAME}
          fontFamily="'Playfair Display', 'Noto Serif KR', serif"
          fontWeight={600}
          fontPx={62}
          letterSpacing={5}
          color="#f1f4f8"
          width={540}
          height={86}
          delay={3500}
          style={{ margin: '0 0 10px', maxWidth: '92vw' }}
        />
        <PretextText
          text={HERO_TAGLINE}
          fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight={500}
          fontPx={16}
          letterSpacing={0}
          color="rgba(150, 168, 180, 0.82)"
          width={470}
          height={40}
          delay={4100}
          style={{ margin: '0 0 28px', maxWidth: '92vw' }}
        />
        <nav className="lp-actions" aria-label="primary">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`lp-btn${item.primary ? ' lp-btn-primary' : ''}`}
              onClick={(e) => handleNav(e, item)}
            >
              <span className="lp-ic">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* navigation transition — glitch slash + bloom sweep (synced with cameraWarp) */}
      <div className={`lp-tx${leaving ? ' lp-tx--on' : ''}`} aria-hidden>
        <div className="lp-tx-slash" />
        <div className="lp-tx-bloom" />
        <div className="lp-tx-noise" />
        {/* dark cover that rises at the end → navigation happens under black,
            then the destination page reveals from black (no abrupt pop) */}
        <div className="lp-tx-fade" />
      </div>

      {/* Reveal-from-black on entry (film iris-out → landing continuity) */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 80,
          pointerEvents: 'none',
          opacity: entering ? 1 : 0,
          transition: 'opacity 760ms ease',
        }}
      />
    </main>
  )
}

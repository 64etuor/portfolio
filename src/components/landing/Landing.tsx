import Link from 'next/link'
import type { ReactNode } from 'react'
import { PROFILE } from '@content/index'
import { PretextText } from './PretextText'
import { LandingAmbientWords } from './LandingAmbientWords'

// Interactive 3D robot background (Spline embed). Overlay layers are
// pointer-events:none so the scene stays interactive; only buttons capture clicks.
const SPLINE_SRC =
  'https://my.spline.design/nexbotrobotcharacterconceptcopy-FULyqbxK0F9M52CamX0Tac2U/'

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

/**
 * Landing — the portfolio home. A full-screen Spline robot under the film's dark
 * CRT-noir tone, with the catchphrase and a row of icon actions just below center
 * (so the robot, which renders around the upper-middle, stays the hero).
 */
export function Landing() {
  return (
    <main className="lp-root">
      <iframe className="lp-spline" src={SPLINE_SRC} title="3D robot" loading="eager" />

      {/* vignette + bottom fade for legibility + faint scanlines over the scene */}
      <div className="lp-veil" aria-hidden />
      <div className="lp-scan" aria-hidden />

      {/* mask the embed's "Built with Spline" badge (bottom-right, inside the iframe) */}
      <div className="lp-mask" aria-hidden />

      {/* descriptor words flickering at random spots behind the scene */}
      <LandingAmbientWords />

      <div className="lp-content">
        {/* all landing text rendered with the pretext letter-physics, 2.5s in */}
        <PretextText
          text="PORTFOLIO"
          fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight={500}
          fontPx={11}
          letterSpacing={5}
          color="#8d8d8d"
          width={280}
          height={18}
          delay={2500}
          style={{ margin: '0 0 14px' }}
        />
        <PretextText
          text="YANGHA PARK"
          fontFamily="'Pretendard Variable', Pretendard, sans-serif"
          fontWeight={800}
          fontPx={60}
          letterSpacing={3}
          color="#f1f4f8"
          width={470}
          height={82}
          delay={2500}
          style={{ margin: '0 0 8px', maxWidth: '92vw' }}
        />
        <PretextText
          text="Designing an awesome future"
          fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight={500}
          fontPx={16}
          letterSpacing={0}
          color="rgba(150, 168, 180, 0.82)"
          width={470}
          height={40}
          delay={2500}
          style={{ margin: '0 0 28px', maxWidth: '92vw' }}
        />
        <nav className="lp-actions" aria-label="primary">
          {/* Projects → interactive gantt / impact board */}
          <a href="/lab/17-gantt-cpm.html" className="lp-btn">
            <span className="lp-ic">{ICON.projects}</span>Projects
          </a>
          {/* Portfolio → the autoplay narrative film */}
          <Link href="/film" className="lp-btn lp-btn-primary">
            <span className="lp-ic">{ICON.portfolio}</span>Portfolio
          </Link>
          {/* Scenes → film scene gallery (12 beats) */}
          <a href="/lab/scenes.html" className="lp-btn">
            <span className="lp-ic">{ICON.scenes}</span>Scenes
          </a>
          {/* Skills → skill demos by area (PM/공정/개발/인프라/PKM) */}
          <a href="/lab/skills.html" className="lp-btn">
            <span className="lp-ic">{ICON.skills}</span>Skills
          </a>
          {/* Resume → pretext-rendered résumé in our dark CRT-noir tone */}
          <Link href="/resume" className="lp-btn">
            <span className="lp-ic">{ICON.resume}</span>Resume
          </Link>
          <a href={`mailto:${PROFILE.contact.email}`} className="lp-btn">
            <span className="lp-ic">{ICON.contact}</span>Contact
          </a>
        </nav>
      </div>
    </main>
  )
}

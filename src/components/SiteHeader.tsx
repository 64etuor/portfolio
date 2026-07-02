'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { sceneById } from '@/scenes/registry'
import { SITE } from '@content/site'

/**
 * The single, unified site header — one bar on every non-immersive route
 * (/s, /c, /resume). Hidden on the landing ('/') and the film ('/film').
 * A centered HOME button; the right end carries a page-specific action where
 * one makes sense (PDF on the résumé, OPEN ↗ on a scene). The same look is
 * replicated inline on the static lab pages (gantt / scenes / skills).
 */
export function SiteHeader() {
  const pathname = usePathname()
  if (pathname === '/' || pathname === '/film') return null

  // Scene page (/s/<slug>): offer to open the raw lab HTML full-screen.
  const scene = pathname.startsWith('/s/') ? sceneById(pathname.slice(3)) : null

  return (
    <header className="site-bar">
      <Link href="/" className="site-bar__brand">{SITE.domain}</Link>
      <Link href="/" className="chrome-btn home">← Home</Link>
      {pathname === '/resume' && (
        // A pre-rendered print-styled PDF, not window.print(): the latter is a
        // silent no-op in embedded WebKit (WKWebView / the cmux browser). A PDF
        // link prints and saves reliably everywhere. Regenerate via
        // `npm run gen:resume:pdf` after résumé content changes.
        <a href="/resume.pdf" target="_blank" rel="noreferrer" className="chrome-btn">
          PDF
        </a>
      )}
      {scene && (
        <a href={`/lab/${scene.file}`} target="_blank" rel="noreferrer" className="chrome-btn">
          Open ↗
        </a>
      )}
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { sceneById } from '@/scenes/registry'

/**
 * The single, unified site header — one bar on every non-immersive route
 * (/s, /c, /resume). Hidden on the landing ('/') and the film ('/film').
 * A centered HOME button; the right end carries a page-specific action where
 * one makes sense (PRINT on the résumé, OPEN ↗ on a scene). The same look is
 * replicated inline on the static lab pages (gantt / scenes / skills).
 */
export function SiteHeader() {
  const pathname = usePathname()
  if (pathname === '/' || pathname === '/film') return null

  // Scene page (/s/<slug>): offer to open the raw lab HTML full-screen.
  const scene = pathname.startsWith('/s/') ? sceneById(pathname.slice(3)) : null

  return (
    <header className="site-bar">
      <Link href="/" className="site-bar__brand">yanghapark.com</Link>
      <Link href="/" className="chrome-btn home">← Home</Link>
      {pathname === '/resume' && (
        <button type="button" className="chrome-btn" onClick={() => window.print()}>
          Print
        </button>
      )}
      {scene && (
        <a href={`/lab/${scene.file}`} target="_blank" rel="noreferrer" className="chrome-btn">
          Open ↗
        </a>
      )}
    </header>
  )
}

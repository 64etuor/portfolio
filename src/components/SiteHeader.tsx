'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { sceneById } from '@/scenes/registry'
import { hasLabPage } from '@/scenes/catalog'
import { SITE } from '@content/site'
import { LocaleSwitcher } from './LocaleSwitcher'
import { useLocale } from './LocaleProvider'

// Document routes get the section nav; immersive routes (/s, /c) keep the compact
// bar with a centered HOME so the scene below keeps its full height.
const DOC_ROUTES = ['/projects', '/scenes', '/skills', '/resume'] as const

function isUnder(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// The landing's "Projects" opens the career Gantt (/s/gantt-cpm), whose drawer leads
// into /projects/<slug>. The header keeps that same destination, so the item has to
// read as current anywhere under /projects as well.
function isCurrent(pathname: string, href: string): boolean {
  return isUnder(pathname, href) || (href === '/s/gantt-cpm' && isUnder(pathname, '/projects'))
}

/**
 * The single, unified site header — one bar on every non-immersive route.
 * Hidden on the landing ('/') and the film ('/film').
 *
 * - Document routes (/projects, /scenes, /skills, /resume): brand (→ home) on the
 *   left, the same five destinations as the landing buttons in the middle, so a
 *   visitor moves between sections without going back through the landing.
 * - Scene routes (/s, /c): brand + a centered HOME button, as before.
 *
 * The right end carries a page-specific action where one makes sense (PRINT on
 * the résumé, OPEN ↗ on a scene). The compact look is replicated inline on the
 * static lab pages (gantt / scenes / skills).
 */
export function SiteHeader() {
  const pathname = usePathname()
  const { t } = useLocale()
  if (pathname === '/' || pathname === '/film') return null

  // Scene page (/s/<slug>): offer to open the raw lab HTML full-screen.
  const scene = pathname.startsWith('/s/') ? sceneById(pathname.slice(3)) : null
  const withNav = DOC_ROUTES.some((route) => isUnder(pathname, route))

  return (
    <header className={`site-bar${withNav ? ' site-bar--nav' : ''}`}>
      <Link href="/" className="site-bar__brand">{SITE.domain}</Link>
      {withNav ? (
        <nav className="site-bar__nav" aria-label={t(SITE.landing.navigation)}>
          {SITE.landing.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="site-bar__link"
              aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>
      ) : (
        <Link href="/" className="chrome-btn home">{t(SITE.chrome.home)}</Link>
      )}
      {pathname === '/resume' && (
        // Native print. Works in real Chrome/Safari; note it is a no-op inside
        // embedded WebKit (WKWebView, e.g. the cmux in-app browser) — print the
        // résumé from a real browser there.
        <button type="button" className="chrome-btn" onClick={() => window.print()}>
          {t(SITE.chrome.print)}
        </button>
      )}
      {scene && hasLabPage(scene) && (
        <a href={`/lab/${scene.file}`} target="_blank" rel="noreferrer" className="chrome-btn">
          {t(SITE.chrome.open)}
        </a>
      )}
      <LocaleSwitcher />
    </header>
  )
}

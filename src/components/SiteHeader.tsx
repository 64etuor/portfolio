'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

/**
 * Global site chrome. Hidden on the home route ('/') because that route is the
 * full-screen cinematic film + interactive finale — the nav would break immersion.
 * Still rendered on /s/[scene] and /c/[comp].
 */
export function SiteHeader() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 md:px-10"
      style={{ background: 'color-mix(in oklab, var(--bg) 80%, transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--line)' }}
    >
      <Link href="/" className="font-serif text-lg font-semibold" style={{ color: 'var(--ink)' }}>
        Park&nbsp;Yangha
      </Link>
      <nav className="flex items-center gap-5 text-sm" style={{ color: 'var(--muted)' }}>
        <Link href="/" className="hover:opacity-80">필름</Link>
        <Link href="/c/overview" className="hover:opacity-80">조합</Link>
        <ThemeSwitcher />
      </nav>
    </header>
  )
}

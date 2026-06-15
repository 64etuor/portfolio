import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import Link from 'next/link'
import { PROFILE } from '@content/index'

export const metadata: Metadata = {
  title: '박양하 · Portfolio',
  description: PROFILE.identity.tagline,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ThemeProvider>
          <header
            className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 md:px-10"
            style={{ background: 'color-mix(in oklab, var(--bg) 80%, transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--line)' }}
          >
            <Link href="/" className="font-serif text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              Park&nbsp;Yangha
            </Link>
            <nav className="flex items-center gap-5 text-sm" style={{ color: 'var(--muted)' }}>
              <Link href="/" className="hover:opacity-80">시안</Link>
              <Link href="/c/overview" className="hover:opacity-80">조합</Link>
              <ThemeSwitcher />
            </nav>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

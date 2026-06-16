import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SiteHeader } from '@/components/SiteHeader'
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
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

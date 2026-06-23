import type { Metadata } from 'next'
// Self-hosted web fonts — single source of truth in ./fonts (must load before globals).
import './fonts'
import './globals.css'
import './cinematic.css' // 랜딩/필름/전환 (globals 에서 분리)
// resume.css 는 /resume 세그먼트(app/resume/layout.tsx)에서만 로드 — 글로벌 페이로드 축소
import { SiteHeader } from '@/components/SiteHeader'
import { PROFILE } from '@content/index'
import { SITE } from '@content/site'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  metadataBase: new URL('https://yanghapark.com'),
  title: SITE.title,
  description: PROFILE.identity.tagline,
  openGraph: {
    type: 'website',
    title: SITE.title,
    description: PROFILE.identity.tagline,
    url: 'https://yanghapark.com',
    siteName: SITE.title,
    locale: 'ko_KR',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: PROFILE.identity.tagline,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: PROFILE.identity.name,
  alternateName: PROFILE.identity.nameEn,
  jobTitle: PROFILE.identity.title,
  description: PROFILE.identity.tagline,
  url: PROFILE.contact.url,
  sameAs: [PROFILE.contact.github, PROFILE.contact.githubPage],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <SiteHeader />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
// Self-hosted web fonts — single source of truth in ./fonts (must load before globals).
import './fonts'
import './globals.css'
import './cinematic.css' // 랜딩/필름/전환 (globals 에서 분리)
// resume.css 는 /resume 세그먼트(app/resume/layout.tsx)에서만 로드 — 글로벌 페이로드 축소
import { SiteHeader } from '@/components/SiteHeader'
import { LocaleProvider } from '@/components/LocaleProvider'
import { SkipToContent } from '@/components/SkipToContent'
import { PROFILE } from '@content/index'
import { SITE } from '@content/site'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  metadataBase: new URL('https://yanghapark.com'),
  title: SITE.metadata.title.ko,
  description: SITE.metadata.description.ko,
  openGraph: {
    type: 'website',
    title: SITE.metadata.title.ko,
    description: SITE.metadata.description.ko,
    url: 'https://yanghapark.com',
    siteName: SITE.metadata.title.ko,
    locale: 'ko_KR',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.metadata.title.ko,
    description: SITE.metadata.description.ko,
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

const ON_VERCEL = Boolean(process.env.VERCEL)

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

// JSON.stringify does not HTML-escape: a `</script>` (or `<!--`) inside any string
// value would break out of the <script> element. Escape the HTML-significant
// characters and the JS line separators as \uXXXX — identical parsed JSON.
const JSON_LD_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}
function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (ch) => JSON_LD_ESCAPES[ch])
}

// Skip-link styles: visually-hidden until focused, then revealed top-left above
// all chrome. Scoped inline so globals.css is untouched (server component — CSS
// :focus, not JS handlers). Keep this CSS as a single source for the .skip-link.
const skipLinkCss = `
.skip-link{position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;z-index:1000;padding:10px 16px;background:#050505;color:#fff;border:1px solid #fff;border-radius:4px;text-decoration:none;}
.skip-link:focus{left:12px;top:12px;width:auto;height:auto;overflow:visible;}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <style dangerouslySetInnerHTML={{ __html: skipLinkCss }} />
        <LocaleProvider>
          <SkipToContent />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd) }}
          />
          <SiteHeader />
          {/* Pages render their own <main> (landing / resume / some scenes), so this
              skip target is a <div> — a wrapping <main> here would create duplicate/
              nested main landmarks. One <main> per page stays owned by the page. */}
          <div id="main">{children}</div>
          {/* The beacons' /_vercel/* scripts only exist on Vercel's edge; anywhere else
              (local `next start`, self-hosting) they 404 and log console errors. */}
          {ON_VERCEL && <SpeedInsights />}
          {ON_VERCEL && <Analytics />}
        </LocaleProvider>
      </body>
    </html>
  )
}

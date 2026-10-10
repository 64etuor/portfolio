import type { Metadata } from 'next'
import { SITE } from '@content/site'

/**
 * Per-page metadata with a self-referencing canonical and page-specific OG/Twitter
 * cards. Next merges `openGraph`/`twitter` shallowly (a child object replaces the
 * root one wholesale), so the shared fields are restated here. URLs are relative —
 * resolved against `metadataBase` in the root layout.
 *
 * No `alternates.languages`: the EN locale is a client-side toggle on the same URL,
 * so there is no separate English URL to advertise as an hreflang alternate.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  const images = ['/opengraph-image']
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title,
      description,
      siteName: SITE.metadata.title.ko,
      locale: 'ko_KR',
      images,
    },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}

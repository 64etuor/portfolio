import { PROFILE } from '@content/index'
import { SiteFooterView } from './SiteFooterView'

/**
 * Site footer for the document routes (/projects, /scenes, /skills) — the page's
 * contentinfo landmark, rendered after the page's own <main>.
 *
 * Server component on purpose: it reads the contact SSOT (content/profile.ts) and
 * hands only the three strings to the client view, so the profile module never
 * lands in a client bundle. Not mounted on /resume (the masthead already carries
 * the same contacts) or on the immersive routes (/, /film, /s, /c).
 */
// `width` matches the footer's inner column to the page above it, so its left edge
// continues the page's own: the project sheet (880), the project index (1040), or
// the scene/skill galleries (1360).
export function SiteFooter({ width = 1040 }: { width?: 880 | 1040 | 1360 }) {
  const { email, github, blog } = PROFILE.contact
  return <SiteFooterView email={email} github={github} blog={blog} width={width} />
}

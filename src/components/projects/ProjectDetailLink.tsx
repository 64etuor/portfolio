'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * A project link that opens the shared ProjectDrawer instead of navigating,
 * while remaining a real `/projects/<slug>` link for fallback (no-JS, middle/
 * cmd-click → new tab, SEO). Dispatches a window event that ProjectDrawerHost
 * listens for, so it works from server-rendered markup (e.g. the résumé).
 */
export function ProjectDetailLink({
  slug,
  className,
  children,
}: {
  slug: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={`/projects/${slug}`}
      className={className}
      onClick={(e) => {
        // keep native behavior for new-tab / modified clicks
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('project-drawer:open', { detail: slug }))
      }}
    >
      {children}
    </Link>
  )
}

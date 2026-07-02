'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'

// Hydration-safe client flag: false during SSR AND the hydration render (so it
// matches the server's null output), true only after hydration — then the
// body portal mounts without a mismatch.
const noopSubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
import Link from 'next/link'
import type { ProjectContent } from '@content/projects/types'
import { COMPANY_ACCENT } from '@content/projects/types'
import { ProjectBody } from './ProjectBody'
import '@/app/projects.css'
import './projectDrawer.css'

/**
 * Right-side detail drawer for the gantt scene. Renders the same project blocks
 * as /projects/[slug] but as an in-context overlay (no full-page navigation).
 * Portaled to <body> so ancestor transforms/overflow on the scene host can't
 * clip or mis-position it. The last project is retained during the close
 * transition so the drawer slides out with content still visible.
 */
export function ProjectDrawer({ project, onClose }: { project: ProjectContent | null; onClose: () => void }) {
  // Retain the last project through the close transition so the drawer slides
  // out with content still visible. React's "adjust state during render"
  // pattern (no refs, no effect): only refresh `shown` when opening.
  const hydrated = useHydrated()
  const [shown, setShown] = useState<ProjectContent | null>(project)
  const [prev, setPrev] = useState<ProjectContent | null>(project)
  if (project !== prev) {
    setPrev(project)
    if (project) setShown(project)
  }
  const open = !!project

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Render nothing on the server and during the hydration pass (matches the
  // server's null output); the body portal mounts only after hydration.
  if (!hydrated) return null

  const accent = shown ? ({ '--pj-acc': COMPANY_ACCENT[shown.hero.companyKey] } as CSSProperties) : undefined

  return createPortal(
    <>
      <div className={`pjd-backdrop${open ? ' pjd-open' : ''}`} onClick={onClose} aria-hidden />
      <aside
        className={`pjd-drawer${open ? ' pjd-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={accent}
      >
        <div className="pjd-bar">
          <button className="pjd-back" type="button" onClick={onClose}>
            ← 뒤로
          </button>
          <div className="pjd-bar-r">
            {shown ? (
              <Link className="pjd-full" href={`/projects/${shown.slug}`}>
                전체 페이지 ↗
              </Link>
            ) : null}
            <button className="pjd-x" type="button" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
        </div>
        <div className="pjd-scroll">{shown ? <ProjectBody project={shown} /> : null}</div>
      </aside>
    </>,
    document.body,
  )
}

'use client'

import { useEffect } from 'react'
import { SITE } from '@content/site'
import { sceneForLocale } from '@content/i18n/scene-en'
import { useLocale } from '@/components/LocaleProvider'
import { hasLabPage, type SceneEntry } from '../catalog'
import { SceneMount } from './SceneMount'

/** Client shell for a standalone scene, so its chrome follows the locale switcher. */
export function ScenePageContent({ scene }: { scene: SceneEntry }) {
  const { locale, t } = useLocale()
  const localized = sceneForLocale(scene, locale)
  const headingId = 'scene-title'
  const heading = localized.domain ? `${localized.title} — ${localized.domain}` : localized.title

  useEffect(() => {
    const pageTitle = `${localized.title} · Scene`
    const syncTitle = () => {
      if (document.title !== pageTitle) document.title = pageTitle
    }
    syncTitle()
    const observer = new MutationObserver(syncTitle)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [localized.title])

  return (
    <section
      aria-labelledby={headingId}
      style={{ height: 'calc(100dvh - 49px)', display: 'flex', flexDirection: 'column', background: localized.bg }}
    >
      <h1 id={headingId} className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
        {heading}
      </h1>
      <div className="flex items-center justify-between px-6 py-2 md:px-10" style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
        <div className="flex items-center gap-3" aria-hidden>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{localized.title}</span>
          {localized.domain ? <span className="hidden text-xs md:inline" style={{ color: 'var(--accent)' }}>{localized.domain}</span> : null}
        </div>
        {hasLabPage(scene) ? <a href={`/lab/${localized.file}`} target="_blank" rel="noreferrer" className="text-xs hover:opacity-80" style={{ color: 'var(--muted)' }}>{t(SITE.chrome.newTab)}</a> : null}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <SceneMount name={localized.file} title={localized.title} bg={localized.bg} />
      </div>
    </section>
  )
}

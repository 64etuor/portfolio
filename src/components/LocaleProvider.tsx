'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DEFAULT_LOCALE, type Locale, type LocalizedString, resolveCopy } from '@/i18n/content'
import { SITE } from '@content/site'
import { sceneForLocale } from '@content/i18n/scene-en'
import { catalogEntry } from '@/scenes/catalog'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (value: LocalizedString) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)
function titleForPath(pathname: string, locale: Locale): string | undefined {
  if (pathname === '/scenes') return resolveCopy(SITE.pages.scenes, locale)
  if (pathname === '/skills' || pathname.startsWith('/skills/')) return resolveCopy(SITE.pages.skills, locale)
  if (pathname === '/resume') return resolveCopy(SITE.pages.resume, locale)
  if (pathname === '/projects' || pathname.startsWith('/projects/')) return resolveCopy(SITE.pages.projects, locale)
  if (pathname === '/film') return resolveCopy(SITE.film.title, locale)
  if (pathname.startsWith('/s/')) {
    const scene = catalogEntry(decodeURIComponent(pathname.slice(3)))
    return scene ? `${sceneForLocale(scene, locale).title} · Scene` : undefined
  }
  return resolveCopy(SITE.metadata.title, locale)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [ready, setReady] = useState(false)
  const pathname = usePathname()
  const selectedBeforeRestore = useRef(false)

  useEffect(() => {
    // Defer restoration until after hydration so server-rendered Korean markup
    // remains stable; an explicit click can still win before this callback.
    const restoreId = window.setTimeout(() => {
      if (!selectedBeforeRestore.current) {
        const saved = localStorage.getItem('pf-locale')
        if (saved === 'ko' || saved === 'en') setLocale(saved)
      }
      setReady(true)
    }, 0)
    return () => window.clearTimeout(restoreId)
  }, [])

  useEffect(() => {
    // Follow a choice made in another document of this origin — other tabs, and
    // app pages embedded as iframes inside scenes — without a reload.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'pf-locale') return
      if (event.newValue === 'ko' || event.newValue === 'en') setLocale(event.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const selectLocale = useCallback((nextLocale: Locale) => {
    // The switcher can be clicked before the persisted preference effect runs.
    // A direct user choice must always win over that deferred restoration.
    selectedBeforeRestore.current = true
    setLocale(nextLocale)
  }, [])

  useEffect(() => {
    if (!ready) return
    const pageTitle = titleForPath(pathname, locale)

    const syncDocument = () => {
      document.documentElement.lang = locale
      if (pageTitle) document.title = pageTitle
    }

    syncDocument()
    // Next may commit route metadata after hydration. Re-apply in the next frame so
    // the visitor's explicit language choice remains authoritative.
    const frame = requestAnimationFrame(syncDocument)
    // Streaming metadata may arrive after hydration and reset the title. Keep
    // title ownership with the active locale for every route (scene pages too).
    // Next 15 streams metadata and may (re)write a <title> outside <head>, so watch
    // the <title> elements themselves too — not just <head> (whole-document observation
    // would fire on every scene DOM mutation).
    const titleObserver = new MutationObserver(() => {
      if (pageTitle && document.title !== pageTitle) document.title = pageTitle
      watchTitles()
    })
    const watched = new WeakSet<Element>()
    const watchTitles = () => {
      document.querySelectorAll('title').forEach((el) => {
        if (watched.has(el)) return
        watched.add(el)
        titleObserver.observe(el, { childList: true, subtree: true, characterData: true })
      })
    }
    titleObserver.observe(document.head, { childList: true, subtree: true, characterData: true })
    watchTitles()

    localStorage.setItem('pf-locale', locale)
    return () => {
      cancelAnimationFrame(frame)
      titleObserver.disconnect()
    }
  }, [locale, pathname, ready])

  const value = useMemo(
    () => ({ locale, setLocale: selectLocale, t: (value: LocalizedString) => resolveCopy(value, locale) }),
    [locale, selectLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used within LocaleProvider')
  return context
}

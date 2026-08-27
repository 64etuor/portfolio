'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DEFAULT_LOCALE, type Locale, type LocalizedString, resolveCopy } from '@/i18n/content'
import { SITE } from '@content/site'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (value: LocalizedString) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [ready, setReady] = useState(false)
  const pathname = usePathname()
  const selectedBeforeRestore = useRef(false)

  useEffect(() => {
    if (!selectedBeforeRestore.current) {
      const saved = localStorage.getItem('pf-locale')
      if (saved === 'ko' || saved === 'en') setLocale(saved)
    }
    setReady(true)
  }, [])

  const selectLocale = useCallback((nextLocale: Locale) => {
    // The switcher can be clicked before the persisted preference effect runs.
    // A direct user choice must always win over that deferred restoration.
    selectedBeforeRestore.current = true
    setLocale(nextLocale)
  }, [])

  useEffect(() => {
    if (!ready) return
    const pageTitle = pathname === '/scenes'
      ? SITE.pages.scenes
      : pathname === '/skills'
        ? SITE.pages.skills
        : pathname === '/resume'
          ? SITE.pages.resume
          : pathname === '/projects'
            ? SITE.pages.projects
            : SITE.metadata.title

    const syncDocument = () => {
      document.documentElement.lang = locale
      document.title = resolveCopy(pageTitle, locale)
    }

    syncDocument()
    // Next may commit route metadata after hydration. Re-apply in the next frame so
    // the visitor's explicit language choice remains authoritative.
    const frame = requestAnimationFrame(syncDocument)

    localStorage.setItem('pf-locale', locale)
    return () => cancelAnimationFrame(frame)
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

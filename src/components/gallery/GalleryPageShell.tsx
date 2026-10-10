'use client'

import type { ReactNode } from 'react'
import { formatCopy, type LocalizedString } from '@/i18n/content'
import { useLocale } from '@/components/LocaleProvider'
import styles from '@/components/gallery/gallery.module.css'

interface GalleryPageShellProps {
  title: LocalizedString
  sub: LocalizedString
  footer: LocalizedString
  footerValues?: Record<string, string | number>
  children: ReactNode
}

export function GalleryPageShell({ title, sub, footer, footerValues, children }: GalleryPageShellProps) {
  const { locale, t } = useLocale()
  return (
    // The page's single <main> landmark (root layout deliberately renders none).
    <main className={styles.page}>
      <header>
        <h1 className={styles.h1}>{t(title)}</h1>
        <p className={styles.sub}>{t(sub)}</p>
      </header>
      {children}
      <footer className={styles.footer}>{footerValues ? formatCopy(footer, locale, footerValues) : t(footer)}</footer>
    </main>
  )
}

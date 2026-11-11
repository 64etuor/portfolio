'use client'

import type { ReactNode } from 'react'
import { formatCopy, type LocalizedString } from '@/i18n/content'
import { useLocale } from '@/components/LocaleProvider'
// 제목용 한글 세리프 — /projects 제목과 같은 서체. unicode-range 서브셋이라 쓰인 글자 조각만 받는다.
import '@fontsource/noto-serif-kr/600.css'
import styles from '@/components/gallery/gallery.module.css'

// "Scenes · 필름 서사" → 모노 아이브로("Scenes") + 세리프 제목("필름 서사").
// 구분점은 .sr-only 로 DOM 에 남겨 <h1> 의 텍스트(접근성 이름)는 원문 그대로 유지된다.
function splitTitle(title: string): [string | null, string] {
  const at = title.indexOf(' · ')
  return at < 0 ? [null, title] : [title.slice(0, at), title.slice(at + 3)]
}

interface GalleryPageShellProps {
  title: LocalizedString
  sub: LocalizedString
  footer: LocalizedString
  footerValues?: Record<string, string | number>
  children: ReactNode
}

export function GalleryPageShell({ title, sub, footer, footerValues, children }: GalleryPageShellProps) {
  const { locale, t } = useLocale()
  const [eyebrow, heading] = splitTitle(t(title))
  return (
    // The page's single <main> landmark (root layout deliberately renders none).
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.h1}>
          {eyebrow ? (
            <>
              <span className={styles.eyebrow}>{eyebrow}</span>
              <span className="sr-only"> · </span>
            </>
          ) : null}
          <span className={styles.title}>{heading}</span>
        </h1>
        <p className={styles.sub}>{t(sub)}</p>
      </header>
      {children}
      <footer className={styles.footer}>{footerValues ? formatCopy(footer, locale, footerValues) : t(footer)}</footer>
    </main>
  )
}

import { ReactNode } from 'react'
import styles from '@/components/gallery/gallery.module.css'

interface GalleryPageShellProps {
  title: ReactNode
  sub: ReactNode
  footer: ReactNode
  children: ReactNode
}

export function GalleryPageShell({ title, sub, footer, children }: GalleryPageShellProps) {
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.h1}>{title}</h1>
        <p className={styles.sub}>{sub}</p>
      </header>
      {children}
      <footer className={styles.footer}>{footer}</footer>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { SITE } from '@content/site'
import { useLocale } from './LocaleProvider'

/** Presentational half of SiteFooter — see SiteFooter.tsx for why it is split. */
export function SiteFooterView({ email, github, blog, width }: { email: string; github?: string; blog?: string; width: number }) {
  const { t } = useLocale()
  return (
    <footer className="site-foot" aria-label={t(SITE.footer.label)}>
      <div className="site-foot__in" style={{ maxWidth: width }}>
        <p className="site-foot__eyebrow">{t(SITE.footer.eyebrow)}</p>
        <p className="site-foot__title">
          <a className="site-foot__mail" href={`mailto:${email}`}>
            {email}
          </a>
        </p>
        <ul className="site-foot__links">
          <li>
            <Link className="chrome-btn chrome-btn--primary" href="/resume">
              {t(SITE.footer.resume)}
            </Link>
          </li>
          {github ? (
            <li>
              <a className="chrome-btn" href={github} target="_blank" rel="noreferrer">
                {t(SITE.footer.github)}
              </a>
            </li>
          ) : null}
          {blog ? (
            <li>
              <a className="chrome-btn" href={blog} target="_blank" rel="noreferrer">
                {t(SITE.footer.blog)}
              </a>
            </li>
          ) : null}
        </ul>
        <p className="site-foot__meta">
          <span>© {SITE.domain}</span>
          <a href="#main">{t(SITE.footer.top)}</a>
        </p>
      </div>
    </footer>
  )
}

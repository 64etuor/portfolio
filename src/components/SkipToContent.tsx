'use client'

import { SITE } from '@content/site'
import { useLocale } from './LocaleProvider'

export function SkipToContent() {
  const { t } = useLocale()
  return <a className="skip-link" href="#main">{t(SITE.chrome.skipToContent)}</a>
}

'use client'

import { SITE } from '@content/site'
import { useLocale } from './LocaleProvider'

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className={className} role="group" aria-label={t(SITE.locale.label)} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {(['ko', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          aria-label={option === 'ko' ? t(SITE.locale.korean) : t(SITE.locale.english)}
          style={{ minWidth: 34, padding: '5px 7px', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 3, background: locale === option ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.28)', color: '#fff', cursor: 'pointer', font: '500 10px/1 "DM Mono", ui-monospace, monospace', letterSpacing: '0.08em' }}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

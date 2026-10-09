'use client'

import { SITE } from '@content/site'
import { useLocale } from './LocaleProvider'

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className={className} role="group" aria-label={t(SITE.locale.label)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {(['ko', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          aria-label={option === 'ko' ? t(SITE.locale.korean) : t(SITE.locale.english)}
          style={{ minWidth: 46, minHeight: 42, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.36)', borderRadius: 4, background: locale === option ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.34)', color: '#fff', cursor: 'pointer', font: '600 var(--fs-sm)/1 var(--font-mono)', letterSpacing: '0.08em' }}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

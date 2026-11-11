'use client'

import { SITE } from '@content/site'
import { useLocale } from './LocaleProvider'

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className={`locale-sw${className ? ` ${className}` : ''}`} role="group" aria-label={t(SITE.locale.label)}>
      {(['ko', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          // Accessible name must contain the visible label ("KO"/"EN") — WCAG 2.5.3
          // label-in-name — so voice-control users can say what they see.
          aria-label={`${option.toUpperCase()} — ${option === 'ko' ? t(SITE.locale.korean) : t(SITE.locale.english)}`}
          className="locale-sw__opt"
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

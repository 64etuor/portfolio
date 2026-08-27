export const LOCALES = ['ko', 'en'] as const

export type Locale = (typeof LOCALES)[number]
export type LocalizedString = Record<Locale, string>

export const DEFAULT_LOCALE: Locale = 'ko'

export function copy(ko: string, en: string): LocalizedString {
  return { ko, en }
}

export function resolveCopy(value: LocalizedString, locale: Locale): string {
  return value[locale]
}

/** Replaces named placeholders without scattering locale-specific templates. */
export function formatCopy(value: LocalizedString, locale: Locale, values: Record<string, string | number>): string {
  return resolveCopy(value, locale).replace(/\{(\w+)\}/g, (token, key: string) => (key in values ? String(values[key]) : token))
}

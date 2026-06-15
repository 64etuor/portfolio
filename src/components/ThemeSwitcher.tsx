'use client'

import { useTheme } from './ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setThemeId, themes } = useTheme()
  return (
    <div className="flex items-center gap-1 rounded-full border p-1" style={{ borderColor: 'var(--line)' }}>
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setThemeId(t.id)}
          title={t.label}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
          style={{
            background: theme.id === t.id ? 'var(--panel)' : 'transparent',
            color: theme.id === t.id ? 'var(--ink)' : 'var(--muted)',
          }}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border"
            style={{ background: t.bg, borderColor: t.line }}
          />
          {t.label}
        </button>
      ))}
    </div>
  )
}

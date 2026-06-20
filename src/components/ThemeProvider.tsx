'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { THEMES, DEFAULT_THEME, themeVars, type Theme } from '@/theme/themes'

interface Ctx {
  theme: Theme
  setThemeId: (id: string) => void
  themes: Theme[]
}
const ThemeCtx = createContext<Ctx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(DEFAULT_THEME)

  useEffect(() => {
    const saved = localStorage.getItem('pf-theme')
    if (saved) setId(saved)
  }, [])

  useEffect(() => {
    const t = THEMES.find((x) => x.id === id) ?? THEMES[0]
    const vars = themeVars(t)
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v)
    }
    document.documentElement.dataset.theme = t.id
    localStorage.setItem('pf-theme', t.id)
  }, [id])

  const theme = THEMES.find((x) => x.id === id) ?? THEMES[0]
  return (
    <ThemeCtx.Provider value={{ theme, setThemeId: setId, themes: THEMES }}>
      {children}
    </ThemeCtx.Provider>
  )
}

function useTheme() {
  const c = useContext(ThemeCtx)
  if (!c) throw new Error('useTheme must be used within ThemeProvider')
  return c
}

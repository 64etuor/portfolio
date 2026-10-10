'use client'

import { useEffect, useState } from 'react'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'
import styles from './LandingAmbientWords.module.css'

// Descriptor words sourced from content/site.ts (SSOT). `lum` is a per-word
// brightness weight (0..1): the warm / human / hopeful words glow a little — a
// small light in the dark — while the technical ones stay almost flat. The
// brightening is kept very subtle overall; lum only nudges it.
type Item = { id: number; word: string; x: number; y: number; rot: number; lum: number }

/**
 * Ambient descriptor words: one fades in (glitch + blur) at a random spot every
 * ~0.7–1.4s, lingers, then fades out. A faint light blooms behind it scaled by
 * the word's `lum` weight. Sits behind the content; disabled for reduced-motion.
 */
export function LandingAmbientWords() {
  const { locale } = useLocale()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let alive = true
    let id = 0
    let timer: ReturnType<typeof setTimeout>

    const spawn = () => {
      if (!alive) return
      const words = SITE.landing.ambientWords
      const pick = words[Math.floor(Math.random() * words.length)]
      const x = 5 + Math.random() * 90
      const y = 8 + Math.random() * 84
      const rot = (Math.random() - 0.5) * 6
      const myId = id++
      setItems((prev) => [...prev, { id: myId, word: pick.word[locale], x, y, rot, lum: pick.lum }])
      window.setTimeout(() => {
        if (alive) setItems((prev) => prev.filter((p) => p.id !== myId))
      }, 2800)
      // one word about every 4s
      timer = setTimeout(spawn, 3800 + Math.random() * 600)
    }
    timer = setTimeout(spawn, 500)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [locale])

  return (
    <div className={styles.words} aria-hidden>
      {items.map((it) => (
        <span
          key={it.id}
          className={styles.word}
          style={{
            left: `${it.x}%`,
            top: `${it.y}%`,
            ['--rot' as string]: `${it.rot}deg`,
            ['--lum' as string]: it.lum,
          }}
        >
          {it.word}
        </span>
      ))}
    </div>
  )
}

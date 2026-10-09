'use client'

import { useEffect, useState } from 'react'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'

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
    <div className="lp-words" aria-hidden>
      {items.map((it) => (
        <span
          key={it.id}
          className="lp-word"
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
      <style jsx>{`
        .lp-words {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }
        .lp-word {
          position: absolute;
          transform: translate(-50%, -50%) rotate(var(--rot, 0deg));
          font-family: 'JetBrains Mono', 'Pretendard Variable', monospace;
          font-weight: 500;
          font-size: clamp(13px, 1.5vw, 22px);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
          color: rgba(168, 180, 192, 0.48);
          opacity: 0;
          will-change: opacity, filter, transform;
          animation: lpw-life 2800ms ease-in-out forwards, lpw-jit 90ms steps(2) infinite;
          text-shadow:
            0 0 13px rgb(150 200 235 / calc(0.3 * var(--lum, 0.25))),
            1px 0 rgba(95, 181, 194, 0.3),
            -1px 0 rgba(224, 122, 95, 0.24);
        }
        /* a faint light blooms behind the word — scaled by its brightness weight */
        .lp-word::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 300%;
          height: 760%;
          transform: translate(-50%, -50%) scale(0.6);
          border-radius: 50%;
          background: radial-gradient(
            ellipse at center,
            rgb(150 200 235 / calc(0.16 * var(--lum, 0.25))) 0%,
            rgb(150 200 235 / calc(0.05 * var(--lum, 0.25))) 38%,
            transparent 66%
          );
          opacity: 0;
          z-index: -1;
          pointer-events: none;
          animation: lpw-glow 2800ms ease-in-out forwards;
        }
        @keyframes lpw-life {
          0% { opacity: 0; filter: blur(6px); }
          16% { opacity: 0.55; filter: blur(1.5px); }
          30% { opacity: 0.4; filter: blur(2.5px); }
          70% { opacity: 0.38; filter: blur(2.5px); }
          100% { opacity: 0; filter: blur(7px); }
        }
        @keyframes lpw-glow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.4; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes lpw-jit {
          0% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)); }
          50% { transform: translate(calc(-50% + 1.2px), calc(-50% - 0.8px)) rotate(var(--rot, 0deg)); }
          100% { transform: translate(calc(-50% - 0.8px), calc(-50% + 1px)) rotate(var(--rot, 0deg)); }
        }
      `}</style>
    </div>
  )
}

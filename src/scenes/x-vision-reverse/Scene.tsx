'use client'

import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { HEADER, HUD_LINES, MACHINES, OK_CELLS, OK_LABEL, REUSE_TAG, REVERSED_LABEL, pick, type Lang } from './data'
import { createSetup } from './runtime'
import s from './scene.module.css'

const setup = createSetup()

// 배터리 모듈 셀 역삽 비전 검사 → 유휴 비전 M/C 4대 재활용.
export default function Scene({ running = true, onReady, locale }: SceneProps) {
  const lang: Lang = locale === 'en' ? 'en' : 'ko'
  const ref = useThreeScene(setup, {
    running,
    onReady,
    background: '#040506',
    fov: 35,
    exposure: 1.05,
    bloom: { strength: 0.55, radius: 0.5, threshold: 1.0 },
  })
  return (
    <SceneHost bg="#040506" film={false} label={pick(HEADER, lang)}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className={s.hud} aria-hidden>
        <div className={s.header}>
          <span className={s.dot} />
          <span className={s.ko}>{pick(HEADER, lang)}</span>
        </div>
        <div className={s.counter}>
          <span className={s.dim}>POLARITY SCAN</span>
          <span data-hud="count" className={s.count}>
            00/45
          </span>
          <span data-hud="ng" className={s.ng} style={{ opacity: 0 }}>
            NG 01 · REVERSED
          </span>
        </div>

        {OK_CELLS.map(([c, r]) => (
          <div key={`${c}-${r}`} data-hud="ok" className={s.anchor} style={{ opacity: 0 }}>
            <span className={s.ok}>{OK_LABEL}</span>
          </div>
        ))}
        <div data-hud="rev" className={s.anchor} style={{ opacity: 0 }}>
          <div className={s.rev}>
            <span className={`${s.revMain} ${s.ko}`}>{pick(REVERSED_LABEL.main, lang)}</span>
            <span className={`${s.revSub} ${s.ko}`}>{pick(REVERSED_LABEL.sub, lang)}</span>
          </div>
        </div>
        {MACHINES.map((m, i) => (
          <div key={m.no} data-hud="mc" className={s.anchor} style={{ opacity: 0 }}>
            <div className={`${s.mc} ${m.kind === 'battery' ? s.mcHero : ''} ${m.kind === 'spare' ? s.mcSpare : ''}`} data-i={i}>
              <span className={s.mcNo}>{m.no}</span>
              <span className={`${s.mcRole} ${s.ko}`}>{pick(m.role, lang)}</span>
            </div>
          </div>
        ))}

        <div data-hud="tag" className={`${s.tag} ${s.ko}`} style={{ opacity: 0 }}>
          {pick(REUSE_TAG, lang)}
        </div>
        <ol className={s.lines}>
          {HUD_LINES.map((l, i) => (
            <li key={l.text.en} data-hud="line" className={`${s.line} ${l.accent ? s[l.accent] : ''}`} style={{ opacity: i === 0 ? 1 : 0 }}>
              <span className={s.idx}>{String(i + 1).padStart(2, '0')}</span>
              <span className={s.txt}>{pick(l.text, lang)}</span>
            </li>
          ))}
        </ol>
      </div>
    </SceneHost>
  )
}

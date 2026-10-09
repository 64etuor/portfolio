'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { HUD, PANELS, PHASES, SLABS, pick } from './data'
import { BG, setupScene } from './runtime'
import s from './scene.module.css'

// 공정 데이터 관리 시스템 — 흩어진 엑셀 시트가 나선으로 모여 DB 슬랩이 되고, 검증되고, 대시보드로 올라간다.
export default function Scene({ running = true, onReady, locale }: SceneProps) {
  const en = locale === 'en'
  const hudRef = useRef<HTMLDivElement | null>(null)
  const ref = useThreeScene((ctx) => setupScene(ctx, () => hudRef.current), {
    running,
    onReady,
    background: BG,
    fov: 38,
    bloom: { strength: 0.85, radius: 0.5, threshold: 0.55 },
  })
  return (
    <SceneHost bg={BG} film={false} label={pick(HUD.label, en)}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div ref={hudRef} className={s.hud} data-locale={en ? 'en' : 'ko'} aria-hidden>
        <div className={s.tag}>
          <span className={s.tagDot} />
          <span className={s.tagTitle}>{pick(HUD.project, en)}</span>
          <span className={s.tagOrg}>{pick(HUD.org, en)}</span>
        </div>

        <div className={s.phases}>
          {PHASES.map((p, i) => (
            <div key={p.title.en} data-k={`phase${i}`} className={s.phase} style={{ opacity: i === 0 ? 1 : 0 }}>
              <span className={s.phaseIdx}>{`0${i + 1} / 04`}</span>
              <span className={s.phaseTitle}>{pick(p.title, en)}</span>
              <span className={s.phaseSub}>{pick(p.sub, en)}</span>
            </div>
          ))}
        </div>

        <div data-k="hero" className={s.hero} style={{ opacity: 0 }}>
          <div className={s.heroRow}>
            <svg className={s.dial} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" className={s.dialBase} />
              <circle cx="50" cy="50" r="44" className={s.dialArc} data-k="arc" pathLength={1} />
            </svg>
            <div className={s.heroNum}>
              <span className={s.minus}>−</span>
              <span data-k="count" className={s.count} />
              <span className={s.unit}>{pick(HUD.unit, en)}</span>
            </div>
          </div>
          <div className={s.heroLabel}>
            {pick(HUD.heroLabel, en)} <span className={s.heroNote}>· {pick(HUD.heroNote, en)}</span>
          </div>
          <div data-k="st" className={s.st} style={{ opacity: 0 }}>
            <span className={s.stVal}>{pick(HUD.st, en)}</span>
            <span className={s.stNote}>{pick(HUD.stNote, en)}</span>
          </div>
          <div data-k="award" className={s.award} style={{ opacity: 0 }}>
            {pick(HUD.award, en)}
          </div>
        </div>

        {SLABS.map((sl, i) => (
          <div key={sl.label.en} data-k={`slab${i}`} className={s.slabLabel} style={{ opacity: 0 }}>
            <span>{pick(sl.label, en)}</span>
          </div>
        ))}
        {PANELS.map((p, i) => (
          <div key={p.en} data-k={`panel${i}`} className={s.panelLabel} style={{ opacity: 0 }}>
            {pick(p, en)}
          </div>
        ))}
        <div data-k="gateway" className={s.gateway} style={{ opacity: 0 }}>
          {pick(HUD.gateway, en)}
        </div>
      </div>
    </SceneHost>
  )
}

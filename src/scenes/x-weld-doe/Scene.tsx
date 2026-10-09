'use client'

import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { BG, COPY } from './data'
import { setupWeldDoe } from './runtime'
import s from './scene.module.css'

// 초음파 용착 DOE — 진폭 × 가압력 응답 곡면 위에서 불량률 15% → 0%대.
export default function Scene({ running = true, onReady, locale = 'ko' }: SceneProps) {
  const loc = locale === 'en' ? 'en' : 'ko'
  const c = COPY[loc]
  const ref = useThreeScene(setupWeldDoe, {
    running,
    onReady,
    background: BG,
    fov: 36,
    exposure: 1.05,
  })

  return (
    <SceneHost bg={BG} film={false} label={c.aria}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className={s.vignette} aria-hidden />
      <div className={s.hud} data-hud="root" data-locale={loc} aria-hidden>
        <div className={s.titleBox} data-hud="title">
          <div className={s.kicker}>{c.kicker}</div>
          <div className={s.title}>{c.title}</div>
          <div className={s.factors}>{c.factors}</div>
          <div className={s.slider}>
            <span className={s.sliderLabel}>{c.timeLabel}</span>
            <span className={s.sliderEnd}>{c.low}</span>
            <span className={s.track}>
              <span className={s.knob} data-hud="knob" />
            </span>
            <span className={s.sliderEnd}>{c.high}</span>
          </div>
          <div className={s.legend} data-hud="legend">
            <span className={s.dot} data-c="blue" />
            {c.legend[0]}
            <span className={s.dot} data-c="amber" />
            {c.legend[1]}
            <span className={s.dot} data-c="phos" />
            {c.legend[2]}
          </div>
        </div>

        <ol className={s.phases}>
          {c.phases.map((p, i) => (
            <li key={p} data-phase={i} data-on={i === 0 ? '1' : '0'}>
              <span className={s.phaseNo}>{String(i + 1).padStart(2, '0')}</span>
              {p}
            </li>
          ))}
        </ol>

        <div className={s.counterBox} data-hud="counterBox">
          <div className={s.counterLabel}>{c.counterLabel}</div>
          <div className={s.counter} data-hud="counter" data-state="hot">
            15.0%
          </div>
          <div className={s.counterFrom}>{c.counterFrom}</div>
        </div>

        <div className={s.cost} data-hud="cost">
          <div className={s.costRow}>
            <span className={s.costMain}>{c.rework}</span>
            <span className={s.costNote}>{c.reworkNote}</span>
          </div>
          <div className={s.costRow}>
            <span className={s.costMain}>{c.scrap}</span>
            <span className={s.costNote}>{c.scrapNote}</span>
          </div>
        </div>

        <div className={s.lbl} data-hud="lblA">
          <span>{c.axisA}</span>
        </div>
        <div className={s.lbl} data-hud="lblP">
          <span>{c.axisP}</span>
        </div>
        <div className={s.lbl} data-hud="lblD">
          <span>{c.axisD}</span>
        </div>
        <div className={`${s.lbl} ${s.lblHot}`} data-hud="lblStart">
          <span>{c.start}</span>
        </div>
        <div className={`${s.lbl} ${s.lblCool}`} data-hud="lblOpt">
          <span>{c.opt}</span>
        </div>
      </div>
    </SceneHost>
  )
}

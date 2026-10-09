'use client'

import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { BOTTLENECKS, HUD } from './data'
import { BG, setupLob } from './runtime'
import s from './scene.module.css'

// LOB 라인 밸런싱 — 공정별 C/T 타워, Jig 로 병목 타워를 절삭해 라인을 균형화.
// HUD 의 움직이는 값은 runtime 이 data-h 속성으로 찾아 imperative 로 갱신한다.
export default function Scene({ running = true, onReady, locale }: SceneProps) {
  const L = locale === 'en' ? HUD.en : HUD.ko
  const ref = useThreeScene(setupLob, { running, onReady, background: BG, fov: 38, far: 120, exposure: 1.05 })

  return (
    <SceneHost bg={BG} film={false} label={`${L.title} · ${L.heroLabel} +24%`}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className={s.hud} aria-hidden data-lob-hud="" data-locale={locale === 'en' ? 'en' : 'ko'}>
        {BOTTLENECKS.map((b) => {
          const from = b.key === 'neck' ? b.ctBefore.toFixed(2) : String(b.ctBefore)
          return (
            <div key={b.key} className={s.anchor} data-h={`tower-${b.key}`}>
              <div className={s.tag}>
                <span className={s.name}>{b.key === 'neck' ? L.neck : L.ft}</span>
                <span className={s.ctRow}>
                  <span className={s.ctKey}>C/T</span>
                  <span className={s.ctFrom} data-h={`from-${b.key}`}>
                    {from}s
                  </span>
                  <span className={s.arrow} data-h={`arrow-${b.key}`}>
                    →
                  </span>
                  <span className={s.ctVal} data-h={`ct-${b.key}`}>
                    {from}
                  </span>
                  <span className={s.ctUnit}>s</span>
                </span>
                <span className={s.pct} data-h={`pct-${b.key}`}>
                  −{b.pct}%
                </span>
              </div>
            </div>
          )
        })}
        {BOTTLENECKS.map((b) => (
          <div key={`j-${b.key}`} className={s.jigAnchor} data-h={`jig-${b.key}`}>
            <span className={s.jig}>{b.key === 'neck' ? L.jigNeck : L.jigFt}</span>
          </div>
        ))}
        <div className={s.planeAnchor} data-h="plane">
          <span className={s.planeHot} data-h="plane-hot">
            {L.bottleneck}
          </span>
          <span className={s.planeOk} data-h="plane-ok">
            {L.balanced}
          </span>
        </div>

        <header className={s.head}>
          <div className={s.kicker}>{L.kicker}</div>
          <div className={s.title}>{L.title}</div>
          <ol className={s.beats}>
            {L.beats.map((txt, k) => (
              <li key={k} data-on={k === 0 ? '1' : '0'} data-h={`beat-${k}`}>
                <span className={s.beatNo}>0{k + 1}</span>
                {txt}
              </li>
            ))}
          </ol>
        </header>

        <div className={s.hero} data-h="hero">
          <div className={s.heroLabel}>{L.heroLabel}</div>
          <div className={s.heroNum}>
            <span data-h="hero-num">+0</span>
            <span className={s.heroPct}>%</span>
          </div>
          <div className={s.heroSub}>{L.heroSub}</div>
        </div>

        <div className={s.foot}>{L.foot}</div>
      </div>
    </SceneHost>
  )
}

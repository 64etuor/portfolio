'use client'

import type { ReactNode } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { COLORS, COPY, SOURCES } from './data'
import { setupWorkRadar } from './runtime'
import s from './scene.module.css'

// Work Radar · 두 레일 — 신호는 자동으로 매트릭스에 모이고, 승격은 사람 게이트만 통과한다.
export default function Scene({ running = true, onReady, locale = 'ko' }: SceneProps) {
  const en = locale === 'en'
  const L = en ? COPY.en : COPY.ko
  const ref = useThreeScene(setupWorkRadar, {
    running,
    onReady,
    background: COLORS.bg,
    fov: 38,
    far: 120,
    exposure: 1.05,
    bloom: { strength: 0.85, radius: 0.55, threshold: 0.55 },
  })

  return (
    <SceneHost bg={COLORS.bg} film={false} label={en ? 'Work Radar · two rails' : 'Work Radar · 두 레일'}>
      <div className={s.root} data-wr-root="">
        <div ref={ref} className={s.canvas} />

        {/* 3D 앵커 라벨 (runtime 이 transform/opacity 갱신) */}
        <div className={s.anchors} aria-hidden>
          <Anchor k="matrix" cls={s.teal}>{L.matrix}</Anchor>
          <Anchor k="urgent" cls={s.dim}>{L.urgent}</Anchor>
          <Anchor k="important" cls={s.dim}>{L.important}</Anchor>
          <Anchor k="decision" cls={s.white}>
            <b>{L.decision}</b>
            <i>{L.decisionSub}</i>
          </Anchor>
          <Anchor k="auto" cls={s.amber} below>
            <b>{L.auto}</b>
            <i>{L.autoSub}</i>
          </Anchor>
          <Anchor k="gate" cls={s.white}>
            <b className={s.big}>{L.gate}</b>
            <i>{L.gateSub}</i>
          </Anchor>
          <Anchor k="job" cls={s.amber} below>
            <b>{L.job}</b>
            <span className={s.badge}>
              <em>{L.sandbox}</em> read_only <span className={s.sep}>|</span> workspace_write
              <span className={s.strike}>danger_full</span>
            </span>
          </Anchor>
          {L.rings.map((r, i) => (
            <Anchor key={r} k={`ring${i}`} cls={i === 2 ? s.amberHi : s.amber} side>
              {r}
            </Anchor>
          ))}
          <Anchor k="killed" cls={s.red} below>
            {L.killed}
          </Anchor>
          <Anchor k="proposal" cls={s.prop}>
            {L.proposal}
          </Anchor>
          {L.pads.map((p, i) => (
            <Anchor key={p} k={`pad${i}`} cls={s.white} side>
              {p}
            </Anchor>
          ))}
        </div>

        {/* 고정 HUD */}
        <div className={s.hudTL}>
          <div className={s.title}>{L.title}</div>
          <div className={s.sub}>{L.sub}</div>
          <ul className={s.legend}>
            {SOURCES.map((src) => (
              <li key={src.key}>
                <span style={{ color: src.color }}>{src.glyph}</span>
                {en ? src.en : src.ko}
              </li>
            ))}
          </ul>
        </div>

        <div className={s.hudBL}>
          <div className={s.headline}>
            <span data-k="h1">{L.h1}</span>
            <span data-k="h2" className={s.h2} style={{ opacity: 0 }}>
              <span className={s.dot}>·</span>
              {L.h2}
            </span>
          </div>
          <div data-k="line2" className={s.line2} style={{ opacity: 0 }}>
            {L.line2}
          </div>
          <div className={s.stack}>{L.stack}</div>
        </div>

        <div className={s.hudBR}>
          <div className={s.logTitle}>{L.logTitle}</div>
          {L.log.map(([verb, rest], i) => (
            <div key={verb} data-k={`log${i}`} className={s.logRow} data-v={verb}>
              <span className={s.verb}>{verb}</span>
              <span>{rest}</span>
            </div>
          ))}
        </div>
      </div>
    </SceneHost>
  )
}

function Anchor({
  k,
  cls,
  below,
  side,
  children,
}: {
  k: string
  cls?: string
  below?: boolean
  side?: boolean
  children: ReactNode
}) {
  return (
    <div data-k={k} className={s.anchor} style={{ opacity: 0 }}>
      <div className={`${s.tag} ${below ? s.below : side ? s.side : ''} ${cls ?? ''}`}>{children}</div>
    </div>
  )
}

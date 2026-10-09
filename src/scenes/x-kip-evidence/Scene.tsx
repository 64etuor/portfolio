'use client'

import type { CSSProperties } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { CARD, CLAIMS, METRICS, PALETTE, SOURCES, SURFACES, TEXT, pick } from './data'
import { setupKip } from './runtime'
import s from './scene.module.css'

// KIP — 질의 → 같은 retrieval service → 표 승격 → 답변 문장마다 원문 위치로 이어지는 스레드.
export default function Scene({ running = true, onReady, locale }: SceneProps) {
  const en = locale === 'en'
  const ref = useThreeScene(setupKip, {
    running,
    onReady,
    background: PALETTE.bg,
    fov: 40,
    far: 120,
    bloom: { strength: 0.95, radius: 0.6, threshold: 0.62 },
  })

  return (
    <SceneHost bg={PALETTE.bg} film={false} label={en ? 'KIP · evidence locators' : 'KIP · 근거 위치'}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className={s.hud} data-hud aria-hidden>
        <div className={s.title}>
          <div className={s.kicker}>{pick(TEXT.kicker, en)}</div>
          <div className={s.sub}>{pick(TEXT.sub, en)}</div>
        </div>

        <div className={s.query}>
          <span className={s.qLabel}>{pick(TEXT.queryLabel, en)} ›</span>
          <span className={s.qText} data-k="query" data-full={pick(TEXT.query, en)} />
          <span className={s.caret} />
          {en ? (
            <span className={s.gloss} data-k="gloss">
              {TEXT.queryGloss.en}
            </span>
          ) : null}
        </div>

        {SURFACES.map((sf, k) => (
          <div key={sf.key} className={s.anchor} data-k={`surf${k}`}>
            <span className={s.surf}>{pick(sf.label, en)}</span>
          </div>
        ))}
        <div className={s.anchor} data-k="core">
          <span className={s.coreLabel}>
            <b>{pick(TEXT.core, en)}</b>
            <i>{pick(TEXT.coreSub, en)}</i>
          </span>
        </div>
        <div className={s.anchor} data-k="tableTag">
          <span className={s.tableTag}>{pick(TEXT.tableTag, en)}</span>
        </div>
        {SOURCES.map((src, i) => (
          <div key={src.id} className={s.anchor} data-k={`loc${i}`}>
            <span
              className={[s.loc, src.label.up ? s.locUp : '', src.label.left ? s.locLeft : ''].join(' ')}
              style={{ '--c': src.color } as CSSProperties}
            >
              <em>[{i + 1}]</em> {pick(src.locator, en)}
            </span>
          </div>
        ))}

        <div className={s.card} data-k="card">
          <div className={s.cardHead}>
            <span>{pick(TEXT.cardHead, en)}</span>
            <span className={s.cardMeta}>{pick(TEXT.cardMeta, en)}</span>
          </div>
          {CLAIMS.map((c, i) => (
            <div
              key={i}
              className={s.claim}
              data-k={`claim${i}`}
              style={
                {
                  top: `${CARD.claimV[i] * 100}%`,
                  '--c': SOURCES[i].color,
                } as CSSProperties
              }
            >
              <em>[{i + 1}]</em>
              <span>{pick(c, en)}</span>
            </div>
          ))}
        </div>

        <div className={s.captions}>
          {TEXT.captions.map((c, i) => (
            <div key={i} className={s.cap} data-k={`cap${i}`}>
              <span className={s.capIdx}>0{i + 1}</span>
              {pick(c, en)}
            </div>
          ))}
        </div>

        <div className={s.metrics} data-k="metrics">
          {METRICS.map((m, i) => (
            <div key={i} className={m.headline ? `${s.metric} ${s.headline}` : s.metric}>
              <span className={s.mLabel}>{pick(m.label, en)}</span>
              <span className={s.mValue}>
                <span data-k={`m${i}`}>—</span>
                {pick(m.note, en) ? <small>{pick(m.note, en)}</small> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SceneHost>
  )
}

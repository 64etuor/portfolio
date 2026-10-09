'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { COPY, STACK, STATIONS, pick, type LabelId } from './data'
import { emptyHud, setupMesLine, type Hud } from './runtime'
import s from './scene.module.css'

const POS: Partial<Record<LabelId, string>> = {
  ocv: 'below',
  vision: 'below',
  assy: 'below',
  'p-ocv': 'left',
  'p-vision': 'left',
  core: 'right',
}

// 신제품 배터리 라인 셋업 — MES 외주비 누락 → 자체 개발(OCV/IR·비전·OPC UA → PostgreSQL → Dash/Electron).
export default function Scene({ running = true, onReady, locale }: SceneProps) {
  const hudRef = useRef<Hud>(emptyHud())
  const ref = useThreeScene((ctx) => setupMesLine(ctx, hudRef), {
    running,
    onReady,
    background: '#04070a',
    fov: 38,
    exposure: 1.05,
    bloom: { strength: 0.95, radius: 0.6, threshold: 0.82 },
  })
  const p = (c: { ko: string; en: string }) => pick(c, locale)
  const labelRef = (id: LabelId) => (el: HTMLDivElement | null) => {
    hudRef.current.labels[id] = el
  }

  const labels: { id: LabelId; main: string; sub?: string; tone: string }[] = [
    ...STATIONS.map((st) => ({ id: st.id as LabelId, main: p(st.label), sub: p(st.sub), tone: st.id })),
    ...STATIONS.filter((st) => st.path).map((st) => ({ id: `p-${st.id}` as LabelId, main: p(st.path!.label), tone: `p-${st.id}` })),
    { id: 'core', main: p(COPY.core), sub: p(COPY.coreSub), tone: 'core' },
    { id: 'api', main: p(COPY.api), sub: p(COPY.apiSub), tone: 'api' },
    { id: 'dash', main: p(COPY.dash), sub: p(COPY.dashSub), tone: 'dash' },
    { id: 'client', main: p(COPY.client), sub: p(COPY.clientSub), tone: 'client' },
  ]

  return (
    <SceneHost bg="#04070a" film={false} label={p(COPY.title)}>
      <div ref={ref} className={s.canvas} />
      <div className={s.hud} aria-hidden>
        {labels.map((l) => (
          <div key={l.id} ref={labelRef(l.id)} className={s.label} data-tone={l.tone} data-pos={POS[l.id]}>
            <div className={l.id.startsWith('p-') ? s.proto : s.tag}>
              <span className={s.tagMain}>{l.main}</span>
              {l.sub && <span className={s.tagSub}>{l.sub}</span>}
            </div>
          </div>
        ))}

        <header className={s.title}>
          <div className={s.org}>{p(COPY.org)}</div>
          <div className={s.titleMain}>{p(COPY.title)}</div>
          <div className={s.meta}>{p(COPY.meta)}</div>
        </header>

        <section
          className={s.ledger}
          ref={(el) => {
            hudRef.current.ledger = el
          }}
        >
          <div className={s.ledgerHead}>{p(COPY.ledgerHead)}</div>
          <div className={s.ledgerSub}>{p(COPY.ledgerSub)}</div>
          <div className={s.row}>
            <span>{p(COPY.rowEquip)}</span>
            <span className={s.over}>{p(COPY.rowEquipVal)}</span>
          </div>
          <div
            className={s.row}
            data-state="missing"
            ref={(el) => {
              hudRef.current.mesRow = el
            }}
          >
            <span>{p(COPY.rowMes)}</span>
            <span className={s.mesVal}>
              <span className={s.missing}>{p(COPY.rowMesMissing)}</span>
              <span className={s.built}>→ {p(COPY.rowMesBuilt)}</span>
            </span>
          </div>
        </section>

        <div
          className={s.headline}
          ref={(el) => {
            hudRef.current.head = el
          }}
        >
          <div className={s.headMain}>{p(COPY.headline)}</div>
          <div className={s.headSub}>{p(COPY.headSub)}</div>
        </div>

        <div className={s.chips}>
          {STACK.map((c, i) => (
            <span
              key={c.name}
              className={s.chip}
              data-on="0"
              ref={(el) => {
                hudRef.current.chips[i] = el
              }}
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </SceneHost>
  )
}

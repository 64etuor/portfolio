'use client'

import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { DECOR, hudText } from './data'
import { setupSnTrace } from './runtime'
import s from './scene.module.css'

// S/N genealogy — 원자재 LOT → 서브 → 상위 조립 → 출하 S/N. 필드 불량 → 역추적 → 영향 S/N 특정 → 미등록 차단.
export default function Scene({ running = true, onReady, locale }: SceneProps) {
  // HUD DOM 은 setup 이 캔버스 컨테이너의 형제(data-hud)에서 1회 수집한다.
  const ref = useThreeScene(setupSnTrace, {
    running,
    onReady,
    background: '#05060a',
    fov: 38,
    bloom: { strength: 0.95, radius: 0.6, threshold: 0.42 },
  })
  const tx = hudText(locale)

  return (
    <SceneHost bg="#05060a" film={false} label={tx.title}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div
        className={s.hud}
        data-hud
        data-locale={locale === 'en' ? 'en' : 'ko'}
      >
        <div className={s.head}>
          <div className={s.kicker}>{tx.kicker}</div>
          <div className={s.title}>{tx.title}</div>
          <div className={s.stack}>{tx.stack}</div>
        </div>

        {tx.layers.map((l, i) => (
          <div key={l} className={s.anchor} data-k={`layer${i}`}>
            <span className={s.layer}>
              <i>0{i + 1}</i>
              {l}
            </span>
          </div>
        ))}

        <div className={s.box} data-k="box">
          <span className={s.q} data-k="q">
            ?
          </span>
          <span className={s.boxLabel}>
            <b data-k="boxUnknown" className={s.unknown}>
              {tx.rangeUnknown}
            </b>
            <b data-k="boxKnown" className={s.known}>
              {tx.rangeKnown}
            </b>
          </span>
        </div>

        <div className={s.anchor} data-k="defect">
          <span className={`${s.tag} ${s.tagRed}`}>
            <em>{tx.defect}</em>
            {DECOR.defectSn}
          </span>
        </div>
        <div className={s.anchor} data-k="lot">
          <span className={`${s.tag} ${s.tagAmber} ${s.tagLeft}`}>
            <em>{tx.lotFound}</em>
            {DECOR.lot}
          </span>
        </div>
        <div className={s.anchor} data-k="gate">
          <span className={`${s.tag} ${s.tagGate}`}>
            <em>{tx.gate}</em>
            {tx.gateSub}
          </span>
        </div>

        <ol className={s.steps}>
          {tx.steps.map((st, i) => (
            <li key={st} data-k={`step${i}`} className={s[`step${i}`]}>
              {st}
            </li>
          ))}
          <li data-k="step3" className={s.award}>
            <span>{tx.award}</span>
            <small>{tx.awardSub}</small>
          </li>
        </ol>
      </div>
    </SceneHost>
  )
}

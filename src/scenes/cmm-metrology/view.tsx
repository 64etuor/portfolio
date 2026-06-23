'use client'

import type { Ref } from 'react'
import { FEATURES, SKILLS, XCHECKS } from './data'
import { specStr } from './runtime'
import type { SceneDomRefs } from './types'
import s from './scene.module.css'

interface ViewProps {
  canvasRef: Ref<HTMLCanvasElement>
  refs: SceneDomRefs
}

export function SceneView({ canvasRef, refs }: ViewProps) {
  return (
    <div className={s.app}>
      <canvas ref={canvasRef} className={s.stage} />

      <div className={`${s.hud} ${s.topbar}`}>
        <div className={s.brand}>
          <span className={s.nm}>CMM 좌표측정</span>
          <span className={s.en}>COORDINATE METROLOGY</span>
        </div>
        <div className={s.sep} />
        <span className={s.role}>3D 좌표측정 · GD&amp;T 검증 · 검사성적서 자동발행</span>
        <div className={s.machine}>
          <span>BRIDGE CMM · 스캐닝 프로브 <b>Ø2.0mm RUBY</b></span>
          <span className={`${s.sep} ${s.shortSep}`} />
          <span className={s.statled} ref={refs.statLed}>
            <span className={s.dot} />
            <span ref={refs.statText}>INSPECTING</span>
          </span>
        </div>
      </div>

      <div className={`${s.hud} ${s.dro}`}>
        <div className={s.droAxis}><span className={s.ax}>X</span><span className={s.val} ref={refs.droX}>+000.000</span><span className={s.un}>mm</span></div>
        <div className={s.droAxis}><span className={s.ax}>Y</span><span className={s.val} ref={refs.droY}>+000.000</span><span className={s.un}>mm</span></div>
        <div className={s.droAxis}><span className={s.ax}>Z</span><span className={s.val} ref={refs.droZ}>+000.000</span><span className={s.un}>mm</span></div>
        <div className={s.droMeta}>
          <span>측정점 <b ref={refs.ptCount}>0</b> / 248</span>
          <span>FEED <b>180</b> mm/min</span>
          <span>PROBE <b>SCAN</b></span>
          <span ref={refs.clock}>T+00.0s</span>
        </div>
      </div>

      <div className={`${s.hud} ${s.legend}`}>
        <div className={s.lgH}>GD&amp;T 기하공차</div>
        <div className={s.lgRow}><div className={s.lgSym}>⏥</div><div className={s.lgTx}><b>평면도</b> Flatness 0.02</div></div>
        <div className={s.lgRow}><div className={s.lgSym}>⌖</div><div className={s.lgTx}><b>위치도</b> Position Ø0.05 Ⓜ</div></div>
        <div className={s.lgRow}><div className={s.lgSym}>⌭</div><div className={s.lgTx}><b>원통도</b> Cylindricity 0.04</div></div>
        <div className={s.lgRow}><div className={s.lgSym}>◎</div><div className={s.lgTx}><b>동심도</b> Concentricity Ø0.03</div></div>
        <div className={s.lgRow}><div className={s.lgSym}>∥</div><div className={s.lgTx}><b>평행도</b> Parallelism 0.02 A</div></div>
        <div className={s.datumtag}>
          <div className={s.dchip}>⟦A⟧</div>
          <div className={s.dchip}>⟦B⟧</div>
          <div className={s.dchip}>⟦C⟧</div>
        </div>
      </div>

      <div className={`${s.hud} ${s.equip}`}>
        <div className={s.eqH}><span>측정 기법 · 장비</span><span ref={refs.eqCount}>0/18</span></div>
        <div className={s.chips}>
          {SKILLS.map((skillName, i) => (
            <span
              className={s.chip}
              key={skillName}
              ref={(el) => {
                refs.chips.current[i] = el
              }}
            >
              {skillName}
            </span>
          ))}
        </div>
      </div>

      <div className={`${s.hud} ${s.report}`}>
        <div className={s.rpTop}>
          <div className={s.rpTitle}>
            <span className={s.t}>검사 성적서</span>
            <span className={s.badge}>RPT-2026-0618</span>
          </div>
          <div className={s.rpSub}>
            <span>PART <b>DATUM-BLOCK-01</b></span>
            <span>발행 <b>AUTO</b></span>
            <span>S/N <b>SN-04412</b></span>
          </div>
        </div>
        <div className={s.rpHead}>
          <span>측정 피처 (FEATURE)</span><span className={s.r}>규격 · 공차</span><span className={s.r}>실측</span><span className={s.r}>판정</span>
        </div>
        <div className={s.rpBody}>
          {FEATURES.map((feature) => (
            <div
              className={s.row}
              data-key={feature.key}
              key={feature.key}
              ref={(el) => {
                refs.rows.current[feature.key] = el
              }}
            >
              <div className={s.feat}>{feature.feat}<span className={s.ftSub}>{feature.sub}</span></div>
              <div className={s.spec}>{specStr(feature)}</div>
              <div
                className={s.meas}
                ref={(el) => {
                  refs.meas.current[feature.key] = el
                }}
              >
                — —
              </div>
              <div
                className={s.jud}
                ref={(el) => {
                  refs.jud.current[feature.key] = el
                }}
              >
                <span className={`${s.tag} ${s.waitingTag}`}>대기</span>
              </div>
            </div>
          ))}
        </div>
        <div className={s.rpFoot}>
          <div className={s.cpkWrap}>
            <div className={s.gauge}><canvas ref={refs.cpkGauge} width={176} height={100} /></div>
            <div className={s.cpkRead}>
              <div className={s.lab}>공정능력 Cpk</div>
              <div className={s.num} ref={refs.cpkNum}><span ref={refs.cpkVal}>0.00</span> <small>(목표 ≥1.33)</small></div>
              <div className={s.note} ref={refs.cpkNote}>측정 대기…</div>
            </div>
          </div>
          <div className={s.verdict} ref={refs.verdict}>
            <span className={s.vbig}>PASS</span>
            <span className={s.vtx}><b ref={refs.passN}>0/8</b> 피처 합격 · 전 GD&amp;T 규격 내<br />검사성적서 자동발행 완료 — 양산 승인</span>
            <span className={s.stamp}>APPROVED<br />QA · METROLOGY</span>
          </div>
          <div className={s.belief}>
            <div className={s.bq}>"측정할 수 없으면 <b>관리할 수 없다.</b>"</div>
            <div className={s.bm}>
              <span className={s.bchip}>전 피처 <b>GD&amp;T 검증</b></span>
              <span className={s.bchip}>공차 대비 <b>편차 정량화</b></span>
              <span className={s.bchip}>20°C <b>기준 보정</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className={`${s.hud} ${s.crossover}`} ref={refs.crossover}>
        <div className={s.xoTop}>
          <div className={s.xoKick}>MEASUREMENT INTEGRITY · 20°C / ISO 10360</div>
          <div className={s.xoTitle}>측정값은 <b>데이텀·열보정·불확도</b><br />위에서만 신뢰할 수 있다</div>
          <div className={s.xoSub}>
            데이텀 = <span className={s.dat}>부품 좌표계 (3-2-1)</span> · 프로브 = <span className={s.dat}>Ø2.0 루비</span><br />
            측정 신호 = 접촉 좌표 → <b className={s.passText}>LSQ 피팅</b>
          </div>
        </div>
        <div className={s.xoHead}>
          <span>신뢰성 점검 (6)</span><span className={s.r}>처리</span><span className={s.r}>상태</span>
        </div>
        <div className={s.xoBody}>
          {XCHECKS.map((check, i) => (
            <div
              className={s.xrow}
              key={check.feat}
              ref={(el) => {
                refs.xrows.current[i] = el
              }}
            >
              <div className={s.xf}>{check.feat}<span className={s.xs}>{check.sub}</span></div>
              <div className={s.xd}>{check.dev}</div>
              <div className={s.xj}>
                <span className={`${s.tag} ${check.jud === 'pass' ? s.pass : s.remeas}`}>{check.jud === 'pass' ? 'OK' : '필터'}</span>
              </div>
            </div>
          ))}
        </div>
        <div className={s.xoFoot}>
          <div className={s.xnote}><b>핵심:</b> 데이텀 정렬 → 열보정(20°C) → 최소자승 피팅 → 이상점 필터 → 불확도 평가. 그 위에서만 GD&amp;T 판정과 Cpk가 의미를 가진다.</div>
          <div className={s.xverdict}><span>계측 추적성 · ISO 표준기 소급</span><span className={s.xstamp}>TRACEABLE</span></div>
        </div>
      </div>

      <div className={`${s.hud} ${s.toast}`} ref={refs.toast}>
        <span className={s.ic} ref={refs.toastIc}>⚠</span>
        <span className={s.tt} ref={refs.toastTx} />
      </div>
    </div>
  )
}

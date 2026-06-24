'use client'

import type { RefObject, RefCallback } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { CHIPS, INVENTORY, LEDGER, LEVERS, STEPS } from './data'
import s from './scene.module.css'

function moduleEars() {
  return (
    <>
      <span className={`${s.ear} ${s.tl}`} />
      <span className={`${s.ear} ${s.tr}`} />
      <span className={`${s.ear} ${s.bl}`} />
      <span className={`${s.ear} ${s.br}`} />
    </>
  )
}

export interface SceneViewRefs {
  canvasRef: RefCallback<HTMLCanvasElement | null>
  rowRefs: RefObject<Array<HTMLButtonElement | null>>
  qRef: RefObject<HTMLDivElement | null>
  aRef: RefObject<HTMLDivElement | null>
  levRef: RefObject<HTMLSpanElement | null>
  idxRef: RefObject<HTMLSpanElement | null>
  ledTotalRef: RefObject<HTMLDivElement | null>
  dmmWinRef: RefObject<HTMLDivElement | null>
  surgeDotRef: RefObject<HTMLSpanElement | null>
  finalStepRef: RefObject<HTMLDivElement | null>
  digitRefs: RefObject<Array<HTMLSpanElement | null>>
  wfSvgRef: RefObject<SVGSVGElement | null>
  scopeSvgRef: RefObject<SVGSVGElement | null>
  gaugeSvgRef: RefObject<SVGSVGElement | null>
}

interface SceneViewProps {
  refs: SceneViewRefs
  onSelectLedger: (i: number) => void
}

export function SceneView({ refs, onSelectLedger }: SceneViewProps) {
  const {
    canvasRef,
    rowRefs,
    qRef,
    aRef,
    levRef,
    idxRef,
    ledTotalRef,
    dmmWinRef,
    surgeDotRef,
    finalStepRef,
    digitRefs,
    wfSvgRef,
    scopeSvgRef,
    gaugeSvgRef,
  } = refs

  return (
    <SceneHost className={s.root} bg="#070809">
      <canvas ref={canvasRef} className={s.c} />
      <div className={s.scroll}>
        <div className={s.wrap}>
          <div className={s.rack}>
            <div className={`${s.railholes} ${s.l}`} aria-hidden="true" />
            <div className={`${s.railholes} ${s.r}`} aria-hidden="true" />
            <div className={s.scanbeam} aria-hidden="true" />
            <div className={s.crtflick} aria-hidden="true" />
            <div className={s.rackinner}>
              <section className={s.u} aria-label="시스템 헤더">
                {moduleEars()}
                <div className={s.head}>
                  <div className={s.logo} aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#39ff8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20V4" />
                      <path d="M4 20h16" />
                      <path d="M7 14l3-4 3 3 4-7" />
                    </svg>
                  </div>
                  <div className={s.brand}>
                    <h1>원가 제1원칙 해부 보드</h1>
                    <div className={s.role}>
                      <b>운영경비(OPEX) −85%</b> 절감 · 제1원칙 분석
                    </div>
                  </div>
                  <div className={s.topmeta}>
                    <span className={s.pill}>
                      <span className={`${s.dot} ${s.run}`} ref={surgeDotRef} /> OPEX&nbsp;−85%
                    </span>
                    <span className={s.pill}>
                      <span className={s.dot} /> 0불량
                    </span>
                    <span className={`${s.pill} ${s.mono}`}>
                      <span className={`${s.dot} ${s.warn}`} /> IATF&nbsp;16949
                    </span>
                  </div>
                </div>
              </section>

              <section className={s.u} aria-label="제1원칙 선언">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>DOCTRINE</span>
                  <h3>제1원칙 — 모든 원가를 처음부터 다시 본다</h3>
                  <span className={`${s.sub} ${s.mono}`}>FIRST-PRINCIPLES COST TEARDOWN</span>
                </div>
                <div className={s.creed}>
                  <span className={s.q}>&ldquo;이 비용은 관행이 아니라, 꼭 필요해서 존재하는가?&rdquo;</span>
                  <br />
                  운영경비(OPEX)를 결과가 아니라 <b>구조</b>로 본다 — 원가를 숫자로 세우기 위해 항목을 한 줄씩 원장에 펼치고, 각 줄을 심문한다.
                  답이 &ldquo;관행&rdquo;이면 레버를 건다. 조달단가 재협상 · 라인 운영구조 재설계 · 비전검사 0불량 · 인원·공수·생산계획·재고 개선으로
                  기준 OPEX를 단계적으로 깎아 <b>−85%</b>까지 내렸다. 1막은 손의 시대에서 정렬을 시작한 시기였다.
                </div>
              </section>

              <section className={s.u} aria-label="원가 원장 및 워터폴">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>LEDGER · WATERFALL</span>
                  <h3>운영경비 원장 해부 → 단계 절감 워터폴</h3>
                  <span className={`${s.sub} ${s.mono}`}>왼쪽: 항목별 심문 · 오른쪽: 100 → 15 계단식 하강</span>
                </div>

                <div className={s.board2}>
                  <div>
                    <div className={s.ledger} role="group" aria-label="원가 원장">
                      <div className={s.ledhead}>
                        <span>원가 항목 · 심문 대상</span>
                        <span className={s.r}>기준 비중</span>
                        <span className={s.r}>절감 후</span>
                      </div>
                      <div>
                        {LEDGER.map((item, i) => (
                          <button
                            className={s.ledrow}
                            type="button"
                            key={item.nm}
                            ref={(node) => {
                              rowRefs.current[i] = node
                            }}
                            style={{ animationDelay: `${(1.05 + i * 0.11).toFixed(2)}s` }}
                            onClick={() => onSelectLedger(i)}
                            onFocus={() => onSelectLedger(i)}
                          >
                            <span className={s.li}>
                              <span className={s.led} />
                              <span className={s.min0}>
                                <span className={s.nm}>{item.nm}</span>
                              </span>
                            </span>
                            <span className={s.base}>{item.base}</span>
                            <span className={`${s.cut} ${item.cut === 0 ? s.zero : ''}`}>{item.cut === 0 ? '0' : item.cut}</span>
                          </button>
                        ))}
                      </div>
                      <div className={s.ledtot} ref={ledTotalRef}>
                        <span className={s.nm}>운영경비 합계 (지수)</span>
                        <span className={s.base}>100</span>
                        <span className={s.cut}>15</span>
                      </div>
                    </div>

                    <div className={s.interro} aria-live="polite">
                      <div className={s.qh}>
                        <span className={s.qt}>원장 메모 · LEDGER NOTE</span>
                        <span className={s.qn} ref={idxRef}>항목 01 / 06</span>
                      </div>
                      <div className={s.qq} ref={qRef} />
                      <div className={s.qa} ref={aRef} />
                      <span className={s.qlev} ref={levRef} />
                    </div>
                  </div>

                  <div className={s.wfwrap}>
                    <div className={s.wfchart}>
                      <div className={s.ovl} />
                      <span className={`${s.wfcorner} ${s.tl} ${s.mono}`}>OPEX INDEX</span>
                      <span className={`${s.wfcorner} ${s.tr} ${s.mono}`}>illustrative [확인필요]</span>
                      <span className={`${s.wfcorner} ${s.br} ${s.mono}`}>ENDPOINT −85%</span>
                      <svg
                        className={s.wfsvg}
                        ref={wfSvgRef}
                        viewBox="0 0 520 300"
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label="운영경비 워터폴 차트 — 100에서 15까지 단계 하강"
                      />
                    </div>

                    <div className={s.wfsteps}>
                      {STEPS.map((step, i) => (
                        <div
                          className={`${s.wfstep} ${step.kind !== 'step' ? s[step.kind] : ''}`}
                          key={step.nm}
                          ref={step.kind === 'final' ? finalStepRef : undefined}
                          style={{ animationDelay: `${(0.95 + i * 0.14).toFixed(2)}s` }}
                        >
                          <span className={s.si}>{step.si}</span>
                          <span>
                            <div className={s.sn}>{step.nm}</div>
                            <div className={s.sd}>{step.sd}</div>
                          </span>
                          <span className={s.sv}>
                            {step.kind === 'step' ? `−${step.drop} → ${step.val}` : step.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className={s.illnote}>
                      <span className={s.flag}>[확인필요]</span> 총 <b>운영경비 −85%</b>(지수 100→15)와 레버 항목은 실제 성과·실제 활동.
                      단, <b>레버별 절감 분해 비율</b>은 정확히 알 수 없어 워터폴 각 단계값은 illustrative(예시) 지수로 표기 — 실제 원화 총액 아님.
                    </div>
                  </div>
                </div>
              </section>

              <section className={s.u} aria-label="절감 레버">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>LEVERS</span>
                  <h3>제1원칙으로 건 4개 레버 — 실제 활동</h3>
                  <span className={`${s.sub} ${s.mono}`}>분해 비율은 illustrative · 활동 자체는 실제</span>
                </div>
                <div className={s.levgrid}>
                  {LEVERS.map((lever) => (
                    <div className={s.lev} key={lever.key}>
                      <div className={s.lk}>{lever.key}</div>
                      <div className={s.lt}>{lever.title}</div>
                      <div className={s.ld}>{lever.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={s.u} aria-label="계측 패널 — 측정 readout">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>INSTRUMENTS</span>
                  <h3>계측 패널 — 측정으로 확정한 성과 readout</h3>
                  <span className={`${s.sub} ${s.mono}`}>DMM 절감률 · 원가 스코프 · OPEX 게이지 · live</span>
                </div>
                <div className={s.instgrid}>
                  <div className={s.inst}>
                    <div className={s.insth}>
                      <span className={s.il} />
                      <span className={s.it}>DMM · 절감률</span>
                      <span className={s.iu}>PERCENT · DC</span>
                    </div>
                    <div className={s.dmm}>
                      <div className={s.dlabel}>운영경비(OPEX) 절감률 — 실측</div>
                      <div className={s.dwin} ref={dmmWinRef} aria-label="OPEX 절감률 마이너스 85 퍼센트">
                        <span className={s.sign}>−</span>
                        <span
                          className={s.digit}
                          data-d="8"
                          ref={(node) => {
                            digitRefs.current[0] = node
                          }}
                        />
                        <span
                          className={s.digit}
                          data-d="5"
                          ref={(node) => {
                            digitRefs.current[1] = node
                          }}
                        />
                        <span className={s.unit}>%</span>
                      </div>
                      <div className={s.drange}>
                        <span>RANGE 0–100%</span>
                        <span>HOLD · ENDPOINT</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.inst}>
                    <div className={s.insth}>
                      <span className={s.il} />
                      <span className={s.it}>Scope · 원가 트레이스</span>
                      <span className={s.iu}>100 → 15</span>
                    </div>
                    <div className={s.scope}>
                      <div className={s.scopewrap}>
                        <svg
                          ref={scopeSvgRef}
                          viewBox="0 0 360 150"
                          preserveAspectRatio="none"
                          role="img"
                          aria-label="기준 100에서 15까지 원가 하강 트레이스"
                        />
                      </div>
                      <div className={s.scopefoot}>
                        <span>BASE <b>100</b> idx</span>
                        <span>SWEEP · loop</span>
                        <span>END <b>15</b> idx</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.inst}>
                    <div className={s.insth}>
                      <span className={s.il} />
                      <span className={s.it}>Gauge · 잔여 OPEX</span>
                      <span className={s.iu}>INDEX</span>
                    </div>
                    <div className={s.gauge}>
                      <svg ref={gaugeSvgRef} viewBox="0 0 200 124" role="img" aria-label="잔여 운영경비 게이지 — 100에서 15로" />
                      <div className={s.gcap}>
                        바늘: 기준 100 → <b>잔여 15</b> · 스윕 반복
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={s.u} aria-label="품질·시스템 현황">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>SYSTEMS</span>
                  <h3>품질체계 · 운영 시스템 — 절감을 떠받친 기반</h3>
                  <span className={`${s.sub} ${s.mono}`}>OPEX 절감 · 제1원칙 분석</span>
                </div>
                <div className={s.inv}>
                  {INVENTORY.map((item) => (
                    <div className={s.invrow} key={item.nm}>
                      <div>
                        <div className={s.nm}>{item.nm}</div>
                        <div className={s.cap}>{item.cap}</div>
                      </div>
                      <div className={s.cap}>{item.role}</div>
                      <div className={`${s.stled} ${s[item.tone]}`}>
                        <span className={s.d} /> {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={s.u} aria-label="기술 스택 / 연락처">
                {moduleEars()}
                <div className={s.footu}>
                  <div className={s.chips}>
                    {CHIPS.map((chip) => (
                      <span className={s.chip} key={chip.text}>
                        {'strong' in chip && chip.strong ? <b>{chip.text}</b> : chip.text}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={s.labelStripFooter}>OPEX −85% · 제1원칙 · 측정 · 심문 · 절감</div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}

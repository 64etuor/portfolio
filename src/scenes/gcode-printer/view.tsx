'use client'

import type React from 'react'
import { SceneHost } from '../_host/SceneHost'
import { cx } from '../_host/dom-util'
import { CAREER, METRICS, SKILLS, TOTAL_LAYERS } from './data'
import { cssVarStyle } from './draw'
import s from './scene.module.css'

function metricToneClass(cls: string) {
  if (cls === 'up') return s.up
  if (cls === 'zero') return s.zero
  return s.good
}

export interface GcodePrinterViewProps {
  canvasRef: React.Ref<HTMLCanvasElement>
  tNozRef: React.MutableRefObject<HTMLElement | null>
  tBedRef: React.MutableRefObject<HTMLElement | null>
  statetagRef: React.MutableRefObject<HTMLDivElement | null>
  statetxtRef: React.MutableRefObject<HTMLSpanElement | null>
  layerRef: React.MutableRefObject<HTMLSpanElement | null>
  zRef: React.MutableRefObject<HTMLSpanElement | null>
  xRef: React.MutableRefObject<HTMLElement | null>
  yRef: React.MutableRefObject<HTMLElement | null>
  eRef: React.MutableRefObject<HTMLElement | null>
  tempRef: React.MutableRefObject<HTMLElement | null>
  etaRef: React.MutableRefObject<HTMLElement | null>
  pctRef: React.MutableRefObject<HTMLSpanElement | null>
  fillRef: React.MutableRefObject<HTMLDivElement | null>
  gcodeRef: React.MutableRefObject<HTMLDivElement | null>
  gLnRef: React.MutableRefObject<HTMLSpanElement | null>
  matMetaRef: React.MutableRefObject<HTMLDivElement | null>
  completeRef: React.MutableRefObject<HTMLElement | null>
  defectRef: React.MutableRefObject<HTMLDivElement | null>
  defectLabelRef: React.MutableRefObject<HTMLSpanElement | null>
  defectTagRef: React.MutableRefObject<HTMLSpanElement | null>
  defectTextRef: React.MutableRefObject<HTMLDivElement | null>
  reprintBtnRef: React.MutableRefObject<HTMLButtonElement | null>
  tempTargetRef: React.MutableRefObject<SVGLineElement | null>
  tempPathRef: React.MutableRefObject<SVGPathElement | null>
  tempAreaRef: React.MutableRefObject<SVGPathElement | null>
  defectSvgRef: React.MutableRefObject<SVGSVGElement | null>
  careerRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  metricRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  metricBarRefs: React.MutableRefObject<Array<HTMLElement | null>>
  skillRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  startReprint: () => void
  resetSimulation: () => void
}

export function GcodePrinterView({
  canvasRef,
  tNozRef,
  tBedRef,
  statetagRef,
  statetxtRef,
  layerRef,
  zRef,
  xRef,
  yRef,
  eRef,
  tempRef,
  etaRef,
  pctRef,
  fillRef,
  gcodeRef,
  gLnRef,
  matMetaRef,
  completeRef,
  defectRef,
  defectLabelRef,
  defectTagRef,
  defectTextRef,
  reprintBtnRef,
  tempTargetRef,
  tempPathRef,
  tempAreaRef,
  defectSvgRef,
  careerRefs,
  metricRefs,
  metricBarRefs,
  skillRefs,
  startReprint,
  resetSimulation
}: GcodePrinterViewProps) {
  return (
    <SceneHost className={s.root} bg="#0a0b0d">
      <div className={s.shell}>
        <header className={s.topbar}>
          <div className={s.brand}>
            <div className={s.logo} aria-hidden="true" />
            <div className={s.metaBlock}>
              <b>적층제조 치공구 빌드</b>
              <span>FDM 파라미터 시뮬레이션</span>
            </div>
          </div>
          <div className={s.mid}>
            <div className={cx(s.chip, s.hot)}>
              <span className={s.dot} />노즐 <b ref={tNozRef}>215°C</b>
            </div>
            <div className={cx(s.chip, s.bedc)}>
              <span className={s.dot} />베드 <b ref={tBedRef}>60°C</b>
            </div>
            <div className={s.chip}>
              레이어 높이 <b>0.2mm</b>
            </div>
            <div className={s.chip}>
              인필 <b>35%</b>
            </div>
            <div className={s.chip}>
              속도 <b>60mm/s</b>
            </div>
          </div>
          <div className={s.statetag} ref={statetagRef}>
            <span className={s.stateDot} />
            <span ref={statetxtRef}>PRINTING — cartridge_press_jig.gcode</span>
          </div>
        </header>

        <section className={s.stage}>
          <div className={s.panel}>
            <div className={s.head}>
              <div className={s.title}>
                <span className={s.key} />FDM 빌드 챔버 · 적층 제조 시뮬레이션
              </div>
              <div className={s.headMeta}>
                part: <b className={s.filamentText}>cartridge_press_insert_jig.stl</b> · 0.2mm · PETG-CF
              </div>
            </div>
            <div className={s.viewport}>
              <canvas ref={canvasRef} className={s.print} />
              <div className={s.vpOverlay}>
                <div className={s.vpBadge}>
                  슬라이싱: <b>{TOTAL_LAYERS}</b> 레이어 · 인필 35% · 리트랙션 ON
                </div>
                <div className={s.vpLayer}>
                  <div className={s.big}>
                    <span ref={layerRef}>0</span> / <span>{TOTAL_LAYERS}</span>
                  </div>
                  <div className={s.sub}>
                    LAYER · Z=<span ref={zRef}>0.00</span>mm
                  </div>
                </div>
                <div className={s.vpCoord}>
                  <span>
                    X<b ref={xRef}>0.0</b>
                  </span>
                  <span>
                    Y<b ref={yRef}>0.0</b>
                  </span>
                  <span className={s.e}>
                    E<b ref={eRef}>0.00</b>
                  </span>
                </div>
                <div className={s.tempgraph}>
                  <div className={s.lbl}>
                    <span>NOZZLE TEMP</span>
                    <b ref={tempRef}>215°C</b>
                  </div>
                  <svg className={s.tempCv} viewBox="0 0 178 34" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="gcodePrinterTempFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="rgba(255,122,24,.25)" />
                        <stop offset="1" stopColor="rgba(255,122,24,0)" />
                      </linearGradient>
                    </defs>
                    <line ref={tempTargetRef} x1="0" x2="178" y1="0" y2="0" stroke="rgba(255,77,77,.3)" strokeWidth="1" strokeDasharray="3 3" />
                    <path ref={tempAreaRef} fill="url(#gcodePrinterTempFill)" />
                    <path ref={tempPathRef} fill="none" stroke="#ff7a18" strokeWidth="1.6" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={s.progress}>
              <div className={s.row}>
                <span>
                  PRINT PROGRESS · <b ref={etaRef}>남은 시간 계산 중…</b>
                </span>
                <span className={s.pct} ref={pctRef}>
                  0%
                </span>
              </div>
              <div className={s.bar}>
                <div className={s.fill} ref={fillRef} />
              </div>
            </div>
          </div>

          <div className={cx(s.panel, s.console)}>
            <div className={s.head}>
              <div className={s.title}>
                <span className={s.key} />G-CODE STREAM
              </div>
              <div className={s.headMeta}>
                line <span className={s.ln} ref={gLnRef}>0</span> · M104/M140 · G1 X Y E
              </div>
            </div>
            <div className={s.gwrap}>
              <div className={s.gcode} ref={gcodeRef} />
            </div>
            <div className={s.spools}>
              {SKILLS.slice(0, 16).map(([name, color]) => (
                <div className={s.spool} key={name}>
                  <span className={s.spoolSwatch} style={cssVarStyle('--spool-color', color)} />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={s.layersgrid}>
          <div className={cx(s.panel, s.career)}>
            <div className={s.head}>
              <div className={s.title}>
                <span className={s.key} />슬라이싱 파라미터 · SLICER CONFIG
              </div>
              <div className={s.headMeta}>빌드 진행에 따라 파라미터 블록 순서 고정</div>
            </div>
            <div>
              {CAREER.map((c, i) => (
                <div
                  className={s.layerItem}
                  data-ci={i}
                  key={c.layerNo}
                  ref={(el) => {
                    careerRefs.current[i] = el
                  }}
                >
                  <div className={s.liTop}>
                    <div>
                      <span className={s.liOrg}>{c.org}</span>
                      <span className={s.liRole}>{c.role}</span>
                    </div>
                    <span className={s.liDate}>{c.date}</span>
                  </div>
                  <div className={s.liBody}>{c.body}</div>
                  <div className={s.liTags}>
                    {c.tags.map(([tag, hi]) => (
                      <span className={cx(s.liTag, hi ? s.hi : false)} key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className={s.liLayerno}>▢ {c.layerNo}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={cx(s.panel, s.metrics)}>
            <div className={s.head}>
              <div className={s.title}>
                <span className={cx(s.key, s.solidKey)} />프린트 품질 리포트 · QC
              </div>
              <div className={s.headMeta}>치수/표면 측정값</div>
            </div>
            <div className={s.metricList}>
              {METRICS.map((m, i) => (
                <div
                  className={s.metric}
                  data-mi={i}
                  key={m.label}
                  ref={(el) => {
                    metricRefs.current[i] = el
                  }}
                >
                  <div className={s.mlabel}>
                    <b>{m.label}</b>
                  </div>
                  <div className={cx(s.mbar, s.mval, metricToneClass(m.cls))}>
                    <i
                      ref={(el) => {
                        metricBarRefs.current[i] = el
                      }}
                    />
                  </div>
                  <div className={cx(s.mval, metricToneClass(m.cls))}>{m.val}</div>
                </div>
              ))}
            </div>

            <div className={s.defect} ref={defectRef}>
              <div className={s.defectHead}>
                <span className={s.defectLabel}>
                  <span className={s.dot} />
                  <span ref={defectLabelRef}>PROCESS NOTE · 코너 비드 관찰</span>
                </span>
                <span className={s.defectTag} ref={defectTagRef}>
                  layer 042
                </span>
              </div>
              <div className={s.defectBody}>
                <div className={s.defectCanvasWrap}>
                  <svg ref={defectSvgRef} className={s.defectCv} viewBox="0 0 480 46" preserveAspectRatio="none" aria-hidden="true" />
                </div>
                <div className={s.dtxt} ref={defectTextRef}>
                  <b>공정 메모:</b> layer 042 카트리지 누름면 코너에서 비드 끊김 경향 확인. 코너 감속과 외벽 순서를 조정해 재슬라이싱.
                </div>
                <button className={s.reprint} type="button" ref={reprintBtnRef} onClick={startReprint}>
                  ▶ APPLY PARAMETER NOTE — 코너 감속 / 외벽 우선
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={s.skillstrip}>
          <div className={s.head}>
            <div className={s.title}>
              <span className={s.key} />재료 / 공정 스풀 · MATERIAL LIBRARY
            </div>
            <div className={s.headMeta} ref={matMetaRef}>
              로드된 스풀 0 / 15
            </div>
          </div>
          <div className={s.skillwrap}>
            {SKILLS.map(([name, color], i) => (
              <div
                className={s.matspool}
                data-si={i}
                key={name}
                ref={(el) => {
                  skillRefs.current[i] = el
                }}
                style={cssVarStyle('--spool-color', color)}
              >
                <span className={s.ring} />
                <span className={s.matLabel}>{name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={s.complete} ref={completeRef}>
          <div className={s.cbar}>
            <div className={s.cl}>
              <div className={s.stamp}>BUILD LOGGED</div>
              <div className={s.ci}>
                <b>치공구 빌드 완료 · 88 레이어</b>
                <span>PETG-CF · 노즐 215°C · 베드 60°C · 인필 35% Gyroid</span>
              </div>
            </div>
            <div className={s.cc}>
              <button className={cx(s.btn, s.active, s.replayBtn)} type="button" onClick={resetSimulation}>
                ⟲ REPLAY BUILD
              </button>
            </div>
          </div>
        </section>

        <div className={s.foot}>적층제조 치공구 시안 · 노즐 모션은 G-code 스트림과 동기화됩니다 · FDM 파라미터 실시간 반영</div>
      </div>
    </SceneHost>
  )
}

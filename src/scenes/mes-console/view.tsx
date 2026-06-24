'use client'

import type React from 'react'
import { SceneHost } from '../_host/SceneHost'
import { DEFECTS, GAUGE_COLORS, GAUGES, JOBS, KPIS, SKILL_GROUPS } from './data'
import { SPARK_COLORS } from './constants'
import { chipToneClass, gaugeArc, jobLeft } from './draw'
import s from './scene.module.css'

export interface MesConsoleViewProps {
  idBase: string
  canvasRef: React.Ref<HTMLCanvasElement>
  clockRef: React.MutableRefObject<HTMLSpanElement | null>
  uptimeRef: React.MutableRefObject<HTMLSpanElement | null>
  connRef: React.MutableRefObject<HTMLSpanElement | null>
  alarmCountRef: React.MutableRefObject<HTMLSpanElement | null>
  gaugeFillRefs: React.MutableRefObject<Array<SVGPathElement | null>>
  gaugeNeedleRefs: React.MutableRefObject<Array<SVGLineElement | null>>
  gaugeTextRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  topSparkSvgRefs: React.MutableRefObject<Array<SVGSVGElement | null>>
  topSparkLineRefs: React.MutableRefObject<Array<SVGPathElement | null>>
  topSparkAreaRefs: React.MutableRefObject<Array<SVGPathElement | null>>
  topMetricRefs: React.MutableRefObject<Array<HTMLSpanElement | null>>
  bellRef: React.MutableRefObject<SVGSVGElement | null>
  cpkRef: React.MutableRefObject<HTMLElement | null>
  yieldRef: React.MutableRefObject<HTMLElement | null>
  ppmRef: React.MutableRefObject<HTMLElement | null>
  kpiValueRefs: React.MutableRefObject<Array<HTMLSpanElement | null>>
  kpiSparkSvgRefs: React.MutableRefObject<Array<SVGSVGElement | null>>
  kpiSparkLineRefs: React.MutableRefObject<Array<SVGPathElement | null>>
  kpiSparkAreaRefs: React.MutableRefObject<Array<SVGPathElement | null>>
  ganttBarRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  nowLineRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  paretoRef: React.MutableRefObject<SVGSVGElement | null>
  trendRef: React.MutableRefObject<SVGSVGElement | null>
  feedRef: React.MutableRefObject<HTMLDivElement | null>
  lampGRef: React.MutableRefObject<HTMLSpanElement | null>
  lampYRef: React.MutableRefObject<HTMLSpanElement | null>
  lampRRef: React.MutableRefObject<HTMLSpanElement | null>
  andonStateRef: React.MutableRefObject<HTMLSpanElement | null>
  stopFlagRef: React.MutableRefObject<HTMLSpanElement | null>
}

export function MesConsoleView({
  idBase,
  canvasRef,
  clockRef,
  uptimeRef,
  connRef,
  alarmCountRef,
  gaugeFillRefs,
  gaugeNeedleRefs,
  gaugeTextRefs,
  topSparkSvgRefs,
  topSparkLineRefs,
  topSparkAreaRefs,
  topMetricRefs,
  bellRef,
  cpkRef,
  yieldRef,
  ppmRef,
  kpiValueRefs,
  kpiSparkSvgRefs,
  kpiSparkLineRefs,
  kpiSparkAreaRefs,
  ganttBarRefs,
  nowLineRefs,
  paretoRef,
  trendRef,
  feedRef,
  lampGRef,
  lampYRef,
  lampRRef,
  andonStateRef,
  stopFlagRef
}: MesConsoleViewProps) {
  return (
    <SceneHost className={s.root} bg="#0a0e0d">
      <canvas ref={canvasRef} className={s.c} />
      <div className={s.screen}>
        <div className={s.topbar}>
          <div className={s.tbBrand}>
            <div className={s.logoLed} />
            <div>
              <div className={s.title}>MES&nbsp;//&nbsp;CONSOLE</div>
              <div className={s.sub}>실시간 운영 콘솔 · 신제품 양산 라인</div>
            </div>
          </div>
          <div className={s.tbMeta}>
            <div className={s.tbCell}>
              <span className={s.k}>Line</span>
              <span className={`${s.v} ${s.amber}`}>LINE-01</span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>Shift</span>
              <span className={s.v}>DAY / A조</span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>Stack</span>
              <span className={s.v}>Django · React · Electron · OPC UA · PostgreSQL</span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>System Clock</span>
              <span className={`${s.v} ${s.g}`} ref={clockRef}>
                --:--:--
              </span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>Shift Elapsed</span>
              <span className={`${s.v} ${s.amber}`} ref={uptimeRef}>
                --
              </span>
            </div>
          </div>
          <div className={s.tbRight}>
            <span className={`${s.pill} ${s.live}`} ref={connRef}>
              DAQ LIVE
            </span>
            <span className={s.pill} ref={alarmCountRef}>
              ALARMS 0
            </span>
          </div>
        </div>

        <div className={s.wrap}>
          <div className={s.sectionTag}>{/* // ABOUT THIS CONSOLE — 자체개발 MES 아키텍처 · 인-하우스 설계 원칙 */}{'// ABOUT THIS CONSOLE — 자체개발 MES 아키텍처 · 인-하우스 설계 원칙'}</div>
          <div className={s.philo}>
            <div className={s.philoCell}>
              <div className={s.pname}>
                <span className={s.pj}>$</span> 자체개발 배경 · WHY IN-HOUSE
              </div>
              <div className={s.ptag}>MES 인-하우스 개발 · 비용 절감 설계</div>
              <div className={s.pdesc}>
                자동화 설비 예산 <em>30만 달러 초과</em> 상황에서 MES 외주 개발비 누락 확인. 추가 발주 대신{' '}
                <em>인-하우스 기획·개발</em>을 선택.
              </div>
            </div>
            <div className={s.philoCell}>
              <div className={s.pname}>
                <span className={s.pj}>⚙</span> 데이터 수집 · ETL LAYER
              </div>
              <div className={s.ptag}>OPC UA · TCP/IP 비전 · OCV/IR 검사장비 · MS Access DB</div>
              <div className={s.pdesc}>
                구형 OCV/IR 검사장비 <em>Python 드라이버</em>(MS Access DB) + OPC UA 설비 태그 수집 + TCP/IP 비전 데이터.
                수집 데이터 → <em>PostgreSQL</em> 중앙 적재.
              </div>
            </div>
            <div className={s.philoCell}>
              <div className={s.pname}>
                <span className={s.pj}>⬡</span> 풀스택 아키텍처 · FULL-STACK
              </div>
              <div className={s.ptag}>Django REST · React · TypeScript · Electron · PostgreSQL · Dash</div>
              <div className={s.pdesc}>
                Backend DRF API · Frontend React/TS/Electron · DB PostgreSQL · 실시간 대시보드 Python Dash.{' '}
                <em>계층형 S/N 바코드 체계 자체 설계.</em>
              </div>
            </div>
          </div>

          <div className={s.sectionTag}>{'// PLANT OVERVIEW — 설비 종합 효율 · 실시간 공정 현황'}</div>
          <div className={`${s.grid} ${s.row1}`}>
            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>설비 종합 효율 OEE</span>
                <span className={s.hId}>PNL-01 / OEE.SUITE</span>
              </div>
              <div className={s.pBody}>
                <div className={s.gaugeWrap}>
                  {GAUGES.map((gauge, i) => {
                    const color = GAUGE_COLORS[gauge.color]
                    return (
                      <div className={s.gauge} key={gauge.id}>
                        <svg viewBox="0 0 108 78" aria-hidden="true">
                          <g transform="translate(54,66)">
                            <path d={gaugeArc(1)} fill="#16201c" />
                            {Array.from({ length: 11 }, (_, tick) => {
                              const ang = -Math.PI / 2 + (tick / 10) * Math.PI
                              return (
                                <line
                                  key={tick}
                                  x1={Math.cos(ang) * 45.5}
                                  y1={Math.sin(ang) * 45.5}
                                  x2={Math.cos(ang) * 49}
                                  y2={Math.sin(ang) * 49}
                                  stroke="#2a3a33"
                                  strokeWidth="1"
                                />
                              )
                            })}
                            <path ref={(el) => { gaugeFillRefs.current[i] = el }} fill={color} filter={`drop-shadow(0 0 4px ${color})`} />
                            <line
                              ref={(el) => { gaugeNeedleRefs.current[i] = el }}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="-40"
                              stroke="#fff"
                              strokeWidth="1.4"
                              opacity=".85"
                            />
                            <circle r="3" fill="#0a0e0d" stroke={color} />
                          </g>
                        </svg>
                        <div className={s.gv} style={{ color }} ref={(el) => { gaugeTextRefs.current[i] = el }}>
                          0.0
                        </div>
                        <div className={s.gl}>{gauge.label}</div>
                        <div className={s.gt}>{gauge.sub}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>처리량 · 생산 신호</span>
                <span className={s.hId}>PNL-02 / THRPT</span>
              </div>
              <div className={s.pBody}>
                <div className={s.throughputStack}>
                  {[
                    ['시간당 생산량 UPH', 'uph', s.txtGreen],
                    ['사이클타임 C/T (s)', 'ct', s.txtAmber],
                    ['생산 달성률 ACHV (%)', 'lob', s.txtCyan],
                  ].map(([label, key, tone], i) => (
                    <div key={key}>
                      <div className={s.metricLine}>
                        <span className={s.txtDim}>{label}</span>
                        <span className={`${s.num} ${tone}`} ref={(el) => { topMetricRefs.current[i] = el }}>
                          0
                        </span>
                      </div>
                      <svg className={s.sparkline} ref={(el) => { topSparkSvgRefs.current[i] = el }}>
                        <defs>
                          <linearGradient id={`${idBase}-spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={SPARK_COLORS[i]} stopOpacity=".35" />
                            <stop offset="100%" stopColor={SPARK_COLORS[i]} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path ref={(el) => { topSparkAreaRefs.current[i] = el }} fill={`url(#${idBase}-spark-${i})`} />
                        <path ref={(el) => { topSparkLineRefs.current[i] = el }} fill="none" stroke={SPARK_COLORS[i]} strokeWidth="1.3" filter={`drop-shadow(0 0 3px ${SPARK_COLORS[i]})`} />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>공정 수율 FPY · 품질 분포</span>
                <span className={s.hId}>PNL-03 / FPY.BELL</span>
              </div>
              <div className={s.pBody}>
                <svg ref={bellRef} className={s.bellSvg} />
                <div className={s.cpkReadout}>
                  <div>
                    <span>Cpk</span>
                    <b ref={cpkRef}>1.67</b>
                  </div>
                  <div>
                    <span>수율 FPY</span>
                    <b className={s.txtAmber} ref={yieldRef}>
                      —
                    </b>
                  </div>
                  <div>
                    <span>불량 PPM</span>
                    <b className={s.txtCyan} ref={ppmRef}>
                      —
                    </b>
                  </div>
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>안돈 · 실시간 알람 피드</span>
                <span className={s.hId}>PNL-04 / ANDON.FEED</span>
              </div>
              <div className={s.andonBar}>
                <div className={s.andonLamps}>
                  <span className={`${s.alamp} ${s.r}`} ref={lampRRef} title="정지 — 설비/품질 이상" />
                  <span className={`${s.alamp} ${s.y}`} ref={lampYRef} title="주의 — 일탈 감시" />
                  <span className={`${s.alamp} ${s.g} ${s.on}`} ref={lampGRef} title="정상 가동" />
                </div>
                <span className={`${s.andonState} ${s.g}`} ref={andonStateRef}>
                  정상 · GO
                </span>
                <div className={s.andonJidoka}>
                  <span className={s.stopFlag} ref={stopFlagRef}>
                    STOP-THE-LINE
                  </span>
                  <b>ANDON</b>
                </div>
              </div>
              <div className={s.pBody}>
                <div className={s.feed} ref={feedRef} />
              </div>
            </div>
          </div>

          <div className={s.sectionTag}>{'// CUMULATIVE KPI — 실시간 운영 지표 (OEE 구성요소 분해)'}</div>
          <div className={`${s.grid} ${s.rowKpi}`}>
            {KPIS.slice(0, 4).map((kpi, i) => (
              <KpiTile
                key={kpi.label}
                index={i}
                idBase={idBase}
                kpi={kpi}
                valueRefs={kpiValueRefs}
                svgRefs={kpiSparkSvgRefs}
                lineRefs={kpiSparkLineRefs}
                areaRefs={kpiSparkAreaRefs}
              />
            ))}
          </div>
          <div className={`${s.grid} ${s.rowKpi} ${s.rowKpiSpaced}`}>
            {KPIS.slice(4).map((kpi, localIndex) => {
              const i = localIndex + 4
              return (
                <KpiTile
                  key={kpi.label}
                  index={i}
                  idBase={idBase}
                  kpi={kpi}
                  valueRefs={kpiValueRefs}
                  svgRefs={kpiSparkSvgRefs}
                  lineRefs={kpiSparkLineRefs}
                  areaRefs={kpiSparkAreaRefs}
                />
              )
            })}
          </div>

          <div className={s.sectionTag}>{'// PRODUCTION SCHEDULE — 당일 워크오더 · 라인별 생산 계획'}</div>
          <div className={`${s.grid} ${s.row2}`}>
            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>생산 스케줄 GANTT · 워크오더</span>
                <span className={s.hId}>PNL-05 / WO.PLAN</span>
              </div>
              <div className={s.pBody}>
                <div className={s.gantt}>
                  <div className={s.ganttAxisWrap}>
                    <div />
                    <div className={s.ganttAxis}>
                      {['06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '→'].map((tick) => (
                        <span key={tick}>{tick}</span>
                      ))}
                    </div>
                  </div>
                  {JOBS.map((job, i) => (
                    <div className={s.grow} key={job.wo}>
                      <div>
                        <div className={s.wo}>{job.wo}</div>
                        <div className={s.gn}>{job.name}</div>
                        <div className={s.gc}>{job.role}</div>
                      </div>
                      <div className={s.gtrack}>
                        <div
                          className={`${s.gbar} ${job.status === 'run' ? s.run : s.done}`}
                          ref={(el) => { ganttBarRefs.current[i] = el }}
                          title={job.desc}
                          style={{ left: `${jobLeft(job)}%`, width: '0%' }}
                        >
                          {job.status === 'run' ? '● RUNNING' : '■ COMPLETE'}
                        </div>
                        <div className={s.nowLine} ref={(el) => { nowLineRefs.current[i] = el }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>불량 모드 파레토 · 4M</span>
                <span className={s.hId}>PNL-06 / DEFECT.PARETO</span>
              </div>
              <div className={s.pBody}>
                <svg ref={paretoRef} className={s.chartBox} />
                <div className={s.legend}>
                  <span>
                    <i className={s.legendAmber} />
                    불량 건수
                  </span>
                  <span>
                    <i className={s.legendGreen} />
                    누적 % (FPY 개선)
                  </span>
                </div>
                <table className={`${s.dtable} ${s.dtableSpaced}`}>
                  <tbody>
                    <tr>
                      <th>불량 모드</th>
                      <th>4M</th>
                      <th>건수</th>
                      <th>비중</th>
                    </tr>
                    {DEFECTS.map((d) => (
                      <tr key={d.mode}>
                        <td>{d.mode}</td>
                        <td className={s.txtCyan}>{d.cat}</td>
                        <td className={s.num}>{d.count}</td>
                        <td>
                          <div className={s.barCell}>
                            <div className={s.bf} style={{ width: `${((d.count / DEFECTS[0].count) * 100).toFixed(0)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={`${s.grid} ${s.row3}`}>
            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>OEE 추이 · 불량률 개선 개입</span>
                <span className={s.hId}>PNL-07 / OEE.TREND</span>
              </div>
              <div className={s.pBody}>
                <svg ref={trendRef} className={s.chartBox} />
                <div className={s.legend}>
                  <span>
                    <i className={s.legendRed} />
                    개선 전
                  </span>
                  <span>
                    <i className={s.legendGreen} />
                    개선 후
                  </span>
                  <span className={s.txtAmber}>▲ 개선 개입 시점</span>
                </div>
                <div className={s.trendNote}>
                  <span className={s.trendNoteAmber}>{'// MES 자체개발 스택'}</span> · OPC UA 수집 → PostgreSQL 적재 → Django REST API →
                  React/Electron UI → Python Dash 대시보드.
                  <br />
                  <b className={s.trendNoteText}>OCV/IR 검사장비</b> 레거시 연동 +{' '}
                  <b className={s.trendNoteCyan}>TCP/IP 비전 데이터</b> 수집 → 실시간 FPY 반영.
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>설비 · 라인 상태 · MES 스택</span>
                <span className={s.hId}>PNL-08 / ASSET.HEALTH</span>
              </div>
              <div className={s.pBody}>
                <div className={s.statGrid}>
                  {SKILL_GROUPS.map((group) => (
                    <div key={group.cat}>
                      <div className={s.statCat}>{group.cat}</div>
                      <div className={s.chips}>
                        {group.items.map(([name, tone]) => (
                          <span className={s.chip} key={name}>
                            <span className={`${s.led} ${chipToneClass(tone, s.amber, s.cyan)}`} />
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>공정 표준 · 인증 · 산출물</span>
                <span className={s.hId}>PNL-09 / CERT.LOG</span>
              </div>
              <div className={s.pBody}>
                <div className={s.statCat}>MES 개발 산출물</div>
                <div className={`${s.chips} ${s.chipsSpaced}`}>
                  <span className={s.chip}>
                    <span className={s.led} />
                    Django REST API
                  </span>
                  <span className={s.chip}>
                    <span className={s.led} />
                    PostgreSQL 스키마
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.amber}`} />
                    React/Electron 앱
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.cyan}`} />
                    Python Dash 대시보드
                  </span>
                  <span className={s.chip}>
                    <span className={s.led} />
                    OPC UA ETL 파이프라인
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.cyan}`} />
                    계층형 S/N 바코드 체계
                  </span>
                </div>
                <div className={s.statCat}>하드웨어 · 인프라</div>
                <div className={`${s.chips} ${s.chipsSpaced}`}>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.amber}`} />
                    Zebra DS2208 바코드 스캐너
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.amber}`} />
                    RAID1 서버
                  </span>
                </div>
                <div className={s.statCat}>공정 문서 산출물</div>
                <table className={s.dtable}>
                  <tbody>
                    <tr>
                      <td className={s.txtDim}>PFMEA</td>
                      <td>신제품 라인 고장모드분석 (국·영문)</td>
                    </tr>
                    <tr>
                      <td className={s.txtDim}>CP · PFD</td>
                      <td>관리계획서 · 공정흐름도</td>
                    </tr>
                    <tr>
                      <td className={s.txtDim}>SOP</td>
                      <td>표준작업절차서 번역·작성</td>
                    </tr>
                    <tr>
                      <td className={s.txtDim}>MES Spec</td>
                      <td>MES 스펙시트 자체 작성 (R0·R1)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={s.footer}>
            <div className={s.fcell}>
              <div className={s.fk}>System</div>
              <div className={s.fv}>MES 실시간 운영 콘솔 · DAY SHIFT</div>
            </div>
            <div className={s.fcell}>
              <div className={s.fk}>Console Build</div>
              <div className={`${s.fv} ${s.txtDim}`}>MES-CONSOLE v1.0 · DAQ@1Hz · 자체개발</div>
            </div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}

function KpiTile({
  index,
  idBase,
  kpi,
  valueRefs,
  svgRefs,
  lineRefs,
  areaRefs,
}: {
  index: number
  idBase: string
  kpi: (typeof KPIS)[number]
  valueRefs: React.MutableRefObject<Array<HTMLSpanElement | null>>
  svgRefs: React.MutableRefObject<Array<SVGSVGElement | null>>
  lineRefs: React.MutableRefObject<Array<SVGPathElement | null>>
  areaRefs: React.MutableRefObject<Array<SVGPathElement | null>>
}) {
  const color = kpi.colorClass === 'g' ? '#37f08e' : kpi.colorClass === 'c' ? '#3fd0e0' : '#ffb627'
  const colorClass = kpi.colorClass === 'g' ? s.g : kpi.colorClass === 'c' ? s.cyan : ''
  return (
    <div className={s.kpi}>
      <div className={s.kl}>{kpi.label}</div>
      <div className={`${s.kv} ${colorClass}`}>
        <span ref={(el) => { valueRefs.current[index] = el }}>0</span>
        <span className={s.kpiUnit}>{kpi.suffix}</span>
      </div>
      <div className={s.kd}>{kpi.desc}</div>
      <svg className={s.kspark} ref={(el) => { svgRefs.current[index] = el }}>
        <defs>
          <linearGradient id={`${idBase}-kpi-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path ref={(el) => { areaRefs.current[index] = el }} fill={`url(#${idBase}-kpi-${index})`} />
        <path ref={(el) => { lineRefs.current[index] = el }} fill="none" stroke={color} strokeWidth="1.3" filter={`drop-shadow(0 0 3px ${color})`} />
      </svg>
    </div>
  )
}

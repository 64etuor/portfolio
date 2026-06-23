// ============================================================
// Oscilloscope scene — static JSX (control rack + CRT shells + meters).
// Pure presentation: receives the shared ref bundle, the driver-canvas
// ref, the CSS-module map, and the single-shot handler.
// ============================================================
import { SceneHost } from '../_host/SceneHost'
import type { OscRefs, SceneStyles } from './types'

interface SceneViewProps {
  driverRef: (node: HTMLCanvasElement | null) => void
  refs: OscRefs
  s: SceneStyles
  onSingle: () => void
}

export function SceneView({ driverRef, refs: r, s, onSingle }: SceneViewProps) {
  return (
    <SceneHost className={s.root} bg="#050505">
      {/* frame-clock driver (not visible) */}
      <canvas ref={driverRef} className={s.driver} />

      <div className={s.scope}>
        <div className={s.case}>
          {/* BRAND BAR */}
          <div className={s.brandbar}>
            <div className={s.brand}>
              <div className={s.logo} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path
                    d="M1 18 H6 L6 8 L11 8 L11 18 L15 18 L15 8 L20 8 L20 18 H25"
                    stroke="#ffb300"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h1>스팟 용접 2차 전류 모니터</h1>
                <div className={s.model}>
                  MODEL <b>WCM-2K</b> · SECONDARY I₂ · AC / MFDC · kA·CYCLE
                </div>
              </div>
            </div>
            <div className={s.topmeta}>
              <span className={s.pill}>
                <span className={`${s.dot} ${s.run}`} ref={r.acqDotRef} />
                <span ref={r.acqStateRef}>ACQUIRE · WELD</span>
              </span>
              <span className={s.pill} ref={r.modePillRef}>
                MODE <b style={{ color: '#ffb300' }}>AC</b>
              </span>
              <span className={`${s.pill} ${s.mono}`}>
                SPOT <span ref={r.spotNoRef} style={{ color: '#ffb300' }}>#0001</span>
              </span>
              <span className={`${s.pill} ${s.mono}`} ref={r.clockRef}>
                --:--:--
              </span>
            </div>
          </div>

          {/* MAIN LAYOUT */}
          <div className={s.layout}>
            {/* LEFT */}
            <div className={s.leftcol}>
              <div className={s.displays}>
                <div className={s.crtwrap}>
                  <span className={s.screenlabel}>
                    LIVE OSCILLOSCOPE · 실시간 스윕 — I₂(t) 연속 스트리밍 · 60Hz ROLL
                  </span>
                  <canvas ref={r.liveRef} width={820} height={460} />
                  <div className={s.scanlines} />
                  <div className={s.glassglare} />
                  <div className={s.vignette} />
                </div>
                <div className={s.crtwrap}>
                  <span className={s.screenlabel} ref={r.scrLabelRef}>
                    WELD CURRENT MONITOR · 타점 통전 — SQUEEZE ▸ WELD ▸ HOLD · TRIG @ WELD-START
                  </span>
                  <canvas ref={r.scopeRef} width={620} height={460} />
                  <div className={s.scanlines} />
                  <div className={s.glassglare} />
                  <div className={s.vignette} />
                </div>
              </div>

              <div className={s.subgrid}>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>WELD SCHEDULE · 통전 스케줄</span>
                    <span className={s.k} ref={r.schedStatRef}>
                      SQUEEZE…
                    </span>
                  </div>
                  <div style={{ padding: 8 }}>
                    <canvas ref={r.schedRef} className={s.ctrlcanvas} width={640} height={300} />
                  </div>
                </div>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>MEASURE · 2차 전류 계측</span>
                    <span className={s.k}>spot</span>
                  </div>
                  <div style={{ padding: '8px 11px' }}>
                    <table className={s.meas}>
                      <tbody>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#ffb300' }} />피크 전류 I₂pk
                          </td>
                          <td className={`${s.num} ${s.hi}`}>
                            <span ref={r.mPeakRef}>9.62</span> kA
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#ffb300' }} />RMS 전류 I₂rms
                          </td>
                          <td className={s.num}>
                            <span ref={r.mRmsRef}>7.18</span> kA
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#8d8d8d' }} />통전 시간 WELD
                          </td>
                          <td className={s.num}>
                            <span ref={r.mCycRef}>25</span> cyc · <span ref={r.mMsRef}>417</span> ms
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#54d6ff' }} />전극력 FORCE
                          </td>
                          <td className={s.num}>
                            <span ref={r.mForceRef}>2.40</span> kN
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#7af0b0' }} />용접 에너지
                          </td>
                          <td className={s.num}>
                            <span ref={r.mEnergyRef}>1.86</span> kJ
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#8d8d8d' }} />통전각 / 듀티
                          </td>
                          <td className={s.num}>
                            <span ref={r.mDutyRef}>72</span>%
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#ff4d4d' }} />익스펄전 / 스패터
                          </td>
                          <td className={s.num} ref={r.mExpRef}>
                            NONE
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#8d8d8d' }} />너깃 추정 Ø
                          </td>
                          <td className={s.num}>
                            <span ref={r.mNugRef}>5.4</span> mm
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className={s.routineNote}>
                      <b>판정 흐름</b> 트리거=용접 개시(전극 통전), 한 타점마다 I₂ 파형 취득 → 피크·RMS·통전 cycle 계측 → 익스펄전 검출 시 해당 타점 플래그 → 다음 타점으로 진행.
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.bottom}>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>SPOT TREND · 타점별 피크 I₂pk</span>
                    <span className={s.k} ref={r.trendStatRef}>
                      kA
                    </span>
                  </div>
                  <div style={{ padding: 8 }}>
                    <canvas ref={r.trendRef} className={s.trendcanvas} width={640} height={220} />
                  </div>
                </div>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>ELECTRODE · 너깃 형성</span>
                    <span className={s.k} ref={r.nugStatRef}>
                      HEAT
                    </span>
                  </div>
                  <div style={{ padding: 8 }}>
                    <canvas ref={r.nugRef} className={s.nugcanvas} width={300} height={220} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT RACK */}
            <div className={s.rack}>
              <div className={s.group}>
                <h3>TRACE · 표시 채널</h3>
                {[
                  { color: '#ffb300', n: '1', co: 'I₂ 2차 전류', yr: 'secondary current · ', b: 'kA' },
                  { color: '#54d6ff', n: '2', co: '전극력 FORCE', yr: 'electrode force · ', b: 'kN' },
                  { color: '#ff8a1e', n: '3', co: '통전 엔벨로프', yr: 'heat envelope · ', b: 'upslope/pulse' },
                  { color: '#7af0b0', n: '4', co: '누적 열량 I²t', yr: 'cumulative heat · ', b: 'energy' },
                ].map((c, i) => (
                  <div className={s.chrow} key={i}>
                    <button
                      className={s.chbtn}
                      data-ch={i}
                      data-on="1"
                      style={{ color: c.color }}
                      ref={(el) => {
                        r.chBtnRefs.current[i] = el
                      }}
                    >
                      {c.n}
                    </button>
                    <div className={s.chmeta}>
                      <div className={s.co} style={{ color: c.color }}>
                        {c.co}
                      </div>
                      <div className={s.yr}>
                        {c.yr}
                        <b>{c.b}</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={s.group}>
                <h3>SCALE · 스코프 스케일</h3>
                <div className={s.knobs}>
                  <div className={s.knob}>
                    <div className={s.dial} ref={r.kTimeRef} />
                    <div className={s.lab}>CYCLE / DIV</div>
                    <div className={s.val} ref={r.vTimeRef}>
                      4 cyc
                    </div>
                  </div>
                  <div className={s.knob}>
                    <div className={s.dial} ref={r.kAmpRef} />
                    <div className={s.lab}>kA / DIV</div>
                    <div className={s.val} ref={r.vAmpRef}>
                      3 kA
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.group}>
                <h3>WELD · 통전 파라미터</h3>
                <div className={s.seg}>
                  <button
                    data-mode="AC"
                    aria-pressed="true"
                    ref={(el) => {
                      r.modeSegRefs.current[0] = el
                    }}
                  >
                    AC 반주기
                  </button>
                  <button
                    data-mode="MFDC"
                    aria-pressed="false"
                    ref={(el) => {
                      r.modeSegRefs.current[1] = el
                    }}
                  >
                    MFDC 인버터
                  </button>
                </div>
                <div className={s.slider}>
                  <label>HEAT %</label>
                  <input type="range" className={s.range} min={35} max={98} defaultValue={72} ref={r.heatRngRef} />
                  <span className={s.sv} ref={r.heatValRef}>
                    72%
                  </span>
                </div>
                <div className={s.slider}>
                  <label>FORCE kN</label>
                  <input type="range" className={s.range} min={120} max={420} defaultValue={240} ref={r.forceRngRef} />
                  <span className={s.sv} ref={r.forceValRef}>
                    2.4kN
                  </span>
                </div>
                <div className={s.modnote} ref={r.modeNoteRef}>
                  <b>AC</b> 60Hz 반주기 위상제어 — 통전각(α)이 HEAT를 결정, 극성 교번 정현 펄스열.
                </div>
              </div>

              <div className={s.group}>
                <h3>TRIGGER · 용접 개시</h3>
                <div className={s.seg}>
                  <button
                    data-edge="rise"
                    aria-pressed="true"
                    ref={(el) => {
                      r.edgeSegRefs.current[0] = el
                    }}
                  >
                    ▲ RISE
                  </button>
                  <button
                    data-edge="fall"
                    aria-pressed="false"
                    ref={(el) => {
                      r.edgeSegRefs.current[1] = el
                    }}
                  >
                    ▼ FALL
                  </button>
                </div>
                <div className={s.slider}>
                  <label>LEVEL kA</label>
                  <input type="range" className={s.range} min={0} max={90} defaultValue={18} ref={r.trigLvlRef} />
                  <span className={s.sv} ref={r.trigValRef}>
                    1.8kA
                  </span>
                </div>
              </div>

              <div className={s.group}>
                <h3>ACQUIRE · 취득 제어</h3>
                <div className={s.btns}>
                  <button className={`${s.ab} ${s.run}`} data-state="run" ref={r.runBtnRef}>
                    RUN / STOP
                    <small ref={r.runSubRef}>연속 취득</small>
                  </button>
                  <button className={s.ab} onClick={onSingle}>
                    SINGLE<small>다음 1타점 취득</small>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={s.hint}>
            <b>스팟 용접 전류 계측</b> = 용접 스케줄(SQUEEZE 가압 → WELD 통전 → HOLD 유지)에서 2차 전류 I₂가 결정적으로 파생된다 · AC는 통전각으로, MFDC는 DC 플래토로 열을 제어 · 노브 위/아래 드래그로 CYCLE·kA/DIV 변경 · 채널 1-4 토글 · 한 타점마다 새 파형이 그려지고 다음 타점으로 진행
          </div>

          <div className={s.footstrip}>
            <div className={s.skills}>
              <span className={`${s.chip} ${s.hi}`}>저항 스팟 용접</span>
              <span className={`${s.chip} ${s.hi}`}>2차 전류 I₂</span>
              <span className={`${s.chip} ${s.hi}`}>통전 cycle</span>
              <span className={s.chip}>AC 위상제어</span>
              <span className={s.chip}>MFDC 인버터</span>
              <span className={s.chip}>멀티 펄스</span>
              <span className={s.chip}>업/다운 슬로프</span>
              <span className={s.chip}>전극력 kN</span>
              <span className={s.chip}>피크/RMS</span>
              <span className={s.chip}>용접 에너지</span>
              <span className={`${s.chip} ${s.hi}`}>익스펄전 검출</span>
              <span className={s.chip}>스패터</span>
              <span className={s.chip}>너깃 형성</span>
              <span className={s.chip}>통전각 α</span>
              <span className={s.chip}>트리거</span>
              <span className={s.chip}>CRT 스코프</span>
              <span className={s.chip}>전류 모니터</span>
            </div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}

/**
 * Digital Twin — static HUD / overlay markup.
 * Pure presentational JSX driven entirely by refs the runtime wires up in
 * Scene.tsx. No state, no effects — keeps Scene.tsx focused on Three.js.
 */
import type { RefObject } from 'react'
import s from './scene.module.css'

export interface HudRefs {
  bootRef: RefObject<HTMLDivElement | null>
  bootFillRef: RefObject<HTMLDivElement | null>
  clockElRef: RefObject<HTMLSpanElement | null>
  kpisRef: RefObject<HTMLDivElement | null>
  lineStateRef: RefObject<HTMLSpanElement | null>
  spdValRef: RefObject<HTMLSpanElement | null>
  swLineRef: RefObject<HTMLDivElement | null>
  spdRef: RefObject<HTMLInputElement | null>
  syncBtnRef: RefObject<HTMLButtonElement | null>
  legendRef: RefObject<HTMLDivElement | null>
  flAiRef: RefObject<HTMLSpanElement | null>
  streamRowsRef: RefObject<HTMLDivElement | null>
  xdStateRef: RefObject<HTMLSpanElement | null>
  detailRef: RefObject<HTMLDivElement | null>
  dtAccentRef: RefObject<HTMLDivElement | null>
  dtStationRef: RefObject<HTMLSpanElement | null>
  dtCoRef: RefObject<HTMLDivElement | null>
  dtRoleRef: RefObject<HTMLDivElement | null>
  dtPeriodRef: RefObject<HTMLDivElement | null>
  dtStatusRef: RefObject<HTMLDivElement | null>
  dtMetricsRef: RefObject<HTMLDivElement | null>
  dtListRef: RefObject<HTMLDivElement | null>
  dtChipsRef: RefObject<HTMLDivElement | null>
}

/** Static HUD overlays + detail panel. All dynamics happen via the passed refs. */
export function Hud(refs: HudRefs) {
  return (
    <>
      {/* boot overlay */}
      <div className={`${s.hud} ${s.boot}`} ref={refs.bootRef}>
        <div className={s.bootMark}>Digital Twin · Connected Domains</div>
        <div className={s.bootTitle}>도메인 연결 상태 초기화 중</div>
        <div className={s.bootSub}>
          제조 · 데이터 · AI 도메인이 한 사람 안에서 연결되면 — 그 자체가 조직·공정의 디지털
          트윈이 된다
        </div>
        <div className={s.bootBar}>
          <div className={s.bootFill} ref={refs.bootFillRef} />
        </div>
      </div>

      {/* top bar */}
      <div className={`${s.hud} ${s.topbar}`}>
        <div className={s.brand}>
          <span className={s.brandNm}>도메인 트윈</span>
          <span className={s.brandRole}>연결된 도메인 = 조직·공정의 디지털 트윈</span>
          <span className={s.brandTw}>
            <span className={s.dot} />
            DOMAIN TWIN · SILO→CONNECTED LIVE
          </span>
        </div>
        <div className={s.topRight}>
          <span>Silo→Connected State</span>
          <span className={s.clock} ref={refs.clockElRef}>--:--:--</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className={`${s.hud} ${s.kpis}`} ref={refs.kpisRef} />

      {/* left control panel */}
      <div className={`${s.hud} ${s.control}`}>
        <div className={s.ctlH}>
          <span className={s.ctlHT}>도메인 연결 상태</span>
          <span className={s.ctlHSub}>Silo→Connected Overlay</span>
        </div>
        <div className={s.ctlBody}>
          <div>
            <div className={s.monoLabel}>
              Domain Layers — 사일로 시 오류[ERR], 연결 시 정합[OK]
            </div>
            <div className={s.layerRow}>
              <div className={s.layerDot} style={{ background: '#ff7a8a', boxShadow: '0 0 4px rgba(255,122,138,.55)' }} />
              <div>
                <div className={s.layerLabel} style={{ color: '#ff7a8a' }}>제조 현장</div>
                <div className={s.layerSub}>설비·공정·OEE·물류 — 제조 현장 도메인</div>
              </div>
            </div>
            <div className={s.layerRow}>
              <div className={s.layerDot} style={{ background: '#6fb4ff', boxShadow: '0 0 4px rgba(111,180,255,.55)' }} />
              <div>
                <div className={s.layerLabel} style={{ color: '#6fb4ff' }}>데이터 / 개발</div>
                <div className={s.layerSub}>MES·파이프라인·SSOT — 현장을 코드로 구조화</div>
              </div>
            </div>
            <div className={s.layerRow}>
              <div className={s.layerDot} style={{ background: '#c9a3ff', boxShadow: '0 0 4px rgba(201,163,255,.55)' }} />
              <div>
                <div className={s.layerLabel} style={{ color: '#c9a3ff' }}>AI 도메인</div>
                <div className={s.layerSub}>예측·이상탐지·에이전트 — 모델로 도메인을 연결</div>
              </div>
            </div>
          </div>
          <div className={s.divider} />
          <div className={s.row}>
            <span className={s.rowLab}>
              라인 가동 <b ref={refs.lineStateRef}>ON</b>
            </span>
            <div className={`${s.switch} ${s.switchOn}`} ref={refs.swLineRef}>
              <div className={s.knob} />
            </div>
          </div>
          <div className={s.row}>
            <span className={s.rowLab}>
              라인 속도 <b ref={refs.spdValRef}>1.0x</b>
            </span>
          </div>
          <input type="range" className={s.slider} ref={refs.spdRef} min="0" max="200" defaultValue="100" />
          <button className={s.btn} ref={refs.syncBtnRef}>
            Sync Pulse : 사일로 → 연결
          </button>
          <div className={s.divider} />
          <div className={s.monoLabelSm}>Stations</div>
          <div className={s.legend} ref={refs.legendRef} />
        </div>
      </div>

      {/* hint */}
      <div className={`${s.hud} ${s.hint}`}>
        <div><b>드래그</b> 궤도 회전 · <b>휠</b> 줌</div>
        <div><b>노드 클릭</b> 포커스 + 상세</div>
      </div>

      {/* cross-domain sync panel (right) */}
      <div className={`${s.hud} ${s.xdpanel}`}>
        <div className={s.xdH}>
          <div className={s.xdHT}>
            도메인 트윈 상태 <span className={s.badge}>LIVE</span>
          </div>
          <div className={s.xdHSub}>사일로 → 연결 · 오류 → 정합 전파</div>
        </div>
        <div className={s.xdBody}>
          <div className={s.fusion}>
            <div className={`${s.fusionLayer} ${s.mfg}`}>
              <div className={`${s.flIcon} ${s.mfg}`}>MFG</div>
              <div className={s.flInfo}>
                <div className={`${s.flLabel} ${s.mfg}`}>제조 현장</div>
                <div className={s.flSub}>사일로 시: 공정 문제가 데이터에 미반영 · 누락</div>
              </div>
              <div className={`${s.flVal} ${s.mfg}`}>연결</div>
            </div>
            <div className={`${s.fusionLayer} ${s.dev}`}>
              <div className={`${s.flIcon} ${s.dev}`}>DEV</div>
              <div className={s.flInfo}>
                <div className={`${s.flLabel} ${s.dev}`}>데이터 / 개발</div>
                <div className={s.flSub}>사일로 시: 현장 맥락 없는 지표 — 판단 오류</div>
              </div>
              <div className={`${s.flVal} ${s.dev}`}>LIVE</div>
            </div>
            <div className={`${s.fusionLayer} ${s.ai}`}>
              <div className={`${s.flIcon} ${s.ai}`}>AI</div>
              <div className={s.flInfo}>
                <div className={`${s.flLabel} ${s.ai}`}>AI 도메인</div>
                <div className={s.flSub}>사일로 시: 도메인 없는 모델 — 오탐·오분류</div>
              </div>
              <span className={`${s.flVal} ${s.ai}`} ref={refs.flAiRef}>ON</span>
            </div>
          </div>
          <div className={s.xdCap}>
            세 도메인이 한 사람 안에서 연결되면
            <br />
            <b>부서 간 통역 + 경계의 숨은 문제 식별</b>이 가능해진다.
            <br />
            단일 도메인 전문가는 보지 못하는 영역이다.
          </div>
          <div className={s.xdStream}>
            <div className={s.streamRqh}>Domain Link Stream — 사일로 해제 피드</div>
            <div ref={refs.streamRowsRef} />
          </div>
          <div className={s.xdState}>
            <span className={s.xdStateLbl}>Twin State</span>
            <span className={s.xdStateVal} ref={refs.xdStateRef}>SYNCED</span>
          </div>
          <div className={s.xdPort}>
            <b>LOG:</b> 세 도메인이 연결될 때 — 경계의 문제가 비로소 보인다.
            <br />
            제조 현장 → 데이터/SW → AI —
            <br />
            <span className={s.xdPortPh}>도메인을 코드와 모델로 잇는 허브</span>가 조직의
            트윈이 된다.
          </div>
        </div>
      </div>

      {/* detail panel */}
      <div className={s.detail} ref={refs.detailRef}>
        <div className={s.dtHead}>
          <div className={s.dtAccentbar} ref={refs.dtAccentRef} />
          <button className={s.dtClose}>x</button>
          <span className={s.dtStation} ref={refs.dtStationRef}>STATION 01</span>
          <div className={s.dtCo} ref={refs.dtCoRef}>--</div>
          <div className={s.dtRole} ref={refs.dtRoleRef}>--</div>
          <div className={s.dtPeriod} ref={refs.dtPeriodRef}>--</div>
          <div className={s.dtStatus} ref={refs.dtStatusRef}>
            <span className={s.dtStatusLamp} />
            <span className={s.dtStatusTxt}>RUNNING</span>
          </div>
        </div>
        <div className={s.dtBody}>
          <div className={s.dtSec}>
            <div className={s.dtSecH}>Layer Metrics</div>
            <div className={s.dtMetrics} ref={refs.dtMetricsRef} />
          </div>
          <div className={s.dtSec}>
            <div className={s.dtSecH}>Domain Log</div>
            <div className={s.dtList} ref={refs.dtListRef} />
          </div>
          <div className={s.dtSec}>
            <div className={s.dtSecH}>Tooling</div>
            <div className={s.chips} ref={refs.dtChipsRef} />
          </div>
        </div>
        <div className={s.dtFoot}>
          <span>연결된 도메인 = 조직·공정의 디지털 트윈</span>
        </div>
      </div>
    </>
  )
}
